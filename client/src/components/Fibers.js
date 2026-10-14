import React, { useEffect, useRef } from 'react';
import GhostFibers from '../lib/ghostfibers';

export default function Fibers({
  id,
  className = '',
  paused = false,
  ...opts
}) {
  const host = useRef(null);
  const fx = useRef(null);
  useEffect(() => {
    fx.current = GhostFibers(host.current, { paused, ...opts });
    return () => {
      fx.current && fx.current.destroy();
      fx.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    fx.current && fx.current.set({ paused });
  }, [paused]);
  return <div id={id} ref={host} className={className} aria-hidden="true" />;
}
