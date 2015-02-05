var models  = require('../models');
var express = require('express');
var router = express.Router();

var respondTo = function (request, response, formats) {
    var format = request.accepts(Object.keys(formats));
    if (format === undefined)
        response.status(406).send("Not Acceptable");
    else
        formats[format]();
};

router.route('/')
// GET all posts
        .get(function (req, res) {
            models.Post.findAll({
                include: models.User
            }).then(function (posts) {
                respondTo(req, res, {
                    'html': function () {
                        res.render('posts/index', {
                            title: 'All posts | TackBoard',
                            posts: posts
                        });
                    },
                    'json': function () {
                        res.json(posts);
                    }
                });
            });
        })
// POST a new post
        .post(function (req, res) {
            var newPost = req.body;
            models.Post.create({
                UserId: newPost.UserId,
                title: newPost.title,
                description: newPost.description
            }).then(function (post) {
                console.log(JSON.stringify(post));
                console.log(JSON.stringify(newPost));
                respondTo(req, res, {
                    'html': function () {
                        res.redirect(201, '/posts/' + post.id);
                    },
                    'json': function () {
                        res.status(201).json(post);
                    }
                });
            });
        });

router.route('/new/')
        // GET a form to add a new post
        .get(function (req, res) {
            models.User.findAll().then(function (users) {
                res.render('posts/new', {
                    title: 'New post | Tackboard',
                    users: users,
                    post: models.Post.build({})
                });
            });
        })
        // PATCH the current page with the form in a snippet
        .patch(function (req, res) {
            models.User.findAll().then(function (users) {
                res.render('posts/_form', {
                    users: users,
                    post: models.Post.build({})
                });
            });
        });

router.route('/:post_id/')
        // GET a single post
        .get(function (req, res) {
            models.Post.find({
                where: { id: req.params.post_id },
                include: models.User
            }).then(function (post) {
                console.log(JSON.stringify(post));
                respondTo(req, res, {
                    'html': function () {
                        res.render('posts/show', {
                            title: 'View post | TackBoard',
                            post: post
                        });
                    },
                    'json': function () {
                        res.json(post);
                    }
                });
            });
        })
        // PUT new data into the post
        .put(function (req, res) {
            var updatedPost = req.body;
            models.Post.find({
                where: { id: req.params.post_id }
            }).then(function (post) {
                console.log(JSON.stringify(post));
                post.update(updatedPost).then(function (update) {
                    res.status(201).json(update); 
                });
            });
        })
        // DELETE a single post
        .delete(function (req, res) {
            models.Post.find({
                where: { id: req.params.post_id }
            }).then(function (post) {
                post.destroy().then(function () {
                    res.sendStatus(204);
                })
            });
        });

router.route('/:post_id/edit')
        // GET a form page to edit a post
        .get(function (req, res) {
            models.Post.find({
                where: { id: req.params.post_id }
            }).then(function (post) {
                models.User.findAll().then(function (users) {
                    res.render('posts/edit', {
                        title: 'Editing post | Tackboard',
                        users: users,
                        post: post
                    });
                });
            });
        })
        // PATCH the page with the form in a snippet
        .patch(function (req, res) {
            models.User.findAll().then(function (users) {
                res.render('posts/_form', {
                    users: users,
                    post: models.Post.build({})
                });
            });
        });
        
module.exports = router;