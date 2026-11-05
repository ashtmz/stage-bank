import { useEffect, useRef } from 'react';
import Icon from '../Icon.jsx';

export default function Dialog({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const element = ref.current;
    const onCancel = (e) => { e.preventDefault(); closeRef.current(); };
    element.addEventListener('cancel', onCancel);
    element.showModal();
    element.querySelector('input:not([type="file"]):not([hidden]), textarea')?.focus();
    return () => { element.removeEventListener('cancel', onCancel); element.close(); };
  }, []);
  return <dialog ref={ref} className={`dialog ${wide ? 'wide-dialog' : ''}`} aria-labelledby="dialog-title" onClick={(e) => { if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}><div className="dialog-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="閉じる" onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}
