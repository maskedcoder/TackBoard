var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var FileStore = require('session-file-store')(session);

var routes = require('./routes/index');
var users = require('./routes/users');
var posts = require('./routes/posts');

var models  = require('./models');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// session middleware, for nonces
app.use(session({
    store: new FileStore(),
    secret: 'nasturtiums pondering monkeys'
}));

// fetches the user's account if logged in
//  store in req.account to differentiate
//  it from the variable 'user' used to
//  create or edit users.
app.use(function (req, res, next) {
    if (req.cookies["user"]) {
        models.User.find({
            where: { uid: req.cookies.user }
        }).then(function (user) {
            req.account = user;
            next();
        });
    } else {
        req.account = false;
        next();
    }
});
app.use('/', routes);
app.use('/users', users);
app.use('/posts', posts);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('home/error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('home/error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
