import React from 'react';
import { posterSrc, fallbackSrc } from '../data/movies';

export default function Poster({ m, cls = 'bg', hero = false, eager = false }) {
  const id = m.id || 'custom';
  return (
    <img
      className={cls || undefined}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      alt={hero ? `Carousel artwork for ${m.t}` : `Poster for ${m.t}`}
      src={posterSrc({ id }, hero)}
      onError={(e) => {
        const f = fallbackSrc(id);
        if (!e.currentTarget.src.endsWith(f)) e.currentTarget.src = f;
      }}
    />
  );
}
