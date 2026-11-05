import { useState } from 'react';
import Dialog from './Dialog.jsx';
import { categories, kinds } from '../library.js';

const split = (s) => s.split(/[,、\n]/).map((v) => v.trim()).filter(Boolean);
export default function TermForm({ term, initialCategory, allTerms, onClose, onSave }) {
  const [values, setValues] = useState({ kind: term?.kind || 'term', detail:term?.detail || '', name: term?.name || '', reading: term?.reading || '', english: term?.english || '', aliases: term?.aliases.join('、') || '', category: term?.category || (initialCategory !== 'all' ? initialCategory : 'stage'), subcategory: term?.subcategory || '', definition: term?.definition || '', usage: term?.usage || '', japan: term?.japan || '', us: term?.us || '', uk: term?.uk || '', europe: term?.europe || '', note: term?.note || '', regions: term?.regions || ['JP'], sourceUrl: term?.sources[0]?.url || '', sourceLabel: term?.sources[0]?.label || '' });
  const [error, setError] = useState('');
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const subgroups = [...new Set(allTerms.filter((t) => t.category === values.category).map((t) => t.subcategory))];
  function submit(e) {
    e.preventDefault();
    if (!values.name.trim() || !values.definition.trim() || !values.subcategory.trim()) { setError('用語・小分類・意味を入力してください。'); return; }
    const url = values.sourceUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) { setError('参考 URL は https:// または http:// で入力してください。'); return; }
    const { sourceUrl, sourceLabel, ...fields } = values;
    const { searchIndex, ...original } = term || {};
    onSave({ ...original, ...fields, name: values.name.trim(), subcategory: values.subcategory.trim(), definition: values.definition.trim(), id: term?.id || `custom-${crypto.randomUUID()}`, aliases: [...new Set(split(values.aliases))], related: term?.related || [], sources: [...(url ? [{ label: sourceLabel.trim() || url, url }] : []), ...(term?.sources.slice(1) || [])] });
  }
  return <Dialog title={term ? '用語を編集' : '用語を追加'} onClose={onClose} wide><form onSubmit={submit} className="term-form">
    <div className="form-grid"><label>用語 <span className="required">必須</span><input value={values.name} onChange={set('name')} maxLength={160} required autoFocus/></label><label>読み<input value={values.reading} onChange={set('reading')} maxLength={160}/></label><label>英語<input value={values.english} onChange={set('english')} maxLength={240}/></label><label>別名・略語<input value={values.aliases} onChange={set('aliases')} placeholder="読点で区切る" maxLength={1000}/></label><label>分野<select value={values.category} onChange={(e) => setValues((v) => ({ ...v, category: e.target.value, subcategory: '' }))}>{categories.map((c) => <option value={c.id} key={c.id}>{c.label}</option>)}</select></label><label>小分類 <span className="required">必須</span><input list="subgroup-options" value={values.subcategory} onChange={set('subcategory')} required maxLength={100}/><datalist id="subgroup-options">{subgroups.map((s) => <option key={s} value={s}/>)}</datalist></label></div>
    <div className="form-grid form-kind"><label>種類<select value={values.kind} onChange={set('kind')}>{kinds.filter(([id]) => id !== 'all').map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label></div><label>意味 <span className="required">必須</span><textarea value={values.definition} onChange={set('definition')} required maxLength={5000}/></label><label>詳しい説明<textarea value={values.detail} onChange={set('detail')} maxLength={10000}/></label><label>使用例<input value={values.usage} onChange={set('usage')} maxLength={2000}/></label>
    <fieldset><legend>使用地域</legend><div className="check-row">{[['JP','日本'],['US','米国'],['UK','英国'],['EU','欧州']].map(([id,label]) => <label key={id}><input type="checkbox" checked={values.regions.includes(id)} onChange={(e) => setValues((v) => ({ ...v, regions: e.target.checked ? [...v.regions, id] : v.regions.filter((r) => r !== id) }))}/>{label}</label>)}</div></fieldset>
    <details className="form-extra"><summary>地域の呼び方・参考資料</summary><div className="form-grid">{[['japan','日本'],['us','米国'],['uk','英国'],['europe','欧州']].map(([key,label]) => <label key={key}>{label}<input value={values[key]} onChange={set(key)} maxLength={2000}/></label>)}<label>参考資料名<input value={values.sourceLabel} onChange={set('sourceLabel')} maxLength={200}/></label><label>参考 URL<input type="url" value={values.sourceUrl} onChange={set('sourceUrl')} maxLength={2000}/></label></div><label>補足<textarea value={values.note} onChange={set('note')} maxLength={5000}/></label></details>
    {error ? <p role="alert" className="error-text">{error}</p> : null}<div className="dialog-footer"><button type="button" className="button" onClick={onClose}>キャンセル</button><button type="submit" className="button primary-button">保存</button></div>
  </form></Dialog>;
}
