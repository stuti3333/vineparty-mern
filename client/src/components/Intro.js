import React, { useEffect, useRef } from 'react';
import { clamp, ramp, RM } from '../lib/util';

const PLATES = [
  ['b', 'WATCH TOGETHER', 0.052, 0.42, 0.318, 0.084, 0.3],
  ['b', 'NOW SHOWING', 0.383, 0.42, 0.246, 0.084, 0],
  ['b', 'BEST TIMEPASS', 0.64, 0.42, 0.31, 0.084, 0.5],
  ['h', 'VINEPARTY', 0.057, 0.352, 0.322, 0.062, -2],
  ['h', 'VINEPARTY', 0.385, 0.352, 0.245, 0.062, 0],
  ['h', 'VINEPARTY', 0.637, 0.352, 0.305, 0.062, 2.4],
];

export default function Intro({ onEnter }) {
  const stage = useRef(null),
    a = useRef(null),
    b = useRef(null),
    gr = useRef(null),
    hint = useRef(null),
    btn = useRef(null);
  useEffect(() => {
    if ('scrollRestoration' in window.history)
      window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    document.body.classList.add('intro-on');
    let target = 0,
      disp = 0,
      last = performance.now(),
      raf = 0;
    const draw = (p) => {
      const za = ramp(p, 0.02, 0.46),
        zb = ramp(p, 0.36, 0.9);
      a.current.querySelector('.bx').style.transform =
        `scale(${1 + 2.6 * za * za})`;
      a.current.style.opacity = 1 - ramp(p, 0.34, 0.48);
      b.current.querySelector('.bx').style.transform =
        `scale(${1 + 1.3 * zb * zb})`;
      stage.current.style.setProperty('--lit', ramp(p, 0.74, 0.9));
      gr.current.classList.toggle('go', p > 0.9);
      hint.current.style.opacity = 1 - ramp(p, 0.04, 0.1);
      btn.current.hidden = p < 0.95;
    };
    const tick = (n) => {
      const dt = Math.min(64, n - last);
      last = n;
      const m = document.documentElement.scrollHeight - window.innerHeight;
      target = m > 0 ? clamp(window.scrollY / m, 0, 1) : 0;
      disp += RM
        ? target - disp
        : (target - disp) * (1 - Math.pow(0.89, dt / 16.667));
      draw(disp);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <main id="intro">
      <div id="stage" ref={stage}>
        <div className="sc" id="sB" ref={b}>
          <div className="bx" style={{ '--ar': 0.5652, '--cy': 0.4 }}>
            <img src="/img/hall.jpg" alt="" />
            <div className="glowspot" />
            <h1 id="gr" className="stext" ref={gr}>
              <span>
                <em>Best</em>
              </span>{' '}
              <span>
                <em>timepass</em>
              </span>
            </h1>
          </div>
        </div>
        <div className="sc" id="sA" ref={a}>
          <div className="bx" style={{ '--ar': 0.8, '--cy': 0.5 }}>
            <img src="/img/lobby.jpg" alt="" />
            {PLATES.map(([k, t, l, tp, w, h, r], i) => (
              <div
                key={i}
                className={`plate pl-${k}`}
                style={{
                  left: l * 100 + '%',
                  top: tp * 100 + '%',
                  width: w * 100 + '%',
                  height: h * 100 + '%',
                  transform: `rotate(${r}deg)`,
                }}
              >
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div id="grain" aria-hidden="true" />
        <button id="enter" ref={btn} className="gb" hidden onClick={onEnter}>
          Enter the lobby
        </button>
        <p id="hint" ref={hint} className="mono">
          SCROLL TO ENTER THE THEATRE ↓
        </p>
      </div>
      <div id="track" />
    </main>
  );
}
