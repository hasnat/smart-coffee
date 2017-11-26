import http from 'http';
import https from 'https';
import redirectHttps from 'redirect-https';
import greenlock from 'greenlock';
import verifyDns from './dns-verifier';

/**
 * HTTP / HTTPS server that automatically fetches SSL certificates.
 */
export default class Server {
    constructor(app) {
        this.ports = app.get('ports');
        this.app = app;
        this.productionMode = app.get('env') === 'production';
    }

    listenHttpOnly() {
        // Only HTTP on localhost
        this.app.listen(this.ports.http, 'localhost', () => {
            console.log(`HTTP server listening on localhost:${this.ports.http}`);
        });
    }

    listen() {
        if (!this.ports.https) {
            this.listenHttpOnly();
        } else {
            this.listenHttpsAndRedirectHttps();
        }
    }

    listenHttpsAndRedirectHttps() {
        const le = greenlock.create({
            server: this.productionMode ? 'production' : 'staging',
            email: process.env.LETSENCRYPT_EMAIL || 'foo@bar.com',
            agreeTos: true,
            configDir: 'tls',
            approveDomains: this.approveDomains
        });
    
        http.createServer(le.middleware(redirectHttps()))
            .listen(this.ports.http, "localhost", () => {
                console.log(`HTTP server listening on port ${this.ports.http}`);
            });
        
        https.createServer(le.httpsOptions, le.middleware(this.app))
            .listen(this.ports.https, "localhost", () => {
                console.log(`HTTPS server listening on port ${this.ports.https}`);
            });
    }

    /**
     * Every domain having an DNS A record pointing to the server's ip is
     * considered valid will result in issuing a csr.
     * @param {object} opts 
     * @param {object} certs 
     * @param {(error: Error, {options, certs})=>void} cb 
     */
    approveDomains(opts, certs, cb) {
        if (certs)
            opts.domains = certs.altnames;

        const verifyTasks = opts.domains.map(domain => verifyDns(domain));

        Promise.all(verifyTasks).then((results) => {
            console.log("alrite!");
            console.log(results);
            cb(null, { options: opts, certs: certs });
        }).catch(err => {
            console.error(err);
            cb(err);
        });
    }
}
