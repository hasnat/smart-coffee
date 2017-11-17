module.exports = (async () => {
    "use strict";

    const {db, r} = await require('./db');

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
    class PushSubscription {

        constructor({id, domain, endpoint, keys: {auth, p256dh}, events}) {
            
            /** @type {string} */
            this.id = id || (endpoint && endpoint.substr(-32)) || undefined;

            /** @type {string} */
            this.domain = domain;
            
            /** @type {string} */
            this.endpoint = endpoint;

            /** @type {object} */
            this.keys = {
                /** @type {string} */
                auth,

                /** @type {string} */
                p256dh
            };

            this.events = events || [];
            
        }

        on(event) {
            if (this.events.indexOf(event) === -1)
                this.events.push(event);
            
            return this;
        }
        
        off(event) {
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
        
        /**
         * Inserts/updates the database record
         * @returns {boolean}
         */
        async save() {
            const result = await r.table("subscriptions")
                                  .insert(this, {conflict: "update"})
                                  .run(db);
            return result.inserted === 1 || result.updated === 1;
        }

        /**
         * Deletes the record from db
         * @returns {boolean}
         */
        async delete() {
            const result = await r.table("subscriptions")
                                  .get(this.id)
                                  .delete()
                                  .run(db);
            return result.deleted === 1;
        }

        /**
         * Checks whether an object with the primary key on instance exists in the db
         * @returns {boolean}
         */
        async exists() {
            return await this.constructor.find(this.id) !== null;
        }

        /**
         * Reloads the data from the database using id
         * @returns {this}
         */
        async reload() {
            const result = await r.table("subscriptions")
                                  .get(this.id || '')
                                  .run(db);
            if (!result)
                this;

            return Object.assign(this, result);
        }

        /**
         * 
         * @param {string} id 
         * @returns {Subscription}
         */
        static async find(id) {
            const result = await r.table("subscriptions")
                                  .get(id || '')
                                  .run(db);
            if (!result)
                return null;
            
            return new this(result);
        }
                
        /**
         * 
         * @param {string} domain
         * @returns {Subscription[]}
         */
        static async allByDomain(domain) {
            const results = (await r.table("subscriptions")
                                   .filter({domain: domain})
                                   .run(db))
                                   .toArray();
            
            for (let i = 0; i < results.length; i++) {
                results[i] = new this(results[i]);
            }

            return results;
        }

    }
    
    return PushSubscription;

})();