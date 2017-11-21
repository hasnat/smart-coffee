import express from 'express';
import logger from "morgan";
import CoffeeMaker from './models/coffeemaker';
import routes from './routes';
import ejs from 'ejs';
import r from './r';

const app = express();

// view engine setup
app.set('views', './views');
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

app.use(logger('dev'));

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

export default app;
