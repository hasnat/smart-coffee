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

    if (await Notification.requestPermission() !== 'granted') {
        alert("You have disabled notifications");
        return;
    }

    class App {
        constructor(serviceWorkerRegistration) {
            this.registration = serviceWorkerRegistration;
        }
        
        get notifications() {
            var pushManager = this.registration.pushManager;
            var app = this;
            
            return {
                getSubscription: async () => {
                    return await pushManager.getSubscription();
                },
                subscribe: async () => {
                    return await app.post('/subscriptions/', await pushManager.getSubscription() || await pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: window.applicationServerKey
                    }));
                },
                unsubscribe: async() => {
                    let subscription = await pushManager.getSubscription();
                    
                    if (subscription && !await subscription.unsubscribe())
                        throw new Error("Failed to unsubscribe!");
                    
                    return await app.delete('/subscriptions/', subscription || {});
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