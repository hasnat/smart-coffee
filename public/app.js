"use strict";

import NotificationHandler from "./notification-handler.js";

class App {
    constructor(options) {
        this.options = options || {};
        if (!this.serviceWorkersSupported())
            return this.error("Valitettavasti selaimesi ei tue Service Worker -tekniikkaa.");

        if (!NotificationHandler.supported())
            return this.error("Valitettavasti selaimesi ei tue ilmoituksia tai Web Push -tekniikkaa!");

        navigator.serviceWorker.register(options.serviceWorker)
            .then(registration => navigator.serviceWorker.ready)
            .then(registration => {
                /** @type {ServiceWorkerRegistration} */
                this.registration = registration;

                /** @type {NotificationHandler} */
                this.notifications = new NotificationHandler({
                    pushManager: registration.pushManager,
                    appServerKeyLocation: options.appServerKeyLocation
                });
            })
            .then(() => this.main());

    }

    error(message) {
        alert(message);
        
        return this;
    }

    serviceWorkersSupported() {
        return ('serviceWorker' in navigator);
    }

    async notificationSubscriptionChange(element) {
        if (!await NotificationHandler.allowed()) {
            this.error("Olet estänyt ilmoitukset!");
            return;
        }
        
        element.classList.add('waiting');

        if (element.checked) {
            await this.notifications.subscribe(element.value);
        } else {
            await this.notifications.unsubscribe(element.value);
        }
        
        element.classList.remove('waiting');
    }

    async main() {
        /** @type {HTMLInputElement[]} */
        const checkboxes = this.options.eventCheckboxes;
        
        await this.notifications.sync();
        
        for (const x of checkboxes) {
            // Set initial status
            x.checked = this.notifications.subscribed(x.value);

            // Hook event listener
            x.addEventListener('change', async () => this.notificationSubscriptionChange(x));
        }

    }
}

export default new App({
    serviceWorker: "./service-worker.js",
    eventCheckboxes: document.querySelectorAll('#notifications input'),
    appServerKeyLocation: "./api/vapid.pub"
});
