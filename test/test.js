var request = require('supertest');
var expect = require('expect.js');
var cheerio = require('cheerio');

/**
 * Set environment to 'test'
 */

process.env.NODE_ENV = 'test';

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('TackBoard:server');
var http = require('http');
var models = require("../models");

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Store the server so we can close it later.
 */

var server;

/**
 * Sync the database models.
 */

models.sequelize.sync().then(function () {

  /**
   * Create HTTP server.
   */

  server = http.createServer(app);

  /**
   * Listen on provided port, on all network interfaces.
   */

  server.listen(app.get('port'));
  server.on('error', onError);
  //server.on('listening', onListening);

  /**
   * Event listener for HTTP server "error" event.
   */

  function onError(error) {
    if (error.syscall !== 'listen') {
      throw error;
    }

    var bind = typeof port === 'string'
      ? 'Pipe ' + port
      : 'Port ' + port

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

  /**
   * Event listener for HTTP server "listening" event.
   */

  function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr.port;
    debug('Listening on ' + bind);
  }

});

/**
* Normalize a port into a number, string, or false.
*/

function normalizePort(val) {
var port = parseInt(val, 10);

if (isNaN(port)) {
  // named pipe
  return val;
}

if (port >= 0) {
  // port number
  return port;
}

return false;
}


after(function () {
    server.close(function () {
        console.log('Shutting down the server');
    });
});

describe('Users API', function () {
    // nonce will hold onto the nonces from forms being loaded, so they can be posted to the server
    var nonce;
    // userLink holds a link to the user page (e.g., `/users/23`)
    var userLink;

    var agent = request.agent(app);

    it('gets a list of users', function (done) {
        agent.get('/users')
            .expect(200, done);
    });

    it('gets a login form', function (done) {
        agent.get('/users/login')
            .expect(200)
            .end(function (error, response) {
                var $ = cheerio.load(response.text);

                nonce = $('input[name="nonce"]').val();

                done();
            });
    });

    it('fails to log in a non-user', function (done) {
        agent.post('/users/login')
            .send({
                nonce: nonce,
                nojs: 'true',
                name: 'Totally made up name here',
                password: 'And this is a totally made up password'
            })
            .expect(401)
            .end(function (err, res) {
                if (err) return done(err);
                done();
            });
    });

    it('will not sign up a user without the correct nonce', function (done) {
        agent.post('/users/')
            .send({
                nonce: nonce,
                nojs: 'true',
                name: 'Test',
                password: 'Test Password'
            })
            .expect(401, done);
    });

    it('loads a sign up form', function (done) {
        agent.get('/users/signup')
            .expect(200)
            .end(function (error, response) {
                var $ = cheerio.load(response.text);

                nonce = $('input[name="nonce"]').val();

                done();
            });
    });

    it('signs up a user', function (done) {
        agent.post('/users/')
            .send({
                nonce: nonce,
                nojs: 'true',
                name: 'Test',
                password: 'Test Password'
            })
            .expect(201)
            .end(function (error, response) {
                expect(response.headers).to.have.property('set-cookie');

                userLink = response.headers['location'];

                done();
            });
    });

    it('redirects to dashboard page', function (done) {
        agent.get(userLink)
            .expect(303)
            .expect('location', '/users/dashboard', done);
    });

    it('gets a dashboard page', function (done) {
        agent.get('/users/dashboard')
            .expect(200, done);
    });

    it('will not edit a user without the correct nonce', function (done) {
        agent.post(userLink + '/edit')
            .send({
                nonce: nonce,
                nojs: 'true',
                name: 'Changed Test',
                password: 'Test Password'
            })
            .expect(401, done);
    });

    it('gets an edit form', function (done) {
        agent.get(userLink + '/edit')
            .expect(200)
            .end(function (error, response) {
                var $ = cheerio.load(response.text);

                nonce = $('input[name="nonce"]').val();

                done();
            });
    });

    it('edits a user', function (done) {
        agent.post(userLink + '/edit')
            .send({
                nonce: nonce,
                nojs: 'true',
                name: 'Changed Test',
                password: 'Test Password'
            })
            .expect(201, done);
    });

    it('will not log out without the correct nonce', function (done) {
        agent.post('/users/logout')
            .send({
                nonce: nonce
            })
            .expect(401, done);
    });

    it('gets a log out form', function (done) {
        agent.get('/users/logout')
            .expect(200)
            .end(function (error, response) {
                var $ = cheerio.load(response.text);

                nonce = $('input[name="nonce"]').val();

                done();
            });
    });

    it('logs out a user', function (done) {
        agent.post('/users/logout')
            .send({
                nonce: nonce
            })
            .expect(200, done);
    });

    it('redirects dashboard requests to login form', function (done) {
        agent.get('/users/dashboard')
            .expect(302)
            .expect('location', '/users/login', done);
    });

    it('isn\'t going to edit a user without being logged in', function (done) {
        agent.get(userLink + '/edit')
            .expect(401, done);
    });

    it('isn\'t going to delete a user without being logged in', function (done) {
        agent.get(userLink + '/delete')
            .expect(401, done);
    });

    it('loads a user\'s page', function (done) {
        agent.get(userLink)
            .expect(200, done);
    });

    it('will not log in a user without the correct nonce', function (done) {
        agent.post('/users/login')
            .send({
                nonce: nonce,
                nojs: 'true',
                name: 'Changed Test',
                password: 'Test Password'
            })
            .expect(401, done);
    });

    it('logs in a user', function (done) {
        // We already tested whether the login form would show up.
        // However, in order to login, the form has to be loaded for the nonce.
        agent.get('/users/login')
            .expect(200)
            .end(function (error, response) {
                var $ = cheerio.load(response.text);

                nonce = $('input[name="nonce"]').val();

                agent.post('/users/login')
                    .send({
                        nonce: nonce,
                        nojs: 'true',
                        name: 'Changed Test',
                        password: 'Test Password'
                    })
                    .expect(201)
                    .end(function (error, response) {
                        expect(response.headers).to.have.property('set-cookie');

                        done();
                    });
            });
    });

    it('will not delete a user without the correct nonce', function (done) {
        agent.post(userLink + '/delete')
            .send({
                nonce: nonce
            })
            .expect(401, done);
    });

    it('gets a delete form', function (done) {
        agent.get(userLink + '/delete')
            .expect(200)
            .end(function (error, response) {
                var $ = cheerio.load(response.text);

                nonce = $('input[name="nonce"]').val();

                done();
            });
    });

    it('deletes a user', function (done) {
        agent.post(userLink + '/delete')
            .send({
                nonce: nonce
            })
            .expect(200)
            .end(function (err, res) {
                // Check to see that it is deleted
                agent.get(userLink)
                    .expect(404, done);
            });
    });
});