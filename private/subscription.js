module.exports = (async () => {
    "use strict";

    const {db, r} = await require('./db');

    /**
     * A class to represent the client PushSubscription object
     */
    class Subscription {

        constructor(domain) {
            
            /** @type {string} */
            this.domain = domain;
            
            /** @type {string} */
            this.endpoint = null;

            /** @type {object} */
            this.keys = {};
            
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
            return (await this.constructor.find(this.id)) !== null;
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
            
            return Object.assign(new this, result);
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
                results[i] = Object.assign(new this, results[i]);
            }

            return results;
        }

    }
    
    return Subscription;

})();