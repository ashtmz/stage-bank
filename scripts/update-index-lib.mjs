import { createHash } from 'node:crypto';

const metadataFields = new Set(['verifiedAt', 'updatedAt', 'addedAt', 'searchIndex']);
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
const hash = (value) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
export const snapshotDigest = (snapshot) => hash(snapshot.map((term) => [term.id,term.hash]).sort(([a],[b]) => a.localeCompare(b)));

export function createSnapshot(terms) {
  const seen = new Set();
  return terms.map((term) => {
    if (seen.has(term.id)) throw new Error(`重複 ID: ${term.id}`);
    seen.add(term.id);
    const content = Object.fromEntries(Object.entries(term).filter(([key]) => !metadataFields.has(key)));
    return { id: term.id, name: term.name, category: term.category, kind: term.kind || 'term', definition: term.definition,
      hash: hash(content), fields: Object.fromEntries(Object.entries(content).map(([key, value]) => [key, hash(value)])), sources: term.sources };
  }).sort((a,b) => a.id.localeCompare(b.id));
}

const compact = (term) => ({ id: term.id, name: term.name, category: term.category, kind: term.kind, summary: term.definition });
function comparisonFields(term) {
  // Older snapshots hashed the source as written, so an implicit kind had no field hash.
  // Keep those stored hashes compatible while comparing the displayed default value.
  return { ...term.fields, kind: term.fields.kind ?? hash(term.kind || 'term') };
}
export function compareSnapshots(previous, next) {
  const before = new Map(previous.map((term) => [term.id, term]));
  const after = new Map(next.map((term) => [term.id, term]));
  const added = [], changed = [], removed = [];
  for (const term of next) {
    const old = before.get(term.id);
    if (!old) added.push(compact(term));
    else if (old.hash !== term.hash) {
      const oldFields = comparisonFields(old);
      const nextFields = comparisonFields(term);
      const fields = [...new Set([...Object.keys(oldFields), ...Object.keys(nextFields)])].filter((key) => oldFields[key] !== nextFields[key]);
      if (fields.length) changed.push({ ...compact(term), previousName: old.name, fields });
    }
  }
  for (const term of previous) if (!after.has(term.id)) removed.push(compact(term));
  return { added, changed, removed };
}

export function releaseMarkdown(release, categoryLabel) {
  const lines = [`# ${release.title}`, '', `${release.date} · ${release.added.length} 件追加 / ${release.changed.length} 件変更 / ${release.removed.length} 件整理`, '', release.summary, ''];
  for (const [key, label] of [['added','追加'],['changed','変更'],['removed','整理']]) {
    if (!release[key].length) continue;
    lines.push(`## ${label}`, '');
    for (const term of release[key]) lines.push(`- **${term.name}**（${categoryLabel(term.category)}）${term.fields ? ` — 変更項目: ${term.fields.join(' / ')}` : ''}\n  ${term.summary}\n  ID: \`${term.id}\``);
    lines.push('');
  }
  lines.push('## 参照資料', '');
  for (const source of release.sources) lines.push(`- [${source.label}](${source.url})`);
  return lines.join('\n') + '\n';
}
