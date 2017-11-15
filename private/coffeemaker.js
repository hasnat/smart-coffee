module.exports = (async () => {
    "use strict";

    const { EventEmitter } = require("events");
    const {db, r} = await require('./db');
    const TpLink = require('../shared/tplink-cloud.js');
    const Subscription = await require('./subscription');
    const Notification = await require('./notification');

    /** @type {Object.<string, int>} */
    let timers = {};

    /** @type {Object.<string, int>} */
    let events = {};

    class CoffeeMaker {

        constructor(properties) {

            /** @type {string} */
            this.domain = null;

            /** @type {object} */
            this.calibration = {
                coldStartCompensationKwh: 0.004,
                coldStartThresholdSeconds: 900,
                kwhPerCup: 0.0136
            };
            
            /** @type {object} */
            this.state = {
                /** @type {object} */
                start: null,

                /** @type {object} */
                previous: null,

                /** @type {Date} */
                lastPowerOff: null
            };

            Object.assign(this, properties);

            /** @type {TpLink.Cloud} */
            this.cloud = Object.assign(new TpLink.Cloud, this.cloud || {});
            
        }

        getEventEmitter() {
            if (!this.domain)
                throw new Error("No domain set!");
        
            if (!(this.domain in events))
                events[this.domain] = new EventEmitter();
            
            return events[this.domain];
        }
        
        on(event, handler) {
            this.getEventEmitter().on(event, handler);
        }
        
        off(event) {
            this.getEventEmitter().removeAllListeners(event);
        }

        /**
         * Custom toJSON to make sure we don't serialize EventEmitter related properties
         */
        toJSON() {
            const json = {};

            ["domain", "calibration", "cloud", "state"].forEach((x) => {
                json[x] = this[x];
            });
            
            return json;
        }

        /**
         * @returns {boolean}
         */
        async save() {
            return (await r.table("configs")
                           .insert(this.toJSON(), {durability: "hard", conflict: "update"})
                           .run(db)).errors === 0;
        }

        /**
         * @returns {boolean}
         */
        async delete() {
            return (await r.table("configs")
                           .get(this.domain)
                           .delete()
                           .run(db)).deleted === 1;
        }

        /**
         * @returns {boolean}
         */
        async exists() {
            return (await this.constructor.find(this.domain)) !== null;
        }

        /**
         * 
         * @param {string} domain 
         * @returns {Subscription}
         */
        static async find(domain) {
            const result = await r.table("configs")
                                  .get(domain || '')
                                  .run(db);
            
            return result ? new this(result) : null;
        }

        async getEmeterStatus() {
            let result = await this.cloud.passthrough("emeter", "get_realtime");
            
            if (typeof result !== 'object')
                throw new Error("Failed to get the emeter status");
            
            return result;
        }

        get isColdStart() {
            if (this.state.lastPowerOff === null)
                return true;

            return (new Date() - this.state.lastPowerOff) / 1000 > this.calibration.coldStartThresholdSeconds;
        }

        static async startListening() {
            this.changefeedCursor = await r.table('configs').changes({includeInitial: true, includeTypes: true}).run(db);

            this.changefeedCursor.each(async (err, e) => {
                if (err) {
                    console.error(err);
                } else {
                    switch (e.type) {
                        case "remove":
                            // Stop polling the device
                            (new this(e.old_val)).stopListening();
                            break;
                        case "change":
                            if (e.old_val.domain !== e.new_val.domain && e.old_val.domain in events) {
                                events[e.new_val.domain] = events[e.old_val.domain];
                                delete events[e.old_val.domain];
                            }
                            if (JSON.stringify(e.old_val.cloud) === JSON.stringify(e.new_val.cloud)) {
                                console.log("Config updated but cloud config remained untouched – no action taken");
                                break;
                            }
                        case "add":
                        case "initial":
                            // start polling if cloud config is provided
                            if (e.new_val.cloud) {
                                const instance = new this(e.new_val);
                                instance.off('power-on');
                                instance.on('power-on', async () => {
                                    await instance.notify({title: "Power on", body: "Oh yeah, power on"});
                                });
                                
                                instance.off('power-off');
                                instance.on('power-off', async () => {
                                    await instance.notify({title: "Power off", body: "Oh no, power off"});
                                });
                                instance.startListening();
                            }
                            
                            break;
                    }
                }
            });
        }

        async notify(o) {
            const n = Object.assign(new Notification, o);
            await n.sendTo(await this.getSubscriptions());
        }

        async getSubscriptions() {
            return await Subscription.allByDomain(this.domain);
        }

        static async stopListening() {
            if (!this.changefeedCursor)
                return;
            
            await this.changefeedCursor.close();
            
            this.changefeedCursor = null;
        }

        /**
         * @private
         */
        async updateStatus () {
            let state;
            try {
                state = await this.getEmeterStatus();
            } catch (err) {
                console.error(err);
                return;
            }

            if (this.state.previous) {
                if (this.state.previous.power > 0 && state.power < 1) {
                    this.getEventEmitter().emit('power-off');
                    this.state.lastPowerOff = new Date();
                    await this.save();
                } else if (this.state.previous.power == 0 && state.power > 0) {
                    this.getEventEmitter().emit('power-on');
                }
            }

            if (this.state.start === null) {
                if (state.power > 100) {
                    this.getEventEmitter().emit('start');
                    this.state.start = this.state.previous || state;
                }
            } else {
                let kwh = state.total - this.state.start.total;
                
                if (this.isColdStart)
                    kwh -= this.calibration.coldStartCompensationKwh;

                state.cups = Math.round(kwh / this.calibration.kwhPerCup);

                if (state.power < 100) {
                    this.getEventEmitter().emit('finishing', state.cups);
                    this.state.start = null;
                } else if (!this.state.previous || state.cups !== this.state.previous.cups) {
                    this.getEventEmitter().emit('progress', state.cups);
                }
            }
            this.state.previous = state;
        }

        isListening() {
            return !!timers[this.domain];
        }

        startListening(interval = 5000) {
            this.stopListening();
            
            timers[this.domain] = setInterval(async () => await this.updateStatus(), interval);
            console.log(`Started polling "${this.cloud.alias}" at the interval of ${interval} ms`);
        }

        stopListening() {
            if (this.isListening()) {
                clearInterval(timers[this.domain]);
                timers[this.domain] = null;
                console.log(`Stopped polling ${this.cloud.alias}`);
            }
        }
        
    }

    return CoffeeMaker;
    
})();