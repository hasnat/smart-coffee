module.exports = (async () => {
  const CoffeeMaker = await require('../coffeemaker');
  const {r, db} = await require('../db');

  const router = require('express').Router();

  /* GET home page. */
  router.get('/', async (req, res) => {

    const coffeeMaker =  new CoffeeMaker({domain: req.host});
    coffeeMaker.reload();

    res.render('index', {
      title: coffeeMaker.domain,
      applicationServerKey: process.env.VAPID_PUBLIC_KEY,
      showConfig: req.query.config || !await coffeeMaker.exists(),
      coffeeMaker: coffeeMaker
    });
  });

  return router;

})();
