import express from "express";
import PushSubscription from '../models/push-subscription';
import CoffeeMaker from '../models/coffeemaker';
import bodyParser from 'body-parser';

import coffeeMakerRoutes from './api/coffeemakers';
import pushSubscriptionRoutes from './api/push-subscriptions';

const router = express.Router();

router.use(bodyParser.json({strict: true, limit: 1024}));

router.use('/coffeemakers', coffeeMakerRoutes);
router.use('/push-subscriptions', pushSubscriptionRoutes);

export default router;