module.exports = (async () => {

  const router = require('express').Router();
  const bodyParser = require('body-parser');

  router.use(bodyParser.json());

  router.use('/coffeemakers', await require('./api/coffeemakers'));
  router.use('/subscriptions', await require('./api/subscriptions'));

  return router;
})();