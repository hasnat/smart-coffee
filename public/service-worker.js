self.addEventListener("push", event => {
    event.waitUntil((async () => {
        const data = event.data.json();

        // set the tag if none provided – this makes sure the browser will group (or replace) the notifications, if there's multiple
        if (!data.tag)
            data.tag = 'default';
        
        // show the notification
        await self.registration.showNotification(data.title, data);

        const notifications = await self.registration.getNotifications();
        setTimeout(() => {
            for (const n of notifications) {
                n.close();
            }
        }, 10000);
    })());
});

self.addEventListener("notificationclick", e => {
    e.notification.close();
});
