import express from "express";
import PushSubscription from '../../models/push-subscription';
import Notification from '../../models/notification';

const router = express.Router();

/**
 * Middleware to create a PushSubscription instance into the request when request body is available
 */
router.use(async (req, res, next) => {
    // Skip request body related logic when possible
    if (['POST', 'PUT'].indexOf(req.method) === -1)
        return next();
    
    // Set PushSubscription instance to the request
    req.pushSubscription = await PushSubscription.findOrNew(req.body);
    
    // Always set/override domain from the request headers
    req.pushSubscription.set({domain: req.host});
    
    return next();
});

/**
 * Use the route :id parameter to create a PushSubscription instance to response.locals
 */
router.param('id', async function(req, res, next, id) {
    const sub = await PushSubscription.get(id);
    
    if (sub) {
        // Set PushSubscription instance to the request
        res.locals.pushSubscription = sub;
        return next();
    }

    // If id was provided but the record was not found, reply with 404
    res.status(404);
    res.end();
});

/**
 * Post a new PushSubscription to the db
 * This is also used for status query, however,
 * we return 303 See Other to (kinda) comply with
 * REST principles
 */
router.post('/', async (req, res) => {
    /** @type {PushSubscription} */
    const sub = req.pushSubscription;

    if (sub.isNew()) {
        await sub.save();
        res.status(201); // 201 Created
    } else {
        res.status(303); // 303 See other
    }

    // Using rawHeaders here to keep the Case
    res.location(`${req.originalUrl}/${sub.id}`);
    res.end();
});


/**
 * Routes for existing Push Subscriptions
 */
router.route('/:id')
    // Get the PushSubscription
    .get(async (req, res) => {
        res.json(res.locals.pushSubscription);
        res.end();
    })

    // Replace the whole subscription
    .put(async (req, res, next) => {
        /** @type {PushSubscription} */
        const oldSub = res.locals.pushSubscription;

        /** @type {PushSubscription} */
        const newSub = req.pushSubscription;

        if (oldSub.id !== newSub.id) {
            // 409 Concflict, as replacing the object would change the id
            res.status(409);
            return next();
        }

        await oldSub.destroy();
        await newSub.save();

        return next();
    })
    
    // Delete the whole subscription
    .delete(async (req, res, next) => {
        /** @type {PushSubscription} */
        const sub = res.locals.pushSubscription;
        
        await sub.destroy();

        return next();
    });


/**
 * Routes for the notification events of existing Push Subscriptions
 */
router.route('/:id/events/:event')
    // Subscribe to a notification event
    .put(async (req, res, next) => {
        /** @type {PushSubscription} */
        const sub = res.locals.pushSubscription;

        // Toggle the requested event on
        await sub.subscribe(req.params.event);
                
        return next();
    })
    
    // Unsubscribe from a notification event
    .delete(async (req, res, next) => {
        /** @type {PushSubscription} */
        const sub = res.locals.pushSubscription;

        // Toggle the requested event off
        await sub.unsubscribe(req.params.event);

        return next();
    });


router.use(function (req, res, next) {
    // Turn 200 OK without response body into 204 No Content
    if (!res.body && res.statusCode === 200)
        res.status(204);
    
    res.end();
});

export default router;
