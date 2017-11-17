module.exports = (async () => {
  const router = require('express').Router();
  const PushSubscription = await require('../../push-subscription');
  const Notification = await require('../../notification');
  
  // middleware to make sure we have a PushSubscription to deal with
  router.use((req, res, next) => {
    if (req.body instanceof PushSubscription)
      return next();
    
    const error = new Error("Bad Request");
    error.status = 400;
    next(error);
  });
  
  /**
   * Delete the whole subscription
   */
  router.delete('/', async (req, res) => {
    /** @type {PushSubscription} */
    const sub = req.body;

    if (await sub.exists()) {
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

    // Reload notification event types from db (if available)
    await sub.reload();
    
    if (await sub.exists()) {
      res.status(409); // 409 Conflict
      res.json(sub);
    } else {
      await sub.save();
      res.status(204); // 204 No Content
    }
    res.end();
  });
  
  router.put('/:event', async (req, res) => {
    /** @type {PushSubscription} */
    const sub = req.body;

    // reload notification event types from db
    await sub.reload();

    // toggle the requested event on
    sub.on(req.params.event);

    // save to the db
    await sub.save();

    // 204 No content. No need to echo the state to the client
    res.status(204);
    res.end();
  });
    
  router.delete('/:event', async (req, res) => {
    /** @type {PushSubscription} */
    const sub = req.body;

    // reload notification event types from db
    await sub.reload();

    // reload notification event types from db
    if (!await sub.exists())
      throw new Error('Subscription not found');

    // toggle the requested event off
    sub.off(req.params.event);

    if (sub.events.length === 0) {
      await sub.delete();
    } else {
      await sub.save();
    }

    // 204 No content. No need to echo the state to the client (I hope so)
    res.status(204);
    res.end();
  });

  return router;

})();
