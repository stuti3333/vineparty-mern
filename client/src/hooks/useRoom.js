import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API } from '../lib/net';

const MAX = 100;
const push = (arr, v) => {
  arr.push(v);
  if (arr.length > MAX) arr.shift();
};

export default function useRoom({ code, me, create, qpick, onError }) {
  const [S, setS] = useState(null);
  const [chat, setChat] = useState([]);
  const [heat, setHeat] = useState([]);
  const [flies, setFlies] = useState([]);
  const [live, setLive] = useState(false);
  const R = useRef({
    sock: null,
    S: null,
    off: 0,
    rtt: 0,
    samp: [],
    wasLive: false,
    drift: 0,
    fixes: 0,
    perf: { ctl: [], drift: [], reconnects: 0, msgs: 0 },
  }).current;
  const errRef = useRef(onError);
  errRef.current = onError;

  const sNow = useCallback(() => Date.now() + R.off, [R]);
  const send = useCallback(
    (ev, payload = {}) => {
      if (!R.sock || !R.sock.connected) return;
      if (ev === 'ctl') payload._t = Date.now();
      R.perf.msgs++;
      R.sock.emit(ev, payload);
    },
    [R],
  );

  useEffect(() => {
    const sock = io(API || undefined, {
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 5000,
    });
    R.sock = sock;
    const ping = () => sock.connected && sock.emit('ping', Date.now());
    sock.on('connect', () => {
      setLive(true);
      sock.emit('join', {
        room: code,
        id: me.id,
        name: me.name,
        create: create || R.wasLive,
      });
      ping();
      for (let i = 1; i < 5; i++) setTimeout(ping, i * 150);
    });
    sock.on('disconnect', () => {
      setLive(false);
      R.perf.reconnects++;
    });
    sock.on('pong', ({ t0, ts }) => {
      const t1 = Date.now(),
        r = t1 - t0;
      R.samp.push({ r, o: ts + r / 2 - t1 });
      if (R.samp.length > 8) R.samp.shift();
      R.off = R.samp.reduce((a, s) => (s.r < a.r ? s : a)).o;
      R.rtt = r;
    });
    sock.on('err', (m) => errRef.current && errRef.current(m.msg));
    sock.on('state', (m) => {
      if (m.ctl && m.ctl.by === me.id && m.ctl._t)
        push(R.perf.ctl, Date.now() - m.ctl._t);
      if (m.first) {
        R.wasLive = true;
        setChat(m.chat || []);
        setHeat(m.heat || []);
        if (qpick && !m.playlist.length)
          sock.emit('pl', {
            act: 'add',
            item: { title: qpick.t, src: qpick.src, c: qpick.c, pid: qpick.id },
          });
      }
      R.S = m;
      setS(m);
    });
    sock.on('chat', (m) => setChat((c) => [...c.slice(-199), m]));
    sock.on('react', (m) => {
      setHeat((h) => [...h, { t: m.t, e: m.e }]);
      const k = Math.random();
      setFlies((f) => [
        ...f,
        { ...m, k, x: 8 + Math.random() * 80, r: Math.random() * 50 - 25 },
      ]);
      setTimeout(() => setFlies((f) => f.filter((x) => x.k !== k)), 2700);
    });
    const pi = setInterval(ping, 2000);
    return () => {
      clearInterval(pi);
      if (sock.connected) sock.emit('bye');
      sock.close();
      R.sock = null;
      R.S = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, me.id, me.name, create]);

  return { S, chat, heat, flies, live, send, sNow, R };
}
