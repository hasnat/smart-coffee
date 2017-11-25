import r from '../r';

export default class ActiveRecord {

    constructor(props, opts) {
        /** @type {Object<string, any>} */
        this.__data = Object.assign({}, props);
        
        this.__meta = Object.assign({
            isNew: true
        }, opts || {});
    }

    /**
     * @returns {string[]}
     */
    static get fields() {
        // @ts-ignore
        return Object.getOwnPropertyNames(this.prototype)
            .map(key => [key, Object.getOwnPropertyDescriptor(this.prototype, key)])
            .filter(([key, descriptor]) => typeof descriptor.get === 'function')
            .map(([key]) => key);
    }

    /**
     * @type {string}
     */
    static get primaryKey() {
        return "id";
    }

    /**
     * @type {string}
     */
    static get table() {
        return this.name.toLowerCase();
    }

    /**
     * Called on module load
     * @param {string[]} tableList List of existing database tables
     */
    static async boot(tableList) {
        const table = this.table;
        
        if (tableList.indexOf(table) === -1) {
            await r.tableCreate(this.table, { primaryKey: this.primaryKey }).run();
            console.info(`Created table '${table}'`);
        } else {
            console.info(`Table '${table}' already created`);
        }
    }

    /**
     * Called after all models have been booted
     * @returns {Promise}
     */
    static async afterBoot() { }

    toJSON() {
        const o = {};
        const fields = this.constructor['fields'];

        for (let i = 0; i < fields.length; i++) {
            o[fields[i]] = this[fields[i]];
        }

        return o;
    }
    
    /**
     * Whether the record was loaded from database or manually created
     * @returns {boolean}
     */
    isNew() {
        return this.__meta.isNew;
    }
    
    set(attributes) {
        Object.assign(this.__data, attributes || {});
    }
    
    /**
     * Deletes the record from the database
     * @returns {Promise<void>}
     */
    async destroy() {
        await this.constructor.delete(this[this.constructor.primaryKey]);
    }
    
    /**
     * Deletes a record from the database using primary key
     * @returns {Promise<void>}
     */
    static async delete(id) {
        id && await this.query().get(id).delete().run();
    }

    /**
     * Saves the record to the database
     * @returns {Promise<void>}
     */
    async save() {
        await this.constructor.query().insert(this.toJSON(), {conflict: "update"});
    }
    
    static query(opts) {
        return r.table(this.table, opts);
    }

    /**
     * @param {string|number} id
     * @returns {Promise<any>}
     */
    static async get(id) {
        if (!id)
            return undefined;
        
        const row = await this.query().get(id).run();
        return row && new this(row, { isNew: false });
    }
    
    /**
     * @returns {Promise<any[]>}
     */
    static async getAll() {
        return await this.findAll({});
    }
    
    /**
     * @returns {Promise<any[]>}
     */
    static async findAll(predicate, opts) {
        const all = [];
        const result = await this.query(opts).filter(predicate).run();
        await result.eachAsync((row) => {
            all.push(new this(row, { isNew: false }));
        });

        return all;
    }
    
    /**
     * @returns {Promise<any>}
     */
    static async find(predicate, opts) {
        const cursor = await this.query(opts).filter(predicate).nth(0).run();
        const rows = await cursor.toArray();

        if (rows.length !== 1)
            return undefined;
            
        return new this(rows[0], { isNew: false });
    }

    /**
     * 
     * @param {Object} props 
     * @returns {Promise<any>} props 
     */
    static async findOrNew(props) {
        const obj = new this(props);
        return (obj[this.primaryKey] && await this.get(obj[this.primaryKey])) || obj;
    }

}