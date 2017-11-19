import rethinkdbdash from 'rethinkdbdash';

const r = rethinkdbdash({
    servers: [{
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT)
    }],
    db: process.env.DB_NAME,
    cursor: true
});

export default r;