(function(exports) {
    let jsonHeaders;

    if (typeof Headers !== 'undefined') {
        jsonHeaders = new Headers();
        jsonHeaders.append("Content-Type", "application/json");
    } else {
        fetch = require('node-fetch');
        jsonHeaders = {"Content-Type": "application/json"};
    }

    class TpLinkCloud {
    
        constructor (token, email, deviceId, appServerUrl) {
            /** @type {string} */
            this.token = token;

            /** @type {string} */
            this.email = email;
            
            /** @type {string} */
            this.deviceId = deviceId;
            
            /** @type {string} */
            this.appServerUrl = appServerUrl;
        }

        /**
         * 
         * @param {string} email 
         * @param {string} password
         * @returns {string} The authentication token
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
         * 
         * @param {string} email 
         * @param {string} token 
         */
        async logout() {
            if (!this.email || !this.token)
                return;
            
            await this.request('logout', {
                cloudUserName: this.email
            });
        }

        /**
         * 
         * @param {string} token
         * @returns {{deviceId: string, alias: string, appServerUrl}[]}
         */
        async getDeviceList() {
            return (await this.request('getDeviceList')).deviceList;
        }

        /**
         * 
         * @param {string} method 
         * @param {object} params 
         * @param {string} token 
         */
        async request(method, params) {
            
            if (!this.token && method !== 'login')
                throw new Error("No token provided");
            
            const response = await (await fetch((this.appServerUrl || "https://wap.tplinkcloud.com/") + (this.token ? ("?token=" + this.token) : ''), {
                method: "post",
                headers: jsonHeaders,
                body: JSON.stringify({
                    "method": method,
                    "params": params || {}
                })
            })).json();

            if (response.error_code !== 0)
                throw new Error("TP-Link API error (" + response.error_code + "): " + response.msg);
            
            return response.result;
        }

        async passthrough(module, action, deviceId) {
            const result = (await this.request("passthrough", {
                deviceId: deviceId || this.deviceId,
                requestData: JSON.stringify({[module]: {[action]: {}}})
            }));
            
            if (!("responseData" in result))
                throw new Error(`result does not contain property "responseData"`);
            
            const response = JSON.parse(result.responseData);

            if (!(module in response))
                throw new Error(`responseData does not contain property "${module}"`);
                
            if (!(action in response[module]))
                throw new Error(`responseData.${module} does not contain property "${action}"`);

            return response[module][action];
        }
    }

    exports.Cloud = TpLinkCloud;

})(typeof exports === 'undefined' ? this.TpLink = this.TpLink || {} : exports);