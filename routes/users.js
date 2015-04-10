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

router.route('/login/')
    // GET the login page
    .get(function (req, res) {
        res.render('users/login', {
            title: 'Login | TackBoard',
            user: req.user
        });
    })
    // POST the login info
    .post(function (req, res) {
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
    .patch(function (req, res) {
        res.render('users/_login_form', {});
    });

router.route('/logout/')
    // GET logout action
    .get(function (req, res) {
        res.clearCookie('user', { httpOnly: true })
            .render('users/logout', {
                title: 'Logout | TackBoard',
                user: req.user
        });
    });

router.route('/')
    // GET index action
    .get(function (req, res) {
        models.User.findAll({
            include: models.Post
        }).then(function (users) {
            respondTo(req, res, {
                'html': function () {
                    res.render('users/index', {
                        title: 'All users | TackBoard',
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
    .post(function (req, res) {
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

// GET form to create a user
router.get('/new', function (req, res) {
    res.render('users/new', {
        title: 'Creating new user | TackBoard',
        user: models.User.build({})
    });
});

/* GET a form to edit the user */
router.get('/:user_id/edit', function (req, res) {
    models.User.find({
        where: { id: req.params.user_id }
    }).then(function (user) {
        res.render('users/edit', {
          title: 'Editing '+user.name+' | TackBoard',
          user: user
        });
    });
});

router.route('/:user_id/')
    // GET the user
    .get(function (req, res, next) {
        models.User.find({
            where: { id: req.params.user_id }
        }).then(function (user) {
            respondTo(req, res, {
                'html': function () {
                    res.render('users/show', {
                        title: user.name + ' | TackBoard',
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
    .delete(function (req, res) {
        models.User.find({
            where: { id: req.params.user_id }
        }).then(function (user) {
            user.destroy().then(function () {
                res.sendStatus(204);
            });
        });
    })
    // PUT an update on the user
    .put(function (req, res) {
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
