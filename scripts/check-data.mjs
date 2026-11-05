import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { categories, kinds, normalize } from '../src/library.js';

const directory = new URL('../src/data/', import.meta.url);
const files = (await readdir(directory)).filter((f) => f.endsWith('.json'));
const terms = (await Promise.all(files.map(async (f) => JSON.parse(await readFile(new URL(f, directory), 'utf8'))))).flat();
const ids = new Set();
const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
const originalIds = new Set(JSON.parse(await readFile(new URL('../maintenance/initial-library.json', import.meta.url), 'utf8')).map((t) => t.id));
const names = new Set(terms.flatMap((t) => [t.name, t.english, ...t.aliases]).map(normalize));
for (const term of terms) {
  assert.ok(!ids.has(term.id), `Duplicate ID: ${term.id}`);
  ids.add(term.id);
  assert.ok(categories.some((c) => c.id === term.category), `Category: ${term.id}`);
  for (const key of ['id','name','reading','english','subcategory','definition','usage','japan','us','uk','note']) {
    assert.equal(typeof term[key], 'string', `${term.id}.${key}`);
  }
  for (const key of ['name','reading','english','subcategory','definition']) assert.ok(term[key].trim(), `${term.id}.${key} is empty`);
  for (const key of ['aliases','related','regions']) assert.ok(Array.isArray(term[key]) && term[key].every((v) => typeof v === 'string'), `${term.id}.${key}`);
  assert.ok(term.regions.length && term.regions.every((r) => ['JP','US','UK','EU'].includes(r)), `Region: ${term.id}`);
  assert.ok(term.sources.length, `Missing source: ${term.id}`);
  for (const source of term.sources) assert.ok(source.label && /^https?:\/\//.test(source.url), `Source: ${term.id}`);
  for (const related of term.related) assert.ok(names.has(normalize(related)), `Unresolved related term: ${term.id} -> ${related}`);
  if (term.kind) assert.ok(kinds.some(([id]) => id !== 'all' && id === term.kind), `Kind: ${term.id}`);
  for (const key of ['detail','manufacturer','version']) if (term[key] !== undefined) assert.equal(typeof term[key], 'string', `${term.id}.${key}`);
  for (const key of ['examples','pitfalls']) if (term[key] !== undefined) assert.ok(Array.isArray(term[key]) && term[key].every((v) => typeof v === 'string' && v.trim()), `${term.id}.${key}`);
  if (term.specs) assert.ok(Array.isArray(term.specs) && term.specs.every((s) => s.label && typeof s.label === 'string' && s.value && typeof s.value === 'string'), `Specs: ${term.id}`);
  for (const key of ['verifiedAt','announcedAt']) if (term[key]) assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(term[key]) && term[key] <= date, `Date: ${term.id}.${key}`);
  if (['equipment','feature'].includes(term.kind)) assert.ok(term.verifiedAt, `Missing verifiedAt: ${term.id}`);
  if (!originalIds.has(term.id)) assert.ok(term.detail?.length >= 80 && (term.examples?.length || term.pitfalls?.length), `New entry lacks detailed context: ${term.id}`);
}
assert.match(terms.find((t) => t.name === '上手').english, /stage left/i);
assert.match(terms.find((t) => t.name === '下手').english, /stage right/i);
console.log(`${terms.length} terms validated; ${new Set(terms.map((t) => `${t.category}|${t.subcategory}`)).size} subcategories; ${new Set(terms.flatMap((t) => t.sources.map((s) => s.url))).size} reference URLs.`);
for (const category of categories) console.log(`${category.label}: ${terms.filter((t) => t.category === category.id).length}`);
