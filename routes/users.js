var models  = require('../models');
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    models.User.findAll({
        include: models.Post
    }).then(function(users) {
    res.render('user/index', {
      title: 'All users | TackBoard',
      users: users
    });
  });
});

/* GET form to create a user */
router.get('/new', function (req, res) {
    res.render('user/new', {
        title: 'Creating new user | TackBoard',
        user: models.User.build({})
    });
});

/* POST the new user */
router.post('/create', function (req, res, next) {
    models.User.create({
        name: req.body.name,
        password: req.body.password
    }).then(function (user) {
        res.redirect('/users/'+user.id);
    })
});

/* GET the user destroyed */
router.get('/:user_id/destroy', function (req, res) {
    models.User.find({
        where: { id: req.params.user_id }
    }).then(function (user) {
        user.destroy().then(function () {
            res.redirect('/users');
        });
    });
});

/* GET a form to edit the user */
router.get('/:user_id/edit', function (req, res) {
    models.User.find({
        where: { id: req.params.user_id }
    }).then(function (user) {
        res.render('user/edit', {
          title: 'Editing '+user.name+' | TackBoard',
          user: user
        });
    });
});

/* POST the updated user */
router.post('/:user_id/update', function (req, res) {
    models.User.find({
        where: { id: req.params.user_id }
    }).then(function (user) {
        user.update({
            name: req.body.name,
            password: req.body.password
        }).then(function () {
            res.redirect('/users/'+user.id);
        });
    });
});

/* GET the user */
router.get('/:user_id/', function (req, res, next) {
    models.User.find({
        where: { id: req.params.user_id }
    }).then(function (user) {
        res.render('user/show', {
            title: user.name+' | TackBoard',
            user: user
        });
    });
});


module.exports = router;
