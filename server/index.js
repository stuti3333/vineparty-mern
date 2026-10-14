require('dotenv').config();
const path = require('path');
const os = require('os');
const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const { Rooms } = require('./rooms');
const attach = require('./socket');

const PORT = +process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const BUILD = path.join(__dirname, '..', 'client', 'build');

const app = express();
const server = http.createServer(app);
const rooms = new Rooms();
const io = new Server(server, {
  cors: { origin: dev ? true : process.env.CLIENT_ORIGIN || false },
  pingInterval: 10000,
  pingTimeout: 8000,
});

app.use(cors({ origin: dev ? true : process.env.CLIENT_ORIGIN || false }));
app.use(express.json({ limit: '20kb' }));

if (process.env.MONGODB_URI !== 'off') {
  mongoose
    .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vineparty', {
      serverSelectionTimeoutMS: 3000,
    })
    .then(() =>
      console.log('MongoDB connected — rooms persist across restarts'),
    )
    .catch((e) =>
      console.warn(
        'MongoDB not reachable — running in memory only (' +
          String(e.message).split('\n')[0] +
          ')',
      ),
    );
}

app.get('/api/health', (_q, r) =>
  r
    .set('cache-control', 'no-store')
    .json({
      ok: true,
      rooms: rooms.size,
      db: rooms.dbReady(),
      uptime: Math.round(process.uptime()),
    }),
);
app.get('/api/info', (_q, r) => {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  r.set('cache-control', 'no-store').json({ lan, port: PORT });
});
app.get('/api/room/:code', async (q, r) =>
  r
    .set('cache-control', 'no-store')
    .json({ exists: await rooms.exists(String(q.params.code).toUpperCase()) }),
);
app.get('/r/:code', (q, r) =>
  r.redirect(
    '/#/r/' +
      String(q.params.code)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, ''),
  ),
);

app.use(express.static(BUILD));
app.get(/^\/(?!api\/|socket\.io\/).*/, (_q, r, next) =>
  r.sendFile(path.join(BUILD, 'index.html'), (e) => e && next()),
);
app.use('/api', (_q, r) => r.status(404).json({ error: 'Not found' }));

attach(io, rooms);
server.listen(PORT, () =>
  console.log(
    `VineParty API on http://localhost:${PORT}` +
      (dev ? '  (dev: React runs on :3001)' : ''),
  ),
);
module.exports = { server, io, rooms };
