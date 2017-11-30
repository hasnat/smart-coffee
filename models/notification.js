import webpush from 'web-push';
import PushSubscription from './push-subscription';

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
     * 
     * @param {PushSubscription[]} subscriptions 
     */
    async sendTo(subscriptions) {
        if (!Array.isArray(subscriptions) || subscriptions.length === 0)
            return;
        
        let sendPromises = [];
        
        for (let i = 0; i < subscriptions.length; i++) {
            sendPromises.push(
                webpush.sendNotification(subscriptions[i], JSON.stringify(this))
                    .catch(err => {
                        // Delete subscription from the db if the end point is already 410 Gone
                        if (err.statusCode === 410) {
                            subscriptions[i].destroy();
                        } else {
                            console.error(err);
                        }
                    })
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