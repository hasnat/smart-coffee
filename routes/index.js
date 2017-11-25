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

/* The main index page. */
router.get('/', async (req, res) => {
    /** @type {CoffeeMaker} */
    const coffeeMaker = res.locals.coffeeMaker;

    if (coffeeMaker.isNew()) {
        // 303 See Other
        res.redirect(303, '/config');
        return;
    }

    res.render('index', {
        title: coffeeMaker.domain,
        coffeeMaker: coffeeMaker
    });
});

/* The config page. */
router.get('/config', async (req, res) => {
    /** @type {CoffeeMaker} */
    const coffeeMaker = res.locals.coffeeMaker;

    res.render('config', {
        title: `Asetukset – ${coffeeMaker.domain}`,
        coffeeMaker: coffeeMaker
    });
});

export default router;