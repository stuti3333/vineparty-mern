const now = () => Date.now();

const clean = (s, n) =>
  String(s == null ? '' : s)
    .replace(/[<>]/g, '')
    .slice(0, n);

const MAX_USERS = 60;

const isYouTubeTrailerId = (id) => /^[\w-]{11}$/.test(String(id || ''));

const isDirectVideoUrl = (url) => /^https?:\/\//i.test(String(url || ''));

module.exports = function attach(io, rooms) {
  io.on('connection', (socket) => {
    let R = null;
    let U = null;

    const push = () => {
      R.seq++;
      io.to(R.code).emit('state', R.state());
      rooms.save(R);
    };

    const on = (ev, fn) =>
      socket.on(ev, (m) => {
        if (!R || !U || U.sock !== socket) return;

        try {
          fn(m && typeof m === 'object' ? m : {});
        } catch (e) {
          console.error(ev, e);
        }
      });

    socket.on('ping', (t0) => socket.emit('pong', { t0, ts: now() }));

    socket.on('join', async (m) => {
      try {
        m = m || {};

        const code = clean(m.room, 8).toUpperCase();
        const id = clean(m.id, 24);

        if (!id) {
          return socket.emit('err', {
            msg: 'Missing client id',
          });
        }

        const room = await rooms.fetch(code, !!m.create);

        if (!room) {
          return socket.emit('err', {
            msg: 'Room not found',
          });
        }

        if (room.users.size >= MAX_USERS && !room.users.has(id)) {
          return socket.emit('err', {
            msg: 'Room full',
          });
        }

        R = room;
        clearTimeout(R.timers.gc);

        const name = clean(m.name || 'Guest', 20).trim() || 'Guest';

        U = R.users.get(id);

        if (U) {
          const old = U.sock;

          U.sock = socket;
          U.on = true;
          U.name = name;

          if (old && old !== socket) {
            old.disconnect(true);
          }
        } else {
          U = {
            id,
            name,
            sock: socket,
            on: true,
            tok: 10,
            tt: now(),
          };

          R.users.set(id, U);
        }

        socket.join(R.code);

        if (!R.host || !R.users.get(R.host) || !R.users.get(R.host).on) {
          R.host = U.id;
        }

        R.seq++;

        socket.emit('state', {
          ...R.state(),
          first: true,
          me: U.id,
          chat: R.chat.slice(-50),
          heat: R.heat,
          now: now(),
        });

        socket.to(R.code).emit('state', R.state());

        rooms.save(R);
      } catch (e) {
        console.error('join', e);

        socket.emit('err', {
          msg: 'Could not join room',
        });
      }
    });

    // Playback controls and synchronized state.
    on('ctl', (m) => {
      const t = Math.max(0, +m.t || 0);

      if (m.act === 'play') {
        R.playing = true;
        R.pos = t;
      } else if (m.act === 'pause') {
        R.playing = false;
        R.pos = t;
      } else if (m.act === 'seek') {
        R.pos = t;
      } else if (m.act === 'next') {
        // Prevent multiple clients advancing the same queue item.
        if (m.from !== R.idx) return;

        R.go(R.idx + 1);
      } else if (m.act === 'jump') {
        R.go(+m.i | 0);
      } else {
        return;
      }

      R.at = now();
      R.seq++;

      io.to(R.code).emit('state', {
        ...R.state(),
        ctl: {
          by: U.id,
          _t: +m._t || 0,
        },
      });

      rooms.save(R);
    });

    // Chat messages.
    on('chat', (m) => {
      const text = clean(m.text, 300).trim();

      if (!text) return;

      const c = {
        id: ++R.n,
        u: U.id,
        name: U.name,
        text,
        ts: now(),
      };

      R.chat.push(c);

      if (R.chat.length > 100) {
        R.chat.shift();
      }

      io.to(R.code).emit('chat', c);

      rooms.save(R);
    });

    // Reactions.
    on('react', (m) => {
      const e = clean(m.e, 8);

      U.tok = Math.min(10, U.tok + (now() - U.tt) / 100);
      U.tt = now();

      if (U.tok < 1 || !e) return;

      U.tok--;

      const t = +m.t || 0;

      R.heat.push({ t, e });

      if (R.heat.length > 800) {
        R.heat.shift();
      }

      io.to(R.code).emit('react', {
        e,
        t,
        name: U.name,
        u: U.id,
      });
    });

    // Playlist: accepts YouTube trailers or direct video URLs.
    on('pl', (m) => {
      if (m.act === 'add' && m.item) {
        const trailerId = String(m.item.trailerId || '');
        const src = String(m.item.src || '');

        const validTrailer = isYouTubeTrailerId(trailerId);
        const validDirectVideo = isDirectVideoUrl(src);

        // A YouTube item does not need a direct video-file URL.
        if (!validTrailer && !validDirectVideo) {
          return;
        }

        R.playlist.push({
          id: ++R.n,
          title: clean(m.item.title, 80) || 'Untitled',

          // Keep the URL for direct videos. YouTube uses trailerId.
          src: validDirectVideo ? clean(src, 400) : '',

          trailerId: validTrailer ? trailerId : '',

          c: (Array.isArray(m.item.c) ? m.item.c : [])
            .slice(0, 2)
            .map((x) => clean(x, 9)),

          pid: clean(m.item.pid, 12),
          by: U.name,
        });

        if (R.playlist.length === 1) {
          R.idx = 0;
          R.pos = 0;
          R.playing = false;
          R.at = now();
        }

        return push();
      }

      if (m.act === 'remove') {
        const i = R.playlist.findIndex((x) => x.id === m.id);

        if (i < 0 || (R.host !== U.id && R.playlist[i].by !== U.name)) {
          return;
        }

        R.playlist.splice(i, 1);

        if (i < R.idx) {
          R.idx--;
        } else if (i === R.idx) {
          R.pos = 0;
          R.at = now();
          R.playing = false;
          R.idx = Math.min(R.idx, Math.max(0, R.playlist.length - 1));
        }

        push();
      }
    });

    // Polls.
    on('poll', (m) => {
      const q = clean(m.q, 90).trim();

      const opts = (Array.isArray(m.opts) ? m.opts : [])
        .slice(0, 6)
        .map((t) => ({
          t: clean(t, 40).trim(),
          v: [],
        }))
        .filter((o) => o.t);

      if (!q || opts.length < 2) return;

      R.polls.push({
        id: ++R.n,
        q,
        opts,
        act: m.act === 'next' || m.act === 'pause' ? m.act : null,
        open: true,
        done: false,
        by: U.name,
      });

      if (R.polls.length > 8) {
        R.polls.shift();
      }

      push();
    });

    // Poll votes.
    on('vote', (m) => {
      const p = R.polls.find((x) => x.id === m.pid);

      if (!p || !p.open || !p.opts[m.i]) return;

      p.opts.forEach((o) => {
        o.v = o.v.filter((x) => x !== U.id);
      });

      p.opts[m.i].v.push(U.id);

      if (p.act && m.i === 0 && p.opts[0].v.length > R.online().length / 2) {
        p.open = false;
        p.done = true;

        if (p.act === 'next') {
          R.go(R.idx + 1);
        } else {
          if (R.playing) {
            R.pos += (now() - R.at) / 1000;
          }

          R.playing = false;
        }

        R.at = now();
      }

      push();
    });

    // Close polls.
    on('closepoll', (m) => {
      const p = R.polls.find((x) => x.id === m.pid);

      if (p && R.host === U.id) {
        p.open = false;
        push();
      }
    });

    // Transfer host privileges.
    on('host', (m) => {
      const t = R.users.get(m.to);

      if (R.host === U.id && t && t.on) {
        R.host = t.id;
        push();
      }
    });

    // Handle a user leaving or disconnecting.
    const drop = () => {
      if (!R || !U || U.sock !== socket) return;

      const room = R;
      const id = U.id;

      U.on = false;

      push();

      if (room.host === id) {
        setTimeout(() => {
          const h = room.users.get(id);

          if (room.host === id && h && !h.on) {
            const n = room.online()[0];

            if (n) {
              room.host = n.id;
              room.seq++;

              io.to(room.code).emit('state', room.state());

              rooms.save(room);
            }
          }
        }, 8000);
      }

      if (!room.online().length) {
        rooms.release(room);
      }
    };

    on('bye', () => {
      drop();
      socket.leave(R.code);
    });

    socket.on('disconnect', drop);
  });
};
