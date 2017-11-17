module.exports = (async () => {
    const express = require('express');
    const path = require('path');
    const favicon = require('static-favicon');
    const logger = require('morgan');
    const cookieParser = require('cookie-parser');
    const CoffeeMaker = await require('./coffeemaker');

    const app = express();
    
    app.set('db', await require('./db'));

    CoffeeMaker.startListening();

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.engine('html', require('ejs').renderFile);
    app.set('view engine', 'html');

    app.use(favicon());
    app.use(logger('dev'));
    app.use(cookieParser());

    app.use(express.static(path.join(__dirname, '..', 'public')));
    app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));

    app.use('/', await require('./routes/index'));
    app.use('/api/', await require('./routes/api'));

    /// catch 404 and forwarding to error handler
    app.use((req, res, next) => {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    /// error handlers

    // development error handler
    // will print stacktrace
    if (app.get('env') === 'development') {
        app.use((err, req, res, next) => {
            res.status(err.status || 500);
            res.render('error', {
                message: err.message,
                error: err,
                title: "Error occured"
            });
        });
    }

    // production error handler
    // no stacktraces leaked to user
    app.use((err, req, res, next) => {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: {},
            title: "Ooops..."
        });
    });

    return app;

})();
