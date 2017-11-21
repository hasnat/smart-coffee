"use strict";

import NotificationHandler from "./notification-handler.js";

class App {
    constructor(options) {
        this.options = options || {};
        if (!this.serviceWorkersSupported())
            return this.error("Valitettavasti selaimesi ei tue Service Worker -tekniikkaa.");

        if (!NotificationHandler.supported())
            return this.error("Valitettavasti selaimesi ei tue ilmoituksia tai Web Push -tekniikkaa!");

        navigator.serviceWorker.register(options.serviceWorker).then(async (registration) => {
            await navigator.serviceWorker.ready;
            this.registration = registration;

            /** @type {NotificationHandler} */
            this.notifications = new NotificationHandler(registration.pushManager);
            return this.main();
        });

    }

    error(message) {
        alert(message);
        return this;
    }

    serviceWorkersSupported() {
        return ('serviceWorker' in navigator);
    }

    async propagateNotificationSubscription(element) {
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
        
        const checkboxes = this.options.eventCheckboxes;
        const app = this;
    
        // hook event listeners
        for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].addEventListener('change', function() { app.propagateNotificationSubscription(this); });
        }
    
        await this.notifications.sync();

        // update current status
        for (let i = 0; i < checkboxes.length; i++) {
            const x = checkboxes[i];
            x.checked = this.notifications.subscribed(x.value);
        }

    }
}

export default new App({
    serviceWorker: "./service-worker.js",
    eventCheckboxes: document.querySelectorAll('#notifications input')
});
