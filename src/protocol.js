const net = require('net');

/**
 * Basic protocol for communication between beetle-ssh CLI and daemon.
 * Uses JSON-RPC-like messages separated by newlines.
 */

function serialize(obj) {
  return JSON.stringify(obj) + '\n';
}

function parse(data) {
  try {
    return JSON.parse(data.toString());
  } catch (e) {
    return null;
  }
}

module.exports = {
  serialize,
  parse,
  SOCKET_PATH: '/tmp/beetle-ssh.sock'
};
