"use strict";

import NotificationHandler from "./notification-handler.js";
import jsonApi from "../shared/json-api.js";

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

        // update the current power status
        this.updateStatus().then(() => {
            setInterval(async () => {
                await this.updateStatus();
            }, 30000);
        });

    }

    async updateStatus() {
        try {
            const response = await jsonApi.get('/api/coffeemakers');
            const json = await response.json();
            const html = document.documentElement;

            if (json.power) {
                html.classList.add('power-on');
            } else {
                html.classList.remove('power-on');
            }
        } catch (err) {
            console.error(err);
        }
    }
}

export default new App({
    serviceWorker: "./service-worker.js",
    eventCheckboxes: document.querySelectorAll('#notifications input'),
    appServerKeyLocation: "./api/vapid.pub"
});
