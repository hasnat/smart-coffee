import ActiveRecord from './active-record';
import TpLinkCloud from '../shared/tplink-cloud.js';
import PushSubscription from './push-subscription';
import Notification from './notification';

/** @type {Object<string, NodeJS.Timer>} */
const timers = {};

/**
 * @typedef CoffeeMakerCalibration
 * @property {number} coldStartCompensationKwh
 * @property {number} coldStartThresholdSeconds
 * @property {number} kwhPerCup
 */

/**
 * @typedef CoffeeMakerState
 * @property {Date} lastPowerOff
 * @property {TpLinkEmeterState} previous
 * @property {TpLinkEmeterState} start
 */
export default class CoffeeMaker extends ActiveRecord {

    constructor(props, opts) {
        props = props || {};
        if (!(props.cloud instanceof TpLinkCloud))
            props.cloud = new TpLinkCloud(props.cloud || {});
        
        if (!props.calibration) {
            props.calibration = Object.assign({
                coldStartCompensationKwh: 0.004,
                coldStartThresholdSeconds: 900,
                kwhPerCup: 0.0136
            }, props.calibration || {});
        }

        if (!props.state) {
            props.state = {
                previous: {},
                start: {},
                lastPowerOff: null
            };
        }
        
        super(props, opts);
    }
    
    static get table() { return "configs"; }
    
    static get primaryKey() { return "domain"; }

    /**
     * Called after all models have been booted
     * @returns {Promise}
     */
    static async afterBoot() {
        await super.afterBoot();
        console.log("calling start listening..");
        await this.startListening()
    }
    
    /** @type {string} */
    get domain() { return this.__data.domain; }
    
    /** @type {TpLinkCloud} */
    get cloud() { return this.__data.cloud; }
    
    /**  @type {CoffeeMakerCalibration} */
    get calibration() { return this.__data.calibration; }
    
    /** @type {CoffeeMakerState} */
    get state() { return this.__data.state; }

    /**
     * Checks whether currently doing a cold start
     */
    isColdStart() {
        if (this.state.lastPowerOff === null)
            return true;
        
        return (new Date().getTime() - this.state.lastPowerOff.getTime()) / 1000 > this.calibration.coldStartThresholdSeconds;
    }

    /**
     * Start listening events on all coffee makers
     */
    static async startListening() {
        /** @type {CoffeeMaker[]} */
        const coffeeMakers = await this.getAll();
        
        for (let coffeeMaker of coffeeMakers) {
            coffeeMaker.startListening();
        }
    }
    
    /**
     * Stop listening events on all coffee makers
     */
    static async stopListening() {
        /** @type {CoffeeMaker[]} */
        const coffeeMakers = await this.getAll();

        for (let coffeeMaker of coffeeMakers) {
            coffeeMaker.stopListening();
        }
    }

    /**
     * @param {string} [event]
     * @returns {Promise<PushSubscription[]>}
     */
    async getSubscriptions(event) {
        if (!event)
            return await PushSubscription.getAll();

        return await PushSubscription.getAllByDomainAndEvent(this.domain, event);
    }

    async emit(event, ...params) {
        console.log("emitting " + event);

        const recipients = await this.getSubscriptions(event);
        if (!recipients.length)
            return;

        const notification = new Notification({
            title: `${event} happened`,
            icon: "/images/notification.jpg",
            body: "OMG"
        });

        await notification.sendTo(recipients);
    }

    /**
     * @private
     */
    async updateStatus () {
        let state;
        try {
            state = await this.cloud.getEmeterStatus();
        } catch (err) {
            console.error(err);
            return;
        }

        if (this.state.previous) {
            if (this.state.previous.power > 0 && state.power < 1) {
                this.emit('power-off');
                this.state.lastPowerOff = new Date();
                await this.save();
            } else if (this.state.previous.power == 0 && state.power > 0) {
                this.emit('power-on');
            }
        }

        if (this.state.start === null) {
            if (state.power > 100) {
                this.emit('start');
                this.state.start = this.state.previous || state;
            }
        } else {
            let kwh = state.total - this.state.start.total;
            
            if (this.isColdStart())
                kwh -= this.calibration.coldStartCompensationKwh;

            state.cups = Math.round(kwh / this.calibration.kwhPerCup);

            if (state.power < 100) {
                this.emit('finishing', state.cups);
                this.state.start = null;
            } else if (!this.state.previous || state.cups !== this.state.previous.cups) {
                this.emit('progress', state.cups);
            }
        }
        this.state.previous = state;
    }

    /**
     * Checks whether the status polling timer is active for the domain
     * @returns {boolean}
     */
    isListening() {
        return !!timers[this.domain];
    }

    /**
     * Starts polling the device
     * @param {number} interval 
     * @returns {void}
     */
    startListening(interval = 5000) {
        if (this.isListening())
            return;
        
        if (!this.cloud.token) {
            console.log(`No TP-Link cloud token provided for "${this.domain}"`);
            return;
        }

        console.log(`Started polling "${this.domain}" at the interval of ${interval} ms`);
        this.updateStatus().then(() => {
            timers[this.domain] = setInterval(async () => await this.updateStatus(), interval);
        });
    }

    /**
     * Stops polling the device
     * @returns {void}
     */
    stopListening() {
        if (!this.isListening())
            return;
        
        clearInterval(timers[this.domain]);
        timers[this.domain] = null;
        console.log(`Stopped polling ${this.domain}`);
    }
    
}
