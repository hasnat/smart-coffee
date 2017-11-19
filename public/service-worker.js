self.addEventListener("push", async (e) => {
    var data = e.data.json();

    await self.registration.showNotification(data.title, data);
});
