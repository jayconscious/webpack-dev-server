'use strict';

const createConfig = require('./createConfig');
const defaultPort = require('./defaultPort');
const findPort = require('./findPort');

function processOptions(config, argv, callback) {
  // processOptions {Promise}
  if (typeof config.then === 'function') {
    config
      .then((conf) => processOptions(conf, argv, callback))
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err.stack || err);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      });

    return;
  }

  // Taken out of yargs because we must know if
  // it wasn't given by the user, in which case
  // we should use portfinder.

  // 从 yargs 中取出，因为我们必须知道它是否不是由用户提供的，
  // 在这种情况下我们应该使用 portfinder
  const options = createConfig(config, argv, { port: defaultPort });

  if (options.socket) {
    callback(config, options);
  } else {
    findPort(options.port)
      .then((port) => {
        options.port = port;
        callback(config, options);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err.stack || err);
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      });
  }
}

module.exports = processOptions;
