
import ActiveRecord from './active-record';

/**
 * const notification = new Notification({
          title: "Successfully subscribed",
          icon: "/images/notification.jpg",
          body: "You'll stay updated about the coffee status"
        });
        await notification.sendTo([subscription]);
 */

/**
 * A class to represent the client PushSubscription object
 */
export default class PushSubscription extends ActiveRecord {

    /**
     * 
     * @param {object} props 
     * @param {object} [opts]
     */
    constructor(props, opts) {
        super(props, opts);
    }

    static get table() { return "subscriptions"; }

    static get primaryKey() { return "id"; }

    /**
     * Identifier generated from the end of the endpoint URI
     */
    get id() {
        return this.__data.id || (this.endpoint && this.endpoint.substr(-32));
    }

    /**
     * The domain this subscription is associated with
     * @type {string}
     */
    get domain() {
        return this.__data.domain;
    }
    
    /**
     * The actual Web Push endpoint URI
     * @type {string}
     */
    get endpoint() {
        return this.__data.endpoint;
    }
    
    /**
     * Encryption keys
     * @type {Object<string, string>}
     */
    get keys() {
        return this.__data.keys;
    }

    /**
     * The subscribed event names
     * @type {string[]}
     */
    get events() {
        // ensure that an array will always be returned
        if (!Array.isArray(this.__data.events))
            this.__data.events = [];
        
        return this.__data.events;
    }

    subscribe(event) {
        if (this.events.indexOf(event) === -1)
            this.events.push(event);
        return this;
    }
    
    unsubscribe(event) {
        const index = this.events.indexOf(event);
        if (index !== -1)
            this.events.splice(index, 1);
        return this;
    }

    /**
     * Whether the object looks like it should be casted to PushSubscription
     * @param {object} o 
     * @returns {boolean}
     */
    static shouldCast(o) {
        return (typeof o === 'object')
            && ("endpoint" in o)
            && ("keys" in o);
    }

}
