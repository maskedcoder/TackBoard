var models  = require('../models');
var express = require('express');
var crypto = require('crypto');
var router = express.Router();

var respondTo = function (request, response, formats) {
    var format = request.accepts(Object.keys(formats));
    if (format)
        return formats[format]();
    response.status(406).send("Not Acceptable");
};

// getNonce helper function creates a nonce
// action -> string of format 'model/action'
//           for example, 'persons/create'
//           `model` is where the model's
//           router is mounted
//           Note that the action is the action
//           that a form is submitted _to_
//           as oppposed to the form's location
var getNonce = function (action) {
    action = action || '';
    var sha512 = crypto.createHash('sha512');
    return sha512.update(action+ +new Date()).digest('hex');
};

// setupNonce helper function creates and saves a nonce
// action -> string of format 'model/action'
//           for example, 'users/login'
//           `model` is where the model's
//           router is mounted
//           that a form is submitted _to_
//           as oppposed to the form's location
var setupNonce = function (request, action) {
    var nonceStore = request.session.nonce;

    if (!nonceStore)
        nonceStore = request.session.nonce = {};

    var nonce = getNonce(action);
    nonceStore[action] = nonce;

    return nonce;
};

// validateNonce middleware validates a nonce
var validateNonce = function (request, response, next) {
    var action = request.baseUrl.split('/')[1] + '/' + request.route.path.split('/')[1];
    var nonce = request.body.nonce;

    var nonceStore = request.session.nonce;
    
    if (!nonceStore) {
        // the user doesn't even have a session
        // definitely something is wrong
        return false;
    }

    var expectedNonce = nonceStore[action];

    if (expectedNonce && expectedNonce === nonce) {
        console.log("\nNONCE IS VALIDATED\n");
        
        // remove the nonce
        delete nonceStore[action];
        next();
    } else {
        console.log("\nINVALID NONCE\n");
        response.sendStatus(401);
    }
};

// restrictAccess middleware keeps users from being edited by others
var restrictAccess = function (request, response, next) {
    if (request.account && request.account.id == request.params.user_id) {
        next();
    } else {
        response.status(401).render('users/deny', {
                account: "hide",
                title: 'Access denied'
        });
    }
};

// nonRedundantAccess middleware keeps users from logging in multiple times
var nonRedundantAccess = function (request, response, next) {
    if (request.account) {
        respondTo(request, response, {
            'html': function () {
                response.redirect(302, '/users/dashboard');
            },
            'json': function () {
                response.status(409).send("Error: User already logged in.");
            }
        });
    } else {
        next();
    }
};

router.route('/login/')
    // GET the login page
    .get(nonRedundantAccess, function (req, res) {
        var nonce = setupNonce(req, 'users/login');
        res.render('users/login', {
            account: "hide",
            title: 'Login',
            nonce: nonce
        });
    })
    // POST the login info
    .post(nonRedundantAccess, validateNonce, function (req, res) {
        var login = req.body;
        models.User.find({
            where: { name: login.name }
        }).then(function (user) {
            if (user.password === login.password) {
                res.cookie('user', user.uid, { httpOnly: true })
                    .status(200)
                    .set('url', '/')
                    .set('Refresh', '0')
                    .send("Successful login");
            } else {
                res.sendStatus(401);
            }
        });
    })
    // PUT the new user
    .put(function (req, res) {
        var newUser = req.body;

        // Generates a unique id by hashing the time
        var sha512 = crypto.createHash('sha512');
        sha512.update(''+ +new Date());

        models.User.create({
            name: newUser.name,
            password: newUser.password,
            uid: sha512.digest('hex')
        }).then(function (user) {
            res.cookie('user', user.uid, { httpOnly: true })
                .status(200)
                .set('url', '/') // This way of redirecting causes the browser to infinitely cycle reload and non-reload: no redirection
                .set('Refresh', '0')
                .send("Successful login");
        });
    })
    // PATCH the web page with a login form
    .patch(nonRedundantAccess, function (req, res) {
        res.render('users/_login_form', {nonce: setupNonce(req, 'users/login')});
    });

router.route('/signup/')
    // GET the signup page
    .get(nonRedundantAccess, function (req, res) {
        var nonce = setupNonce(req, 'users/');
        res.render('users/new', {
            account: 'hide',
            title: 'Sign Up',
            user: models.User.build({}),
            nonce: nonce
        });
    })
    // PATCH the web page with a signup form
    .patch(nonRedundantAccess, function (req, res) {
        res.render('users/_form', {nonce: setupNonce(req, 'users/')});
    });

router.route('/logout/')
    // GET logout action
    .get(function (req, res) {
        res.clearCookie('user', { httpOnly: true })
            .render('users/logout', {
                account: "hide",
                title: 'Logout'
        });
    });

router.route('/dashboard/')
    // GET logged in user's dashboard
    .get(function (req, res) {
        if (req.account) {
            var nonce = setupNonce(req, 'users/:user_id');
            res.render('users/dashboard', {
                account: "hide",
                title: 'My Account Dashboard',
                user: req.account,
                nonce: nonce
            });
        } else {
            res.redirect(302, '/users/login');
        }
    });

router.route('/')
    // GET index action
    .get(function (req, res) {
        models.User.findAll({
            include: models.Post,
            attributes: ['name', 'id']
        }).then(function (users) {
            respondTo(req, res, {
                'html': function () {
                    res.render('users/index', {
                        account: req.account,
                        title: 'All users',
                        users: users
                    });
                },
                'json': function () {
                    res.json(users);
                }
            });
        });
    })
    // POST new user action
    .post(nonRedundantAccess, validateNonce, function (req, res) {
        var newUser = req.body;
        if (!newUser.name || !newUser.password) {
            res.status(400).send("Invalid - missing name and/or password");
            return false;
        }

        // Generates a unique id by hashing the time
        var sha512 = crypto.createHash('sha512');
        sha512.update(''+ +new Date());

        models.User.create({
            name: newUser.name,
            password: newUser.password,
            uid: sha512.digest('hex')
        }).then(function (user) {
            res.cookie('user', user.uid, { httpOnly: true });
            respondTo(req, res, {
                'html': function () {
                    res.redirect(201, '/users/' + user.id);
                },
                'json': function () {
                    res.status(201).json(user);
                }
            });
        }, function (error) {
            console.log(error);
            res.status(400).send("Invalid name and/or password");
        });
    });

/* GET a form to edit the user */
router.get('/:user_id/edit', restrictAccess, function (req, res) {
    var nonce = setupNonce(req, 'users/:user_id');
    models.User.find({
        where: { id: req.params.user_id }
    }).then(function (user) {
        res.render('users/edit', {
          account: req.account,
          title: 'Editing '+user.name,
          user: user,
          nonce: nonce
        });
    });
});

router.route('/:user_id/')
    // GET the user
    .get(function (req, res, next) {
        if (req.params.user_id == req.account.id && req.accepts(['html', 'json']) == 'html') {
            res.redirect(303, '/users/dashboard');
            return;
        }
        models.User.find({
            where: { id: req.params.user_id },
            attributes: ['id', 'name']
        }).then(function (user) {
            respondTo(req, res, {
                'html': function () {
                    res.render('users/show', {
                        account: req.account,
                        title: user.name,
                        user: user
                    });
                },
                'json': function () {
                    res.json(user);
                }
            });
        });
    })
    // DELETE the user
    .delete(restrictAccess, validateNonce, function (req, res) {
        models.User.find({
            where: { id: req.params.user_id }
        }).then(function (user) {
            user.destroy().then(function () {
                res.clearCookie('user', { httpOnly: true })
                    .sendStatus(204);
            });
        });
    })
    // PUT an update on the user
    .put(restrictAccess, validateNonce, function (req, res) {
        var updatedUser = req.body;
        if (!updatedUser.name || !updatedUser.password) {
            res.status(400).send("Invalid - missing name and/or password");
            return false;
        }
        models.User.find({
            where: { id: req.params.user_id }
        }).then(function (user) {
            user.update({
                name: updatedUser.name,
                password: updatedUser.password
            }).then(function (update) {
                res.status(201).json(update);
            });
        });
    });


module.exports = router;
