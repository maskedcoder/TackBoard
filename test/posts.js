/**
 * Post API tests
 *@module tests/posts
 */

var request = require('supertest');
var expect = require('expect.js');
var cheerio = require('cheerio');

/**
 * Runs test on the Posts API
 *
 *@param {Object|Function|String}  app    A server exposing an API to test, function returning such a server, or URL string pointing to the server.
 */
module.exports = function (app) {
    describe('Posts API', function () {
        // nonce will hold onto the nonces from forms being loaded, so they can be posted to the server
        var nonce;
        // postLink holds a link to the user page (e.g., `/posts/23`)
        var postLink;

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

        it('gets a list of posts', function (done) {
            agent.get('/posts')
                .expect(200, done);
        });

        describe('Create page', function () {

            it('will not create a post without the correct nonce', function (done) {
                agent.post('/posts/')
                    .send({
                        nonce: nonce,
                        title: 'Test',
                        link: 'www.google.com'
                    })
                    .expect(401, done);
            });

            it('loads a create form', function (done) {

                // Log in to allow creating and editing posts
                setupNonce('/users/login', function () {
                    agent.post('/users/login')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Another user',
                            password: 'Test Password'
                        })
                        .expect(200)
                        .end(function (error, response) {
                            if (error) return done(error);

                            expect(response.headers).to.have.property('set-cookie');

                            // The actual test is right here
                            agent.get('/posts/new')
                                .expect(200, done);
                        });
                });
            });

            it('eliminates blank titles', function (done) {
                setupNonce('/posts/new', function () {
                    agent.post('/posts/')
                        .send({
                            nonce: nonce,
                            // Blank title
                            title: '',
                            link: 'www.google.com'
                        })
                        .expect(400, done);
                });
            });

            it('eliminates blank urls', function (done) {
                setupNonce('/posts/new', function () {
                    agent.post('/posts/')
                        .send({
                            nonce: nonce,
                            title: 'Test',
                            // Blank Url
                            link: ''
                        })
                        .expect(400, done);
                });
            });

            it('eliminates missing titles', function (done) {
                setupNonce('/posts/new', function () {
                    agent.post('/posts/')
                        .send({
                            nonce: nonce,
                            // Missing title
                            link: 'www.google.com'
                        })
                        .expect(400, done);
                });
            });

            it('eliminates missing urls', function (done) {
                setupNonce('/posts/new', function () {
                    agent.post('/posts/')
                        .send({
                            nonce: nonce,
                            title: 'Test'
                            // Missing Url
                        })
                        .expect(400, done);
                });
            });

            it('eliminates non-urls', function (done) {
                setupNonce('/posts/new', function () {
                    agent.post('/posts/')
                        .send({
                            nonce: nonce,
                            title: 'Test',
                            // String does not validate as a url
                            link: 'this is not even remotely a url'
                        })
                        .expect(400, done);
                });
            });

            it('eliminates non-existant urls', function (done) {
                setupNonce('/posts/new', function () {
                    agent.post('/posts/')
                        .send({
                            nonce: nonce,
                            title: 'Test',
                            // Valid url, but page doesn't exist
                            link: 'http://thisismysuperdupersecretnonexistantdomainthatdoesnotexistatall.com/notanapi/159/'
                        })
                        .expect(400, done);
                });
            });

            it('will not allow super-long descriptions', function (done) {
                setupNonce('/posts/new', function () {
                    agent.post('/posts/')
                        .send({
                            nonce: nonce,
                            title: 'Test',
                            link: 'www.google.com',
                            // Description much too long
                            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut sed felis euismod, commodo leo eget, eleifend nunc. Vestibulum semper sed dui ac condimentum. Aenean ut mauris quis mauris varius placerat. Ut sit amet ullamcorper sem. Vivamus lobortis et lorem ac tincidunt. Vivamus nec ligula velit. Donec in tellus non erat lacinia mollis vel ut elit. Mauris libero dolor, accumsan non semper sed, aliquet ac neque. Curabitur placerat nec quam a blandit. Vestibulum aliquet turpis nec lacus mattis aliquam. Fusce sagittis dolor leo, eget bibendum diam aliquam vel. Mauris rhoncus vulputate dui, ac vestibulum est porta quis.  Ut bibendum dictum odio, id tincidunt odio blandit lacinia. Quisque volutpat purus in rutrum aliquet. Quisque augue magna, consequat vitae maximus in, bibendum ut augue. Nam condimentum eu ipsum et sagittis. Cras sit amet justo lacus. Quisque a ligula ac libero sollicitudin blandit. Sed posuere, arcu nec auctor congue, massa augue volutpat sem, vel accumsan ante arcu sit amet nunc. Pellentesque accumsan id mi quis ultricies. Morbi diam est, blandit eget rutrum efficitur, venenatis et ipsum.    Mauris at nisi erat. Pellentesque ac turpis hendrerit, accumsan risus ac, tempor nunc. Vivamus blandit risus libero. Vivamus dignissim tortor eget nunc sagittis, ac iaculis enim suscipit. Integer diam est, pretium sed diam sed, iaculis porttitor libero. Vivamus quis odio semper neque malesuada feugiat a in massa. Nullam sollicitudin sed mauris vel porta. Sed augue arcu, efficitur eu eleifend vel, faucibus sed ex. Integer non felis non ex posuere cursus interdum et dui. Aenean elit urna, iaculis a dolor ac, viverra gravida massa. Cras vitae libero sit amet ante tristique fermentum id quis urna. Sed quis porttitor nunc, a efficitur tortor. Nunc et semper est, et tempor erat. Mauris sodales nisi quis dapibus auctor.    Pellentesque in ante est. Nam quis blandit ipsum. Morbi iaculis eget libero eget euismod. In in aliquet lectus. Nulla nec tortor eros. Duis mollis dapibus nunc, nec varius ipsum sagittis et. Cras quis elementum sapien. Ut efficitur aliquet massa eget condimentum.    Donec at tempus sapien. Suspendisse id lacus quis ante varius eleifend sed sed nulla. Praesent placerat eget ex eget rutrum. Praesent a ligula accumsan, facilisis sem in, pretium lacus. Morbi nunc mi, commodo et luctus nec, gravida sit amet velit. Maecenas justo libero, accumsan sit amet venenatis sed, faucibus et lectus. Morbi posuere non neque nec finibus. Fusce porta, erat quis elementum euismod, nulla sapien vulputate dui, non posuere arcu justo non diam. In auctor aliquet diam quis semper. Sed bibendum eros eget mi congue, in fringilla dui vehicula. Praesent aliquam tortor eu augue efficitur, vel finibus neque ultrices. Aliquam lacinia imperdiet risus in cursus. Proin pulvinar metus eget eleifend interdum. Ut ac magna a ipsum finibus imperdiet. Fusce augue lectus, imperdiet ut mollis quis, accumsan at purus.    Morbi quis dictum tellus. Aenean in erat tortor. Nulla tempor pellentesque pretium. Duis pharetra, mauris fermentum ultricies pharetra, tortor sem euismod ex, sit amet euismod neque nunc vitae urna. Maecenas mollis lorem augue, at interdum purus congue vel. Sed ultrices rhoncus diam, vitae sodales lorem. Aliquam pellentesque gravida magna bibendum aliquet. Ut tellus dui, interdum at tincidunt id, dictum eu nisi. Nunc et tortor quam. Praesent tincidunt tempus odio sed tempor. Fusce id nisi eget purus laoreet ultricies at non orci. Proin sit amet nunc vitae velit mollis consectetur quis vel lorem. Proin vel bibendum neque, in fringilla lacus. Sed tincidunt, mi eu lacinia maximus, odio risus ullamcorper purus, ac commodo arcu ligula et nisi.    Vestibulum leo massa, lacinia a lacinia id, sodales non arcu. Vestibulum scelerisque malesuada egestas. Proin ut blandit tortor. Donec viverra convallis magna, eget euismod nisi elementum a. In et tortor dapibus, pellentesque purus in, luctus nunc. Nullam massa urna, eleifend id velit sit amet, cursus sollicitudin nisl. Vivamus volutpat diam sed arcu feugiat tempor. Cras ac eros et mauris condimentum scelerisque. Sed tempor pellentesque imperdiet. Proin rutrum, metus id pharetra pulvinar, dui lectus sodales libero, nec pharetra odio urna eget mi. Phasellus elit dolor, hendrerit non semper nec, scelerisque nec eros. Pellentesque imperdiet ultricies commodo. Etiam sit amet porta tortor, tempor tincidunt odio. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Donec turpis ligula, ullamcorper in felis gravida, commodo pellentesque erat. Phasellus id mi ultrices, sagittis neque vel, auctor dui.    Donec porta efficitur bibendum. Donec consequat volutpat luctus. Suspendisse imperdiet pharetra vestibulum. Quisque sollicitudin odio nec diam venenatis elementum. Mauris porta, dolor at vulputate vulputate, tellus nisl varius felis, et eleifend libero arcu vel nulla. Sed ante nisl, imperdiet vel libero sit amet, commodo facilisis nisi. Duis ultricies, nibh a dapibus finibus, velit nunc molestie neque, eget egestas arcu erat et quam. Praesent sed erat eros.'
                        })
                        .expect(400, done);
                });
            });

            it('creates a new post', function (done) {
                setupNonce('/posts/new', function () {
                    agent.post('/posts/')
                        .send({
                            nonce: nonce,
                            title: 'Test',
                            description: 'This is a test. This is only a test. It can be nothing but a test. However it *does* link to Google.',
                            link: 'www.google.com'
                        })
                        .expect(201)
                        .end(function (error, response) {
                            if (error) return done(error);

                            expect(response.headers).to.have.property('location');

                            postLink = response.headers['location'];

                            done();
                        });
                });
            });

        });

        describe('Logged out actions', function () {

            it('will not create a post without being logged in', function (done) {
                // First log out
                setupNonce('/users/logout', function () {
                    agent.post('/users/logout')
                        .send({
                            nonce: nonce
                        })
                        .end(function () {

                            // Actual test is here
                            agent.get('/posts/new')
                                .expect(401, done);
                        });
                });
            });

            it('will not edit a post without being logged in', function (done) {
                agent.get(postLink + '/edit')
                    .expect(401, done);
            });

            it('will not delete a post without being logged in', function (done) {
                agent.get(postLink + '/delete')
                    .expect(401, done);
            });

            it('shows a post', function (done) {
                agent.get(postLink)
                    .expect(200, done);
            });

            it('doesn\'t find non-existant posts', function (done) {
                // If auto-increment and primary keys are working, id 2 has long been deleted

                agent.get('/posts/2')
                    .expect(404, done);
            });

        });

        describe('Edit page', function () {

            it('will not edit a post created by another user', function (done) {
                // Log in to allow creating and editing posts
                setupNonce('/users/login', function () {
                    agent.post('/users/login')
                        .send({
                            nonce: nonce,
                            nojs: 'true',
                            name: 'Another user',
                            password: 'Test Password'
                        })
                        .end(function () {

                            // Actual test is here
                            agent.get('/posts/1/edit')
                                .expect(401, done);
                        });
                });
            });

            it('will not edit a post without the correct nonce', function (done) {
                agent.post(postLink + '/edit')
                    .send({
                        nonce: nonce,
                        title: 'Test',
                        link: 'www.google.com'
                    })
                    .expect(401, done);
            });

            it('loads an edit form', function (done) {
                agent.get(postLink + '/edit')
                    .expect(200, done);
            });

            it('eliminates blank titles', function (done) {
                setupNonce(postLink + '/edit', function () {
                    agent.post(postLink + '/edit')
                        .send({
                            nonce: nonce,
                            // Blank title
                            title: '',
                            link: 'www.google.com'
                        })
                        .expect(400, done);
                });
            });

            it('eliminates blank urls', function (done) {
                setupNonce(postLink + '/edit', function () {
                    agent.post(postLink + '/edit')
                        .send({
                            nonce: nonce,
                            title: 'Changed Test',
                            // Blank Url
                            link: ''
                        })
                        .expect(400, done);
                });
            });

            it('eliminates missing titles', function (done) {
                setupNonce(postLink + '/edit', function () {
                    agent.post(postLink + '/edit')
                        .send({
                            nonce: nonce,
                            // Missing title
                            link: 'www.google.com'
                        })
                        .expect(400, done);
                });
            });

            it('eliminates missing urls', function (done) {
                setupNonce(postLink + '/edit', function () {
                    agent.post(postLink + '/edit')
                        .send({
                            nonce: nonce,
                            title: 'Changed Test'
                            // Missing Url
                        })
                        .expect(400, done);
                });
            });

            it('eliminates non-urls', function (done) {
                setupNonce(postLink + '/edit', function () {
                    agent.post(postLink + '/edit')
                        .send({
                            nonce: nonce,
                            title: 'Changed Test',
                            // String does not validate as a url
                            link: 'this is not even remotely a url'
                        })
                        .expect(400, done);
                });
            });

            it('eliminates non-existant urls', function (done) {
                setupNonce(postLink + '/edit', function () {
                    agent.post(postLink + '/edit')
                        .send({
                            nonce: nonce,
                            title: 'Changed Test',
                            // Valid url, but page doesn't exist
                            link: 'http://thisismysuperdupersecretnonexistantdomainthatdoesnotexistatall.com/notanapi/159/'
                        })
                        .expect(400, done);
                });
            });

            it('will not allow super-long descriptions', function (done) {
                setupNonce(postLink + '/edit', function () {
                    agent.post(postLink + '/edit')
                        .send({
                            nonce: nonce,
                            title: 'Changed Test',
                            link: 'www.google.com',
                            // Description much too long
                            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut sed felis euismod, commodo leo eget, eleifend nunc. Vestibulum semper sed dui ac condimentum. Aenean ut mauris quis mauris varius placerat. Ut sit amet ullamcorper sem. Vivamus lobortis et lorem ac tincidunt. Vivamus nec ligula velit. Donec in tellus non erat lacinia mollis vel ut elit. Mauris libero dolor, accumsan non semper sed, aliquet ac neque. Curabitur placerat nec quam a blandit. Vestibulum aliquet turpis nec lacus mattis aliquam. Fusce sagittis dolor leo, eget bibendum diam aliquam vel. Mauris rhoncus vulputate dui, ac vestibulum est porta quis.  Ut bibendum dictum odio, id tincidunt odio blandit lacinia. Quisque volutpat purus in rutrum aliquet. Quisque augue magna, consequat vitae maximus in, bibendum ut augue. Nam condimentum eu ipsum et sagittis. Cras sit amet justo lacus. Quisque a ligula ac libero sollicitudin blandit. Sed posuere, arcu nec auctor congue, massa augue volutpat sem, vel accumsan ante arcu sit amet nunc. Pellentesque accumsan id mi quis ultricies. Morbi diam est, blandit eget rutrum efficitur, venenatis et ipsum.    Mauris at nisi erat. Pellentesque ac turpis hendrerit, accumsan risus ac, tempor nunc. Vivamus blandit risus libero. Vivamus dignissim tortor eget nunc sagittis, ac iaculis enim suscipit. Integer diam est, pretium sed diam sed, iaculis porttitor libero. Vivamus quis odio semper neque malesuada feugiat a in massa. Nullam sollicitudin sed mauris vel porta. Sed augue arcu, efficitur eu eleifend vel, faucibus sed ex. Integer non felis non ex posuere cursus interdum et dui. Aenean elit urna, iaculis a dolor ac, viverra gravida massa. Cras vitae libero sit amet ante tristique fermentum id quis urna. Sed quis porttitor nunc, a efficitur tortor. Nunc et semper est, et tempor erat. Mauris sodales nisi quis dapibus auctor.    Pellentesque in ante est. Nam quis blandit ipsum. Morbi iaculis eget libero eget euismod. In in aliquet lectus. Nulla nec tortor eros. Duis mollis dapibus nunc, nec varius ipsum sagittis et. Cras quis elementum sapien. Ut efficitur aliquet massa eget condimentum.    Donec at tempus sapien. Suspendisse id lacus quis ante varius eleifend sed sed nulla. Praesent placerat eget ex eget rutrum. Praesent a ligula accumsan, facilisis sem in, pretium lacus. Morbi nunc mi, commodo et luctus nec, gravida sit amet velit. Maecenas justo libero, accumsan sit amet venenatis sed, faucibus et lectus. Morbi posuere non neque nec finibus. Fusce porta, erat quis elementum euismod, nulla sapien vulputate dui, non posuere arcu justo non diam. In auctor aliquet diam quis semper. Sed bibendum eros eget mi congue, in fringilla dui vehicula. Praesent aliquam tortor eu augue efficitur, vel finibus neque ultrices. Aliquam lacinia imperdiet risus in cursus. Proin pulvinar metus eget eleifend interdum. Ut ac magna a ipsum finibus imperdiet. Fusce augue lectus, imperdiet ut mollis quis, accumsan at purus.    Morbi quis dictum tellus. Aenean in erat tortor. Nulla tempor pellentesque pretium. Duis pharetra, mauris fermentum ultricies pharetra, tortor sem euismod ex, sit amet euismod neque nunc vitae urna. Maecenas mollis lorem augue, at interdum purus congue vel. Sed ultrices rhoncus diam, vitae sodales lorem. Aliquam pellentesque gravida magna bibendum aliquet. Ut tellus dui, interdum at tincidunt id, dictum eu nisi. Nunc et tortor quam. Praesent tincidunt tempus odio sed tempor. Fusce id nisi eget purus laoreet ultricies at non orci. Proin sit amet nunc vitae velit mollis consectetur quis vel lorem. Proin vel bibendum neque, in fringilla lacus. Sed tincidunt, mi eu lacinia maximus, odio risus ullamcorper purus, ac commodo arcu ligula et nisi.    Vestibulum leo massa, lacinia a lacinia id, sodales non arcu. Vestibulum scelerisque malesuada egestas. Proin ut blandit tortor. Donec viverra convallis magna, eget euismod nisi elementum a. In et tortor dapibus, pellentesque purus in, luctus nunc. Nullam massa urna, eleifend id velit sit amet, cursus sollicitudin nisl. Vivamus volutpat diam sed arcu feugiat tempor. Cras ac eros et mauris condimentum scelerisque. Sed tempor pellentesque imperdiet. Proin rutrum, metus id pharetra pulvinar, dui lectus sodales libero, nec pharetra odio urna eget mi. Phasellus elit dolor, hendrerit non semper nec, scelerisque nec eros. Pellentesque imperdiet ultricies commodo. Etiam sit amet porta tortor, tempor tincidunt odio. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Donec turpis ligula, ullamcorper in felis gravida, commodo pellentesque erat. Phasellus id mi ultrices, sagittis neque vel, auctor dui.    Donec porta efficitur bibendum. Donec consequat volutpat luctus. Suspendisse imperdiet pharetra vestibulum. Quisque sollicitudin odio nec diam venenatis elementum. Mauris porta, dolor at vulputate vulputate, tellus nisl varius felis, et eleifend libero arcu vel nulla. Sed ante nisl, imperdiet vel libero sit amet, commodo facilisis nisi. Duis ultricies, nibh a dapibus finibus, velit nunc molestie neque, eget egestas arcu erat et quam. Praesent sed erat eros.'
                        })
                        .expect(400, done);
                });
            });

            it('edits a post', function (done) {
                setupNonce(postLink + '/edit', function () {
                    agent.post(postLink + '/edit')
                        .send({
                            nonce: nonce,
                            title: 'Changed Test',
                            description: 'This is a test. This is only a test. It can be nothing but a test. However it *does* link to Google.',
                            link: 'www.google.com'
                        })
                        .expect(201)
                        .end(function (error, response) {
                            if (error) return done(error);

                            agent.get(postLink)
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

        describe('Delete pages', function () {

            it('will not delete a post created by another user', function (done) {
                agent.get('/posts/1/delete')
                    .expect(401, done);
            });

            it('will not delete a post without the correct nonce', function (done) {
                agent.post(postLink + '/delete')
                    .send({
                        nonce: nonce
                    })
                    .expect(401, done);
            });

            it('gets a delete form', function (done) {
                agent.get(postLink + '/delete')
                    .expect(200)
                    .end(function (error, response) {
                        if (error) return done(error);

                        var $ = cheerio.load(response.text);

                        nonce = $('input[name="nonce"]').val();

                        done();
                    });
            });

            it('deletes a post', function (done) {
                agent.post(postLink + '/delete')
                    .send({
                        nonce: nonce
                    })
                    .expect(200)
                    .end(function (err, res) {
                        if (err) return done(err);

                        // Check to see that it is deleted
                        agent.get(postLink)
                            .expect(404)
                            .end(function (error) {
                                if (error) return done(error);

                                // Log out now that we're done
                                setupNonce('/users/logout', function () {
                                    agent.post('/users/logout')
                                        .send({
                                            nonce: nonce
                                        })
                                        .end(done);
                                });
                            });
                    });
            });

        });
    });
};