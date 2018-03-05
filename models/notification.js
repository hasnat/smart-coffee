import webpush from 'web-push';
import PushSubscription from './push-subscription';
import jsonApi from '../shared/json-api';

webpush.setVapidDetails(
    process.env.APP_URL || 'https://kofeiini.fi',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

class Notification {

    constructor(attributes) {
        Object.assign(this, {
            icon: "/images/hot-coffee-cup-192.png",
            badge: "/images/hot-coffee-cup-192.png",
            body: "t. Kahvinkeitin"
        }, attributes);
    }

    /**
     * Send an incoming webhook to Slack
     * @param {string} webhookUrl 
     */
    async sendToSlack(webhookUrl) {
        return await jsonApi.post(webhookUrl, {
            text: this.title,
            icon_url: this.icon
        });
    }

    /**
     * 
     * @param {PushSubscription[]} subscriptions 
     */
    async sendTo(subscriptions) {
        if (!Array.isArray(subscriptions) || subscriptions.length === 0)
            return;
        
        let sendPromises = [];

        const errorHandler = async (err, subscription) => {
            // Delete subscription from the db if the end point is already 410 Gone
            if (err.statusCode === 410) {
                // Try to destroy – it doesn't really matter if it fails
                try {
                    await subscription.destroy();
                } catch (e) {}
            } else {
                console.error(err);
            }
        };
        
        for (let i = 0; i < subscriptions.length; i++) {
            sendPromises.push(
                webpush
                    .sendNotification(subscriptions[i], JSON.stringify(this))
                    .catch(async err => errorHandler(err, subscriptions[i]))
            );
        }

        await Promise.all(sendPromises);
    }

    static get(event) {
        if (!(event in notifications))
            throw new Error("Invalid event");

        return notifications[event];
    }

}

/**
 * @type {Object<string, Notification>}
 */
const notifications = {
    "power-on": new Notification({
        title: "Kahvinkeitin on laitettu päälle!"
    }),
    "starting": new Notification({
        title: "Kahvia on tulossa pian!"
    }),
    "finishing": new Notification({
        title: "Kahvi on pian valmista!"
    }),
    "finished": new Notification({
        title: "Kahvi on valmista!"
    }),
    "power-off": new Notification({
        title: "Kahvinkeitin on sammutettu!"
    }),
    "progress": new Notification({
        title: "Kahvinkeittäminen edistyy"
    }),
};

export default Notification;