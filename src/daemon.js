const net = require('net');
const fs = require('fs');
const path = require('path');
const { parse, serialize, SOCKET_PATH } = require('./protocol');
const { spawn } = require('child_process');
const { Client } = require('ssh2');
const { listSshConfigs } = require('./config-store');
const { getEnv } = require('./secret-store');

const sessions = [];

const server = net.createServer((socket) => {
  console.log('Client connected');

  socket.on('data', async (data) => {
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
          startedAt: s.startedAt,
          alias: s.alias
        })) }));
        break;
      case 'create_session':
        try {
          const configs = await listSshConfigs();
          const config = configs ? configs.find(c => c.alias === msg.alias) : null;
          if (!config) {
            socket.write(serialize({ type: 'error', message: 'Alias not found' }));
            return;
          }

          const envObj = await getEnv(config.id);
          const password = envObj && envObj.SUPER_USER_PASSWORD ? envObj.SUPER_USER_PASSWORD : undefined;

          // Assumes route is like root@192.168.1.10
          let username = 'root', host = config.route, port = 22;
          if (config.route.includes('@')) {
            const parts = config.route.split('@');
            username = parts[0];
            host = parts[1];
          }
          if (host.includes(':')) {
            const hParts = host.split(':');
            host = hParts[0];
            port = parseInt(hParts[1], 10);
          }

          const conn = new Client();
          const session = {
            id: sessions.length + 1,
            command: `ssh ${config.route}`,
            status: 'connecting',
            alias: config.alias,
            pid: null, // SSH2 holds conn internally
            startedAt: new Date().toISOString(),
            output: '', // Buffer to hold session data
            conn
          };
          sessions.push(session);

          // Return immediately with the connecting status
          socket.write(serialize({ type: 'create_session', session: { id: session.id, status: session.status } }));

          conn.on('ready', () => {
            session.status = 'ready';
            conn.shell((err, stream) => {
              if (err) {
                session.status = `shell error: ${err.message}`;
                return;
              }
              session.stream = stream;

              const appendToBuffer = (text) => {
                session.output += text;
                // Amortized truncate: if > 150kb, cut down to 100kb
                if (session.output.length > 150000) {
                  session.output = session.output.slice(-100000);
                }

                // Autodetect sudo prompts and auto-fill via stream injection
                if (password) {
                  const recent = session.output.slice(-100);
                  if (/\[sudo\].*(password|contraseña).*:\s*$/i.test(recent)) {
                    stream.write(password + '\n');
                    session.output += '\n[Beetle: Sudo password auto-filled securely from vault]\n';
                  }
                }
              };

              stream.on('close', () => {
                session.status = 'closed';
                conn.end();
              }).on('data', (d) => {
                appendToBuffer(d.toString('utf8'));
              }).stderr.on('data', (d) => {
                appendToBuffer(d.toString('utf8'));
              });
            });
          }).on('error', (err) => {
            session.status = `error: ${err.message}`;
          }).on('end', () => {
            session.status = 'ended';
          }).on('close', () => {
            session.status = 'closed';
          });

          conn.connect({
            host,
            port,
            username,
            password,
            readyTimeout: 10000,
            keepaliveInterval: 30000,
            keepaliveCountMax: 3
          });
        } catch (err) {
          socket.write(serialize({ type: 'error', message: err.message }));
        }
        break;
      case 'read_session':
        const s = sessions.find(sub => sub.id === parseInt(msg.id, 10));
        if (!s) {
          socket.write(serialize({ type: 'error', message: 'Session not found' }));
        } else {
          socket.write(serialize({ type: 'read_session', output: s.output || '' }));
        }
        break;
      case 'write':
      case 'write_q':
        const targetSession = sessions.find(sub => sub.id === parseInt(msg.id, 10));
        if (!targetSession || !targetSession.stream) {
          socket.write(serialize({ type: 'error', message: 'Session stream not found or not ready' }));
          return;
        }

        targetSession.stream.write(msg.input + '\n');

        if (msg.type === 'write_q') {
          socket.write(serialize({ type: 'write_q', status: 'written' }));
        } else {
          // Give some time for the process to output data to the buffer
          setTimeout(() => {
            socket.write(serialize({ type: 'write', output: targetSession.output || '' }));
          }, 1000);
        }
        break;
      case 'drop_session': {
        const dropId = parseInt(msg.id, 10);
        const dropSessionIndex = sessions.findIndex(sub => sub.id === dropId);
        if (dropSessionIndex === -1) {
          socket.write(serialize({ type: 'error', message: 'Session not found' }));
          return;
        }
        const s = sessions[dropSessionIndex];
        if (s.stream) {
          s.stream.close();
        }
        if (s.conn) {
          s.conn.end();
          s.conn.destroy();
        }
        sessions.splice(dropSessionIndex, 1);
        socket.write(serialize({ type: 'drop_session', message: 'Session forcefully dropped' }));
        break;
      }
      case 'send_key':
        const tk = sessions.find(sub => sub.id === parseInt(msg.id, 10));
        if (!tk || !tk.stream) {
          socket.write(serialize({ type: 'error', message: 'Session stream not found' }));
          return;
        }
        tk.stream.write(msg.key);
        socket.write(serialize({ type: 'send_key', status: 'key sent' }));
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
