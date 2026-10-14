import React, { useEffect, useState } from 'react';
import Fibers from './Fibers';
import { RM } from '../lib/util';

const imgReady = (src) =>
  new Promise((r) => {
    const i = new Image();
    i.onload = i.onerror = () => r();
    i.src = src;
    if (i.decode) i.decode().then(r, r);
  });

export default function Boot({ onDone }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    document.body.classList.add('booting');
    const t0 = performance.now();
    let dead = false,
      t1,
      t2;
    Promise.race([
      Promise.all([
        new Promise((r) =>
          document.readyState === 'complete'
            ? r()
            : window.addEventListener('load', r, { once: true }),
        ),
        imgReady('/img/hall.jpg'),
        imgReady('/img/lobby.jpg'),
      ]),
      new Promise((r) => setTimeout(r, 5000)),
    ]).then(() => {
      t1 = setTimeout(
        () => {
          if (dead) return;
          setOut(true);
          document.body.classList.remove('booting');
          t2 = setTimeout(() => !dead && onDone(), RM ? 0 : 800);
        },
        Math.max(0, (RM ? 600 : 1700) - (performance.now() - t0)),
      );
    });
    return () => {
      dead = true;
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.classList.remove('booting');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      id="boot"
      className={out ? 'out' : ''}
      role="status"
      aria-live="polite"
      aria-label="Loading VineParty"
    >
      <Fibers
        id="bootfx"
        glowColor="#b01230"
        lineColor="#ffd9a0"
        speed={0.35}
        glow={2.2}
        brightness={1.5}
        vignette={0.85}
      />
      <div className="bglow" aria-hidden="true" />
      <div className="bw">
        <div className="cwrap">
          <div className="beam" aria-hidden="true" />
          <img
            className="cam"
            src="/img/camera.png"
            alt=""
            width="595"
            height="454"
            fetchpriority="high"
          />
        </div>
        <p className="mono">LOADING THE THEATRE</p>
        <div className="pbar" aria-hidden="true">
          <i />
        </div>
      </div>
    </div>
  );
}
