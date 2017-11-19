import jsonApi from "../shared/json-api.js";

export default class NotificationHandler {
    constructor(pushManager) {
        this.pushManager = pushManager;
    }

    /**
     * Checks whether the user agent supports notifications & Web Push
     * @returns {boolean}
     */
    static supported() {
        return (typeof Notification !== 'undefined' && ('PushManager' in window));
    }

    /**
     * Checks whether the notifications are allowed. This should trigger the permission request popup.
     */
    static async allowed() {
        return await Notification.requestPermission() === 'granted';
    }

    /**
     * Get the current subscription status
     * @returns {Promise<{events: string[]}>}
     */
    async status() {
        // Get existing subscription
        const subscription = await this.pushManager.getSubscription();
        
        if (!subscription)
            return null;
        
        const response = await jsonApi.post(`/api/push-subscriptions/`, subscription);
        
        // If got no content, let's use the one we just sent
        if (response.status === 204) {
            subscription.events = [];
            return subscription;
        }
        
        const result = await response.json();
        
        // unsubscribe the push client in case we are not subscribed to any event on the server
        if (!result.events)
            await subscription.unsubscribe();

        return result;
    }

    /**
     * Subscribe to an event
     * @param {string} event 
     * @returns {Promise<boolean>}
     */
    async subscribe(event) {
        // Get existing subscription or create new
        const subscription = await this.pushManager.getSubscription() || await this.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: window['applicationServerKey']
        });

        const response = await jsonApi.put(`/api/push-subscriptions/${event}`, subscription);

        return response.status === 204;
    }

    /**
     * Unsubscribe from an event
     * @param {string} event 
     * @returns {Promise<boolean>}
     */
    async unsubscribe(event) {
        const subscription = await this.pushManager.getSubscription();
        
        if (!subscription)
            throw new Error("Already unsubscribed from all events");

        const response = await jsonApi.delete(`/api/push-subscriptions/${event}`, subscription);
        
        return response.status === 204;
    }
}