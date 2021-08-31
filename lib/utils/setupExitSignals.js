'use strict';

const signals = ['SIGINT', 'SIGTERM'];

function setupExitSignals(serverData) {
  // 监听进程信号事件，
  signals.forEach((signal) => {
    process.on(signal, () => {
      if (serverData && serverData.server) {
        serverData.server.close(() => {
          // eslint-disable-next-line no-process-exit
          process.exit();
        });
      } else {
        // eslint-disable-next-line no-process-exit
        process.exit();
      }
    });
  });
}

module.exports = setupExitSignals;
