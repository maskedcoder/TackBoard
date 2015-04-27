process.env.NODE_ENV = 'test';

// These are needed to run a server
var app = require('../app');
var http = require('http');
var models = require("../models");


// Store the server so we can close it later.
var server;

before(function () {
    app.set('port', 3000);

    models.sequelize.sync().then(function () {
        server = http.createServer(app);
        server.listen(app.get('port'));
    });
});

after(function () {
    server.close(function () {
        console.log('Shutting down the server');
    });
});

require('./users')(app);