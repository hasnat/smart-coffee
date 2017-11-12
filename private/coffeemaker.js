module.exports = (async () => {
    "use strict";

    const { EventEmitter } = require("events");
    const {db, r} = await require('./db');
    const TpLink = require('../shared/tplink-cloud.js');

    class CoffeeMaker {

        constructor() {

            Object.defineProperty(this, 'events', {
                value: new EventEmitter,
                writable: false,
                enumerable: false
            });

            /** @type {string} */
            this.domain = null;

            /** @type {object} */
            this.calibration = {
                coldStartCompensationKwh: 0.004,
                coldStartThresholdSeconds: 900,
                kwhPerCup: 0.0136
            };

            /** @type {TpLink.Cloud} */
            this.cloud = null;
            
            /** @type {object} */
            this.startingState = null;

            /** @type {object} */
            this.previousState = null;

            /** @type {Date} */
            this.lastPowerOff = null;
        }

        /**
         * @returns {boolean}
         */
        async save() {
            return (await r.table("configs")
                          .insert(this, {durability: "hard", conflict: "update"})
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
            if (!result)
                return null;
            
            if (result.cloud)
                result.cloud = Object.assign(new TpLink.Cloud, result.cloud);

            return Object.assign(new this, result);
        }

        async getEmeterStatus() {
            return await this.cloud.passthrough("emeter", "get_realtime");
        }

        get isColdStart() {
            if (this.lastPowerOff === null)
                return true;

            return (new Date() - this.lastPowerOff) / 1000 > this.calibration.coldStartThresholdSeconds;
        }

        async listen () {
            let state = await this.getEmeterStatus();

            if (this.previousState) {
                if (this.previousState.power > 0 && state.power < 1) {
                    this.emit('power-off');
                    this.lastPowerOff = new Date();
                } else if (this.previousState.power == 0 && state.power > 0) {
                    this.emit('power-on');
                }
            }

            if (this.startingState === null) {
                if (state.power > 100) {
                    this.emit('start');
                    this.startingState = this.previousState || state;
                }
            } else {
                let kwh = state.total - this.startingState.total;
                
                if (this.isColdStart)
                    kwh -= this.calibration.coldStartCompensationKwh;

                state.cups = Math.round(kwh / this.calibration.kwhPerCup);

                if (state.power < 100) {
                    this.emit('finishing', state.cups);
                    this.startingState = null;
                } else if (!this.previousState || state.cups !== this.previousState.cups) {
                    this.emit('progress', state.cups);
                }
            }
            this.previousState = state;
        }

        startListening() {
            this.timer = setInterval(this.listen.bind(this), 5000);
        }

        stopListening() {
            if (this.timer)
                clearInterval(this.timer);
        }
        
    }

    return CoffeeMaker;
    
})();