(async (window, navigator, Notification, PushSubscription) => {
    "use strict";
    
    if (!('serviceWorker' in navigator)) {
        // Service Worker isn't supported on this browser, disable or hide UI.
        alert("Sorry, your browser is not supported");
        return;
    }
    
    if (!('PushManager' in window)) {
        // Push isn't supported on this browser, disable or hide UI.
        alert("Sorry, your browser is not supported");
        return;
    }
    
    if (typeof Notification === 'undefined') {
        alert("Sorry, your browser is not supported");
        return;
    }

    class App {
        constructor(serviceWorkerRegistration) {
            this.registration = serviceWorkerRegistration;
            //document.addEventListener("DOMContentLoaded", async () => {
                this.main();
            //});
        }

        async main() {
            
            let form = document.querySelector('#notifications');
            let chkNotifications = form.querySelectorAll('input');
            const submit = async () => {
                // get the notification names as an array
                const notifications = [].map.call(chkNotifications, (x)=>x.checked && x.name).filter(x=>x);
                if (notifications.length > 0) {
                    if (await Notification.requestPermission() !== 'granted') {
                        alert("You have disabled notifications");
                        return;
                    }
                }
                await this.notifications.subscribe(notifications);
            };
        
            // hook event listeners
            for (let i = 0; i < chkNotifications.length; i++) {
                chkNotifications[i].addEventListener('change', submit);
            }
        
            const subscription = await this.notifications.subscribe();
            subscription.notifications = subscription.notifications || [];
            
            // update current status
            for (let i = 0; i < chkNotifications.length; i++) {
                const x = chkNotifications[i];
                x.checked = subscription.notifications.indexOf(x.name) !== -1;
            }
        
            form.disabled = false;

        }
        
        get notifications() {
            var pushManager = this.registration.pushManager;
            var app = this;
            
            return {
                /** @type {PushSubscription} */
                getSubscription: async function () {
                    return await pushManager.getSubscription() || await pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: window.applicationServerKey
                    });
                },
                subscribe: async function (notifications) {

                    const sub = await this.getSubscription();

                    // serialize && deserialize to get the keys
                    const data = JSON.parse(JSON.stringify(sub));

                    // set the key as id
                    data.id = data && data.keys && data.keys.auth;

                    if (typeof notifications !== 'undefined') {

                        let unsubscribe = true;

                        Object.keys(notifications).map((key) => {
                            unsubscribe &= !notifications[key];
                        });

                        if (unsubscribe && sub)
                            await sub.unsubscribe();
                        
                        data.notifications = notifications;

                    }

                    const response = await app.post('/subscriptions/', data);

                    return await response.json();
                },
                unsubscribe: async function () {
                    return await this.subscribe([]);
                }
            };
        }
        
        async post (url, data) {
            return await this.request('POST', url, data);
        }
        
        async delete (url, data) {
            return await this.request('DELETE', url, data);
        }

        async request (method, url, data) {
            if (data instanceof FormData) {
                return await fetch("/api" + url, {
                    method: method,
                    headers: {
                        'Accept': 'application/json',
                    },
                    body: data
                });
            }

            return await fetch("/api" + url, {
                method: method,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        }
    }

    window.app = new App(await navigator.serviceWorker.register('./service-worker.js'));

})(window, navigator, Notification, PushSubscription).catch((err) => { console.error(err); });