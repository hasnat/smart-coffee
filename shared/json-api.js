import http from "../http.js";

export default class JsonApi {
    /**
     * 
     * @param {string} method 
     * @param {string} url 
     * @param {object} [body]
     * @param {object} [options]
     * @returns {Promise<http.Response>}
     */
    static async request(method, url, body, options) {
        const opts = {
            method: method,
            //headers: {"Accept": "application/json"},
            headers: {}
        };

        if (typeof body === 'object' && body !== null) {
            opts.headers["Content-Type"] = "application/json";
            opts.body = JSON.stringify(body);
        }
        
        if (typeof options === 'object' && options !== null)
            Object.assign(opts, options);
        
        return await http.fetch(url, opts);
    }
    
    /**
     * 
     * @param {string} url 
     * @param {object} [options]
     * @returns {Promise<http.Response>}
     */
    static async get(url, options) {
        return await this.request('GET', url);
    }
    
    /**
     * 
     * @param {string} url 
     * @param {object} [data]
     * @param {object} [options]
     * @returns {Promise<http.Response>}
     */
    static async post(url, data, options) {
        return await this.request('POST', url, data, options);
    }
    
    /**
     * 
     * @param {string} url 
     * @param {object} [data]
     * @param {object} [options]
     * @returns {Promise<http.Response>}
     */
    static async put(url, data, options) {
        return this.request('PUT', url, data, options);
    }
    
    /**
     * 
     * @param {string} url 
     * @param {object} [data]
     * @param {object} [options]
     * @returns {Promise<http.Response>}
     */
    static delete(url, data, options) {
        return this.request('DELETE', url, data, options);
    }
}