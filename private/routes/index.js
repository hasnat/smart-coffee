module.exports = (async () => {
  const CoffeeMaker = await require('../coffeemaker');
  const {r, db} = await require('../db');

  const router = require('express').Router();

  /* GET home page. */
  router.get('/', async (req, res) => {

    const domain = req.headers.host.split(':')[0];

    const coffeeMaker =  await CoffeeMaker.find(domain) || Object.assign(new CoffeeMaker, {domain: domain});

    res.render('index', {
      title: domain,
      applicationServerKey: process.env.VAPID_PUBLIC_KEY,
      showConfig: req.query.config || !await coffeeMaker.exists(),
      coffeeMaker: coffeeMaker
    });
  });

  return router;

})();
