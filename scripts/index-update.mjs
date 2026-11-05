import { readFile, writeFile, readdir, mkdir, rename } from 'node:fs/promises';
import { createSnapshot, compareSnapshots, releaseMarkdown, snapshotDigest } from './update-index-lib.mjs';
import { categoryLabel } from '../src/library.js';

const root = new URL('../', import.meta.url);
async function atomicWrite(url, content) {
  const temporary = new URL(`${url.href}.tmp-${process.pid}`);
  await writeFile(temporary,content);
  await rename(temporary,url);
}
const args = process.argv.slice(2);
const option = (key, fallback) => { const index = args.indexOf(key); return index >= 0 ? args[index + 1] : fallback; };
const initialize = args.includes('--initialize');
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const date = option('--date', today);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('日付は YYYY-MM-DD で指定してください。');
const title = option('--title', initialize ? '初期収録' : '用語・機材情報を更新');
const summary = option('--summary', '公式資料を確認し、収録内容を更新しました。');
const dataFiles = (await readdir(new URL('src/data/', root))).filter((f) => f.endsWith('.json'));
const terms = (await Promise.all(dataFiles.map(async (f) => JSON.parse(await readFile(new URL(`src/data/${f}`, root), 'utf8'))))).flat();
const snapshotFile = new URL('maintenance/content-snapshot.json', root);
const indexFile = new URL('src/content/updates.json', root);
let previous = [], releases = [];
try { previous = JSON.parse(await readFile(snapshotFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
try { releases = JSON.parse(await readFile(indexFile, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const next = createSnapshot(terms);
const diff = compareSnapshots(previous, next);
const hasChanges = diff.added.length || diff.changed.length || diff.removed.length;
const contentHash = snapshotDigest(next);
if (hasChanges && releases[0]?.contentHash === contentHash) {
  // A prior interrupted run already wrote the history. Complete its snapshot without duplicating the release.
  // This also precedes the initialization guards because the first snapshot may not exist yet.
  await mkdir(new URL('docs/updates/', root), { recursive: true });
  await mkdir(new URL('maintenance/', root), { recursive: true });
  await atomicWrite(new URL(`docs/updates/${releases[0].id}.md`, root), releaseMarkdown(releases[0],categoryLabel));
  await atomicWrite(new URL('docs/updates/README.md', root), '# 更新インデックス\n\n' + releases.map((r) => `- [${r.date} ${r.title}](./${r.id}.md) — 追加 ${r.added.length} / 変更 ${r.changed.length} / 整理 ${r.removed.length}`).join('\n') + '\n');
  await atomicWrite(snapshotFile,JSON.stringify(next,null,2)+'\n');
  console.log(`${releases[0].id}: 中断していたインデックスの保存を完了しました。`);
  process.exit(0);
}
if (initialize && (previous.length || releases.length)) throw new Error('初期インデックスは作成済みです。通常の更新を使用してください。');
if (!initialize && !previous.length) throw new Error('先に --initialize で初期インデックスを作成してください。');
if (!hasChanges) { console.log('内容の変更はありません。更新履歴は増やしていません。'); process.exit(0); }
const changedIds = new Set([...diff.added, ...diff.changed].map((term) => term.id));
const sources = [...new Map(terms.filter((term) => changedIds.has(term.id)).flatMap((term) => term.sources).map((source) => [source.url, source])).values()];
const sequence = releases.filter((r) => r.date === date).length + 1;
const release = { id: `${date}-${String(sequence).padStart(2,'0')}`, date, title, summary, type: initialize ? 'initial' : 'update', total: terms.length, contentHash, ...diff, sources };
const updatedReleases = [release, ...releases];
await mkdir(new URL('docs/updates/', root), { recursive: true });
await mkdir(new URL('src/content/', root), { recursive: true });
await mkdir(new URL('maintenance/', root), { recursive: true });
await atomicWrite(new URL(`docs/updates/${release.id}.md`, root), releaseMarkdown(release, categoryLabel));
await atomicWrite(indexFile, JSON.stringify(updatedReleases, null, 2) + '\n');
await atomicWrite(new URL('docs/updates/README.md', root), '# 更新インデックス\n\n' + updatedReleases.map((r) => `- [${r.date} ${r.title}](./${r.id}.md) — 追加 ${r.added.length} / 変更 ${r.changed.length} / 整理 ${r.removed.length}`).join('\n') + '\n');
await atomicWrite(snapshotFile, JSON.stringify(next, null, 2) + '\n');
console.log(`${release.id}: +${diff.added.length} / changed ${diff.changed.length} / removed ${diff.removed.length}; total ${terms.length}`);
