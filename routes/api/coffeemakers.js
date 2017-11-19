import express from "express";
import CoffeeMaker from '../../models/coffeemaker';

const router = express.Router();

router.post('/', async (req, res) => {
    /** @type {CoffeeMaker} */
    let coffeeMaker = req.body;
    
    const isNew = coffeeMaker.isNew();

    await coffeeMaker.save();

    res.status(204);
    res.end();
});

export default router;
