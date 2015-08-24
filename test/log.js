'use strict';

var woody = require('..')
  , _ = require('lodash')
  , moment = require('moment')
  , assert = require('assert');

/**
 * Install source maps.
 */

require('source-map-support').install();

describe('A', function() {

  var logs = [];
  beforeEach(function() {
    logs.length = 0;
  });

  var validate = function(expected) {
    expected = _.chunk(expected, 2);
    assert.strictEqual(expected.length, logs.length);
    _.each(
      expected
    , function(x, i) {
        assert.strictEqual(x[0], logs[i].level);
        assert.strictEqual(x[1], logs[i].message);
      });
  };

  describe('baseline logger', function() {
    it('logs level and message', function() {
      var logger = woody
        .as(woody.bracketed())
        .to(function(level, message) {
          logs.push({ level: level, message: message });
        });

      logger.info('foo-0')
            .warn('foo-1')
            .error('foo-2')
            .verbose('foo-3')
            .debug('foo-4')
            .trace('foo-5')
            .log('foo-6');

      validate(
        [ woody.level.INFO, 'foo-0'
        , woody.level.WARN, 'foo-1'
        , woody.level.ERROR, 'foo-2'
        , woody.level.VERBOSE, 'foo-3'
        , woody.level.DEBUG, 'foo-4'
        , woody.level.TRACE, 'foo-5'
        , woody.level.LOG, 'foo-6' ]);
    });
  });

  describe('contextualized logger', function() {
    it('stacks it\'s contexts', function() {
      var logger = woody
        .as(function(level, contexts, message) { logs.push(contexts); })
        .to(woody.nowhere);

      logger.log();
      logger.fork('ctx').info();
      logger.log();
      logger.fork('ctx').fork('foo').fork('bar').log();

      var i = 0
        , f = logger.fork(function() { return '' + (i++); });
      _.times(2, f.log.bind(f));

      var expected = [
        []
      , [ 'ctx' ]
      , []
      , [ 'ctx', 'foo', 'bar' ]
      , [ '0' ]
      , [ '1' ] ];

      assert.strictEqual(expected.length, logs.length);
      _.each(_.zip(expected, logs), _.spread(function(ex, actual) {
        assert.strictEqual(ex.length, actual.length);
        _.each(_.zip(ex, actual), _.spread(function(exName, actualName) {
          assert.strictEqual(exName, actualName);
        }));
      }));
    });

    it('returns the same, but not identical logger if context is null/undefined', function() {
      var logger = woody
        .as(function(level, contexts, message) { logs.push(contexts); })
        .to(woody.nowhere);

      logger.log('test');
      logger.fork().log('test');

      assert.strictEqual(logs[0].length, 0);
      assert.strictEqual(logs[1].length, 0);

      logger.fork('cat').log('test');
      logger.fork('cat').fork().log('test');

      assert.strictEqual(logs[2].length, 1);
      assert.strictEqual(logs[3].length, 1);

      assert.strictEqual(logs[2][0], 'cat');
      assert.strictEqual(logs[3][0], 'cat');
    });
  });

  describe('Built-in logging combinators', function() {
    var logger = null;
    beforeEach(function() {
      logger = woody
        .as(woody.bracketed())
        .to(function(level, message) {
          logs.push({ level: level, message: message });
        });
    });

    describe('Timestamped', function() {
      it('Renders timestamps', function() {
        var loggerTimed = logger.fork(woody.timestamp());
        loggerTimed.log('test');
        var date = _.takeWhile(
          _.drop(logs[0].message, 1)
        , function(c) { return c !== ']'; }).join('');
        assert(moment(date));
      });
    });

    describe('Level', function() {
      it('Renders levels', function() {
        var loggerLevel = logger.fork(woody.level());
        loggerLevel.log('test');
        var level = _.takeWhile(
          _.drop(logs[0].message, 1)
        , function(c) { return c !== ']'; }).join('');
        assert(level === 'LOG');
      });
    });
  });

  describe('Sequencing', function() {
    describe('Logger.sequence', function() {
      it('invokes the current logger first, and then the second', function() {
        var x = null;
        var msgs = [];
        var logger1 = woody
          .as(woody.bracketed())
          .to(function(level, rendered) {
            assert.strictEqual(x, null);
            assert.strictEqual(rendered, 'test');
            x = 10;
          });

        var logger2 = woody
          .as(woody.bracketed())
          .to(function(level, rendered) {
            assert.notStrictEqual(x, null);
            assert.strictEqual(rendered, 'test');
          });

        var logger3 = logger1.sequence(logger2);

        logger3.log('test');

        assert.notStrictEqual(x, null);
      });
    });
  });
});
