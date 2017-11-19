import express from "express";
import bodyParser from "body-parser";
import PushSubscription from '../../models/push-subscription';
import Notification from '../../models/notification';

const router = express.Router();

// middleware to make sure we have a PushSubscription to deal with
router.use((req, res, next) => {
    if (req.body instanceof PushSubscription)
        return next();
    
    const error = new Error("Bad Request");
    error['status'] = 400;
    next(error);
});

/**
 * Delete the whole subscription
 */
router.delete('/', async (req, res) => {
    /** @type {PushSubscription} */
    const sub = req.body;
    
    if (!sub.isNew()) {
        await sub.destroy();

        res.status(204); // 204 No Content
        res.end();
    } else {
        res.status(404); // 404 Not Found
    }
});

/**
 * Post a new PushSubscription to the db
 * This is also used for status query, however,
 * we return 409 Conflict to comply with
 * REST principles ( :D )
 */
router.post('/', async (req, res) => {
    /** @type {PushSubscription} */
    const sub = req.body;
    
    if (sub.isNew()) {
        await sub.save();
        res.status(204); // 204 No Content
    } else {
        res.status(409); // 409 Conflict
        res.json(sub);
    }
    res.end();
});

router.put('/:event', async (req, res) => {
    /** @type {PushSubscription} */
    const sub = req.body;

    // toggle the requested event on
    sub.subscribe(req.params.event);

    // save to the db
    await sub.save();

    // 204 No content. No need to echo the state to the client
    res.status(204);
    res.end();
});
    
router.delete('/:event', async (req, res) => {
    /** @type {PushSubscription} */
    const sub = req.body;

    if (sub.isNew()) {
        res.status(404); // 404 Not Found
        res.end();
        return;
    }

    // toggle the requested event off
    sub.unsubscribe(req.params.event);

    if (sub.events.length === 0) {
        await sub.destroy();
    } else {
        await sub.save();
    }

    // 204 No content. No need to echo the state to the client (I hope so)
    res.status(204);
    res.end();
});

export default router;
