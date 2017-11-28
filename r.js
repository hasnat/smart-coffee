import rethinkdbdash from 'rethinkdbdash';
import url from 'url';

if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL environment variable is undefined');

const db = url.parse(process.env.DATABASE_URL);

if (db.protocol !== 'rethinkdb:')
    throw new Error(`Sorry, ${db.protocol.substr(0, -1)} is not supported. Please use RethinkDB.`);

const r = rethinkdbdash({
    servers: [{
        host: db.hostname,
        port: parseInt(db.port || "28015")
    }],
    db: db.pathname.substr(1),
    cursor: true
});

export default r;