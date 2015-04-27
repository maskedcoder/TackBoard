var models  = require('../models');
var express = require('express');
var crypto = require('crypto');
var router = express.Router();

var utils = require('./utils');

// restrictAccess middleware keeps users from being edited by others
var restrictAccess = function (request, response, next) {
    if (request.account && request.account.id == request.params.user_id) {
        next();
    } else {
        response.status(401).render('notifications/error', {
                account: "hide",
                title: 'Access denied',
                text: 'You cannot make changes to this user.'
        });
    }
};

// nonRedundantAccess middleware keeps users from logging in multiple times
var nonRedundantAccess = function (request, response, next) {
    if (request.account) {
        utils.respondTo(request, response, {
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

/**
 * Users API
 *
 * The Users route deals with User objects. Actions include logging in, logging out, signing up (creating a new account), editing accounts, deleting accounts, and updating accounts.
 *
 * The API is as follows:
 *
 * GET /users/                   View a listing of all users
 * GET /users/user_id            View a user's account. If the account is the logged in user, redirect to /users/dashboard.
 * GET /users/dashboard/         View the logged in user's account. Links to /users/user_id/edit and /uses/user_id/destroy to change or delete the account.
 * GET /users/user_id/edit/      View a form to edit the user. If the user_id does not match the logged in user's id, or if the browser is not logged in, redirect to an Unauthorized page.
 * GET /users/user_id/delete/    View a form to delete the user (basically a confirmation page). If the user_id does not match the logged in user's id, or if the browser is not logged in, redirect to an Unauthorized page.
 * GET /users/login/             View a login form. If the user is already logged in, redirect to dashboard.
 * GET /users/signup/            View a signup form. If the user is already logged in, redirect to dashboard.
 * GET /users/logout/            View a logout form (essentially a confirmation page)
 *
 * POST /users/                  Create a new user, and logs in as that user. This is the AJAX target of the /users/signup/ form.
 * PUT /users/user_id            Make a change to a user's account. This is the target of /users/user_id/edit/. If the user_id does not match the logged in user's id, or if the browser is not logged in, stop and send an error.
 * DELETE /users/user_id         Delete a user's account and logs out. This is the target of the /users/user_id/delete/ form. If the user_id does not match the logged in user's id, or if the browser is not logged in, stop and send an error.
 * POST /users/login/            Log the user in. This is the target of the /users/login/ form. Redirect to a main page.
 * POST /users/logout/           Log the user out. This is the target of the /users/logout/ form. The page will inform the user that they are logged out and then redirect to the main page.
 *
 * Because PUT and DELETE verbs cannot be done without javascript, two more routes are provided:
 *
 * POST /users/user_id/delete/    Synonym for DELETE /users/user_id
 * POST /users/user_id/edit/    Synonym for PUT /users/user_id
 */

/**
 * Users Controller
 *
 * This object provides the actions for the routes.
 */
var UsersController = {

    /**
     * Find user (middleware)
     *
     * Finds a user by user ID. If no user is found, respond with a 404.
     *
     * @param {Object}  req        The request object
     * @param {Object}  res        The response object
     * @param {Function}  next     The next middleware
     * @param {String}  user_id    The id of the user to get
     */
    findUser: function (req, res, next, user_id) {
        models.User.find({
            where: { id: user_id },
            attributes: ['id', 'name']
        }).then(function (user) {
            if (user) {
                // User found
                req.user = user;
                next();
            } else {
                // User not found
                res.status(404);
                utils.respondTo(req, res, {
                    'html': function () {
                        res.render('notifications/error', {
                            account: 'hide',
                            title: "User not found",
                            text: "Unable to find user #"+user_id,
                        });
                    },
                    'json': function () {
                        res.json({
                            'type': 'error',
                            'text': 'Invalid - User does not exist'
                        });
                    }
                });
            }
        });
    },

    /**
     * Index action
     *
     * Fetches a listing of all users. Corresponds to GET /users/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
    index: function (req, res) {
        models.User.findAll({
            include: models.Post,
            attributes: ['name', 'id']
        }).then(function (users) {
            utils.respondTo(req, res, {
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
    },

    /**
     * Show action
     *
     * Show an individual user's account. Corresponds to GET /users/user_id
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     showUser: function (req, res) {
        if (req.user.id == req.account.id && req.accepts(['html', 'json']) == 'html') {
            res.redirect(303, '/users/dashboard');
            return;
        }
        utils.respondTo(req, res, {
            'html': function () {
                res.render('users/show', {
                    account: req.account,
                    title: req.user.name,
                    user: req.user
                });
            },
            'json': function () {
                res.json(req.user);
            }
        });
    },

    /**
     * Dashboard action
     *
     * Show the logged in user's dashboard. Corresponds to GET /users/dashboard
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     dashboard: function (req, res) {
        if (req.account) {
            res.render('users/dashboard', {
                account: "hide",
                title: 'My Account Dashboard',
                user: req.account
            });
        } else {
            res.redirect(302, '/users/login');
        }
    },

    /**
     * Edit Form action
     *
     * Show a form to edit a user. Corresponds to GET /users/user_id/edit/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     editForm: function (req, res) {
        var nonce = utils.setupNonce(req, 'users/:user_id');
        res.render('users/edit', {
            account: req.account,
            title: 'Editing '+req.user.name,
            user: req.user,
            nonce: nonce
        });
    },

    /**
     * Delete Form action
     *
     * Show a form to delete a user. Corresponds to GET /users/user_id/delete/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     deleteForm: function (req, res) {
        var nonce = utils.setupNonce(req, 'users/:user_id');
        res.render('users/delete', {
            account: 'hide',
            title: 'Confirm Delete',
            user: req.user,
            nonce: nonce
        });
    },

    /**
     * Login Form action
     *
     * Show a form to login. Corresponds to GET /users/login/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     loginForm: function (req, res) {
        var nonce = utils.setupNonce(req, 'users/login');
        res.render('users/login', {
            account: "hide",
            title: 'Login',
            nonce: nonce
        });
    },

    /**
     * Signup Form action
     *
     * Show a form to sign up (create a new user). Corresponds to GET /users/signup/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     signupForm: function (req, res) {
        var nonce = utils.setupNonce(req, 'users/');
        res.render('users/new', {
            account: 'hide',
            title: 'Sign Up',
            user: models.User.build({}),
            nonce: nonce
        });
    },

    /**
     * Logout Form action
     *
     * Show a form to log out. Corresponds to GET /users/logout/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     logoutForm: function (req, res) {
        var nonce = utils.setupNonce(req, 'users/logout');
        res.render('users/logout', {
            account: 'hide',
            title: 'Confirm Logout',
            user: req.account, // Since we aren't using the account that was fetched in the header, why not use it here and skip another call to the database?
            nonce: nonce
        });
    },

    /**
     * Create User action
     *
     * Create a new user, and logs in as that user. Corresponds to POST /users/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     createUser: function (req, res) {
        var newUser = req.body;
        if (!newUser.name || !newUser.password) {
            res.status(400);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/error', {
                        account: 'hide',
                        title: 'Error creating user',
                        text: 'Invalid - missing name and/or password'
                    });
                },
                'json': function () {
                    response.json({
                        'type': 'error',
                        'text': 'Invalid - missing name and/or password'
                    });
                }
            });
            return false;
        }

        // Generates a unique id by hashing the time
        var sha512 = crypto.createHash('sha512');
        sha512.update(''+ +new Date());

        password = newUser.password;

        // If the user is not using javascript, the password cannot be encoded client-side
        // So we have to encode it server-side
        if (newUser.nojs) {
            password = crypto.createHash('sha512')
                             .update(password)
                             .digest('hex');
        }

        models.User.create({
            name: newUser.name,
            password: password,
            uid: sha512.digest('hex')
        }).then(function (user) {
            res.cookie('user', user.uid, { httpOnly: true })
                .status(201)
                .set('Location', '/users/' + user.id);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/information', {
                        account: 'hide',
                        title: 'User created',
                        text: 'The user was successfully created.',
                        link: '/users/' + user.id
                    });
                },
                'json': function () {
                    // Can't just send json(user), because it exposes sensitive information
                    res.status(201).json({
                        name: user.name,
                        id: user.id
                    });
                }
            });
        }, function (error) {
            res.status(400);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/error', {
                        account: 'hide',
                        title: 'Error creating user',
                        text: 'Invalid name and/or password'
                    });
                },
                'json': function () {
                    response.json({
                        'type': 'error',
                        'text': 'Invalid name and/or password'
                    });
                }
            });
        });
    },

    /**
     * Update User action
     *
     * Updates a user. Corresponds to PUT /users/user_id/ and POST /users/user_id/edit
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     updateUser: function (req, res) {
        var updatedUser = req.body;
        if (!updatedUser.name || !updatedUser.password) {
            res.status(400);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/error', {
                        account: 'hide',
                        title: 'Error updating user',
                        text: 'Invalid - missing name and/or password'
                    });
                },
                'json': function () {
                    response.json({
                        'type': 'error',
                        'text': 'Invalid - missing name and/or password'
                    });
                }
            });
            return false;
        }

        password = updatedUser.password;

        // If the browser is not using javascript, the password cannot be encoded client-side
        // So we have to encode it server-side
        if (updatedUser.nojs) {
            password = crypto.createHash('sha512')
                                .update(password)
                                .digest('hex');
        }

        req.user.update({
            name: updatedUser.name,
            password: password
        }).then(function (update) {
            res.status(201)
                .set('Location', '/users/' + update.id);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/information', {
                        account: 'hide',
                        title: 'User updated',
                        text: 'The user was successfully updated.',
                        link: '/users/' + update.id
                    });
                },
                'json': function () {
                    // Can't just send json(update), because it exposes sensitive information
                    res.status(201).json({
                        name: update.name,
                        id: update.id
                    });
                }
            });
        }, function (error) {
            res.status(400);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/error', {
                        account: 'hide',
                        title: 'Error updating user',
                        text: 'Invalid name and/or password'
                    });
                },
                'json': function () {
                    response.json({
                        'type': 'error',
                        'text': 'Invalid name and/or password'
                    });
                }
            });
        });
    },

    /**
     * Delete User action
     *
     * Deletes a user and logs out. Corresponds to DELETE /users/user_id/ and POST /users/user_id/delete
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     deleteUser: function (req, res) {
        req.user.destroy().then(function () {
            res.clearCookie('user', { httpOnly: true }) // Log out
                .status(200);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/information', {
                        account: 'hide',
                        title: 'User deleted',
                        text: 'The user was successfully deleted.'
                    });
                },
                'json': function () {
                    res.json({
                        type: 'info',
                        text: 'The user was successfully deleted.'
                    });
                }
            });
        });
    },

    /**
     * Login action
     *
     * Logs a user in. Corresponds to POST /users/login/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     loginUser: function (req, res) {
        var login = req.body;

        if (!login.name || !login.password) {
            res.status(401);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/error', {
                        account: 'hide',
                        title: 'Error logging in',
                        text: 'Invalid - please provide both a name and a password'
                    });
                },
                'json': function () {
                    response.json({
                        'type': 'error',
                        'text': 'Invalid - missing name and/or password'
                    });
                }
            });
            return false;
        }

        models.User.find({
            where: { name: login.name }
        }).then(function (user) {

            password = login.password;
            // If the browser is not using javascript, the password cannot be encoded client-side
            // So we have to encode it server-side
            if (login.nojs) {
                password = crypto.createHash('sha512')
                                    .update(password)
                                    .digest('hex');
            }

            if (user && user.password === password) {
                res.cookie('user', user.uid, { httpOnly: true })
                    .status(200)
                    .set('url', '/')
                    .set('Refresh', '0')
                    .send("Successful login");
            } else {
                res.status(401);
                utils.respondTo(req, res, {
                    'html': function () {
                        res.render('notifications/error', {
                            account: 'hide',
                            title: 'Error logging in',
                            text: 'Invalid - incorrect name and/or password'
                        });
                    },
                    'json': function () {
                        response.json({
                            'type': 'error',
                            'text': 'Invalid - incorrect name and/or password'
                        });
                    }
                });
            }
        });
    },

    /**
     * Log Out action
     *
     * Logs a user out. Corresponds to POST /users/logout/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     logoutUser: function (req, res) {
        res.clearCookie('user', { httpOnly: true })
            .render('notifications/information', {
                account: "hide",
                title: 'Logout',
                text: 'Logged out successfully.'
        });
    }
};

// Load user when an id is given
router.param('user_id', UsersController.findUser);

router.route('/login/')
    // GET the login page
    .get(nonRedundantAccess, UsersController.loginForm)
    // POST the login info
    .post(nonRedundantAccess, utils.validateNonce, UsersController.loginUser)
    // PATCH the web page with a login form
    .patch(nonRedundantAccess, function (req, res) {
        res.render('users/_login_form', {nonce: utils.setupNonce(req, 'users/login')});
    });

router.route('/signup/')
    // GET the signup page
    .get(nonRedundantAccess, UsersController.signupForm)
    // PATCH the web page with a signup form
    .patch(nonRedundantAccess, function (req, res) {
        res.render('users/_form', {nonce: utils.setupNonce(req, 'users/')});
    });

router.route('/logout/')
    // GET logout form action
    .get(UsersController.logoutForm)
    // POST logout action
    .post(utils.validateNonce, UsersController.logoutUser);

router.route('/dashboard/')
    // GET logged in user's dashboard
    .get(UsersController.dashboard);

router.route('/')
    // GET index action
    .get(UsersController.index)
    // POST new user action
    .post(nonRedundantAccess, utils.validateNonce, UsersController.createUser);

router.route('/:user_id/edit')
    // GET edit form action
    .get(restrictAccess, UsersController.editForm)
    // POST an update on the user
    .post(restrictAccess, utils.validateNonce, UsersController.updateUser);

router.route('/:user_id/delete')
    // GET delete form action
    .get(restrictAccess, UsersController.deleteForm)
    // POST delete user action
    .post(restrictAccess, utils.validateNonce, UsersController.deleteUser);

router.route('/:user_id/')
    // GET the user
    .get(UsersController.showUser)
    // DELETE the user
    .delete(restrictAccess, utils.validateNonce, UsersController.deleteUser)
    // PUT an update on the user
    .put(restrictAccess, utils.validateNonce, UsersController.updateUser);


module.exports = router;
