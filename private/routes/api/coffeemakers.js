module.exports = (async () => {
  const router = require('express').Router();
  const CoffeeMaker = await require('../../coffeemaker');

  router.post('/', async (req, res) => {
    let result = {};
    
    const domain = req.headers.host.split(':')[0];
    let coffeeMaker = Object.assign(new CoffeeMaker({domain}), req.body);
    
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
