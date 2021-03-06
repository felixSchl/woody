'use strict';

module.exports = function(config) {
  config.set({
    frameworks: ['browserify', 'mocha']
  , files: [
      './test/phantomjs.shim.js'
    , './test/log.js'
    ]
  , preprocessors: {
      './test/**/*.js': ['browserify']
    }
  , browserify: {
      debug: true
    , transform: ['babelify']
    }
  });
};
