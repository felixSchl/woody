import _ from 'lodash';
import Level from './Level';
import moment from 'moment';
import { timestamped, level } from './comb';
import Promise from 'promise';

/**
 * @class
 */

export default class Logger {

  /*
   * @constructor
   *
   * @param {Function} commit
   * Given a rendered context stack, commit it, e.g. print to console.
   *
   * @param {Function} render
   * Transform the context stack into a single object, e.g. a string.
   *
   * @param {Object[]} contexts
   * The context stack the logger is running in.
   *
   * @param {(Boolean|Function)[]} conditions
   */

  constructor(committers, render, contexts=[], conds=[]) {
    this._committers = _.isArray(committers) ? committers : [ committers ];
    this._render = render;
    this._contexts = contexts;
    this._conditions = conds;
  }

  /**
   * Helper function to register various log levels.
   *
   * @private
   *
   * @param {string} level - The log level.
   *
   * @param {Object[]} x - The messages to log.
   *
   * @returns {undefined} - Void.
   */

  _log(level, args) {
    if (_.all(
      this._conditions
    , cond => (
        _.isFunction(cond)
          ? cond(level)
          : (_.isNumber(cond) ? (level >= cond) : cond)))
    ) {
      var p = this._commit(
        level
      , this._render.call(
          this
        , level
        , _.map(this._contexts, context =>
            _.isFunction(context)
              ? context.apply({ level: level})
              : context)
        , _.toArray(args)));
      return this._createHull(_.bindAll(p));
    } else {
      var p = Promise.resolve(undefined);
      return this._createHull(_.bindAll(p));
    }
  };

  _createHull(extra) {
    return _.assign({
      fatal:    _.bind(this.fatal, this)
    , error:    _.bind(this.error, this)
    , warn:     _.bind(this.warn, this)
    , log:      _.bind(this.log, this)
    , info:     _.bind(this.info, this)
    , debug:    _.bind(this.debug, this)
    , trace:    _.bind(this.trace, this)
    , fork:     _.bind(this.fork, this)
    , module:   _.bind(this.module, this)
    , push:     _.bind(this.push, this)
    , if:       _.bind(this.if, this)
    , to:       _.bind(this.to, this)
    , sequence: _.bind(this.sequence, this)
    }, extra);
  }

  _commit(level, message) {
    return Promise.all(_.map(this._committers, committer => {
      // the committer may take an optional callback
      if (committer.length > 2) {
        return new Promise((resolve, reject) => {
          committer.call(this, level, message, (err) => {
            if (err) {
              reject(err)
            } else {
              resolve(undefined);
            }
          });
        });
      } else {
        // allow the committer to return a promise
        return Promise.resolve(committer.call(this, level, message));
      }
    }));
  }

  /**
   * Provide log levels as specied in log4js.
   */

  fatal() { return this._log(Level.FATAL, _.toArray(arguments)); }
  error() { return this._log(Level.ERROR, _.toArray(arguments)); }
  warn()  { return this._log(Level.WARN,  _.toArray(arguments)); }
  log()   { return this._log(Level.INFO,  _.toArray(arguments)); }
  info()  { return this._log(Level.INFO,  _.toArray(arguments)); }
  debug() { return this._log(Level.DEBUG, _.toArray(arguments)); }
  trace() { return this._log(Level.TRACE, _.toArray(arguments)); }

  /**
   * Contextualize the logger.
   *
   * @param {!Object} context
   * The context to push, usually a string.
   *
   * @returns {!Logger}
   * Returns a new logger with a new context pushed onto it's context stack.
   */

  fork(context) {
    return new Logger(
        this._committers
      , this._render
      , this._contexts.concat(
          (_.isUndefined(context) || _.isNull(context))
            ? []
            : [context])
      , this._conditions.concat([]));
  }

  /**
   * Alias for `fork`
   * @deprecated
   */

  push(context) {
    return this.fork(context);
  }


  /**
   * Alias for `fork`
   */

  module(context) {
    return this.fork(context);
  }

  /**
   * Conditionally cull logs
   */

  if(cond) {
    return new Logger(
        this._committers
      , this._render
      , this._contexts.concat([])
      , this._conditions.concat(
          (_.isUndefined(cond) || _.isNull(cond))
            ? []
            : [cond]));
  }

  /**
   * Route traffic to these committers
   */

  to(...committers) {
    if (!committers.length) {
      return this;
    }

    return new Logger(
        this._committers.concat(committers)
      , this._render
      , this._contexts
      , this._conditions
    );
  }

  /**
   * Pipe the rendered output of this logger into another
   * committer.
   *
   * @param {!Logger} other
   * The logger to sequence
   *
   * @returns {!Logger}
   * Returns a new Logger instance.
   */

  sequence(other) {
    const self = this;
    return new Logger(
      (level, [left, right]) => {
        self._commit.call(self, level, left);
        other._commit.call(other, level, right);
      }
    , (level, contexts, messages) =>
        [ self._render.call(self, level, contexts, messages)
        , other._render.call(other, level, contexts, messages) ]
    , self._contexts
    , self._conditions);
  }
}
