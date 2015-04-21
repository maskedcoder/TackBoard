var crypto = require('crypto');

/**
 * Logs a string except when the environment is 'test'. This keeps the mocha tests from getting cluttered with logging. Credit: dankohn, http://stackoverflow.com/a/22710649
 *
 * @param {String}  string    
 *
 * @private
 */
var logExceptOnTest = function(string) {
  if (process.env.NODE_ENV !== 'test') {
    console.log(string);
  }
};

/**
 * Utility functions for routes
 *
 * @module utils
 */

/**
 * Generates a nonce for a given action
 *
 * @param {String}  action    The action that the nonce will validate. For example, 'cars/delete'. The name given will be used to look up the expected nonce during validation.
 *
 * @return {String}    A random hexidecimal code
 * @private
 */
var generateNonce = function (action) {
    var sha512 = crypto.createHash('sha512');

    return sha512.update(action+ +new Date()).digest('hex');
};

module.exports = {

    /**
    * Uses the response Accepts header to select which format to respond in. If no match is found, a 406 Not Acceptable is sent.
    *
    * @example
    * respondTo(request, response, {
    *   json: function () {
    *     response.json(data);
    *   },
    *   html: function () {
    *     response.render(data);
    *   }
    * });
    *
    * @param {Object}  request     The request object
    * @param {Object}  response    The request response
    * @param {Object}  formats     An object with formats as keys and functions as values.
    */
    respondTo: function (request, response, formats) {
        var format = request.accepts(Object.keys(formats));
        if (format)
            return formats[format]();
        response.status(406).send("Not Acceptable");
    },


    /**
    * Generates and saves a nonce for a given action
    *
    * @param {Object}  request    The request object
    * @param {String}  action     The action that the nonce will validate. For example, 'cars/delete'. The name given will be used to look up the expected nonce during validation. Currently, validation requires that the name be of a format `baseUrl/routePath`, where baseUrl is the base url that the form is submitted to, and routePath is the path the form is submitted to. If the form will be submitted to `.post('/turnOn/', ...)` which is mounted using `app.route('/cars', ...)`, the action would be `cars/turnOn'.
    *
    * @return {String}    A random hexidecimal code
    */
    setupNonce: function (request, action) {
        var nonceStore = request.session.nonce;

        if (!nonceStore)
            nonceStore = request.session.nonce = {};

        var nonce = generateNonce(action);
        nonceStore[action] = nonce;

        return nonce;
    },


    /**
    * Middleware to validate a nonce. If the nonce is not valid, reply with an error.
    *
    * @param {Object}  request     The request object
    * @param {Object}  response    The request response
    * @param {Object}  next        The next handler for the route
    */
    validateNonce: function (request, response, next) {
        var action = request.baseUrl.split('/')[1] + '/' + request.route.path.split('/')[1];
        var nonce = request.body.nonce;

        var nonceStore = request.session.nonce;

        if (!nonceStore) {
            // the user doesn't even have a session
            // definitely something is wrong
            response.sendStatus(401);
        }

        var expectedNonce = nonceStore[action];

        if (expectedNonce && expectedNonce === nonce) {
            logExceptOnTest("\nNONCE IS VALIDATED\n");

            // remove the nonce
            delete nonceStore[action];
            next();
        } else {
            logExceptOnTest("\nINVALID NONCE\n");
            response.sendStatus(401);
        }
    }
};