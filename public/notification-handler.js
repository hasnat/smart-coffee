import jsonApi from "../shared/json-api.js";

export default class NotificationHandler {
    constructor({pushManager, appServerKeyLocation}) {
        /** @type {PushManager} */
        this.pushManager = pushManager;
        
        /** @type {string} */
        this.endpoint = null;

        /** @type {string[]} */
        this.events = [];

        /** @type {string} */
        this.appServerKeyLocation = appServerKeyLocation;

        /** @type {ArrayBuffer} */
        this.appServerKey = null;
    }

    /**
     * Checks whether the user agent supports notifications & Web Push
     * @returns {boolean}
     */
    static supported() {
        return (typeof Notification !== 'undefined' && ('PushManager' in window));
    }

    /**
     * Checks whether the notifications are allowed.
     * This will also trigger the permission request popup (if not denied already).
     */
    static async allowed() {
        return await Notification.requestPermission() === 'granted';
    }

    /**
     * Synchronize the state between client and server
     * @returns {Promise<{events: string[]}>}
     */
    async sync() {
        // Get existing subscription
        const subscription = await this.pushManager.getSubscription();
        
        if (!subscription)
            return null;
        
        let response = await jsonApi.post("/api/push-subscriptions", subscription);

        // Handle 201 Created with Location header as it is not redirected automatically
        if (response.status === 201)
            response = await jsonApi.get(response.headers.get("Location"));
            
        // Store the redirected endpoint for later usage
        this.endpoint = response.url;
        
        const result = await response.json() || {};

        // Store the subscribed events
        this.events = result.events || [];
        
        return result;
    }

    subscribed(event) {
        return this.events.indexOf(event) !== -1;
    }

    /**
     * Subscribe to an event
     * @param {string} event 
     * @returns {Promise<boolean>}
     */
    async subscribe(event) {
        // Check if already subscribed
        if (this.subscribed(event))
            return;
        
        if (!await this.pushManager.getSubscription()) {

            if (!this.appServerKey)
                this.appServerKey = await (await jsonApi.get(this.appServerKeyLocation)).arrayBuffer();

            // Get existing subscription or create new
            await this.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.appServerKey
            });
            
        }

        if (!this.endpoint)
            await this.sync();

        await jsonApi.put(`${this.endpoint}/events/${event}`);

        // Add event to local status
        if (!this.subscribed(event))
            this.events.push(event);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event
     * @returns {Promise<boolean>}
     */
    async unsubscribe(event) {
        // Check if already unsubscribed
        if (!this.subscribed(event))
            return;

        const subscription = await this.pushManager.getSubscription();
        
        if (!subscription)
            throw new Error("Already unsubscribed from all events");
            
        if (!this.endpoint)
            await this.sync();
        
        // Remove event from local status
        const i = this.events.indexOf(event);
        if (i !== -1)
            this.events.splice(i, 1);
        
        // In case there are no active notification events, let's delete the whole subscription
        if (this.events.length === 0) {
            // Unsubscribe from the Web Push endpoint
            await subscription.unsubscribe();

            // Unsubscribe from our server
            await jsonApi.delete(this.endpoint);

            // Clear the endpoint as it doesn't exist anymore
            this.endpoint = null;

            return;
        }
        
        await jsonApi.delete(`${this.endpoint}/events/${event}`);
    }
}