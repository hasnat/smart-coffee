module.exports = (async () => {
    const r = require('rethinkdb');
    const db = process.env.DB_NAME;
    const conn = await r.connect({host: process.env.DB_HOST, port: process.env.DB_PORT});

    if ((await r.dbList().run(conn)).indexOf(db) === -1) {
        await r.dbCreate(db).run(conn);
        console.info("Created database", db);
    } else {
        console.info(`Database '${db}' already created`);
    }
    
    conn.use(db);

    /**
     * Making sure we have all the tables
     */
    const tables = {
        configs: {primaryKey: "domain"},
        logs: {primaryKey: "id"},
        subscriptions: {primaryKey: "id"}
    };

    // Get the current table list in the db server
    const tableList = await r.tableList().run(conn);

    for (table in tables) {
        if (tableList.indexOf(table) === -1) {
            await r.tableCreate(table, tables[table]).run(conn);
            console.info(`Created table '${table}'`);
        } else {
            console.info(`Table '${table}' already created`);
        }
    }
    
    return {
        db: conn,
        r: r
    };

})();