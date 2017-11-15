module.exports = (async () => {
  const router = require('express').Router();
  const Subscription = await require('../../subscription');
  const Notification = await require('../../notification');

  router.post('/', async (req, res) => {
    const domain = req.headers.host.split(':')[0];
    let subscription = Object.assign(await Subscription.find(req.body.id) || new Subscription(domain), req.body);

    if (!await subscription.exists()) {
      await subscription.save();

      const notification = new Notification({
        title: "Successfully subscribed",
        icon: "/images/notification.jpg",
        body: "You'll stay updated about the coffee status"
      });
      await notification.sendTo([subscription]);
    } else {
      await subscription.save();
    }

    res.json(subscription);
  });

  return router;

})();
