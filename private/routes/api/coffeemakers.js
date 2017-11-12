module.exports = (async () => {
  const router = require('express').Router();
  const CoffeeMaker = await require('../../coffeemaker');
  const bodyParser = require('body-parser');

  router.use(bodyParser.json({
    reviver: (k, v) => (k ? v : Object.assign(new CoffeeMaker, v))
  }));

  router.post('/', async (req, res) => {
    let result = {};
    
    let coffeeMaker = req.body;
    coffeeMaker.domain = req.headers.host.split(':')[0];

    const found = await coffeeMaker.exists();

    if (await coffeeMaker.save()) {
      result.message = !found ? "Created!" : "Updated!";
    } else {
      result.message = "Failed to save";
    }

    res.json(result);
  });

  return router;

})();
