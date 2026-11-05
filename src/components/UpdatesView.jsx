import { useEffect, useMemo, useState } from 'react';
import { categories, categoryLabel, kindLabel, normalize } from '../library.js';
import Icon from '../Icon.jsx';
import releases from '../content/updates.json';
import status from '../content/update-status.json';

const fieldLabels = { name:'名称', reading:'読み', english:'英語', aliases:'別名', definition:'意味', detail:'詳しい説明', examples:'使用場面', pitfalls:'注意点', specs:'仕様', sources:'出典', japan:'日本の呼称', us:'米国の呼称', uk:'英国の呼称', europe:'欧州の呼称', note:'補足', related:'関連語', category:'分野', subcategory:'小分類', kind:'種類', manufacturer:'メーカー', version:'版・バージョン', announcedAt:'発表日', usage:'使用例', regions:'使用地域' };
const pageSize = 60;
export default function UpdatesView({ allTerms, onSelect, initialId, onReleaseChange }) {
  const initialRelease = releases.find((r) => r.id === initialId) || releases[0];
  const [releaseId, setReleaseId] = useState(initialRelease?.id);
  const [section, setSection] = useState(() => initialRelease?.added.length ? 'added' : initialRelease?.changed.length ? 'changed' : 'removed');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [limit, setLimit] = useState(pageSize);
  useEffect(() => { const target = releases.find((r) => r.id === initialId) || (initialId === 'latest' ? releases[0] : null); if(target && target.id !== releaseId) { setReleaseId(target.id);setSection(target.added.length ? 'added' : target.changed.length ? 'changed' : 'removed');setLimit(pageSize);setCategory('all');setQuery(''); } },[initialId,releaseId]);
  const release = releases.find((r) => r.id === releaseId) || releases[0];
  const termMap = useMemo(() => new Map(allTerms.map((t) => [t.id,t])), [allTerms]);
  const records = useMemo(() => {
    const key = normalize(query);
    return (release?.[section] || []).filter((entry) => (category === 'all' || entry.category === category) && (!key || normalize([entry.name,entry.summary,categoryLabel(entry.category),kindLabel(entry.kind)].join(' ')).includes(key)));
  }, [release,section,category,query]);
  function selectRelease(next) {
    onReleaseChange(next.id);setReleaseId(next.id); setSection(next.added.length ? 'added' : next.changed.length ? 'changed' : 'removed'); setQuery('');setCategory('all');setLimit(pageSize);
    history.replaceState(null,'',`${location.pathname}${location.search}#update=${next.id}`);
  }
  if (!release) return <section className="updates-empty"><p>更新履歴はまだありません。</p></section>;
  return <section className="updates-workspace" aria-label="更新インデックス">
    <aside className="release-sidebar" aria-label="更新日">
      <div className="release-nav-heading"><Icon name="history" size={19}/><span>更新インデックス</span></div>
      <div className="release-status"><span>資料の最終確認</span><strong>{status.lastCheckedAt}</strong>{status.schedule.enabled ? <p>毎月1日 9:00 · 日本時間</p> : <p>定期更新を設定中</p>}</div>
      <nav className="release-list" aria-label="更新履歴の一覧">{releases.map((r) => <button key={r.id} className={r.id === release.id ? 'release-selected' : ''} aria-current={r.id === release.id ? 'true' : undefined} onClick={() => selectRelease(r)}><time>{r.date}</time><span>{r.title}</span><small>追加 {r.added.length} · 変更 {r.changed.length}{r.removed.length ? ` · 整理 ${r.removed.length}` : ''}</small></button>)}</nav>
    </aside>
    <div className="release-detail">
      <header className="release-heading"><time>{release.date}</time><h1>{release.title}</h1><p>{release.summary}</p><div className="release-totals"><span>追加 <b>{release.added.length}</b></span><span>変更 <b>{release.changed.length}</b></span><span>収録 <b>{release.total.toLocaleString()}</b></span></div></header>
      <div className="release-controls"><div className="release-tabs" role="group" aria-label="変更の種類">{[['added','追加'],['changed','変更'],['removed','整理']].map(([id,label]) => <button key={id} className={section === id ? 'selected' : ''} aria-pressed={section === id} onClick={() => {setSection(id);setLimit(pageSize);}}>{label}<span>{release[id].length}</span></button>)}</div><div className="release-filters"><label className="release-search"><Icon name="search" size={17}/><input type="search" aria-label="更新内容を検索" placeholder="更新内容を検索" value={query} onChange={(e) => {setQuery(e.target.value);setLimit(pageSize);}}/></label><select aria-label="更新の分野" value={category} onChange={(e) => {setCategory(e.target.value);setLimit(pageSize);}}><option value="all">すべての分野</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div></div>
      <div className="change-list" aria-label="更新された項目">{records.length ? records.slice(0,limit).map((entry) => <div className="change-row" key={entry.id}><div className="change-row-heading"><button className="change-term-link" disabled={!termMap.has(entry.id)} onClick={() => onSelect(termMap.get(entry.id))}>{entry.name}{termMap.has(entry.id) ? <Icon name="arrow" size={15}/> : null}</button><span>{categoryLabel(entry.category)}{entry.kind !== 'term' ? ` / ${kindLabel(entry.kind)}` : ''}</span></div><p>{entry.summary}</p>{entry.fields ? <div className="changed-fields">{entry.fields.map((field) => <span key={field}>{fieldLabels[field] || field}</span>)}</div> : null}</div>) : <p className="change-empty">{query || category !== 'all' ? '該当する項目がありません。' : 'この種類の変更はありません。'}</p>}</div>
      {records.length > limit ? <button className="button more-changes" onClick={() => setLimit((v) => v + pageSize)}>さらに表示 <span>{Math.min(pageSize,records.length-limit)} 件</span></button> : null}
      <details className="release-sources"><summary>参照資料 <span>{release.sources.length} 件</span></summary><ul>{release.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}<Icon name="arrow" size={12}/></a></li>)}</ul></details>
    </div>
  </section>;
}
