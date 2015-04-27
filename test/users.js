/**
 * User API tests
 *@module tests/users
 */

var request = require('supertest');
var expect = require('expect.js');
var cheerio = require('cheerio');

/**
 * Runs test on the Users API
 *
 *@param {Object|Function|String}  app    A server exposing an API to test, function returning such a server, or URL string pointing to the server.
 */
module.exports = function (app) {
    describe('Users API', function () {
        // nonce will hold onto the nonces from forms being loaded, so they can be posted to the server
        var nonce;
        // userLink holds a link to the user page (e.g., `/users/23`)
        var userLink;

        var agent = request.agent(app);

        /**
        * Convenience function to setup nonces for actions
        *
        * @param {String}  link    The page to GET which will contain a nonce
        * @param {Function}  cb    Callback function
        */
        var setupNonce = function (link, cb) {
            agent.get(link)
                .end(function (error, response) {
                    var $ = cheerio.load(response.text);

                    nonce = $('input[name="nonce"]').val();
                    cb();
                });
        };

        it('gets a list of users', function (done) {
            agent.get('/users')
                .expect(200, done);
        });

        describe('Sign up page', function () {

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
                    .expect(200, done);
            });

            it('eliminates blank usernames', function (done) {
                setupNonce('/users/signup', function () {
                    agent.post('/users/')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            // Blank username
                            name: '',
                            password: 'Test Password'
                        })
                        .expect(400, done);
                });
            });

            it('eliminates blank passwords', function (done) {
                setupNonce('/users/signup', function () {
                    agent.post('/users/')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Test',
                            // Blank password
                            password: ''
                        })
                        .expect(400, done);
                });
            });

            it('eliminates missing passwords', function (done) {
                setupNonce('/users/signup', function () {
                    agent.post('/users/')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Test'
                            // Password missing!
                        })
                        .expect(400, done);
                });
            });

            it('eliminates missing usernames', function (done) {
                setupNonce('/users/signup', function () {
                    agent.post('/users/')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            // Name missing!
                            password: 'Test Password'
                        })
                        .expect(400, done);
                });
            });

            it('doesn\'t allow users to have the same name', function (done) {
                setupNonce('/users/signup', function () {
                    agent.post('/users/')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            // I believe that this name is already taken
                            name: 'Another user',
                            password: 'Test Password'
                        })
                        .expect(400, done);
                });
            });

            it('doesn\'t allow users to inject sql', function (done) {
                var secretSQL = 'Test\',\'aba9cs\',\'acb83\',\'2015-04-15 12:25:34\',\'2015-04-15 12:25:34\'); DROP TABLE posts;#';
                var link = '';
                setupNonce('/users/signup', function () {
                    agent.post('/users/')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: secretSQL,
                            password: 'Test Password'
                        })
                        .expect(201)
                        .end(function (err, res) {
                            if (err) return done(err);

                            link = res.headers['location'];

                            setupNonce(link + '/delete', function () {
                                agent.post(link + '/delete')
                                    .send({
                                        nonce: nonce
                                    })
                                    .expect(200, done);
                            });
                        });
                });
            });

            it('signs up a user', function (done) {
                setupNonce('/users/signup', function () {
                    agent.post('/users/')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Test',
                            password: 'Test Password'
                        })
                        .expect(201)
                        .end(function (error, response) {
                            if (error) return done(error);

                            expect(response.headers).to.have.property('set-cookie');

                            userLink = response.headers['location'];

                            done();
                        });
                })
            });

        });

        describe('Dashboard pages', function () {

            it('redirects to dashboard page', function (done) {
                agent.get(userLink)
                    .expect(303)
                    .expect('location', '/users/dashboard', done);
            });

            it('gets a dashboard page', function (done) {
                agent.get('/users/dashboard')
                    .expect(200, done);
            });

        });

        describe('Edit pages', function () {

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
                        if (error) return done(error);

                        var $ = cheerio.load(response.text);

                        nonce = $('input[name="nonce"]').val();

                        done();
                    });
            });

            it('eliminates blank usernames', function (done) {
                setupNonce(userLink + '/edit', function () {
                    agent.post(userLink + '/edit')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            // Blank username
                            name: '',
                            password: 'Test Password'
                        })
                        .expect(400, done);
                });
            });

            it('eliminates blank passwords', function (done) {
                setupNonce(userLink + '/edit', function () {
                    agent.post(userLink + '/edit')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Test',
                            // Blank password
                            password: ''
                        })
                        .expect(400, done);
                });
            });

            it('eliminates missing passwords', function (done) {
                setupNonce(userLink + '/edit', function () {
                    agent.post(userLink + '/edit')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Test'
                            // Password missing!
                        })
                        .expect(400, done);
                });
            });

            it('eliminates missing usernames', function (done) {
                setupNonce(userLink + '/edit', function () {
                    agent.post(userLink + '/edit')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            // Name missing!
                            password: 'Test Password'
                        })
                        .expect(400, done);
                });
            });

            it('doesn\'t allow users to have the same name', function (done) {
                setupNonce(userLink + '/edit', function () {
                    agent.post(userLink + '/edit')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            // I believe that this name is already taken
                            name: 'Another user',
                            password: 'Test Password'
                        })
                        .expect(400, done);
                });
            });

            it('doesn\'t allow users to inject sql', function (done) {
                var secretSQL = 'Test\',\'aba9cs\',\'acb83\',\'2015-04-15 12:25:34\',\'2015-04-15 12:25:34\'); DROP TABLE posts;#';
                setupNonce(userLink + '/edit', function () {
                    agent.post(userLink + '/edit')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: secretSQL,
                            password: 'Test Password'
                        })
                        .expect(201, done);
                });
            });

            it('edits a user', function (done) {
                setupNonce(userLink + '/edit', function () {
                    agent.post(userLink + '/edit')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Changed Test',
                            password: 'Test Password'
                        })
                        .expect(201)
                        .end(function (err, res) {
                            if (err) return done(err);

                            agent.get('/users/dashboard')
                                .expect(200)
                                .end(function (error, response) {
                                    if (error) return done(error);

                                    expect(response.text).to.contain('Changed Test');
                                    done();
                                })
                        });
                });
            });

        });

        describe('Logout pages', function () {

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
                        if (error) return done(error);

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

        });

        describe('Logged out pages', function () {

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

            it('doesn\'t find non-existant users', function (done) {
                // If auto-increment and primary keys are working, subtracting 1
                // from the user ID will result in an ID of a user that was just deleted
                var nonUserLink = userLink.replace(/(\d)[\\\/]?$/, function (_, digit) {
                    return Number(digit) - 1;
                });

                agent.get(nonUserLink)
                    .expect(404, done);
            });

        });

        describe('Login pages', function () {

            it('gets a login form', function (done) {
                agent.get('/users/login')
                    .expect(200)
                    .end(function (error, response) {
                        if (error) return done(error);

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

            it('will not log in a user without the correct nonce', function (done) {
                agent.post('/users/login')
                    .send({
                        nonce: 'This is not a nonce. This is a test. It is only a test.',
                        nojs: 'true',
                        name: 'Changed Test',
                        password: 'Test Password'
                    })
                    .expect(401, done);
            });

            it('checks passwords', function (done) {
                setupNonce('/users/login', function () {
                    agent.post('/users/login')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Changed Test',
                            // Wrong password
                            password: 'Something else'
                        })
                        .expect(401, done);
                });
            });

            it('eliminates blank passwords', function (done) {
                setupNonce('/users/login', function () {
                    agent.post('/users/login')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Changed Test',
                            // Blank password
                            password: ''
                        })
                        .expect(401, done);
                });
            });

            it('eliminates missing passwords', function (done) {
                setupNonce('/users/login', function () {
                    agent.post('/users/login')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Changed Test'
                            // Password missing!
                        })
                        .expect(401, done);
                });
            });

            it('handles long (and incorrect) passwords', function (done) {
                setupNonce('/users/login', function () {
                    agent.post('/users/login')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Changed Test',
                            // Long password
                            password: 'An incredibly long, amazingly long -- and tedious -- password. Wow! It is real long! Lorem ipsum dolor sit amet consectuter adelpsing atrum ex mipsolsing.'
                        })
                        .expect(401, done);
                });
            });

            it('logs in a user', function (done) {
                setupNonce('/users/login', function () {
                    agent.post('/users/login')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Changed Test',
                            password: 'Test Password'
                        })
                        .expect(200)
                        .end(function (error, response) {
                            if (error) return done(error);

                            expect(response.headers).to.have.property('set-cookie');

                            done();
                        });
                });
            });

        });

        describe('Delete pages', function () {

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
                        if (error) return done(error);

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
                        if (err) return done(err);

                        // Check to see that it is deleted
                        agent.get(userLink)
                            .expect(404, done);
                    });
            });

        });
    });
};