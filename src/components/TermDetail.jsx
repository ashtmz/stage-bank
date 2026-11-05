import { useEffect, useRef, useState } from 'react';
import Icon from '../Icon.jsx';
import { categoryLabel, kindLabel, normalize, additionalDetail } from '../library.js';

function StageDiagram({ term }) {
  const left = /上手/.test(term.name) || /^stage left$/i.test(term.english);
  const right = /下手/.test(term.name) || /^stage right$/i.test(term.english);
  if (!left && !right) return null;
  return <figure className="stage-diagram" aria-label="客席から見た舞台。右が上手・Stage left、左が下手・Stage right。">
    <div className="stage-back">奥 <span>/ Upstage</span></div>
    <div className="stage-sides"><div className={right ? 'diagram-active' : ''}><b>下手</b><span>Stage right</span></div><div className={left ? 'diagram-active' : ''}><b>上手</b><span>Stage left</span></div></div>
    <figcaption>客席 <span>/ Audience</span></figcaption>
  </figure>;
}

export default function TermDetail({ term, allTerms, saved, toggleBookmark, onSelect, onBack, note, setNote, onCopy, onEdit, onDelete }) {
  const [editingNote, setEditingNote] = useState(false);
  const contentRef = useRef(null);
  useEffect(() => { contentRef.current?.scrollTo(0, 0); setEditingNote(false); }, [term?.id]);
  if (!term) return <section className="detail-panel detail-empty" aria-label="用語の詳細"><Icon name="book" size={40}/><p>用語を選択</p><button className="text-button mobile-back" onClick={onBack}><Icon name="back" size={17}/>一覧</button></section>;
  const related = term.related.map((name) => {
    const matches = allTerms.filter((entry) => entry.id !== term.id && [entry.name, entry.english, ...entry.aliases].some((v) => normalize(v) === normalize(name)));
    return matches.find((entry) => entry.category === term.category) || matches[0];
  }).filter(Boolean);
  const additionalExamples = (term.examples || []).filter((text) => normalize(text) !== normalize(term.usage));
  const expandedText = additionalDetail(term);
  const showNote = term.note && !(term.pitfalls || []).some((text) => normalize(text) === normalize(term.note));
  const regionRows = [['日本', term.japan], ['米国', term.us], ['英国', term.uk], ['欧州', term.europe]];
  return <article className="detail-panel" ref={contentRef} aria-label="用語の詳細">
    <div className="detail-top"><div><button className="text-button mobile-back" onClick={onBack}><Icon name="back" size={17}/>一覧</button><span className="detail-crumb">{categoryLabel(term.category)}<span>/</span>{term.subcategory}</span></div><div className="detail-actions"><button className={`icon-button ${saved ? 'is-saved' : ''}`} aria-label={`${term.name}を${saved ? '保存から外す' : '保存'}`} aria-pressed={saved} onClick={() => toggleBookmark(term.id)}><Icon name="bookmark" size={22} filled={saved}/></button><button className="icon-button" aria-label="用語へのリンクをコピー" onClick={() => onCopy(term.id)}><Icon name="link" size={23}/></button></div></div>
    <header className="term-heading"><h1>{term.name}</h1><p className="reading">{term.reading}</p><p className="english-heading" lang="en">{term.english}</p>{term.aliases.length ? <div className="aliases">{term.aliases.map((alias) => <span key={alias}>{alias}</span>)}</div> : null}</header>
    <p className="definition">{term.definition}</p>
    {term.kind && term.kind !== 'term' || term.manufacturer || term.verifiedAt ? <div className="entry-meta">{term.kind && term.kind !== 'term' ? <span>{kindLabel(term.kind)}</span> : null}{term.manufacturer ? <span>{term.manufacturer}</span> : null}{term.version ? <span>{term.version}</span> : null}{term.verifiedAt ? <span>確認 {term.verifiedAt}</span> : null}{term.announcedAt ? <span>発表 {term.announcedAt}</span> : null}</div> : null}
    {expandedText ? <section className="detail-section expanded-detail"><h2>仕組み・概要</h2>{expandedText.split(/\n+/).filter(Boolean).map((paragraph,i) => <p key={i}>{paragraph}</p>)}</section> : null}
    {term.specs?.length ? <section className="detail-section"><h2>仕様・対応</h2><dl className="spec-table">{term.specs.map((spec,i) => <div key={i}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl></section> : null}
    <StageDiagram term={term}/>
    {regionRows.some(([, value]) => value) ? <section className="detail-section"><h2>地域による呼び方</h2><dl className="region-comparison">{regionRows.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section> : null}
    {term.usage ? <section className="detail-section usage"><h2>使用例</h2><p>{term.usage}</p></section> : null}
    {additionalExamples.length ? <section className="detail-section"><h2>使う場面</h2><ul className="detail-points">{additionalExamples.map((text,i) => <li key={i}>{text}</li>)}</ul></section> : null}
    {term.pitfalls?.length ? <section className="detail-section"><h2>違い・注意点</h2><ul className="detail-points">{term.pitfalls.map((text,i) => <li key={i}>{text}</li>)}</ul></section> : null}
    {showNote ? <section className="detail-section note-section"><h2>補足</h2><p>{term.note}</p></section> : null}
    <div className="detail-footer">{related.length ? <div className="related"><span>関連する用語</span>{[...new Map(related.map((t) => [t.id, t])).values()].map((t) => <button key={t.id} className="related-link" onClick={() => onSelect(t)}>{t.name}<Icon name="arrow" size={13}/></button>)}</div> : <span/>}</div>
    <details className="sources"><summary>出典・参考<span>{term.sources.length}</span></summary>{term.sources.length ? <ul>{term.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label}<Icon name="arrow" size={13}/></a></li>)}</ul> : <p>ユーザーが追加した用語</p>}</details>
    <section className="personal-note"><button className="text-button" onClick={() => setEditingNote((v) => !v)} aria-expanded={editingNote}><Icon name="note" size={16}/>メモ{note ? 'あり' : ''}</button>{editingNote ? <textarea aria-label="自分のメモ" placeholder="現場での呼び方など" value={note || ''} onChange={(e) => setNote(term.id, e.target.value)} maxLength={20000}/> : note ? <p>{note}</p> : null}</section>
    {term.id.startsWith('custom-') ? <div className="custom-actions"><button className="text-button" onClick={() => onEdit(term)}>編集</button><button className="text-button" onClick={() => onDelete(term)}>削除</button></div> : null}
  </article>;
}
