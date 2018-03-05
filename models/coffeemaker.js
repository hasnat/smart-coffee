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
 * @property {number} powerOnThresholdWatts
 * @property {number} finishingSeconds
 * @property {number} finishingSecondsPerBatch
 * @property {number} actionThresholdWatts
 * @property {number} kwhPerBatch
 */

/**
 * @typedef CoffeeMakerState
 * @property {Date} lastPowerOff
 * @property {TpLinkEmeterState} previous
 * @property {TpLinkEmeterState} current
 * @property {TpLinkEmeterState} start
 */
export default class CoffeeMaker extends ActiveRecord {

    constructor(props, opts) {
        props = props || {};
        if (!(props.cloud instanceof TpLinkCloud))
            props.cloud = new TpLinkCloud(props.cloud || {});
        
        //if (!props.calibration) {
            props.calibration = Object.assign({
                coldStartCompensationKwh: 0.004,
                coldStartThresholdSeconds: 1200,
                kwhPerBatch: 0.1360,
                powerOnThresholdWatts: 5,
                actionThresholdWatts: 150,
                finishingSeconds: 30,
                finishingSecondsPerBatch: 90 // this is untested
            }, props.calibration || {});
        //}

        if (!props.state) {
            props.state = {
                previous: {},
                current: {},
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
            return await PushSubscription.getAllByDomain(this.domain);

        return await PushSubscription.getAllByDomainAndEvent(this.domain, event);
    }

    /**
     * 
     * @param {string} event
     * @param {Object} params
     */
    emit(event, params) {
        console.log(event);
        this.getSubscriptions(event)
            .then(recipients => {
                return Notification.get(event)
                                   .sendTo(recipients);
            }).catch((e) => {
                console.error(e);
            });
    }
    
    /**
     * @returns {boolean}
     */
    hasJustBeenPoweredOn() {
        if (!this.state.previous)
            return false;
        
        return this.state.previous.power < this.calibration.powerOnThresholdWatts
            && this.state.current.power > this.calibration.powerOnThresholdWatts;
    }
    
    /**
     * @returns {boolean}
     */ 
    hasJustBeenPoweredOff() {
        if (!this.state.previous)
            return false;
        
        return this.state.previous.power > this.calibration.powerOnThresholdWatts
            && this.state.current.power < this.calibration.powerOnThresholdWatts;
    }
    
    /**
     * @returns {boolean}
     */
    hasJustStartedHeatingTheWater() {
        if (this.state.start !== null)
            return false;
        
        return this.isHeatingTheWater();
    }
    
    /**
     * @returns {boolean}
     */ 
    hasJustFinishedHeatingTheWater() {
        if (this.state.start === null)
            return false;

        return !this.isHeatingTheWater();
    }
    
    /**
     * @returns {boolean}
     */
    isHeatingTheWater() {
        return (this.state.current.power > this.calibration.actionThresholdWatts);
    }

    /**
     * @returns {boolean}
     */
    hasJustMadeProgress() {
        return this.state.previous && this.state.current.progress !== this.state.previous.progress;
    }

    /**
     * @private
     * @returns {void}
     */
    updatePowerStatus() {
        if (this.hasJustBeenPoweredOff()) {
            this.emit('power-off', this.state.current);
            this.state.lastPowerOff = new Date();
        } else if (this.hasJustBeenPoweredOn()) {
            this.emit('power-on', this.state.current);
        }
    }

    /**
     * @private
     * @returns {void}
     */
    updateWaterHeatingStatus() {
        const { calibration, state } = this;
        
        if (this.hasJustStartedHeatingTheWater()) {
            const startState = state.previous || state.current;
            this.emit('starting', startState);
            state.start = startState;
            return;
        } else if (state.start === null) {
            return;
        }

        let kwh = state.current.total - state.start.total;
        
        if (this.isColdStart())
            kwh -= calibration.coldStartCompensationKwh;

        state.current.progress = (kwh / calibration.kwhPerBatch) || 0;

        if (this.hasJustFinishedHeatingTheWater()) {
            this.emit('finishing', state.current);
            state.start = null;
            setTimeout(() => {
                this.emit('finished', state.current);
            }, (calibration.finishingSeconds + state.current.progress * calibration.finishingSecondsPerBatch) * 1000);
        } else if (this.hasJustMadeProgress()) {
            setTimeout(() => {
                this.emit('progress', state.current);
            }, (calibration.finishingSeconds + state.current.progress * calibration.finishingSecondsPerBatch) * 1000);
        }
    }

    /**
     * Updates the machine status from the cloud
     * @private
     * @returns {Promise<void>}
     */
    async updateStatus () {
        let state;
        try {
            this.state.current = await this.cloud.getEmeterStatus();
        } catch (err) {
            console.error(err);
            return;
        }

        this.updatePowerStatus();
        this.updateWaterHeatingStatus();
        
        // always save the state
        await this.save();

        this.state.previous = this.state.current;
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
