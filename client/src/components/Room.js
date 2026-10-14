import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import useRoom from '../hooks/useRoom';
import Discover from './Discover';
import Modal from './Modal';
import Poster from './Poster';
import { clamp, copyText, fmt } from '../lib/util';
import { api } from '../lib/net';

const EMOJI = ['😂', '❤️', '🔥', '👏', '😮', '😢', '🎉', '💀', '👀', '🤣'];
const TABS = [
  ['chat', 'CHAT'],
  ['queue', 'QUEUE'],
  ['find', 'DISCOVER'],
  ['polls', 'POLLS'],
  ['ppl', 'PEOPLE'],
  ['stats', 'STATS'],
];
const p95 = (a) =>
  a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.95)] : 0;
const avg = (a) =>
  a.length ? (a.reduce((x, y) => x + y, 0) / a.length) | 0 : 0;
const mx = (a) => (a.length ? Math.max(...a) : 0);

function Stats({ room, me, tick }) {
  const { S, R } = room,
    P = R.perf,
    d = Math.abs(R.drift) | 0,
    c95 = p95(P.ctl);
  void tick;
  return (
    <div className="stats">
      <div className="stat-group">
        <h4>Control round-trip</h4>
        <p>
          P95: <b>{c95} ms</b>{' '}
          <span style={{ color: c95 <= 250 ? '#22c55e' : '#f59e0b' }}>
            {c95 <= 250 ? '✓' : '⚠'}
          </span>{' '}
          (target ≤250 ms)
        </p>
        <p>
          Avg: {avg(P.ctl)} ms · Max: {mx(P.ctl)} ms · Samples: {P.ctl.length}
        </p>
      </div>
      <div className="stat-group">
        <h4>Drift correction</h4>
        <p>
          Current: <b>{d} ms</b>{' '}
          <span style={{ color: d <= 500 ? '#22c55e' : '#f59e0b' }}>
            {d <= 500 ? '✓' : '⚠'}
          </span>{' '}
          (target ≤500 ms)
        </p>
        <p>
          P95: {p95(P.drift) | 0} ms · Avg: {avg(P.drift)} ms · Max:{' '}
          {mx(P.drift) | 0} ms · Hard fixes: {R.fixes}
        </p>
      </div>
      <div className="stat-group">
        <h4>Network</h4>
        <p>
          RTT: <b>{R.rtt} ms</b> · Clock offset: {R.off | 0} ms
        </p>
        <p>
          Reconnects: {P.reconnects} · Messages sent: {P.msgs}
        </p>
      </div>
      <div className="stat-group">
        <h4>Room</h4>
        <p>
          Users: <b>{S ? S.users.filter((u) => u.on).length : 0}</b> online /{' '}
          {S ? S.users.length : 0} seated · Queue: {S ? S.playlist.length : 0}
        </p>
        <p>Host: {S && S.host === me.id ? 'You 👑' : 'Another user'}</p>
      </div>
      <div className="stat-group">
        <h4>How it stays in sync</h4>
        <p>Server is the single clock: every action gets a sequence number.</p>
        <p>Clients correct drift: &gt;0.5 s hard-seek, otherwise ±6% speed.</p>
        <p>Same user id on reconnect = same seat; host handover after 8 s.</p>
      </div>
    </div>
  );
}

export default function Room({ code, me, create, qpick, toast, onLeave }) {
  const room = useRoom({
    code,
    me,
    create,
    qpick,
    onError: (msg) => {
      toast(msg);
      onLeave();
    },
  });
  const { S, chat, heat, flies, live, send, sNow, R } = room;
  const v = useRef(null),
    seek = useRef(null),
    tm = useRef(null),
    buf = useRef(null),
    msgs = useRef(null);
  const [tab, setTab] = useState('chat');
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cc, setCc] = useState(false);
  const [msg, setMsg] = useState('');
  const [qt, setQt] = useState(''),
    [qu, setQu] = useState(''),
    [pq, setPq] = useState(''),
    [po, setPo] = useState('');
  const [invite, setInvite] = useState(false),
    [statsOpen, setStatsOpen] = useState(false);
  const [lan, setLan] = useState([]);
  const [tick, bump] = useReducer((x) => x + 1, 0);
  const drag = useRef(false);

  const tgt = useCallback(() => {
    const s = R.S;
    if (!s) return 0;
    const t = s.playing ? s.pos + (sNow() - s.at) / 1000 : s.pos;
    return v.current && v.current.duration
      ? Math.min(t, v.current.duration)
      : t;
  }, [R, sNow]);

  const it = S && S.playlist[S.idx];
  useEffect(() => {
    const el = v.current;
    if (!el || !S) return;
    if (!it) {
      el.removeAttribute('src');
      el.dataset.id = '';
      return;
    }
    if (el.dataset.id !== String(it.id)) {
      el.dataset.id = it.id;
      el.src = it.src;
      el.load();
    }
    if (S.playing) {
      if (el.paused)
        el.play().catch(() => {
          el.muted = true;
          setMuted(true);
          el.play().catch(() => {});
          toast('Autoplay blocked — started muted');
        });
      fix(true);
    } else {
      el.pause();
      el.playbackRate = 1;
      if (el.readyState && Math.abs(el.currentTime - S.pos) > 0.05)
        el.currentTime = S.pos;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S, fix, toast]);

  const fix = useCallback(
    (force) => {
      const el = v.current,
        s = R.S;

      if (!s || !s.playing || !el || el.readyState < 2 || el.seeking) return;

      const d = el.currentTime - tgt();
      R.drift = d * 1000;

      if (R.perf.drift.length >= 100) R.perf.drift.shift();
      R.perf.drift.push(Math.abs(R.drift));

      if (Math.abs(d) > (force ? 0.25 : 0.5)) {
        el.currentTime = tgt();
        R.fixes++;
        el.playbackRate = 1;
      } else if (Math.abs(d) > 0.06) {
        el.playbackRate = d > 0 ? 0.94 : 1.06;
      } else {
        el.playbackRate = 1;
      }
    },
    [R, tgt],
  );

  useEffect(() => {
    const i = setInterval(() => {
      fix(false);
      bump();
    }, 400);
    return () => clearInterval(i);
  }, [fix]);

  useEffect(() => {
    const i = setInterval(() => {
      const el = v.current,
        sk = seek.current;
      if (!el || !sk || drag.current || !el.duration) return;
      sk.max = el.duration;
      sk.value = el.currentTime;
      tm.current.textContent = fmt(el.currentTime) + ' / ' + fmt(el.duration);
      if (el.buffered.length)
        buf.current.style.width =
          (el.buffered.end(el.buffered.length - 1) / el.duration) * 100 + '%';
      sk.style.setProperty(
        '--value',
        (el.currentTime / el.duration) * 100 + '%',
      );
    }, 250);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (msgs.current) msgs.current.scrollTop = msgs.current.scrollHeight;
  }, [chat, tab]);
  useEffect(() => {
    api('/api/info', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setLan(j.lan || []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (tab !== 'stats' && !statsOpen) return;
    const i = setInterval(bump, 1000);
    return () => clearInterval(i);
  }, [tab, statsOpen]);

  const B = 60,
    buckets = Array(B).fill(0);
  if (dur)
    heat.forEach((h) => {
      buckets[clamp(((h.t / dur) * B) | 0, 0, B - 1)]++;
    });
  const hmax = Math.max(1, ...buckets);

  const isLocal = /^(localhost|127\.|\[::1\])/.test(window.location.hostname);
  const inviteUrl = () => {
    const o =
      isLocal && lan.length
        ? window.location.protocol +
          '//' +
          lan[0] +
          (window.location.port ? ':' + window.location.port : '')
        : window.location.origin;
    return o + '/#/r/' + code;
  };
  const inviteInput = useRef(null);
  const openInvite = async () => {
    setInvite(true);
    const ok = await copyText(inviteUrl(), null);
    toast(ok ? 'Invite link copied' : 'Select the link and press Ctrl+C');
  };

  const isHost = S && S.host === me.id;
  const ctl = (act, t) => send('ctl', { act, t });

  return (
    <div id="room">
      <div className="rh">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onLeave();
          }}
        >
          VINE<b>PARTY</b>
        </a>
        <span
          className="code"
          title="Invite friends"
          role="button"
          tabIndex={0}
          onClick={openInvite}
          onKeyDown={(e) =>
            (e.key === 'Enter' || e.key === ' ') &&
            (e.preventDefault(), openInvite())
          }
        >
          {code}
        </span>
        <button className="ghost" onClick={openInvite}>
          COPY INVITE LINK
        </button>
        <span className={'stat ' + (live && S ? 'ok' : 'bad')}>
          {live ? (S ? '● live' : 'joining…') : 'reconnecting…'}
        </span>
        <button
          className="ghost"
          title="Performance stats"
          aria-label="Performance stats"
          onClick={() => setStatsOpen(true)}
        >
          📊
        </button>
        <span className="sp" />
        <div className="av">
          {S &&
            S.users.map((u) => (
              <span
                key={u.id}
                className={(u.on ? '' : 'off ') + (u.id === S.host ? 'h' : '')}
                title={u.name + (u.id === S.host ? ' (host)' : '')}
              >
                {u.name.slice(0, 2).toUpperCase()}
              </span>
            ))}
        </div>
        <button className="ghost" onClick={onLeave}>
          LEAVE
        </button>
      </div>

      <div className="main">
        <div className="pw">
          <video
            ref={v}
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            onLoadedMetadata={(e) => {
              setDur(e.currentTarget.duration);
              seek.current && (seek.current.max = e.currentTarget.duration);
              R.S && setTimeout(() => fix(true), 0);
            }}
            onEnded={() => R.S && send('ctl', { act: 'next', from: R.S.idx })}
          >
            <track kind="captions" srcLang="en" label="English" />
          </video>
          {!it && (
            <div className="empty">
              <div>
                <h3 style={{ font: '400 34px var(--serif)' }}>
                  The screen is dark.
                </h3>
                <p>
                  Open <b>Discover</b> and queue something.
                </p>
              </div>
            </div>
          )}
          <div id="fl" aria-hidden="true">
            {flies.map((f) => (
              <span key={f.k} style={{ left: f.x + '%', '--r': f.r + 'deg' }}>
                {f.e}
                <small>{f.name}</small>
              </span>
            ))}
          </div>
        </div>

        <div className="ctl">
          <button
            aria-label="Play or pause"
            onClick={() => S && ctl(S.playing ? 'pause' : 'play', tgt())}
          >
            {S && S.playing ? '❚❚' : '▶'}
          </button>
          <button
            aria-label="Back 10 seconds"
            onClick={() => ctl('seek', Math.max(0, tgt() - 10))}
          >
            −10
          </button>
          <button
            aria-label="Forward 10 seconds"
            onClick={() => ctl('seek', tgt() + 10)}
          >
            +10
          </button>
          <div className="sk">
            <div className="heat" aria-hidden="true">
              {buckets.map((n, i) => (
                <i key={i} style={{ height: (n / hmax) * 100 + '%' }} />
              ))}
            </div>
            <div className="progress-buffer" ref={buf} />
            <input
              ref={seek}
              type="range"
              min="0"
              max="1000"
              step="0.1"
              defaultValue="0"
              aria-label="Seek"
              onInput={(e) => {
                drag.current = true;
                tm.current.textContent = fmt(e.target.value) + ' / ' + fmt(dur);
              }}
              onChange={(e) => {
                drag.current = false;
                ctl('seek', +e.target.value);
              }}
            />
          </div>
          <span className="tm" ref={tm}>
            0:00
          </span>
          <button
            aria-label="Captions"
            title="Captions"
            style={{ opacity: cc ? 1 : 0.5 }}
            onClick={() => {
              const t = v.current && v.current.textTracks[0];
              if (!t) return toast('No captions for this video');
              t.mode = t.mode === 'showing' ? 'hidden' : 'showing';
              setCc(t.mode === 'showing');
              toast(t.mode === 'showing' ? 'Captions on' : 'Captions off');
            }}
          >
            CC
          </button>
          <button
            aria-label="Mute"
            onClick={() => {
              v.current.muted = !v.current.muted;
              setMuted(v.current.muted);
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            aria-label="Fullscreen"
            onClick={() => {
              const pw = document.querySelector('.pw');
              document.fullscreenElement
                ? document.exitFullscreen()
                : pw && pw.requestFullscreen && pw.requestFullscreen();
            }}
          >
            ⛶
          </button>
        </div>

        <div className="rx" role="group" aria-label="Reactions">
          {EMOJI.map((e) => (
            <button
              key={e}
              aria-label={'React ' + e}
              onClick={() =>
                send('react', { e, t: v.current ? v.current.currentTime : 0 })
              }
            >
              {e}
            </button>
          ))}
        </div>
        <div className="np">
          <span className="small">
            SYNC ±{Math.abs(R.drift) | 0} ms · RTT {R.rtt} ms · {R.fixes} hard
            fixes
          </span>
          <h3>{it ? it.title : 'Nothing playing'}</h3>
        </div>
      </div>

      <aside className="side2">
        <div className="tabs" role="tablist">
          {TABS.map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="pane">
          {tab === 'chat' && (
            <div className="msgs" ref={msgs}>
              {chat.map((m) => (
                <div className="msg" key={m.id}>
                  <b>{m.name}</b>
                  <p>{m.text}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'queue' && (
            <>
              <div>
                {S && S.playlist.length ? (
                  S.playlist.map((x, i) => (
                    <div
                      key={x.id}
                      className={'li' + (i === S.idx ? ' cur' : '')}
                    >
                      <Poster
                        m={{ id: x.pid || 'custom', t: x.title }}
                        cls="qb"
                      />
                      <div>
                        <b>{x.title}</b>
                        <small>added by {x.by}</small>
                      </div>
                      <button
                        aria-label="Play now"
                        onClick={() => send('ctl', { act: 'jump', i })}
                      >
                        ▶
                      </button>
                      {(isHost || x.by === me.name) && (
                        <button
                          aria-label="Remove"
                          onClick={() =>
                            send('pl', { act: 'remove', id: x.id })
                          }
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="small">Queue is empty.</p>
                )}
              </div>
              <p className="small">Add any direct video URL (mp4/webm):</p>
              <input
                placeholder="Title"
                maxLength={80}
                value={qt}
                onChange={(e) => setQt(e.target.value)}
              />
              <input
                placeholder="https://…/video.mp4"
                value={qu}
                onChange={(e) => setQu(e.target.value)}
              />
              <button
                className="blue"
                onClick={() => {
                  if (!/^https?:\/\//.test(qu.trim()))
                    return toast('Enter a valid http(s) URL');
                  send('pl', {
                    act: 'add',
                    item: {
                      title: qt || 'Custom video',
                      src: qu.trim(),
                      c: ['#334155', '#0ea5e9'],
                    },
                  });
                  setQt('');
                  setQu('');
                }}
              >
                ADD TO QUEUE
              </button>
            </>
          )}

          {tab === 'find' && (
            <Discover
              mini
              onPick={(m) => {
                send('pl', {
                  act: 'add',
                  item: { title: m.t, src: m.src, c: m.c, pid: m.id },
                });
                toast(m.t + ' added to queue');
              }}
            />
          )}

          {tab === 'polls' && (
            <>
              <p className="small">
                QUICK POLLS · majority “Yes” triggers the action
              </p>
              <div className="row" style={{ margin: '8px 0' }}>
                <button
                  className="ghost"
                  onClick={() =>
                    send('poll', {
                      q: 'Skip to the next movie?',
                      opts: ['Yes', 'No'],
                      act: 'next',
                    })
                  }
                >
                  SKIP THIS MOVIE?
                </button>
                <button
                  className="ghost"
                  onClick={() =>
                    send('poll', {
                      q: 'Pause for a snack break?',
                      opts: ['Yes', 'No'],
                      act: 'pause',
                    })
                  }
                >
                  SNACK BREAK?
                </button>
              </div>
              <input
                placeholder="Question"
                maxLength={90}
                value={pq}
                onChange={(e) => setPq(e.target.value)}
              />
              <input
                placeholder="Options, comma separated"
                value={po}
                onChange={(e) => setPo(e.target.value)}
              />
              <button
                className="blue"
                onClick={() => {
                  const opts = po
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  if (!pq.trim() || opts.length < 2)
                    return toast('Add a question and at least two options');
                  send('poll', { q: pq, opts });
                  setPq('');
                  setPo('');
                }}
              >
                CREATE POLL
              </button>
              <div style={{ marginTop: 14 }}>
                {S && S.polls.length ? (
                  [...S.polls].reverse().map((q) => {
                    const tot = q.opts.reduce((a, o) => a + o.v.length, 0) || 1;
                    return (
                      <div className="poll" key={q.id}>
                        <h4>{q.q}</h4>
                        {q.opts.map((o, i) => (
                          <button
                            key={i}
                            className="opt"
                            disabled={!q.open}
                            onClick={() => send('vote', { pid: q.id, i })}
                          >
                            <i
                              style={{ width: (o.v.length / tot) * 100 + '%' }}
                            />
                            <span>
                              {o.t}
                              <b>{o.v.length}</b>
                            </span>
                          </button>
                        ))}
                        <div className="small">
                          {q.open ? 'open' : q.done ? 'passed ✓' : 'closed'} ·
                          by {q.by}{' '}
                          {q.open && isHost && (
                            <>
                              ·{' '}
                              <button
                                className="lnk"
                                onClick={() => send('closepoll', { pid: q.id })}
                              >
                                close
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="small">No polls yet.</p>
                )}
              </div>
            </>
          )}

          {tab === 'ppl' &&
            S &&
            S.users.map((u) => (
              <div className="li" key={u.id}>
                <div>
                  <b>
                    {u.name}
                    {u.id === me.id ? ' (you)' : ''}
                  </b>
                  <small>
                    {u.id === S.host ? '👑 host ' : ''}
                    {u.on ? 'online' : 'reconnecting / offline'}
                  </small>
                </div>
                {isHost && u.id !== me.id && u.on && (
                  <button onClick={() => send('host', { to: u.id })}>
                    MAKE HOST
                  </button>
                )}
              </div>
            ))}

          {tab === 'stats' && <Stats room={room} me={me} tick={tick} />}
        </div>
        {tab === 'chat' && (
          <form
            className="cin"
            onSubmit={(e) => {
              e.preventDefault();
              if (msg.trim()) send('chat', { text: msg.trim() });
              setMsg('');
            }}
          >
            <input
              placeholder="Say something…"
              maxLength={300}
              aria-label="Message"
              autoComplete="off"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
            <button className="blue">SEND</button>
          </form>
        )}
      </aside>

      <Modal
        open={invite}
        onClose={() => setInvite(false)}
        className="ctr"
        labelledBy="dit"
      >
        <h3 id="dit">Invite friends</h3>
        <p>Share this link, or the room code.</p>
        <input
          ref={inviteInput}
          readOnly
          aria-label="Invite link"
          value={inviteUrl()}
          onFocus={(e) => e.target.select()}
          autoFocus
        />
        <div className="row">
          <button
            className="blue"
            onClick={async () =>
              toast(
                (await copyText(inviteUrl(), inviteInput.current))
                  ? 'Invite link copied'
                  : 'Select the link and press Ctrl+C',
              )
            }
          >
            Copy link
          </button>
          <button
            className="ghost"
            onClick={() => window.open(inviteUrl(), '_blank')}
          >
            Open link
          </button>
          <button
            className="ghost"
            onClick={async () =>
              toast(
                (await copyText(code))
                  ? 'Room code ' + code + ' copied'
                  : 'Room code: ' + code,
              )
            }
          >
            Copy code
          </button>
          <button className="ghost" onClick={() => setInvite(false)}>
            Close
          </button>
        </div>
        <p className="small">
          {isLocal && lan.length
            ? 'Using your network address so friends on the same Wi-Fi can open it.'
            : isLocal
              ? 'This link only works on this computer. Open the app via your computer’s network address (e.g. http://192.168.x.x:' +
                (window.location.port || 80) +
                ') to invite other devices.'
              : ''}
        </p>
      </Modal>
      <Modal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        className="halo-card"
        labelledBy="dst"
      >
        <h3 id="dst">📊 Performance Stats</h3>
        <Stats room={room} me={me} tick={tick} />
        <div className="row">
          <button className="ghost" onClick={() => setStatsOpen(false)}>
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
}
