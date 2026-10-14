import React, { useMemo, useState } from 'react';
import { M } from '../data/movies';
import { fz } from '../lib/util';
import Poster from './Poster';

const GENRES = [
  'All',
  'Marvel',
  'Action',
  'Adventure',
  'Sci-Fi',
  'Fantasy',
  'Comedy',
  'Animation',
  'Horror',
];

export default function Discover({ mini = false, onPick }) {
  const [q, setQ] = useState('');
  const [g, setG] = useState('All');
  const [sort, setSort] = useState('rel');
  const [mr, setMr] = useState(0);

  const list = useMemo(() => {
    const L = M.map((m) => ({ m, s: fz(q, m.t + ' ' + m.tags) })).filter(
      (x) =>
        x.s > 0 &&
        x.m.r >= mr &&
        (g === 'All' || (g === 'Marvel' ? x.m.mv : x.m.g.includes(g))),
    );
    L.sort((a, b) =>
      sort === 'r'
        ? b.m.r - a.m.r
        : sort === 'y'
          ? b.m.y - a.m.y
          : sort === 'len'
            ? a.m.len - b.m.len
            : q
              ? b.s - a.s
              : 0,
    );
    return L.map((x) => x.m);
  }, [q, g, sort, mr]);

  return (
    <div className={mini ? 'mini' : undefined}>
      <div className="dq">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Fuzzy search: titles, genres, “marvle”…"
          aria-label="Search movies"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort"
        >
          <option value="rel">Best match</option>
          <option value="r">Top rated</option>
          <option value="y">Newest</option>
          <option value="len">Shortest</option>
        </select>
        <select
          value={mr}
          onChange={(e) => setMr(+e.target.value)}
          aria-label="Minimum rating"
        >
          <option value={0}>Any rating</option>
          <option value={4}>4★+</option>
          <option value={4.5}>4.5★+</option>
        </select>
      </div>
      <div className="chips" role="group" aria-label="Categories">
        {GENRES.map((x) => (
          <button
            key={x}
            className={'chip' + (x === g ? ' on' : '')}
            aria-pressed={x === g}
            onClick={() => setG(x)}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="grid">
        {list.length ? (
          list.map((m) => (
            <button
              key={m.id}
              className="card"
              aria-label={m.t}
              onClick={() => onPick(m)}
            >
              <Poster m={m} />
              {m.mv && <span className="tag">MARVEL</span>}
              {mini ? (
                <div className="act">
                  <span>+ QUEUE</span>
                </div>
              ) : (
                <span className="play" aria-hidden="true">
                  ▶
                </span>
              )}
              <div className="in">
                <h4>{m.t}</h4>
                <small>
                  {m.y} · {m.g.join('/')} · ★{m.r}
                </small>
              </div>
            </button>
          ))
        ) : (
          <p className="small">No matches — try fewer letters.</p>
        )}
      </div>
    </div>
  );
}
