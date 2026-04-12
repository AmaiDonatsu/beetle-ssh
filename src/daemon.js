const net = require('net');
const fs = require('fs');
const path = require('path');
const { parse, serialize, SOCKET_PATH } = require('./protocol');

const { spawn } = require('child_process');

const sessions = [];

const server = net.createServer((socket) => {
  console.log('Client connected');

  socket.on('data', (data) => {
    const msg = parse(data);
    if (!msg) return;

    switch (msg.type) {
      case 'ping':
        socket.write(serialize({ type: 'pong' }));
        break;
      case 'ps':
        socket.write(serialize({ type: 'ps', sessions: sessions.map(s => ({
          id: s.id,
          command: s.command,
          status: s.status,
          pid: s.pid,
          startedAt: s.startedAt
        })) }));
        break;
      case 'exec':
        const [cmd, ...args] = msg.command.split(' ');
        const child = spawn(cmd, args, {
          detached: true,
          stdio: 'ignore' // For now, ignore output to avoid blocking
        });
        
        child.unref();

        const session = {
          id: sessions.length + 1,
          command: msg.command,
          status: 'running',
          pid: child.pid,
          startedAt: new Date().toISOString(),
          child
        };

        child.on('exit', (code) => {
          session.status = `exited (${code})`;
        });

        sessions.push(session);
        socket.write(serialize({ type: 'exec', session: { id: session.id, pid: session.pid } }));
        break;
      default:
        socket.write(serialize({ type: 'error', message: 'Unknown command' }));
    }
  });
});

// Clean up socket file if it exists
if (fs.existsSync(SOCKET_PATH)) {
  fs.unlinkSync(SOCKET_PATH);
}

server.listen(SOCKET_PATH, () => {
  console.log(`Daemon listening on ${SOCKET_PATH}`);
});

process.on('SIGINT', () => {
  if (fs.existsSync(SOCKET_PATH)) {
    fs.unlinkSync(SOCKET_PATH);
  }
  process.exit();
});
