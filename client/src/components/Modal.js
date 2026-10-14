import React, { useEffect, useRef } from 'react';

export default function Modal({
  open,
  onClose,
  className,
  labelledBy,
  children,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) {
      document.body.classList.add('lock');
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => () => document.body.classList.remove('lock'), []);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={labelledBy}
      onClose={() => {
        document.body.classList.remove('lock');
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
