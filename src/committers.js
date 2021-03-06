import _ from 'lodash';
import Level from './Level';

/*
 * Commit to nowhere.
 */
export function toNowhere() {};

/*
 * Commit message to console.
 */
export function toConsole(level, message) {
  level = Level.toString(level);
  level = _.has(console, level) ? level : 'info';
  console[level].apply(console, [message]);
};

/**
 * Commit to a log4s logger.
 *
 * @param {!Log4Js} log4jsLogger
 * The log4js logger instance to commit to.
 *
 * @returns {Function}
 * Returns a callback to create a new logger with.
 */
export function toLog4js(log4jsLogger) {
  return (level, message) => {
    level = Level.toString(level);
    level = (level === 'log') ? 'info' : level;
    if (log4jsLogger[level]) {
      log4jsLogger[level](message);
    }
  };
};
