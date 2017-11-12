module.exports = (async() => {

    const webpush = require('web-push');
    const Subscription = await require('./subscription');
    //const base64url = require('base64url').default;
    //const MoccaMaster = require('./coffeemaker');


    webpush.setVapidDetails(
        process.env.APP_URL || 'https://kofeiini.fi',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );

    class Notification {

        constructor() {


        }

        /**
         * 
         * @param {Subscription[]} subscriptions 
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

    var n = new Notification;

    return Notification;

})();


    /*
    (async () => {
        let coffeeMakers = await CoffeeMaker.getAll();
        coffeeMakers.forEach((coffeemaker) => {
            coffeemaker.on('start', () => {
                push("Starting to heat the water!");
            });
            
            coffeemaker.on('progress', (cups) => {
                push(`There are at least ${cups} cups coming`);
            });
            
            coffeemaker.on('finishing', (cups) => {
                push(`Hooray! ${cups} cups coming, just wait till gravity finishes the job`);
            });
            
            coffeemaker.on('power-on', () => {
                push("The machine has been turned on!");
            });
            
            coffeemaker.on('power-off', () => {
                push("The machine has been turned off!");
            });

            coffeemaker.startListening();
        }
    })().catch(e=>{console.error(e);});
    */