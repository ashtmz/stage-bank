import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon.jsx';
import { categories } from '../library.js';

export default function Sidebar({ category, savedOnly, terms, bookmarks, navigate, open, onClose, onData, view = 'library' }) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const drawerOpen = open && mobile;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setMobile(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = drawerRef.current;
    const opener = document.activeElement;
    closeButtonRef.current?.focus({ preventScroll: true });
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      // Keep the app's search shortcut from moving focus behind the drawer.
      if (event.key === '/') event.stopPropagation();
      if (event.key !== 'Tab') return;
      const controls = [...drawer.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) {
        event.preventDefault();
        drawer.focus();
      } else if (!drawer.contains(document.activeElement) || document.activeElement === drawer) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      if (opener instanceof HTMLElement && opener.isConnected && opener.getClientRects().length) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [drawerOpen]);

  return <>
    {drawerOpen ? <button className="sidebar-shade" tabIndex={-1} aria-hidden="true" onClick={onClose} /> : null}
    <aside ref={drawerRef} className={`sidebar ${drawerOpen ? 'is-open' : ''}`} aria-label="用語の分類" role={drawerOpen ? 'dialog' : undefined} aria-modal={drawerOpen ? true : undefined} tabIndex={drawerOpen ? -1 : undefined}>
      <div className="sidebar-heading"><Icon name="book" size={27}/><span>ライブラリ</span><button ref={closeButtonRef} className="icon-button mobile-only" aria-label="分類を閉じる" onClick={onClose}><Icon name="close"/></button></div>
      <nav className="nav-primary" aria-label="ライブラリ">
        <button className={`nav-item ${view === 'library' && category === 'all' && !savedOnly ? 'active' : ''}`} onClick={() => navigate('all')} aria-current={view === 'library' && category === 'all' && !savedOnly ? 'page' : undefined}><Icon name="list"/><span>すべての用語</span><small>{terms.length}</small></button>
        <button className={`nav-item ${view === 'library' && savedOnly ? 'active' : ''}`} onClick={() => navigate('saved')} aria-current={view === 'library' && savedOnly ? 'page' : undefined}><Icon name="bookmark"/><span>保存した用語</span><small>{terms.filter((t) => bookmarks.includes(t.id)).length}</small></button>
        <button className={`nav-item ${view === 'updates' ? 'active' : ''}`} onClick={() => navigate('updates')} aria-current={view === 'updates' ? 'page' : undefined}><Icon name="history"/><span>更新履歴</span></button>
      </nav>
      <div className="sidebar-rule"/>
      <p className="nav-label">分野</p>
      <nav className="nav-categories" aria-label="分野">
        {categories.map((c) => <button key={c.id} className={`nav-item ${view === 'library' && category === c.id && !savedOnly ? 'category-active' : ''}`} onClick={() => navigate(c.id)} aria-current={view === 'library' && category === c.id && !savedOnly ? 'page' : undefined}><Icon name={c.icon}/><span>{c.label}</span><small>{terms.filter((t) => t.category === c.id).length}</small></button>)}
      </nav>
      <div className="sidebar-bottom"><button className="data-button" onClick={onData}><Icon name="database"/><span>データ</span></button><span className="local-label">このブラウザに保存</span></div>
    </aside>
  </>;
}
