module.exports = (async () => {
    "use strict";

    const {db, r} = await require('./db');

    /**
     * A class to represent the client PushSubscription object
     */
    class Subscription {

        constructor() {
            
            /** @type {string} */
            this.domain = null;
            
            /** @type {string} */
            this.endpoint = null;

            /** @type {object} */
            this.keys = {};

            /**
             * Additional properties for json serialization
             * How in the world can I jsdoc this??!?!?!??!?!??!
             */
            Object.defineProperties(this, {
                id: {
                    get: () => this.keys.auth,
                    enumerable: true // this is essential for JSON encoding & decoding
                }
            });
            
        }
        
        /**
         * Inserts/updates the database record
         * @returns {boolean}
         */
        async save() {
            return (await r.table("subscriptions")
                           .insert(this)
                           .run(db)).inserted === 1;
        }

        /**
         * Deletes the record from db
         * @returns {boolean}
         */
        async delete() {
            return (await r.table("subscriptions")
                           .get(this.id)
                           .delete()
                           .run(db)).deleted === 1;
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
            
            // id is a readonly-property so it must be unset
            delete result.id;
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
                // id is a readonly-property so it must be unset
                delete results[i].id;
                results[i] = Object.assign(new this, results[i]);
            }

            return results;
        }

    }
    
    return Subscription;

})();