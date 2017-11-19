import webpush from 'web-push';
import PushSubscription from './push-subscription';

webpush.setVapidDetails(
    process.env.APP_URL || 'https://kofeiini.fi',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

export default class Notification {

    constructor(attributes) {
        Object.assign(this, attributes);
    }

    /**
     * 
     * @param {PushSubscription[]} subscriptions 
     */
    async sendTo(subscriptions) {
        if (!subscriptions)
            return;
        
        let sendPromises = [];
        
        for (let i = 0; i < subscriptions.length; i++) {
            sendPromises.push(webpush.sendNotification(subscriptions[i], JSON.stringify(this)));
        }

        await Promise.all(sendPromises);
    }

}
