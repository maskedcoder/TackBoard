var models  = require('../models');
var express = require('express');
var router = express.Router();

var utils = require('./utils');

/**
 * Restrict Access (middleware)
 * 
 * Keeps posts from being edited by non-owners
 *
 * @param {Object}  req        The request object
 * @param {Object}  res        The response object
 * @param {Function}  next     The next middleware
 */
var restrictAccess = function (request, response, next) {
    if (request.account && request.account.id == request.post.User.id) {
        next();
    } else {
        response.status(401).render('notifications/error', {
                account: "hide",
                title: 'Access denied',
                text: 'You cannot make changes to this post.'
        });
    }
};

/**
 * Require Login (middleware)
 * 
 * Requires users to login before editing/creating posts
 *
 * @param {Object}  req        The request object
 * @param {Object}  res        The response object
 * @param {Function}  next     The next middleware
 */
var requireLogin = function (request, response, next) {
    if (request.account) {
        next();
    } else {
        response.status(401).render('notifications/error', {
                account: "hide",
                title: 'Access denied',
                text: 'You must login first'
        });
    }
};

/**
 * Posts API
 *
 * The Posts route involves posts: View, Create, Update, and Delete. Fairly straight-forward.
 *
 * The API is as follows
 *
 * GET /posts/                  View a listing of all posts
 * GET /posts/post_id           View a single post
 * GET /posts/post_id/edit      View a form to edit a post
 * GET /posts/post_id/delete    View a formt to delete a post (confirmation)
 * GET /posts/new               View a form to create a new post
 *
 * POST /posts/                 Create a new post
 * PUT /posts/post_id           Make a change to a post
 * DELETE /posts/post_id        Delete a post
 *
 * PUT and DELETE can only be done through client-side javascript. Non-javascript users may use the following backup routes
 *
 * POST /posts/post_id/edit     Synonym for PUT /posts/post_id. Make a change to a post
 * POST /posts/post_id/delete   Synonym for DELETE /posts/post_id. Delete a post
 */

/**
 * Posts Controller
 *
 * This object provides the actions for the routes.
 */
var PostsController = {
    /**
     * Find post (middleware)
     *
     * Finds a post by post ID. If no post is found, respond with a 404.
     *
     * @param {Object}  req        The request object
     * @param {Object}  res        The response object
     * @param {Function}  next     The next middleware
     * @param {String}  post_id    The id of the post to get
     */
     findPost: function (req, res, next, post_id) {
        models.Post.find({
            include: models.User,
            where: { id: post_id },
            attributes: ['id', 'title', 'description', 'link', 'data']
        }).then(function (post) {
            if (post) {
                // Post found
                req.post = post;
                next();
            } else {
                // Post not found
                res.status(404);
                utils.respondTo(req, res, {
                    'html': function () {
                        res.render('notifications/error', {
                            account: 'hide',
                            title: "Post not found",
                            text: "Unable to find post #"+post_id
                        });
                    },
                    'json': function () {
                        res.json({
                            'type': 'error',
                            'text': 'Invalid - Post does not exist'
                        });
                    }
                });
            }
        });
    },

    /**
     * Index action
     *
     * Fetches a listing of all posts. Corresponds to GET /posts/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
    index: function (req, res) {
        models.Post.findAll({
            include: models.User,
            attributes: ['id', 'title', 'description', 'link', 'data']
        }).then(function (posts) {
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('posts/index', {
                        account: req.account,
                        title: 'All posts',
                        posts: posts
                    });
                },
                'json': function () {
                    res.json(posts);
                }
            });
        });
    },

    /**
     * Show action
     *
     * Show an individual post. Corresponds to GET /posts/post_id
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     showPost: function (req, res) {
        utils.respondTo(req, res, {
            'html': function () {
                res.render('posts/show', {
                    account: req.account,
                    title: req.post.title,
                    post: req.post
                });
            },
            'json': function () {
                res.json(req.post);
            }
        });
    },

    /**
     * Edit Form action
     *
     * Show a form to edit a post. Corresponds to GET /posts/post_id/edit/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     editForm: function (req, res) {
        var nonce = utils.setupNonce(req, 'posts/:post_id');
        res.render('posts/edit', {
            account: req.account,
            title: 'Editing '+req.post.title,
            post: req.post,
            nonce: nonce
        });
    },

    /**
     * Delete Form action
     *
     * Show a form to delete a post. Corresponds to GET /posts/post_id/delete/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     deleteForm: function (req, res) {
        var nonce = utils.setupNonce(req, 'posts/:post_id');
        res.render('posts/delete', {
            account: req.account,
            title: 'Confirm Delete',
            post: req.post,
            nonce: nonce
        });
    },

    /**
     * New Form action
     *
     * Show a form to create a new post. Corresponds to GET /posts/new/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     newForm: function (req, res) {
        var nonce = utils.setupNonce(req, 'posts/');
        res.render('posts/new', {
            account: req.account,
            title: 'New Post',
            post: models.Post.build({}),
            nonce: nonce
        });
    },

    /**
     * Create Post action
     *
     * Create a new post. Corresponds to POST /posts/
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     createPost: function (req, res) {
        var newPost = req.body;
        if (!newPost.title || !newPost.link) {
            res.status(400);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/error', {
                        account: 'hide',
                        title: 'Error creating post',
                        text: 'Invalid - post needs both a title and a link'
                    });
                },
                'json': function () {
                    response.json({
                        'type': 'error',
                        'text': 'Invalid - missing title and/or link'
                    });
                }
            });
            return false;
        }

        // Data should be gathered by gathering metadata from the link given
        var dummyData = {
            boo: 'far'
        };

        var link = newPost.link;
        if (link.length < 4 || link.substr(0,4) != 'http')
            link = 'http://' + link;

        models.Post.create({
            title: newPost.title,
            link: link,
            description: newPost.description || '',
            data: JSON.stringify(dummyData),
            UserId: req.account.id
        }).then(function (post) {
            res.status(201)
                .set('Location', '/posts/' + post.id);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/information', {
                        account: 'hide',
                        title: 'Post created',
                        text: 'The post was successfully created.',
                        link: '/posts/' + post.id
                    });
                },
                'json': function () {
                    // Can't just send json(post), because it exposes too much information
                    res.json({
                        title: post.title,
                        link: post.link,
                        description: post.description,
                        data: post.data
                    });
                }
            });
        }, function (error) {
            console.log(error.message);
            res.status(400);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/error', {
                        account: 'hide',
                        title: 'Error creating post',
                        text: 'The post could not be created'
                    });
                },
                'json': function () {
                    response.json({
                        'type': 'error',
                        'text': 'The post could not be created'
                    });
                }
            });
        });
     },

    /**
     * Update Post action
     *
     * Updates a post. Corresponds to PUT /posts/post_id and POST /posts/post_id/edit
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     updatePost: function (req, res) {
        var update = req.body;
        if (!update.title || !update.link) {
            res.status(400);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/error', {
                        account: 'hide',
                        title: 'Error editing post',
                        text: 'Invalid - post needs both a title and a link'
                    });
                },
                'json': function () {
                    response.json({
                        'type': 'error',
                        'text': 'Invalid - missing title and/or link'
                    });
                }
            });
            return false;
        }

        // Data should be gathered by gathering metadata from the link given
        var dummyData = {
            boo: 'far'
        };

        var link = update.link;
        if (link.length < 4 || link.substr(0,4) != 'http')
            link = 'http://' + link;

        req.post.update({
            title: update.title,
            link: link,
            description: update.description || '',
            data: JSON.stringify(dummyData)
        }).then(function (post) {
            res.status(201)
                .set('Location', '/posts/' + post.id);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/information', {
                        account: 'hide',
                        title: 'Post updated',
                        text: 'The post was successfully updated.',
                        link: '/posts/' + post.id
                    });
                },
                'json': function () {
                    // Can't just send json(post), because it exposes too much information
                    res.json({
                        title: post.title,
                        link: post.link,
                        description: post.description,
                        data: post.data
                    });
                }
            });
        }, function (error) {
            res.status(400);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/error', {
                        account: 'hide',
                        title: 'Error updating post',
                        text: 'The post could not be updated'
                    });
                },
                'json': function () {
                    response.json({
                        'type': 'error',
                        'text': 'The post could not be updated'
                    });
                }
            });
        });
     },

    /**
     * Delete Post action
     *
     * Deletes a post. Corresponds to DELETE /posts/post_id/ and POST /posts/post_id/delete
     *
     * @param {Object}  req    The request object
     * @param {Object}  res    The response object
     */
     deletePost: function (req, res) {
        req.post.destroy().then(function () {
            res.status(200);
            utils.respondTo(req, res, {
                'html': function () {
                    res.render('notifications/information', {
                        account: 'hide',
                        title: 'Post deleted',
                        text: 'The post was successfully deleted.'
                    });
                },
                'json': function () {
                    res.json({
                        type: 'info',
                        text: 'The post was successfully deleted.'
                    });
                }
            });
        });
    }
};

// Load user when an id is given
router.param('post_id', PostsController.findPost);

router.route('/')
        // GET all posts
        .get(PostsController.index)
        // POST a new post
        .post(requireLogin, utils.validateNonce, PostsController.createPost);

router.route('/new/')
        // GET a form to add a new post
        .get(requireLogin, PostsController.newForm)
        // PATCH the current page with the form in a snippet
        .patch(requireLogin, function (req, res) {
            res.render('posts/_form', {
                post: models.Post.build({})
            });
        });

router.route('/:post_id/')
        // GET a single post
        .get(PostsController.showPost)
        // PUT new data into the post
        .put(restrictAccess, utils.validateNonce, PostsController.updatePost)
        // DELETE a single post
        .delete(restrictAccess, utils.validateNonce, PostsController.deletePost);

router.route('/:post_id/delete')
        // GET a delete confirmation page
        .get(restrictAccess, PostsController.deleteForm)
        // POST delete the post
        .post(restrictAccess, utils.validateNonce, PostsController.deletePost);

router.route('/:post_id/edit')
        // GET a form page to edit a post
        .get(restrictAccess, PostsController.editForm)
        // POST new data into the post
        .post(restrictAccess, utils.validateNonce, PostsController.updatePost)
        // PATCH the page with the form in a snippet
        .patch(restrictAccess, function (req, res) {
            res.render('posts/_form', {
                post: req.post
            });
        });
        
module.exports = router;