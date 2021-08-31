#!/usr/bin/env node

'use strict';

/* eslint-disable no-shadow, no-console */

const fs = require('fs');
const net = require('net');
const debug = require('debug')('webpack-dev-server');
const importLocal = require('import-local');
const yargs = require('yargs');

const webpack = require('webpack');
const Server = require('../lib/Server');

const setupExitSignals = require('../lib/utils/setupExitSignals');
const colors = require('../lib/utils/colors');
const processOptions = require('../lib/utils/processOptions');
const createLogger = require('../lib/utils/createLogger');
const getVersions = require('../lib/utils/getVersions');
const options = require('./options');

let server;
// Todo: why? 用对象属性的方式，为了方便更新？
const serverData = {
  server: null,
};
// we must pass an object that contains the server object as a property so that
// we can update this server property later, and setupExitSignals will be able to
// recognize that the server has been instantiated, because we will set
// serverData.server to the new server object.
// Tip:
// 我们必须传递一个包含服务器对象作为属性的对象，以便我们可以稍后更新此服务器属性。
// 并且 setupExitSignals 将能够认识到服务器已被实例化，因为我们将 serverData.server 设置为新的服务器对象。
setupExitSignals(serverData);

// Prefer the local installation of webpack-dev-server
// 首选本地安装 webpack-dev-server
if (importLocal(__filename)) {
  debug('Using local install of webpack-dev-server');

  return;
}

try {
  require.resolve('webpack-cli');
} catch (err) {
  console.error('The CLI moved into a separate package: webpack-cli');
  console.error(
    "Please install 'webpack-cli' in addition to webpack itself to use the CLI"
  );
  console.error('-> When using npm: npm i -D webpack-cli');
  console.error('-> When using yarn: yarn add -D webpack-cli');

  // why set exitcode 1 ?
  process.exitCode = 1;
}

yargs.usage(
  `${getVersions()}\nUsage:  https://webpack.js.org/configuration/dev-server/`
);

// webpack-cli@3.3 path : 'webpack-cli/bin/config/config-yargs'
let configYargsPath;
try {
  require.resolve('webpack-cli/bin/config/config-yargs');
  configYargsPath = 'webpack-cli/bin/config/config-yargs';
} catch (e) {
  configYargsPath = 'webpack-cli/bin/config-yargs';
}
// eslint-disable-next-line import/no-extraneous-dependencies
// eslint-disable-next-line import/no-dynamic-require
require(configYargsPath)(yargs);

// It is important that this is done after the webpack yargs config,
// so it overrides webpack's version info.
yargs.version(getVersions());
yargs.options(options);

// 获取参数
const argv = yargs.argv;

// webpack-cli@3.3 path : 'webpack-cli/bin/utils/convert-argv'
let convertArgvPath;
try {
  require.resolve('webpack-cli/bin/utils/convert-argv');
  convertArgvPath = 'webpack-cli/bin/utils/convert-argv';
} catch (e) {
  convertArgvPath = 'webpack-cli/bin/convert-argv';
}
// eslint-disable-next-line import/no-extraneous-dependencies
// eslint-disable-next-line import/no-dynamic-require

// 通过 webpack-cli 和 yargs 合并配置
const config = require(convertArgvPath)(yargs, argv, {
  outputFilename: '/bundle.js',
});

function startDevServer(config, options) {
  const log = createLogger(options);

  let compiler;

  try {
    // Todo: webpack的产物
    compiler = webpack(config);
  } catch (err) {
    if (err instanceof webpack.WebpackOptionsValidationError) {
      log.error(colors.error(options.stats.colors, err.message));
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }

    throw err;
  }

  try {
    server = new Server(compiler, options, log);
    serverData.server = server;
  } catch (err) {
    if (err.name === 'ValidationError') {
      log.error(colors.error(options.stats.colors, err.message));
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }

    throw err;
  }

  //  options.socket is what?
  if (options.socket) {
    server.listeningApp.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        const clientSocket = new net.Socket();

        clientSocket.on('error', (err) => {
          if (err.code === 'ECONNREFUSED') {
            // No other server listening on this socket so it can be safely removed
            fs.unlinkSync(options.socket);

            server.listen(options.socket, options.host, (error) => {
              if (error) {
                throw error;
              }
            });
          }
        });

        clientSocket.connect({ path: options.socket }, () => {
          throw new Error('This socket is already used');
        });
      }
    });

    server.listen(options.socket, options.host, (err) => {
      if (err) {
        throw err;
      }

      // chmod 666 (rw rw rw)
      const READ_WRITE = 438;

      fs.chmod(options.socket, READ_WRITE, (err) => {
        if (err) {
          throw err;
        }
      });
    });
  } else {
    // 服务启动
    server.listen(options.port, options.host, (err) => {
      if (err) {
        throw err;
      }
    });
  }
}

processOptions(config, argv, (config, options) => {
  startDevServer(config, options);
});
