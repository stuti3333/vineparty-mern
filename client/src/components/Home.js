import React, { useEffect, useRef, useState } from 'react';
import { M, art } from '../data/movies';
import Discover from './Discover';
import Poster from './Poster';
import { RM, stars, code5 } from '../lib/util';

function Hero({ onParty, onInfo, paused }) {
  const [H, setH] = useState(0);
  const [shown, setShown] = useState(0);
  const [out, setOut] = useState(false);
  const th = useRef(null);

  useEffect(() => {
    if (RM || paused) return undefined;
    const t = setInterval(() => setH((x) => (x + 1) % M.length), 7000);
    return () => clearInterval(t);
  }, [H, paused]);
  useEffect(() => {
    if (H === shown) return undefined;
    setOut(true);
    const t = setTimeout(
      () => {
        setShown(H);
        setOut(false);
      },
      RM ? 0 : 300,
    );
    return () => clearTimeout(t);
  }, [H, shown]);
  useEffect(() => {
    const b = th.current && th.current.children[H];
    if (b)
      th.current.scrollTo({
        left: Math.max(0, b.offsetLeft - 12),
        behavior: RM ? 'auto' : 'smooth',
      });
  }, [H]);

  const m = M[shown];
  const w = m.t.split(' '),
    k = w.length > 2 ? Math.ceil(w.length / 2) : w.length;
  const lines = [w.slice(0, k).join(' '), w.slice(k).join(' ')].filter(Boolean);
  return (
    <section id="hero">
      <div id="hbg" />
      <div className="veil" />
      <div id="hp">
        {M.map((x, i) => (
          <div
            key={x.id}
            className={'hs' + (i === H ? ' on' : '')}
            style={{
              background: art(x).replace(/,#0e0712$/, ''),
              animation: i === H ? undefined : 'none',
            }}
          >
            <Poster m={x} cls="" hero eager={i < 2} />
          </div>
        ))}
      </div>
      <div className={'hc' + (out ? ' out' : '')}>
        <span className="pill mono">NOW SHOWING</span>
        <h2 id="ht" key={m.id}>
          {lines.map((l, j) => (
            <span key={j}>
              <em style={{ animationDelay: 0.08 + j * 0.14 + 's' }}>{l}</em>
            </span>
          ))}
        </h2>
        <p id="hmeta" className="meta">
          Movie<b>|</b>
          {m.y}
          <b>|</b>
          {m.g.join(' · ').toLowerCase()}
          <b>|</b>
          {m.age}
          <b>|</b>
          <u>{stars(m.r)}</u>
        </p>
        <p id="hd">{m.deck + ' ' + m.about}</p>
        <div className="row">
          <button className="gb" onClick={() => onParty(M[H])}>
            Start a watch party
          </button>
          <button className="ghost" onClick={() => onInfo(H)}>
            Details
          </button>
        </div>
      </div>
      <div id="thumbs" role="tablist" ref={th}>
        {M.map((x, j) => (
          <button
            key={x.id}
            className={'th' + (j === H ? ' on' : '')}
            role="tab"
            aria-selected={j === H}
            aria-label={x.t}
            onClick={() => setH(j)}
          >
            <Poster m={x} />
            <span>{x.t}</span>
            <b>{String(j + 1).padStart(2, '0')}</b>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" opacity=".3" />
              <circle className="pr" cx="12" cy="12" r="10" />
            </svg>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function Home({
  me,
  name,
  setName,
  pick,
  setPick,
  onCreate,
  onJoin,
  onOpenJoin,
  onInfo,
  toast,
  paused,
}) {
  const [jn, setJn] = useState(name),
    [jc, setJc] = useState('');
  const lobby = useRef(null);
  useEffect(() => {
    setJn(name);
  }, [name]);
  const scrollLobby = () =>
    lobby.current &&
    lobby.current.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  return (
    <div id="home">
      <header className="bar">
        <a
          href="/"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo(0, 0);
          }}
        >
          VINE<b>PARTY</b>
        </a>
        <nav aria-label="Primary">
          <a href="#hero">NOW SHOWING</a>
          <a href="#lobby">START A ROOM</a>
          <a href="#disc">DISCOVER</a>
        </nav>
        <button className="gb sm" onClick={onOpenJoin}>
          Join with code
        </button>
      </header>
      <Hero
        paused={paused}
        onInfo={onInfo}
        onParty={(m) => {
          setPick(m);
          scrollLobby();
          toast(m.t + ' will be queued in your new room');
        }}
      />
      <section id="lobby" ref={lobby}>
        <p className="mono lab">LOBBY</p>
        <h2>
          Press play <i>together.</i>
        </h2>
        <div className="two">
          <div className="panel">
            <h3>Create a room</h3>
            <p>
              Get an invite link and a 5-letter code. You become the host; host
              can be handed over any time.
            </p>
            {pick && (
              <p className="small">
                Will queue: <b>{pick.t}</b> ·{' '}
                <button className="lnk" onClick={() => setPick(null)}>
                  clear
                </button>
              </p>
            )}
            <input
              placeholder="Your name"
              maxLength={20}
              aria-label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="gb"
              onClick={() => {
                const n = name.trim();
                if (!n) return toast('Enter your name first');
                onCreate(code5(), n);
              }}
            >
              Create room
            </button>
          </div>
          <div className="panel">
            <h3>Join a room</h3>
            <p>Paste a room code or open an invite link.</p>
            <input
              placeholder="Your name"
              maxLength={20}
              aria-label="Your name"
              value={jn}
              onChange={(e) => setJn(e.target.value)}
            />
            <input
              placeholder="ROOM CODE OR INVITE LINK"
              aria-label="Room code"
              style={{ textTransform: 'uppercase' }}
              value={jc}
              onChange={(e) => setJc(e.target.value)}
            />
            <button className="gb" onClick={() => onJoin(jc, jn.trim())}>
              Join room
            </button>
          </div>
        </div>
      </section>
      <section id="disc">
        <p className="mono lab">DISCOVER</p>
        <h2>
          Pick tonight’s <i>watch.</i>
        </h2>
        <div id="dh">
          <Discover onPick={(m) => onInfo(M.indexOf(m))} />
        </div>
      </section>
    </div>
  );
}
