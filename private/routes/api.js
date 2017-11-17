module.exports = (async () => {

  const router = require('express').Router();
  const PushSubscription = await require('../push-subscription');
  const CoffeeMaker = await require('../coffeemaker');
  const bodyParser = require('body-parser');
  
  router.use(bodyParser.json({strict: true}));

  /**
   * Middleware to always set the request hostname to the request body.
   * This will ease the class instance creation as you can pass req.body directly
   */
  router.use((req, res, next) => {
    req.body.domain = req.host;
    next();
  });

  // Converts general objects to the actual class instances
  router.use((req, res, next) => {
    if (PushSubscription.shouldCast(req.body)) {
      req.body = new PushSubscription(req.body);
    } else if (CoffeeMaker.shouldCast(req.body)) {
      req.body = new CoffeeMaker(req.body);
    }

    return next();
  });

  router.use('/coffeemakers', await require('./api/coffeemakers'));
  router.use('/subscriptions', await require('./api/subscriptions'));

  return router;
})();