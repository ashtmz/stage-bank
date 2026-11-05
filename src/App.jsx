import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { categories, categoryLabel, emptyUserData, filterTerms, makeIndex, mergeBackup, parseBackup, STORAGE_KEY } from './library.js';
import Icon from './Icon.jsx';
import Sidebar from './components/Sidebar.jsx';
import TermList from './components/TermList.jsx';
import TermDetail from './components/TermDetail.jsx';
import TermForm from './components/TermForm.jsx';
import DataDialog from './components/DataDialog.jsx';
import Dialog from './components/Dialog.jsx';

const UpdatesView = lazy(() => import('./components/UpdatesView.jsx'));

const initialNames = ['上手', '下手', '舞台袖', 'プロセニアム', '奈落', 'フライタワー', '平台', '花道'];
const builtins = Object.values(import.meta.glob('./data/*.json', { eager: true, import: 'default' })).flat().sort((a,b) => {
  const delta = categories.findIndex((c) => c.id === a.category) - categories.findIndex((c) => c.id === b.category);
  if (delta) return delta;
  const ai = initialNames.indexOf(a.name), bi = initialNames.indexOf(b.name);
  return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
}).map((t) => ({ ...t, searchIndex: makeIndex(t) }));
function getHashId() { return new URLSearchParams(window.location.hash.slice(1)).get('term'); }
function loadUserData() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); return { data: raw ? parseBackup(raw) : emptyUserData(), unreadableRaw: null }; }
  catch { return { data: emptyUserData(), unreadableRaw: raw }; }
}

export default function App() {
  const [initialStorage] = useState(loadUserData);
  const [userData, setUserData] = useState(initialStorage.data);
  const [storageRecovered, setStorageRecovered] = useState(false);
  const [view,setView] = useState(() => new URLSearchParams(location.hash.slice(1)).has('update') ? 'updates' : 'library');
  const [updateId,setUpdateId] = useState(() => new URLSearchParams(location.hash.slice(1)).get('update') || 'latest');
  const [category, setCategory] = useState('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const [subgroup, setSubgroup] = useState('');
  const [region, setRegion] = useState('all');
  const [kind,setKind] = useState('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [sort, setSort] = useState('category');
  const [selectedId, setSelectedId] = useState(() => getHashId() || builtins[0]?.id);
  const [mobileDetail, setMobileDetail] = useState(() => Boolean(getHashId()));
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [storageError, setStorageError] = useState(initialStorage.unreadableRaw ? 'unreadable' : '');
  const inputRef = useRef(null);
  const terms = useMemo(() => [...builtins, ...userData.customTerms.map((t) => ({ ...t, searchIndex: makeIndex(t) }))], [userData.customTerms]);
  const filtered = useMemo(() => filterTerms(terms, { category, subgroup, region, kind, query: deferredQuery, savedOnly, bookmarks: userData.bookmarks, sort }), [terms, category, subgroup, region, kind, deferredQuery, savedOnly, userData.bookmarks, sort]);
  const searchPending = query !== deferredQuery;
  const selected = filtered.find((t) => t.id === selectedId) || (searchPending ? terms.find((t) => t.id === selectedId) : filtered[0]);
  const title = view === 'updates' ? '更新履歴' : savedOnly ? '保存した用語' : category === 'all' ? 'すべての用語' : categoryLabel(category);
  const subgroups = useMemo(() => {
    const map = new Map();
    for (const t of terms) if ((category === 'all' || t.category === category) && (!savedOnly || userData.bookmarks.includes(t.id))) {
      const key = `${t.category}|${t.subcategory}`;
      if (!map.has(key)) map.set(key, { key, label: `${category === 'all' ? categoryLabel(t.category) + ' / ' : ''}${t.subcategory}`, count: 0 });
      map.get(key).count++;
    }
    return [...map.values()];
  }, [terms, category, savedOnly, userData.bookmarks]);
  useEffect(() => {
    if (initialStorage.unreadableRaw && !storageRecovered) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(userData)); setStorageError(''); }
    catch { setStorageError('unavailable'); }
  }, [userData, initialStorage.unreadableRaw, storageRecovered]);
  useEffect(() => {
    if (view !== 'library' || searchPending) return;
    const id = selected?.id;
    if (id) setSelectedId(id);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${id ? '#term=' + encodeURIComponent(id) : ''}`);
    if (!id) setMobileDetail(false);
  }, [selected?.id,view,searchPending]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function onKey(e) {
      const editing = ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if (e.key === '/' && !editing && !modal && view === 'library') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'Escape' && !modal) { setSidebarOpen(false); setMobileDetail(false); }
    }
    function onHash() { if (new URLSearchParams(location.hash.slice(1)).has('update')) { setUpdateId(new URLSearchParams(location.hash.slice(1)).get('update'));setView('updates'); return; } const id = getHashId(); if (id) { setView('library'); setSelectedId(id); setCategory('all'); setSavedOnly(false); setSubgroup(''); setRegion('all'); setKind('all'); setQuery(''); setMobileDetail(true); } }
    window.addEventListener('keydown', onKey); window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', onHash); };
  }, [modal,view]);
  const toggleBookmark = useCallback((id) => setUserData((d) => ({ ...d, bookmarks: d.bookmarks.includes(id) ? d.bookmarks.filter((v) => v !== id) : [...d.bookmarks, id] })), []);
  const setNote = useCallback((id, value) => setUserData((d) => ({ ...d, notes: { ...d.notes, [id]: value } })), []);
  function selectTerm(term, clear = false) {
    setView('library');
    if (clear) { setCategory('all'); setSavedOnly(false); setSubgroup(''); setRegion('all'); setKind('all'); setQuery(''); }
    setSelectedId(term.id); setMobileDetail(true);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#term=${encodeURIComponent(term.id)}`);
  }
  function navigate(target) { if (target === 'updates') { setUpdateId('latest');setView('updates');setMobileDetail(false);setSidebarOpen(false);history.replaceState(null,'',`${location.pathname}${location.search}#update=latest`);return; } setView('library'); setKind('all'); setSavedOnly(target === 'saved'); setCategory(target === 'saved' ? 'all' : target); setSubgroup(''); setQuery(''); setRegion('all'); setMobileDetail(false); setSidebarOpen(false); }
  function resetFilters() { setKind('all');setQuery(''); setRegion('all'); setSubgroup(''); setCategory('all'); setSavedOnly(false); }
  function saveTerm(term) { if (!userData.customTerms.some((t) => t.id === term.id) && userData.customTerms.length >= 10000) { setToast('追加用語は 10,000 語まで保存できます'); return; } setUserData((d) => ({ ...d, customTerms: [...d.customTerms.filter((t) => t.id !== term.id), term] })); setModal(null); selectTerm(term, true); setToast('用語を保存しました'); }
  async function copyLink(id) { try { const url = new URL(window.location.href); url.hash = `term=${encodeURIComponent(id)}`; await navigator.clipboard.writeText(url.toString()); setToast('リンクをコピーしました'); } catch { setToast('このブラウザではコピーできません'); } }
  return <div className={`app-shell ${mobileDetail ? 'show-detail' : ''}`}>
    <Sidebar view={view} category={category} savedOnly={savedOnly} terms={terms} bookmarks={userData.bookmarks} navigate={navigate} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onData={() => { setSidebarOpen(false); setModal({ type: 'data' }); }}/>
    <header className="topbar"><div className="topbar-location"><button className="icon-button mobile-only" aria-label="分類を開く" onClick={() => setSidebarOpen(true)}><Icon name="menu"/></button><span className="breadcrumb-root">ライブラリ</span><span className="breadcrumb-divider">/</span><span className="current-view">{title}</span></div><button className="button add-button" onClick={() => setModal({ type: 'form' })}><Icon name="plus" size={15}/><span>追加</span></button></header>
    <main className={`main-content ${view === 'updates' ? 'updates-main' : ''}`}>
      {view === 'updates' ? <Suspense fallback={<div className="updates-empty">読み込み中</div>}><UpdatesView allTerms={terms} initialId={updateId} onReleaseChange={setUpdateId} onSelect={(term) => selectTerm(term,true)}/></Suspense> : <>
      <TermList terms={filtered} selectedId={selected?.id} onSelect={selectTerm} query={query} setQuery={setQuery} inputRef={inputRef} region={region} setRegion={setRegion} subgroup={subgroup} setSubgroup={setSubgroup} subgroups={subgroups} kind={kind} setKind={setKind} bookmarks={userData.bookmarks} toggleBookmark={toggleBookmark} sort={sort} setSort={setSort} title={title} onClear={resetFilters}/>
      <TermDetail term={selected} allTerms={terms} saved={selected ? userData.bookmarks.includes(selected.id) : false} toggleBookmark={toggleBookmark} onSelect={(t) => selectTerm(t, true)} onBack={() => setMobileDetail(false)} note={selected ? userData.notes[selected.id] : ''} setNote={setNote} onCopy={copyLink} onEdit={(term) => setModal({ type: 'form', term })} onDelete={(term) => setModal({ type: 'delete', term })}/>
      </>}
    </main>
    {modal?.type === 'form' ? <TermForm term={modal.term} initialCategory={category} allTerms={terms} onClose={() => setModal(null)} onSave={saveTerm}/> : null}
    {modal?.type === 'data' ? <DataDialog data={userData} total={terms.length} onClose={() => setModal(null)} notify={setToast} unreadableRaw={initialStorage.unreadableRaw && !storageRecovered ? initialStorage.unreadableRaw : null} onImport={(incoming) => { try { const merged = mergeBackup(userData, incoming); setUserData(merged); setStorageRecovered(true); setToast('データを取り込みました'); return true; } catch (error) { setToast(error.message); return false; } }}/> : null}
    {modal?.type === 'delete' ? <Dialog title="用語を削除" onClose={() => setModal(null)}><p>「{modal.term.name}」を削除します。</p><div className="dialog-footer"><button className="button" onClick={() => setModal(null)}>キャンセル</button><button className="button primary-button" onClick={() => { const id = modal.term.id; setUserData((d) => ({ ...d, customTerms: d.customTerms.filter((t) => t.id !== id), bookmarks: d.bookmarks.filter((v) => v !== id), notes: Object.fromEntries(Object.entries(d.notes).filter(([key]) => key !== id)) })); setModal(null); setMobileDetail(false); setToast('用語を削除しました'); }}>削除</button></div></Dialog> : null}
    {toast ? <div role="status" className="toast"><Icon name="check" size={17}/>{toast}</div> : null}
    {storageError ? <div role="alert" className="storage-alert">{storageError === 'unreadable' ? '以前の保存データを読み込めません。「データ」から元の内容を書き出せます。' : '変更をブラウザに保存できません。「データ」から書き出してください。'}</div> : null}
  </div>;
}
