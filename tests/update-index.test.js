import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createSnapshot, compareSnapshots, releaseMarkdown } from '../scripts/update-index-lib.mjs';

const term = { id: 'audio-a', name: '元の用語', category: 'audio', definition: '元の意味', sources: [{ label:'公式資料',url:'https://example.com/official' }] };

async function withIndexFixture(check) {
  const directory = await mkdtemp(join(tmpdir(),'stage-bank-index-'));
  try {
    for (const sub of ['scripts','src/data','src/content','maintenance','docs/updates']) await mkdir(join(directory,sub),{recursive:true});
    await writeFile(join(directory,'package.json'),'{"type":"module"}');
    for (const file of ['scripts/index-update.mjs','scripts/update-index-lib.mjs','src/library.js']) await copyFile(new URL('../'+file,import.meta.url),join(directory,file));
    const invoke = (extra=[]) => spawnSync(process.execPath,[join(directory,'scripts/index-update.mjs'),'--date','2026-11-03',...extra],{encoding:'utf8'});
    const run = (extra=[]) => { const result=invoke(extra);assert.equal(result.status,0,result.stderr);return result.stdout; };
    await check({ directory, dataset:join(directory,'src/data/terms.json'), snapshot:join(directory,'maintenance/content-snapshot.json'), index:join(directory,'src/content/updates.json'), run, invoke });
  } finally { await rm(directory,{recursive:true,force:true}); }
}

test('変更箇所・追加・削除を ID で判定し、名称変更も同じ項目の更新として扱う', () => {
  const before = createSnapshot([term, { ...term, id:'audio-removed' }]);
  const next = createSnapshot([{ ...term, name:'変更した名称', detail:'新しい詳しい説明' }, { ...term, id:'audio-new' }]);
  const diff = compareSnapshots(before,next);
  assert.deepEqual(diff.added.map(t=>t.id),['audio-new']);
  assert.deepEqual(diff.removed.map(t=>t.id),['audio-removed']);
  assert.deepEqual(diff.changed[0].fields,['name','detail']);
  assert.equal(diff.changed[0].previousName,'元の用語');
});
test('JSON のキー順や確認日だけの変更では実質的な更新を作らない', () => {
  const previous=createSnapshot([{ ...term, verifiedAt:'2026-11-03' }]);
  const next=createSnapshot([{ sources:term.sources, definition:term.definition, category:term.category, name:term.name, id:term.id, verifiedAt:'2026-12-01' }]);
  assert.deepEqual(compareSnapshots(previous,next),{added:[],changed:[],removed:[]});
});
test('旧形式の snapshot でも kind の省略と term の明示を同じ意味として比較する', () => {
  const legacy = JSON.parse(JSON.stringify(createSnapshot([term])));
  assert.equal(Object.hasOwn(legacy[0].fields,'kind'),false);
  const explicit = createSnapshot([{...term,kind:'term'}]);
  const original = JSON.stringify(legacy);
  assert.deepEqual(compareSnapshots(legacy,explicit),{added:[],changed:[],removed:[]});
  assert.deepEqual(compareSnapshots(explicit,legacy),{added:[],changed:[],removed:[]});
  assert.deepEqual(compareSnapshots(legacy,createSnapshot([{...term,kind:'term',definition:'改訂した意味'}])).changed[0].fields,['definition']);
  assert.deepEqual(compareSnapshots(legacy,createSnapshot([{...term,kind:'feature'}])).changed[0].fields,['kind']);
  assert.equal(JSON.stringify(legacy),original);
});
test('参照資料や用例の並び替えは既定値の補完と区別して変更として残す', () => {
  const source = {label:'二つ目の資料',url:'https://example.com/second'};
  const before = createSnapshot([{...term,sources:[...term.sources,source],examples:['最初の例','次の例']}]);
  const next = createSnapshot([{...term,kind:'term',sources:[source,...term.sources],examples:['次の例','最初の例']}]);
  assert.deepEqual(compareSnapshots(before,next).changed[0].fields,['sources','examples']);
});
test('出典 URL・仕様・注意点の変更は更新として記録し、入力を変更しない', () => {
  const copy=JSON.stringify(term);
  const before=createSnapshot([term]);
  const next=createSnapshot([{ ...term, sources:[{label:'改訂された公式資料',url:'https://example.com/new'}],specs:[{label:'対応',value:'新機能'}] }]);
  const diff=compareSnapshots(before,next);
  assert.deepEqual(diff.changed[0].fields,['sources','specs']);
  assert.equal(JSON.stringify(term),copy);
  assert.throws(()=>createSnapshot([term,term]),/重複/);
});
test('更新インデックスの Markdown に追加用語・変更項目・出典を残す', () => {
  const diff=compareSnapshots([],createSnapshot([term]));
  const output=releaseMarkdown({title:'更新',date:'2026-11-03',summary:'範囲を拡充',...diff,sources:term.sources},()=> '音響');
  assert.match(output,/元の用語/);assert.match(output,/audio-a/);assert.match(output,/https:\/\/example.com\/official/);
});

test('実際の更新コマンドは再実行と中断後の再開で索引を二重作成しない', async () => {
  await withIndexFixture(async ({directory,dataset,snapshot,index,run}) => {
    await writeFile(dataset,JSON.stringify([term,{...term,id:'audio-old',name:'旧項目'}]));
    run(['--initialize']);
    const initialSnapshot=await readFile(snapshot,'utf8');
    await writeFile(dataset,JSON.stringify([{...term,name:'新しい名称',detail:'詳しい説明を追記'}, {...term,id:'audio-new',name:'追加項目'}]));
    run();
    let releases=JSON.parse(await readFile(index,'utf8'));
    assert.equal(releases.length,2);assert.equal(releases[0].added.length,1);assert.equal(releases[0].changed.length,1);assert.equal(releases[0].removed.length,1);
    assert.match(run(),/変更はありません/);
    assert.equal(JSON.parse(await readFile(index,'utf8')).length,2);
    await writeFile(snapshot,initialSnapshot);
    assert.match(run(),/中断していた/);
    releases=JSON.parse(await readFile(index,'utf8'));
    assert.equal(releases.length,2);
    assert.match(run(),/変更はありません/);
    const markdown=await readFile(join(directory,'docs/updates/'+releases[0].id+'.md'),'utf8');
    assert.match(markdown,/新しい名称/);assert.match(markdown,/追加項目/);assert.match(markdown,/旧項目/);
  });
});

test('初回索引の履歴保存後に中断しても初期作成と通常実行のどちらからも再開できる', async () => {
  for (const options of [['--initialize'],[]]) await withIndexFixture(async ({directory,dataset,snapshot,index,run,invoke}) => {
    const terms = [term,{...term,id:'audio-b',name:'別の用語'}];
    await writeFile(dataset,JSON.stringify(terms));
    run(['--initialize']);
    const savedIndex = await readFile(index,'utf8');
    const [release] = JSON.parse(savedIndex);
    // The history is durable, but the final snapshot and generated documentation are missing.
    await rm(snapshot);
    await rm(join(directory,'docs/updates'),{recursive:true});
    assert.match(run(options),/中断していた/);
    assert.equal(await readFile(index,'utf8'),savedIndex);
    assert.deepEqual(JSON.parse(await readFile(snapshot,'utf8')),createSnapshot(terms));
    assert.match(await readFile(join(directory,`docs/updates/${release.id}.md`),'utf8'),/別の用語/);
    assert.match(await readFile(join(directory,'docs/updates/README.md'),'utf8'),new RegExp(release.id));
    assert.match(run(),/変更はありません/);
    assert.notEqual(invoke(['--initialize']).status,0);
  });
});

test('既存のハッシュ形式から kind を明示しても全件変更にせず実際の編集だけを記録する', async () => {
  await withIndexFixture(async ({dataset,snapshot,index,run}) => {
    const originalTerms = [term,{...term,id:'audio-b',name:'別の用語'}];
    const legacySnapshot = JSON.stringify(createSnapshot(originalTerms),null,2)+'\n';
    const initialRelease = [{id:'2026-10-01-01',date:'2026-10-01',title:'初期収録',type:'initial',added:originalTerms,changed:[],removed:[],sources:term.sources}];
    await writeFile(snapshot,legacySnapshot);
    await writeFile(index,JSON.stringify(initialRelease));
    const explicit = originalTerms.map(t=>({...t,kind:'term'}));
    await writeFile(dataset,JSON.stringify(explicit));
    assert.match(run(),/変更はありません/);
    assert.equal(await readFile(snapshot,'utf8'),legacySnapshot);
    assert.deepEqual(JSON.parse(await readFile(index,'utf8')),initialRelease);
    await writeFile(dataset,JSON.stringify(explicit.map(t=>t.id===term.id?{...t,definition:'内容を改訂'}:t)));
    run();
    const releases = JSON.parse(await readFile(index,'utf8'));
    assert.equal(releases.length,2);
    assert.equal(releases[0].added.length,0);
    assert.equal(releases[0].removed.length,0);
    assert.equal(releases[0].changed.length,1);
    assert.equal(releases[0].changed[0].id,term.id);
    assert.deepEqual(releases[0].changed[0].fields,['definition']);
    assert.match(run(),/変更はありません/);
  });
});
