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
            const app = this;
            const submit = async function () {
                if (typeof Notification === 'undefined') {
                    alert("Valitettavasti selaimesi ei tue ilmoituksia!");
                    return;
                } else if (await Notification.requestPermission() !== 'granted') {
                    alert("Olet estänyt ilmoitukset!");
                    return;
                }
                
                if (this.checked) {
                    await app.notifications.subscribe(this.value);
                } else {
                    await app.notifications.unsubscribe(this.value);
                }
            };
        
            // hook event listeners
            for (let i = 0; i < chkNotifications.length; i++) {
                chkNotifications[i].addEventListener('change', submit);
            }
        
            const subscription = await this.notifications.status();
            if (subscription) {
                // update current status
                for (let i = 0; i < chkNotifications.length; i++) {
                    const x = chkNotifications[i];
                    x.checked = subscription.events.indexOf(x.value) !== -1;
                }
            }
        
            form.disabled = false;

        }
        
        get notifications() {
            var pushManager = this.registration.pushManager;
            var app = this;
            
            return {
                status: async function () {
                    // Get existing subscription
                    const subscription = await pushManager.getSubscription();
                    
                    if (!subscription)
                        return null;
                    
                    const response = await app.post(`/subscriptions/`, subscription);
                    
                    // If got no content, let's use the one we just sent
                    if (response.status === 204) {
                        subscription.events = [];
                        return subscription;
                    }
                    
                    const result = await response.json();
                    
                    if (!result.events)
                        await subscription.unsubscribe();

                    return result;
                },
                subscribe: async function (event) {
                    // Get existing subscription or create new
                    const subscription = await pushManager.getSubscription() || await pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: window.applicationServerKey
                    });

                    const response = await app.put(`/subscriptions/${event}`, subscription);

                    return response.status === 204;
                },
                unsubscribe: async function (event) {
                    const subscription = await pushManager.getSubscription();
                    
                    if (!subscription)
                        throw new Error("Already unsubscribed from all events");

                    const response = await app.delete(`/subscriptions/${event}`, subscription);
                    
                    return response.status === 204;
                }
            };
        }
        
        async post (url, data) {
            return await this.request('POST', url, data);
        }
        
        async put (url, data) {
            return await this.request('PUT', url, data);
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