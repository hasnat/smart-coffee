import express from "express";
import CoffeeMaker from '../../models/coffeemaker';

const router = express.Router();

/**
 * Middleware to create a CoffeeMaker instance into the request when request body is available
 */
router.use(async (req, res, next) => {

    // Set CoffeeMaker instance to the request
    req.coffeeMaker = new CoffeeMaker(req.body);

    // Always set/override domain from the request headers
    req.coffeeMaker.set({domain: req.host});

    return next();
});

router.put('/', async (req, res, next) => {
    /** @type {CoffeeMaker} */
    const oldCoffeeMaker = res.locals.coffeeMaker;

    /** @type {CoffeeMaker} */
    const newCoffeeMaker = req.coffeeMaker;
    
    if (oldCoffeeMaker.domain !== newCoffeeMaker.domain) {
        // 409 Concflict, as replacing the object would change the primary key (not allowed)
        res.status(409);
        return next();
    }

    if (!oldCoffeeMaker.isNew())
        await oldCoffeeMaker.destroy();
    
    await newCoffeeMaker.save();

    res.status(204);
    res.end();
});

export default router;
