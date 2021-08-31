'use strict';

/* global __resourceQuery WorkerGlobalScope self */

// Send messages to the outside, so plugins can consume it.
// Tip: 向外部发送消息，以便插件可以使用它
// 如果是iframe的话，应该会触发，但是如果是 hot 模式呢？
function sendMsg(type, data) {
  if (
    typeof self !== 'undefined' &&
    (typeof WorkerGlobalScope === 'undefined' ||
      !(self instanceof WorkerGlobalScope))
  ) {
    self.postMessage(
      {
        type: `webpack${type}`,
        data,
      },
      '*'
    );
  }
}

module.exports = sendMsg;
