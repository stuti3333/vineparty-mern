import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Boot from './components/Boot';
import Fibers from './components/Fibers';
import Intro from './components/Intro';
import Home from './components/Home';
import Room from './components/Room';
import Details from './components/Details';
import Modal from './components/Modal';
import { api } from './lib/net';
import { getMe, parseCode, routeCode, store } from './lib/util';

export default function App() {
  const me0 = useMemo(getMe, []);
  const [name, setName] = useState(me0.name);
  const me = useMemo(() => ({ id: me0.id, name }), [me0.id, name]);
  const [booted, setBooted] = useState(false);
  const [view, setView] = useState(routeCode() ? 'home' : 'intro');
  const [session, setSession] = useState(null);
  const [pick, setPick] = useState(null);
  const [detail, setDetail] = useState(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [dc, setDc] = useState('');
  const [dn, setDn] = useState(me0.name);
  const [toastMsg, setToastMsg] = useState('');
  const [netOK, setNetOK] = useState(true);
  const th = useRef(0);

  const toast = useCallback((t) => {
    setToastMsg(t);
    clearTimeout(th.current);
    th.current = setTimeout(() => setToastMsg(''), 2600);
  }, []);

  useEffect(() => {
    const check = async () => {
      let ok = false;
      try {
        const r = await api('/api/health', { cache: 'no-store' });
        ok = r.ok && (await r.json()).ok === true;
      } catch {}
      setNetOK(ok);
      return ok;
    };
    check();
    const i = setInterval(() => !document.hidden && check(), 5000);
    return () => clearInterval(i);
  }, []);

  const enterRoom = useCallback((code, n, create, qpick) => {
    store.set('vp_name', n);
    setName(n);
    setSession({ code, create, qpick: create ? qpick : null, name: n });
    setView('room');
    setPick(null);
    window.scrollTo(0, 0);
    if (routeCode() !== code) window.location.hash = '#/r/' + code;
  }, []);
  const leave = useCallback(() => {
    setSession(null);
    setView('home');
    if (routeCode()) window.history.replaceState(null, '', '#');
  }, []);
  const joinRoom = useCallback(
    async (raw, n) => {
      const c = parseCode(raw);
      if (!n || !c) return toast('Name and room code needed');
      try {
        const r = await api('/api/room/' + encodeURIComponent(c), {
          cache: 'no-store',
        });
        if (!r.ok || !(await r.json()).exists) {
          toast('Room ' + c + ' not found — check the code');
          if (routeCode() === c) window.history.replaceState(null, '', '#');
          return false;
        }
      } catch {
        toast("Can't reach the VineParty server");
        return false;
      }
      enterRoom(c, n, false);
      return true;
    },
    [enterRoom, toast],
  );

  const sess = useRef(null);
  sess.current = session;
  useEffect(() => {
    const apply = () => {
      const c = routeCode();
      if (c) {
        if (sess.current) {
          if (sess.current.code === c) return;
          leave();
        }
        setView((v) => (v === 'intro' ? 'home' : v));
        setDc(c);
        if (store.get('vp_name') || me0.name)
          joinRoom(c, store.get('vp_name') || me0.name);
        else setJoinOpen(true);
      } else if (sess.current) leave();
    };
    window.addEventListener('hashchange', apply);
    apply();
    return () => window.removeEventListener('hashchange', apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.classList.toggle('intro-on', view === 'intro');
  }, [view]);

  const showHome = () => {
    setView('home');
    window.scrollTo(0, 0);
  };
  const startParty = (m) => {
    setPick(m);
    setDetail(null);
    setTimeout(
      () =>
        document.getElementById('lobby') &&
        document.getElementById('lobby').scrollIntoView(),
      50,
    );
    toast(m.t + ' queued for your new room');
  };

  return (
    <>
      {!booted && <Boot onDone={() => setBooted(true)} />}
      <Fibers
        id="fx"
        className={view === 'intro' ? 'over' : ''}
        paused={!booted || view === 'room'}
        glowColor="#b01230"
        lineColor="#ffd9a0"
        speed={0.2}
        glow={2}
        brightness={1.4}
        vignette={0.8}
      />
      {view === 'intro' && <Intro onEnter={showHome} />}
      {view === 'home' && (
        <Home
          me={me}
          name={name}
          setName={setName}
          pick={pick}
          setPick={setPick}
          toast={toast}
          paused={detail != null}
          onCreate={(c, n) => enterRoom(c, n, true, pick)}
          onJoin={joinRoom}
          onOpenJoin={() => setJoinOpen(true)}
          onInfo={setDetail}
        />
      )}
      {view === 'room' && session && (
        <Room
          key={session.code}
          code={session.code}
          me={{ id: me0.id, name: session.name }}
          create={session.create}
          qpick={session.qpick}
          toast={toast}
          onLeave={leave}
        />
      )}
      <Details
        index={detail}
        onClose={() => setDetail(null)}
        onParty={startParty}
      />
      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} className="ctr">
        <h3>Join a room</h3>
        <p>Enter the invite code. You can set your name next.</p>
        <input
          placeholder="ROOM CODE OR INVITE LINK"
          aria-label="Room code"
          style={{ textTransform: 'uppercase' }}
          value={dc}
          onChange={(e) => setDc(e.target.value)}
          autoFocus
        />
        <input
          placeholder="Your name"
          maxLength={20}
          aria-label="Your name"
          value={dn}
          onChange={(e) => setDn(e.target.value)}
        />
        <div className="row">
          <button
            className="blue"
            onClick={async () => {
              const n = dn.trim();
              if (!n || !parseCode(dc)) return toast('Code and name needed');
              if (await joinRoom(dc, n)) setJoinOpen(false);
            }}
          >
            Join
          </button>
          <button className="ghost" onClick={() => setJoinOpen(false)}>
            Close
          </button>
        </div>
      </Modal>
      <div id="net" role="alert" className={netOK ? '' : 'on'}>
        {netOK ? '' : "Can't reach the VineParty server — retrying…"}
      </div>
      <div
        id="toast"
        role="status"
        aria-live="polite"
        className={toastMsg ? 'on' : ''}
      >
        {toastMsg}
      </div>
    </>
  );
}
