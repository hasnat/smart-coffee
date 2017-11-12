module.exports = (async () => {

  const router = require('express').Router();

  router.use('/coffeemakers', await require('./api/coffeemakers'));
  router.use('/subscriptions', await require('./api/subscriptions'));

  return router;
})();