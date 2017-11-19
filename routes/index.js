import CoffeeMaker from '../models/coffeemaker';
import express from "express";

const router = express.Router();

/* GET home page. */
router.get('/', async (req, res) => {

    const coffeeMaker = await CoffeeMaker.find(req.host) || new CoffeeMaker({domain: req.host});

    res.render('index', {
        title: coffeeMaker.domain,
        applicationServerKey: process.env.VAPID_PUBLIC_KEY,
        showConfig: req.query.config || coffeeMaker.isNew(),
        coffeeMaker: coffeeMaker
    });
});

export default router;