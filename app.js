import express from 'express';
import CoffeeMaker from './models/coffeemaker';
import routes from './routes';
import ejs from 'ejs';
import r from './r';
import models from './models';

const app = express();

// view engine setup
app.set('views', './views');
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

app.use('/', routes);

/// catch 404 and forwarding to error handler
app.use((req, res, next) => {
    var err = new Error('Not Found');
    err['status'] = 404;
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

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    debugger;
    // application specific logging, throwing an error, or other logic here
});

app.set('port', process.env.PORT || 3000);

models.then(() => {
    
    var server = app.listen(app.get('port'), function() {
        console.debug('Express server listening on port ' + server.address().port);
    });

});

export default app;
