import EventEmitter from "event-emitter-es6";
import ActiveRecord from './active-record';
import TpLinkCloud from '../shared/tplink-cloud.js';
import PushSubscription from './push-subscription';
import Notification from './notification';

/** @type {Object.<string, NodeJS.Timer>} */
let timers = {};

/** @type {Object.<string, EventEmitter>} */
let events = {};

/*calibration = {
    coldStartCompensationKwh: 0.004,
    coldStartThresholdSeconds: 900,
    kwhPerCup: 0.0136
};*/

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
        
        super(props, opts);
    }
    
    static get table() { return "configs"; }
    
    static get primaryKey() { return "domain"; }
    
    /** @type {string} */
    get domain() { return this.__data.domain; }
    
    /** @type {TpLinkCloud} */
    get cloud() { return this.__data.cloud; }
    
    /**  @type {CoffeeMakerCalibration} */
    get calibration() { return this.__data.calibration; }
    
    /** @type {CoffeeMakerState} */
    get state() { return this.__data.state; }

    /**
     * Whether the object looks like it should be casted to CoffeeMaker
     * @param {object} o 
     * @returns {boolean}
     */
    static shouldCast(o) {
        return (typeof o === 'object')
            && ("cloud" in o)
            && ("domain" in o);
    }

    /**
     * @return {EventEmitter}
     */
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
     * Checks whether currently doing a cold start
     */
    isColdStart() {
        if (this.state.lastPowerOff === null)
            return true;
        
        return (new Date().getTime() - this.state.lastPowerOff.getTime()) / 1000 > this.calibration.coldStartThresholdSeconds;
    }

    static async startListening() {
        /** @type {CoffeeMaker[]} */
        const coffeeMakers = await this.findAll({});
        coffeeMakers.forEach(async (coffeeMaker) => {
            coffeeMaker.startListening();
        });
    }

    async notify(o) {
        const n = Object.assign(new Notification, o);
        await n.sendTo(await this.getSubscriptions());
    }

    async getSubscriptions() {
        return await PushSubscription.findAll({where: {domain: this.domain}});
    }

    static async stopListening() {
        /** @type {CoffeeMaker[]} */
        const coffeeMakers = await this.findAll({});
        coffeeMakers.forEach(async (coffeeMaker) => {
            coffeeMaker.stopListening();
        });
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
            
            if (this.isColdStart())
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
