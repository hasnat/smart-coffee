import express from "express";
import PushSubscription from '../models/push-subscription';
import CoffeeMaker from '../models/coffeemaker';
import bodyParser from 'body-parser';
import base64url from 'urlsafe-base64';

import coffeeMakerRoutes from './api/coffeemakers';
import pushSubscriptionRoutes from './api/push-subscriptions';

const router = express.Router();

const applicationServerKey = base64url.decode(process.env.VAPID_PUBLIC_KEY);
router.get('/vapid.pub', (req, res) => {
    res.send(applicationServerKey);
    res.end();
});

router.use(bodyParser.json({strict: true, limit: 1024}));

router.use('/coffeemakers', coffeeMakerRoutes);
router.use('/push-subscriptions', pushSubscriptionRoutes);

export default router;