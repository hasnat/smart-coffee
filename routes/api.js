import express from "express";
import PushSubscription from '../models/push-subscription';
import CoffeeMaker from '../models/coffeemaker';
import bodyParser from 'body-parser';

import coffeeMakerRoutes from './api/coffeemakers';
import pushSubscriptionRoutes from './api/push-subscriptions';

const router = express.Router();

router.use(bodyParser.json({strict: true}));

/**
 * Middleware to always set the request hostname to the request body.
 * This will ease the class instance creation as you can pass req.body directly
 */
router.use((req, res, next) => {
    if (typeof req.body === "object" && req.body !== null)
        req.body.domain = req.host;
    
    next();
});

// Converts general objects to the actual class instances
router.use(async (req, res, next) => {
    if (PushSubscription.shouldCast(req.body)) {
        req.body = await PushSubscription.findOrNew(req.body);
    } else if (CoffeeMaker.shouldCast(req.body)) {
        req.body = await CoffeeMaker.findOrNew(req.body);
    }

    return next();
});

router.use('/coffeemakers', coffeeMakerRoutes);
router.use('/push-subscriptions', pushSubscriptionRoutes);

export default router;