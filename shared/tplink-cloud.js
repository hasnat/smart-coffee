"use strict";

import jsonApi from "./json-api.js";

/**
 * @global
 * @typedef TpLinkEmeterState
 * @property {number} current
 * @property {number} voltage
 * @property {number} power
 * @property {number} total
 * @property {number} cups
 * @property {number} err_code
 */

export default class TpLinkCloud {

    constructor (props = {}) {
        /** @type {string} */
        this.alias = props.alias;

        /** @type {string} */
        this.token = props.token;

        /** @type {string} */
        this.email = props.email;
        
        /** @type {string} */
        this.deviceId = props.deviceId;
        
        /** @type {string} */
        this.appServerUrl = props.appServerUrl;
    }

    static shouldCast(o) {
        return (typeof o === 'object')
            && ("token" in o)
            && ("email" in o);
    }

    /**
     * Does the login and sets this.token
     * @param {string} email 
     * @param {string} password
     * @returns {Promise<string>} The authentication token
     */
    async login(email, password) {
        const result = await this.request('login', {
            appType: "Kasa_Android",
            cloudUserName: email,
            cloudPassword: password,
            terminalUUID:  ''
        });

        this.token = result.token;
        this.email = result.email || email;

        return this.token;
    }

    /**
     * Log out the current user / token
     */
    async logout() {
        if (!this.email || !this.token)
            return;
        
        await this.request('logout', {
            cloudUserName: this.email
        });
    }

    /**
     * Fetch the device list
     * @returns {Promise<{deviceId: string, alias: string, appServerUrl: string, deviceModel: string}[]>}
     */
    async getDeviceList() {
        return (await this.request('getDeviceList')).deviceList;
    }

    /**
     * 
     * @param {string} method 
     * @param {object} [params]
     */
    async request(method, params) {
        
        if (!this.token && method !== 'login')
            throw new Error("No token provided");
        
        const httpResponse = await jsonApi.post((this.appServerUrl || "https://wap.tplinkcloud.com/") + (this.token ? ("?token=" + this.token) : ''), {
            "method": method,
            "params": params || {}
        });

        const response = await httpResponse.json();

        if (response.error_code !== 0)
            throw new Error("TP-Link API error (" + response.error_code + "): " + response.msg);
        
        return response.result;
    }

    async passthrough(module, action, deviceId) {
        const result = await this.request("passthrough", {
            deviceId: deviceId || this.deviceId,
            requestData: JSON.stringify({[module]: {[action]: {}}})
        });
        
        if (!("responseData" in result))
            throw new Error(`result does not contain property "responseData"`);
        
        const response = JSON.parse(result.responseData);

        if (!(module in response))
            throw new Error(`responseData does not contain property "${module}"`);
            
        if (!(action in response[module]))
            throw new Error(`responseData.${module} does not contain property "${action}"`);

        return response[module][action];
    }

    /**
     * @returns {Promise<TpLinkEmeterState>}
     */
    async getEmeterStatus() {
        let result = await this.passthrough("emeter", "get_realtime");
        
        if (typeof result !== 'object')
            throw new Error("Failed to get the emeter status");
        
        return result;
    }
}
