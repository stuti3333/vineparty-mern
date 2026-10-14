const { io } = require('socket.io-client');
const fs = require('fs');
const URL = 'http://localhost:' + (process.env.PORT || 3000),
  N = +process.env.N || 12,
  ACTS = +process.env.ACTS || 300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hr = () => Number(process.hrtime.bigint()) / 1e6;
const pct = (a, p) => {
  a = [...a].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))];
};
const room = 'T' + Math.random().toString(36).slice(2, 6).toUpperCase();

function client(id, create = true) {
  return new Promise((res) => {
    const s = io(URL, { transports: ['websocket'], forceNew: true });
    s.id2 = id;
    s.last = null;
    s.on('connect', () => s.emit('join', { room, id, name: id, create }));
    s.on('state', (m) => {
      s.last = m;
      s.emit_('st', m);
    });
    s.emit_ = (e, m) =>
      s.listeners_ && (s.listeners_[e] || []).forEach((f) => f(m));
    s.onSt = (f) => {
      (s.listeners_ = s.listeners_ || {}).st = [
        ...((s.listeners_ || {}).st || []),
        f,
      ];
      return () => (s.listeners_.st = s.listeners_.st.filter((x) => x !== f));
    };
    const off = s.onSt(() => {
      off();
      res(s);
    });
  });
}
(async () => {
  const out = { users: N, actions: ACTS, room };
  const cs = [];
  for (let i = 0; i < N; i++) cs.push(await client('u' + i));
  cs[0].emit('pl', { act: 'add', item: { title: 'A', src: 'http://x/a.mp4' } });
  cs[0].emit('pl', { act: 'add', item: { title: 'B', src: 'http://x/b.mp4' } });
  await sleep(200);

  const lat = [];
  for (let k = 1; k <= ACTS; k++) {
    const s = cs[k % N],
      t0 = hr();
    let got = 0;
    await new Promise((r) => {
      cs.filter((c) => c !== s).forEach((c) => {
        const off = c.onSt((m) => {
          if (m.pos === k + 1000) {
            lat.push(hr() - t0);
            off();
            if (++got === N - 1) r();
          }
        });
      });
      s.emit('ctl', {
        act: k % 3 === 0 ? 'play' : k % 3 === 1 ? 'pause' : 'seek',
        t: k + 1000,
      });
    });
    await sleep(15);
  }
  out.latency_ms = {
    samples: lat.length,
    p50: +pct(lat, 0.5).toFixed(2),
    p95: +pct(lat, 0.95).toFixed(2),
    p99: +pct(lat, 0.99).toFixed(2),
    max: +Math.max(...lat).toFixed(2),
  };

  cs.forEach((c, i) => c.emit('ctl', { act: 'seek', t: 5000 + i }));
  await sleep(300);
  const fin = new Set(cs.map((c) => c.last.seq + ':' + c.last.pos));
  out.concurrent = {
    clients_firing: N,
    distinct_final_states: fin.size,
    converged: fin.size === 1,
  };

  cs[1].emit('ctl', { act: 'play', t: 42 });
  await sleep(1500);
  const late = await client('late', false);
  out.late_join = {
    playing: late.last.playing,
    reported_pos: late.last.pos,
    state_age_s: +((Date.now() - late.last.at) / 1000).toFixed(2),
  };

  const before = late.last.users.length;
  late.close();
  await sleep(150);
  const back = await client('late', false);
  out.reconnect = {
    users_before: before,
    users_after: back.last.users.length,
    duplicate_seat: back.last.users.filter((u) => u.id === 'late').length > 1,
    got_state: back.last.playlist.length > 0,
  };

  out.unknown_room = await new Promise((r) => {
    const s = io(URL, { transports: ['websocket'], forceNew: true });
    s.on('connect', () =>
      s.emit('join', { room: 'NOPE9', id: 'x', name: 'x' }),
    );
    s.on('err', (e) => {
      s.close();
      r(e.msg);
    });
    setTimeout(() => r('no reply'), 2000);
  });

  const h = cs.find((c) => c.last.host === c.id2);
  h.close();
  await sleep(500);
  const kept = cs.find((c) => c !== h).last.host === h.id2;
  await sleep(8500);
  const nh = cs.filter((c) => c !== h).map((c) => c.last.host);
  out.host_transfer = {
    host_kept_during_grace: kept,
    new_host_agreed_by_all: new Set(nh).size === 1 && nh[0] !== h.id2,
  };

  const ref = cs.find((c) => c !== h),
    idx0 = ref.last.idx;
  cs.filter((c) => c !== h).forEach((c) =>
    c.emit('ctl', { act: 'next', from: idx0 }),
  );
  await sleep(300);
  out.ended_storm = {
    advanced_by: (ref.last.idx - idx0 + 2) % 2,
    playlist_len: 2,
  };

  console.log(JSON.stringify(out, null, 2));
  fs.writeFileSync(__dirname + '/results.json', JSON.stringify(out, null, 2));
  process.exit(0);
})();
