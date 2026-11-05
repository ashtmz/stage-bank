export const categories = [
  { id: 'stage', label: '舞台・劇場', icon: 'stage' },
  { id: 'audio', label: '音響', icon: 'audio' },
  { id: 'lighting', label: '照明', icon: 'light' },
  { id: 'video', label: '映像・制御', icon: 'video' },
  { id: 'production', label: '制作・運営', icon: 'clipboard' },
  { id: 'safety', label: '安全・仕込み', icon: 'safety' },
  { id: 'costume', label: '衣裳・メイク', icon: 'costume' },
  { id: 'music', label: '楽器・音楽', icon: 'music' },
  { id: 'network', label: '電源・通信', icon: 'network' },
];
export const kinds = [['all', 'すべての種類'], ['term', '用語'], ['technology', '技術'], ['equipment', '機材'], ['feature', '機能']];
export const kindLabel = (kind) => kinds.find(([id]) => id === kind)?.[1] || '用語';
export const categoryLabel = (id) => categories.find((c) => c.id === id)?.label || id;
export const regions = [['all', 'すべて'], ['JP', '日本'], ['US', '米国'], ['UK', '英国'], ['EU', '欧州']];
export const normalize = (value = '') => String(value).normalize('NFKC').toLowerCase()
  .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
  .replace(/[\s\p{P}\p{S}]/gu, '');

export function additionalDetail(term) {
  let text = (term.detail || '').trim();
  const definition = term.definition.trim();
  const note = (term.note || '').trim();
  const usage = (term.usage || '').trim();
  if (definition && text.startsWith(definition)) text = text.slice(definition.length).trim();
  if (note && text.endsWith(note)) text = text.slice(0, -note.length).trim();
  if (usage && text.endsWith(usage)) text = text.slice(0, -usage.length).trim();
  return text;
}

export function makeIndex(term) {
  return normalize([term.name, term.reading, term.english, ...term.aliases, term.definition,
    categoryLabel(term.category), term.subcategory, term.japan, term.us, term.uk, term.europe || '', term.note,
    term.detail || '', ...(term.examples || []), ...(term.pitfalls || []), term.manufacturer || '', term.version || '',
    ...(term.specs || []).map((spec) => `${spec.label} ${spec.value}`), kindLabel(term.kind)].join(' '));
}

export function filterTerms(terms, { category = 'all', subgroup = '', region = 'all', kind = 'all', query = '', savedOnly = false, bookmarks = [], sort = 'category' } = {}) {
  const words = query.trim().split(/\s+/u).map(normalize).filter(Boolean);
  const saved = new Set(bookmarks);
  const result = terms.filter((term) =>
    (category === 'all' || term.category === category) &&
    (!subgroup || `${term.category}|${term.subcategory}` === subgroup) &&
    (region === 'all' || term.regions.includes(region)) &&
    (kind === 'all' || (term.kind || 'term') === kind) &&
    (!savedOnly || saved.has(term.id)) &&
    (!words.length || words.every((word) => (term.searchIndex || makeIndex(term)).includes(word)))
  );
  if (sort === 'kana') result.sort((a, b) => (a.reading || a.name).localeCompare(b.reading || b.name, 'ja'));
  if (sort === 'english') result.sort((a, b) => a.english.localeCompare(b.english, 'en'));
  if (sort === 'verified') result.sort((a,b) => (b.verifiedAt || '').localeCompare(a.verifiedAt || ''));
  if (words.length && sort === 'category') {
    const queryKey = normalize(query);
    const rank = (term) => normalize(term.name) === queryKey || normalize(term.english) === queryKey ? 0
      : [term.name, term.reading, term.english, ...term.aliases].some((v) => normalize(v).startsWith(queryKey)) ? 1 : 2;
    result.sort((a, b) => rank(a) - rank(b));
  }
  return result;
}

export const emptyUserData = () => ({ version: 1, customTerms: [], bookmarks: [], notes: {} });
export const STORAGE_KEY = 'stage-bank.user.v1';
const validString = (v, max = 10000) => typeof v === 'string' && v.length <= max;
const validArray = (v) => Array.isArray(v) && v.every((s) => validString(s));
export function validateTerm(term) {
  if (!term || typeof term !== 'object' || !validString(term.id, 160) || !term.id.startsWith('custom-')) return false;
  if (!categories.some((c) => c.id === term.category)) return false;
  if (!['name', 'reading', 'english', 'subcategory', 'definition', 'usage', 'japan', 'us', 'uk', 'note'].every((key) => validString(term[key]))) return false;
  if (!term.name.trim() || !term.definition.trim() || !term.subcategory.trim()) return false;
  if (!['aliases', 'related', 'regions'].every((key) => validArray(term[key]))) return false;
  if (!term.regions.every((r) => ['JP', 'US', 'UK', 'EU'].includes(r))) return false;
  if (term.europe !== undefined && !validString(term.europe)) return false;
  if (term.kind !== undefined && !kinds.some(([id]) => id !== 'all' && id === term.kind)) return false;
  for (const key of ['detail', 'manufacturer', 'version', 'verifiedAt', 'announcedAt']) if (term[key] !== undefined && !validString(term[key])) return false;
  for (const key of ['examples', 'pitfalls']) if (term[key] !== undefined && !validArray(term[key])) return false;
  if (term.specs !== undefined && (!Array.isArray(term.specs) || !term.specs.every((s) => s && validString(s.label) && validString(s.value)))) return false;
  return Array.isArray(term.sources) && term.sources.every((source) => source && validString(source.label) && validString(source.url) && /^https?:\/\//i.test(source.url));
}
export function parseBackup(raw) {
  const data = JSON.parse(raw);
  if (!data || data.version !== 1 || !Array.isArray(data.customTerms) || data.customTerms.length > 10000 || !data.customTerms.every(validateTerm)
      || !validArray(data.bookmarks) || !data.notes || typeof data.notes !== 'object' || Array.isArray(data.notes)
      || !Object.values(data.notes).every((v) => validString(v, 20000))) throw new Error('形式を確認してください。');
  if (new Set(data.customTerms.map((t) => t.id)).size !== data.customTerms.length) throw new Error('用語の ID が重複しています。');
  const notes = Object.fromEntries(Object.entries(data.notes).filter(([k]) => !['__proto__', 'constructor', 'prototype'].includes(k)));
  return { version: 1, customTerms: data.customTerms, bookmarks: [...new Set(data.bookmarks)], notes };
}
export function mergeBackup(current, incoming) {
  // Restore merges additions; existing local edits and notes take priority.
  const merged = {
    version: 1,
    customTerms: [...new Map([...incoming.customTerms, ...current.customTerms].map((term) => [term.id, term])).values()],
    bookmarks: [...new Set([...current.bookmarks, ...incoming.bookmarks])],
    notes: { ...incoming.notes, ...current.notes },
  };
  if (merged.customTerms.length > 10000) throw new Error('追加用語は 10,000 語まで取り込めます。現在のデータは保持しています。');
  return merged;
}
