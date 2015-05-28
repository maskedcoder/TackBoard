var request = require('request'),
    cheerio = require('cheerio'),
    parseString = require('xml2js').parseString;

/**
 * Get OEmbed data from the href of a <link> tag
 *
 * @param {Object}  linkElement    A Cheerio-wrapped <link> element
 * @param {Function}  cb           Callback to execute when data has been gathered. If an error occurs, the first argument will be the error and the second argument will be null. For normal execution, the first argument will be falsy and the second will contain the data gathered.
 * @return null
 * @private
 */
var getOEmbed = function (linkElement, cb) {
  var url = linkElement.attr('href'),
      isJson = linkElement.attr('type').indexOf('xml') === -1;

  request(link, function (error, response, body) {
    if (error) {
      console.error(error);
      cb(error, null);
      return;
    }

    if (isJson) {
      cb(null, JSON.parse(body));
    } else {
      parseString(body, function (error, result) {
        if (error) {
          console.error(error);
          cb(error, null);
          return;
        }

        cb(null, result);
      });
    }
  });
};

/**
 * Get data from Twitter Cards
 *
 * @param {Object}  $       A Cheerio-wrapped DOM
 * @param {Function}  cb    Callback to execute when data has been gathered. If an error occurs, the first argument will be the error and the second argument will be null. For normal execution, the first argument will be falsy and the second will contain the data gathered.
 * @return null
 * @private
 */
var getTwitterCard = function ($, cb) {
  var data = {},
      name;

  $('meta[name^="twitter:"]').each(function (i, el) {
    name = el.name.split(":")[1];
    data[name] = el.content;
  });

  process.nextTick(function () {
    cb(null, data);
  });
};

/**
 * Get Open Graph Protocol data
 * This is a very simplistic data scraper. It is not based on any official schema, but tries to parse based on
 * the colons in the property attribute. So it works for malformed or `unofficial` properties, but you might not
 * get what you expect.
 *
 * @param {Object}  $       A Cheerio-wrapped DOM
 * @param {Function}  cb    Callback to execute when data has been gathered. If an error occurs, the first argument will be the error and the second argument will be null. For normal execution, the first argument will be falsy and the second will contain the data gathered.
 * @return null
 * @private
 */
var getOpenGraph = function ($, cb) {
  var data = {},
      parts,
      content,
      weight,
      i,
      obj,
      tmpObj,
      name,
      lastIndex;

  $('meta[property^="og:"]').each(function (index, el) {
    parts = el.getAttribute('property').split(":");
    content = el.content || el.getAttribute('value');
    weight = parts.length;
    obj = data; // The current data object

    // Now we look through the data object to find the right spot to store the content
    for (i = 0; i < weight; i++ ) {
      name = parts[i];

      if (i == weight - 1) {
        // This is the final part, i.e. where the value is set

        if (!obj[name]) {
          // The field has not been set

          obj[name] = content;

        } else if (Array.isArray(obj[name])) {
          // The field is an array, so push the content onto it

          obj[name].push(content);

        } else {
          // The field already has a value, so make it an array

          tmpObj = obj[name];
          obj[name] = [tmpObj, content];

        }

      } else {
        // Get to the next part

        if (!obj[name]) {
          // The next field needs to be an object

          obj[name] = {};
          obj = obj[name];

        } else if (Array.isArray(obj[name])) {
          // The field is an array
          // The last part of the array is the active part that should be changed

          lastIndex = obj[name].length - 1;
          tmpObj = obj[name][lastIndex];

          if (typeof tmpObj === 'object') {
            // The last member of the array is an object, so we're fine to continue
            obj = tmpObj;
          } else {
            // It's a string or something, so we have to do some scrambling
            obj[name][lastIndex] = {
              "value": tmpObj
            };
            obj = obj[name][lastIndex];
            // There was probably a better way to do all that...
          }

        } else if (typeof obj[name] === 'object') {
          // The field is an object

          obj = obj[name];

        } else {
          // The field already has a value, so make it an object

          tmpObj = obj[name];
          obj[name] = {
            "_main": tmpObj
          };
          obj = obj[name];

        }

      }
    }
  });

  process.nextTick(function () {
    cb(null, data);
  });
};

/**
 * Get the meta data from standard HTML elements
 *
 * @param {Object}  $       A Cheerio-wrapped DOM
 * @param {Function}  cb    Callback to execute when data has been gathered. If an error occurs, the first argument will be the error and the second argument will be null. For normal execution, the first argument will be falsy and the second will contain the data gathered.
 * @return null
 * @private
 */
var getHTMLMetaData = function ($, cb) {
  var data = {},
      name;

  $('title').each(function (i, el) {
    data.title = el.content;
  });
  $('meta[name="description"]').each(function (i, el) {
    data.description = el.content;
  });
  $('meta[name="author"]').each(function (i, el) {
    data.author = el.content;
  });

  process.nextTick(function () {
    cb(null, data);
  });
};

/**
 * parseEmbed module extracts data from websites
 *
 * @param {String}  url     Link to the target page
 * @param {Function}  cb    Callback to execute when data has been gathered. If an error occurs, the first argument will be the error and the second argument will be null. For normal execution, the first argument will be falsy and the second will contain the data gathered.
 * @return null
 */
module.exports = function (url, cb) {
  request(url, function (error, response, body) {
    var $,
        data,
        $query;
    if (error) {
      console.error(error);
      process.nextTick(function () {
        cb(error, null);
      });
      return;
    }

    // Initialize cheerio
    $ = cheerio.load(body);

    // Check for oEmbed
    $query = $('link[type*="oembed"]')
    if ($query.length) {
      return getOEmbed($query, cb);
    } else if ($('meta[name="twitter:card"]').length) {
      return getTwitterCard($, cb);
    } else if ($('meta[property="og:title"]').length) {
      return getOpenGraph($, cb);
    } else {
      return getHTMLMetaData($, cb);
    }
  });
};
