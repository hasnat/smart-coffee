const closeNotifications = async function () {
    for (const notification of await self.registration.getNotifications()) {
        notification.close();
    }
};

let closeTimeout;

self.addEventListener("push", async (e) => {
    var data = e.data.json();

    // close any existing notifications
    await closeNotifications();

    // reset the close timeout
    !closeTimeout || clearTimeout(closeTimeout);

    // show the notification
    await self.registration.showNotification(data.title, data);

    // set the close timeout
    closeTimeout = setTimeout(async () => {
        await closeNotifications();
    }, 5000);
});
