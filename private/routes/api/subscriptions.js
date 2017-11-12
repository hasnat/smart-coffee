module.exports = (async () => {
  const router = require('express').Router();
  const Subscription = await require('../../subscription');
  const Notification = await require('../../notification');
  const bodyParser = require('body-parser');

  router.use(bodyParser.json({
    reviver: (k, v) => (k ? v : Object.assign(new Subscription, v))
  }));

  router.post('/', async (req, res) => {
    const domain = req.headers.host.split(':')[0];
    let result = {};
    let subscription = req.body;

    if (!await subscription.exists()) {
      subscription.domain = domain;
      await subscription.save();
      await Object.assign(new Notification, {
        title: "Successfully subscribed",
        icon: "/images/notification.jpg",
        body: "You'll stay updated about the coffee status"
      }).sendTo([subscription]);
      result.message = "Subscribed";
    } else {
      result.message = "Already subscribed";
    }

    res.json(result);
  });

  router.delete('/', async (req, res) => {
    let result = {};
    let subscription = req.body;

    if (await subscription.exists()) {
      await subscription.delete();
      result.message = "Unsubscribed";
    } else {
      result.message = "Already unsubscribed";
    }
    
    res.json(result);
  });

  return router;

})();
