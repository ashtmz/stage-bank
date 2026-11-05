import Icon from '../Icon.jsx';
import { categoryLabel, regions, kinds, kindLabel } from '../library.js';

export default function TermList({ terms, selectedId, onSelect, query, setQuery, inputRef, region, setRegion, subgroup, setSubgroup, subgroups, kind, setKind, bookmarks, toggleBookmark, sort, setSort, title, onClear }) {
  return <section className="list-panel" aria-label="用語一覧">
    <div className="list-controls">
      <div className="search-box"><Icon name="search" size={22}/><input ref={inputRef} type="search" placeholder="用語・英語・略語で検索" aria-label="用語を検索" value={query} onChange={(e) => setQuery(e.target.value)}/>{query ? <button className="icon-button" aria-label="検索を消す" onClick={() => setQuery('')}><Icon name="close" size={17}/></button> : <kbd>/</kbd>}</div>
      <div className="region-tabs" role="group" aria-label="使用地域">{regions.map(([id, label]) => <button key={id} className={region === id ? 'selected' : ''} onClick={() => setRegion(id)} aria-pressed={region === id}>{label}</button>)}</div>
      <div className="subgroup-filter"><select aria-label="小分類" value={subgroup} onChange={(e) => setSubgroup(e.target.value)}><option value="">すべての小分類</option>{subgroups.map((s) => <option key={s.key} value={s.key}>{s.label} ({s.count})</option>)}</select><select aria-label="種類" value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></div>
      <div className="list-meta"><span>{query ? '検索結果' : title}<small aria-live="polite">{terms.length.toLocaleString()} 件</small></span><label className="sort-label"><Icon name="sort" size={16}/><select aria-label="並び順" value={sort} onChange={(e) => setSort(e.target.value)}><option value="category">分類順</option><option value="kana">五十音順</option><option value="english">英語順</option><option value="verified">確認日順</option></select></label></div>
    </div>
    <div className="term-list" role="list">
      {terms.length ? terms.map((term) => <div role="listitem" key={term.id} className={`term-row ${selectedId === term.id ? 'is-selected' : ''}`}>
        <button className="term-pick" onClick={() => onSelect(term)} aria-current={selectedId === term.id ? 'true' : undefined}><span className="term-name">{term.name}</span><span className="term-english" lang="en">{term.english || term.reading}</span><span className="term-category">{categoryLabel(term.category)}{term.kind && term.kind !== 'term' ? ` · ${kindLabel(term.kind)}` : ''}</span></button>
        <button className={`icon-button row-save ${bookmarks.includes(term.id) ? 'is-saved' : ''}`} aria-label={`${term.name}を${bookmarks.includes(term.id) ? '保存から外す' : '保存'}`} aria-pressed={bookmarks.includes(term.id)} onClick={() => toggleBookmark(term.id)}><Icon name="bookmark" size={19} filled={bookmarks.includes(term.id)}/></button>
      </div>) : <div className="empty-list"><Icon name="search" size={30}/><p>該当する用語がありません</p><button className="text-button" onClick={onClear}>条件をリセット</button></div>}
    </div>
  </section>;
}
