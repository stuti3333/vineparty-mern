import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Poster from './Poster';
import { M } from '../data/movies';

export default function Details({ index, onClose, onParty }) {
  const [i, setI] = useState(index ?? 0);
  const [sw, setSw] = useState(false);
  useEffect(() => {
    if (index != null) setI(index);
  }, [index]);
  const step = (d) => {
    setSw(true);
    setTimeout(() => {
      setI((x) => (x + d + M.length) % M.length);
      setSw(false);
    }, 120);
  };
  const m = M[i];
  return (
    <Modal
      open={index != null}
      onClose={onClose}
      className="side"
      labelledBy="dmt"
    >
      <div
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') step(-1);
          if (e.key === 'ArrowRight') step(1);
        }}
      >
        <div className="sh">
          <span className="mono">
            MOVIE / DETAILS <i className="dot" />
          </span>
          <button className="x" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div id="dmb" className={sw ? 'sw' : ''}>
          <Poster m={m} cls="dp" />
          <div className="k mono">
            {String(i + 1).padStart(2, '0')} / {m.g.join(' · ').toUpperCase()}
          </div>
          <h3 id="dmt">{m.t}</h3>
          <p className="deck">{m.deck}</p>
          <p className="hist">{m.about}</p>
          <hr />
          <div className="l">READ THE TITLE</div>
          <p className="small" style={{ font: '400 13px/1.6 var(--sans)' }}>
            {m.y} · rated {m.age} · ★ {m.r}
            {m.mv ? ' · Marvel Studios' : ''}
          </p>
          <div className="l" style={{ marginTop: 12 }}>
            FOR THE ROOM
          </div>
          <p className="small" style={{ font: '400 13px/1.6 var(--sans)' }}>
            Queue it in a room and everyone watches in sync.
          </p>
          <div className="note">
            Poster artwork is local. The player streams an open-licence demo
            video, not the licensed film.
          </div>
          <button className="gb sm" onClick={() => onParty(m)}>
            Start a party with this
          </button>
        </div>
        <div className="sf">
          <button className="ghost" onClick={() => step(-1)}>
            PREVIOUS
          </button>
          <span className="mono" aria-live="polite">
            {String(i + 1).padStart(2, '0')} /{' '}
            {String(M.length).padStart(2, '0')}
          </span>
          <button className="ghost" onClick={() => step(1)}>
            NEXT TITLE
          </button>
        </div>
      </div>
    </Modal>
  );
}
