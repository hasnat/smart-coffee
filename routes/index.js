import CoffeeMaker from '../models/coffeemaker';
import express from "express";
import apiRoutes from './api';

const router = express.Router();

/**
 * Middleware to initialize a domain-specific CoffeeMaker instance to the request
 */
router.use(async (req, res, next) => {
    // Set CoffeeMaker instance to the request
    res.locals.coffeeMaker = await CoffeeMaker.findOrNew({domain: req.host});
    
    return next();
});

router.use(express.static('./public'));
router.use('/shared', express.static('./shared'));
router.use('/api/', apiRoutes);


/* GET home page. */
router.get('/', async (req, res) => {
    /** @type {CoffeeMaker} */
    const coffeeMaker = res.locals.coffeeMaker;

    res.render('index', {
        title: coffeeMaker.domain,
        applicationServerKey: process.env.VAPID_PUBLIC_KEY,
        showConfig: req.query.config || coffeeMaker.isNew(),
        coffeeMaker: coffeeMaker
    });
});

export default router;