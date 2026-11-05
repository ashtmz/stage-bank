import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalize,
  makeIndex,
  filterTerms,
  emptyUserData,
  validateTerm,
  parseBackup,
  mergeBackup,
} from '../src/library.js';

function term(overrides = {}) {
  return {
    id: 'audio-fader', name: 'フェーダー', reading: 'ふぇーだー', english: 'Fader',
    aliases: ['スライドフェーダー'], category: 'audio', subcategory: 'ミキサー・操作',
    definition: '信号レベルを調整する操作子。', usage: '台詞の音量を調整する。',
    japan: '', us: '', uk: '', note: '', related: [],
    regions: ['JP', 'US', 'UK'], sources: [], ...overrides,
  };
}

const fixtures = [
  term({ id: 'audio-dca', name: 'DCA・VCA', reading: 'でぃーしーえーぶいしーえー', english: 'DCA / VCA group', aliases: ['コントロールグループ'], definition: '複数チャンネルの音量を一括操作する制御グループ。' }),
  term({ id: 'stage-left', name: '上手', reading: 'かみて', english: 'Stage left', aliases: ['SL'], category: 'stage', subcategory: '方向・位置', definition: '客席から見て右側。', regions: ['JP', 'US', 'UK'] }),
  term({ id: 'audio-matrix', name: 'マトリクス', reading: 'まとりくす', english: 'Matrix', aliases: ['MTX'], subcategory: 'ルーティング・接続', definition: 'ミックスを組み合わせる出力。', regions: ['JP', 'US', 'UK', 'EU'] }),
  term(),
  term({ id: 'lighting-dimmer', name: '調光器', reading: 'ちょうこうき', english: 'Dimmer', aliases: ['ディマー'], category: 'lighting', subcategory: '調光・電源', definition: '照明の明るさを制御する装置。', regions: ['JP', 'US', 'UK', 'EU'] }),
  term({ id: 'stage-prompt', name: 'プロンプトサイド', reading: 'ぷろんぷとさいど', english: 'Prompt side', aliases: ['PS'], category: 'stage', subcategory: '方向・位置', definition: '舞台監督の操作位置を基準とする側の呼び方。', regions: ['UK'] }),
  term({ id: 'audio-stage-rack', name: 'ステージラック', reading: 'すてーじらっく', english: 'Stage rack', aliases: [], subcategory: 'ルーティング・接続', definition: 'ステージ左側に配置する音声用ラック。Stage leftとの連絡に使用する。', regions: ['US'] }),
];
const ids = (rows) => rows.map((row) => row.id);
const custom = (overrides = {}) => term({ id: 'custom-local-mic', name: '持込マイク', reading: 'もちこみまいく', english: 'Guest microphone', subcategory: '現場メモ', definition: 'この現場で使うマイクの呼び方。', ...overrides });
const serialize = (overrides = {}) => JSON.stringify({ ...emptyUserData(), ...overrides });

test('検索の正規化は英字の大小、全角、半角カナ、句読点を吸収する', () => {
  assert.equal(normalize(' ＤＣＡ／ＶＣＡ・GROUP '), 'dcavcagroup');
  assert.equal(normalize('ﾌｪｰﾀﾞｰ'), normalize('フェーダー'));
  assert.equal(normalize('フェーダー'), 'ふぇーだー');
  assert.equal(normalize('Ｓｔａｇｅ－Ｒｉｇｈｔ'), normalize('stage right'));
  assert.equal(normalize(), '');
});

test('日本語・読み・英語・略語・別名から同じ用語に到達できる', () => {
  for (const query of ['上手', 'かみて', 'ＳＴＡＧＥ ＬＥＦＴ', 'SL']) {
    assert.ok(ids(filterTerms(fixtures, { query })).includes('stage-left'), query);
  }
  assert.deepEqual(ids(filterTerms(fixtures, { query: 'コントロールグループ' })), ['audio-dca']);
  assert.deepEqual(ids(filterTerms(fixtures, { query: 'MTX' })), ['audio-matrix']);
  assert.deepEqual(ids(filterTerms(fixtures, { query: 'ﾌｪｰﾀﾞｰ' })), ['audio-fader']);
});

test('複数語は異なるフィールドも含めてAND検索し、空白や記号だけなら全件を返す', () => {
  assert.deepEqual(ids(filterTerms(fixtures, { query: '音響 コントロール' })), ['audio-dca']);
  assert.deepEqual(ids(filterTerms(fixtures, { query: 'ＤＣＡ　音量' })), ['audio-dca']);
  assert.deepEqual(ids(filterTerms(fixtures, { query: 'DCA 存在しない語' })), []);
  assert.deepEqual(ids(filterTerms(fixtures, { query: '  \n\t ' })), ids(fixtures));
  assert.deepEqual(ids(filterTerms(fixtures, { query: '／・' })), ids(fixtures));
});

test('分類・小分類・地域・保存済みの条件は同時に満たす用語だけを残す', () => {
  const options = {
    category: 'audio', subgroup: 'audio|ルーティング・接続', region: 'EU',
    savedOnly: true, bookmarks: ['audio-matrix', 'audio-fader', 'lighting-dimmer'],
  };
  assert.deepEqual(ids(filterTerms(fixtures, options)), ['audio-matrix']);
  assert.deepEqual(ids(filterTerms(fixtures, { ...options, category: 'stage' })), []);
  assert.deepEqual(ids(filterTerms(fixtures, { ...options, bookmarks: [] })), []);
  assert.deepEqual(ids(filterTerms(fixtures, { category: 'stage', region: 'UK' })), ['stage-left', 'stage-prompt']);
  assert.deepEqual(ids(filterTerms(fixtures, { region: 'EU' })), ['audio-matrix', 'lighting-dimmer']);
  assert.deepEqual(ids(filterTerms(fixtures, { subgroup: 'stage|ミキサー・操作' })), []);
});

test('保存済みだけの表示は重複IDや存在しないIDの影響を受けない', () => {
  assert.deepEqual(ids(filterTerms(fixtures, {
    savedOnly: true, bookmarks: ['audio-fader', 'audio-fader', 'missing', 'stage-left'],
  })), ['stage-left', 'audio-fader']);
  assert.deepEqual(ids(filterTerms(fixtures, { bookmarks: ['audio-fader'] })), ids(fixtures));
});

test('五十音順・英語順に並べ替えられ、元の配列と項目を変更しない', () => {
  const rows = [
    term({ id: 'z', name: '座席', reading: 'ざせき', english: 'Seat' }),
    term({ id: 'a', name: '音響', reading: 'おんきょう', english: 'Audio' }),
    term({ id: 'k', name: '上手', reading: 'かみて', english: 'Stage left' }),
    term({ id: 'fallback', name: '舞台', reading: '', english: 'Stage' }),
  ];
  const before = structuredClone(rows);
  assert.deepEqual(ids(filterTerms(rows, { sort: 'kana' })), ['a', 'k', 'z', 'fallback']);
  assert.deepEqual(ids(filterTerms(rows, { sort: 'english' })), ['a', 'z', 'fallback', 'k']);
  assert.deepEqual(rows, before);
});

test('既定の検索順は名称の完全一致を、説明にしか出ない一致より先にする', () => {
  const rows = [...fixtures].reverse();
  const result = filterTerms(rows, { query: 'Stage left' });
  assert.equal(result[0].id, 'stage-left');
  assert.ok(ids(result).includes('audio-stage-rack'));
});

test('検索インデックスを事前作成しても同じ結果になり、欧州の注記も検索できる', () => {
  const rows = [term({ id: 'custom-eu', europe: 'CourとJardinの位置を確認する。' }), ...fixtures];
  const indexed = rows.map((row) => ({ ...row, searchIndex: makeIndex(row) }));
  for (const query of ['Cour', 'DCA', 'ふぇーだー', 'stage right', '音響 ミックス']) {
    assert.deepEqual(ids(filterTerms(indexed, { query })), ids(filterTerms(rows, { query })), query);
  }
  assert.deepEqual(ids(filterTerms(indexed, { query: 'Jardin' })), ['custom-eu']);
});

test('空のユーザーデータは呼び出しごとに独立し、バックアップとして読める', () => {
  const first = emptyUserData();
  first.bookmarks.push('audio-fader');
  first.customTerms.push(custom());
  first.notes['audio-fader'] = '現場のメモ';
  assert.deepEqual(emptyUserData(), { version: 1, customTerms: [], bookmarks: [], notes: {} });
  assert.deepEqual(parseBackup(JSON.stringify(first)), first);
});

test('正しい追加用語・欧州表記・出典を復元し、保存済みIDの重複だけを除く', () => {
  const entry = custom({ europe: '欧州の会場で使う呼び方。', regions: ['JP', 'EU'], sources: [{ label: '機器資料', url: 'https://example.org/manual' }] });
  const result = parseBackup(serialize({ customTerms: [entry], bookmarks: ['audio-fader', 'audio-fader', entry.id], notes: { [entry.id]: '装着位置を確認。' } }));
  assert.deepEqual(result.customTerms, [entry]);
  assert.deepEqual(result.bookmarks, ['audio-fader', entry.id]);
  assert.equal(result.notes[entry.id], '装着位置を確認。');
  assert.equal(validateTerm(entry), true);
});

test('壊れたバックアップを取り込まず、既存データと混ざる前に拒否する', () => {
  const invalid = [
    '{', 'null', '[]', serialize({ version: 2 }), serialize({ customTerms: 'bad' }),
    serialize({ bookmarks: [1] }), serialize({ notes: [] }), serialize({ notes: { a: 42 } }),
    serialize({ notes: { a: 'x'.repeat(20001) } }),
    serialize({ customTerms: [custom({ id: 'audio-builtin' })] }),
    serialize({ customTerms: [custom({ name: '  ' })] }),
    serialize({ customTerms: [custom({ definition: '' })] }),
    serialize({ customTerms: [custom({ subcategory: '' })] }),
    serialize({ customTerms: [custom({ category: 'unknown' })] }),
    serialize({ customTerms: [custom({ aliases: [null] })] }),
    serialize({ customTerms: [custom({ related: 'bad' })] }),
    serialize({ customTerms: [custom({ regions: ['XX'] })] }),
    serialize({ customTerms: [custom({ sources: [{ label: '資料', url: 'javascript:alert(1)' }] })] }),
    serialize({ customTerms: [custom({ europe: 1 })] }),
    serialize({ customTerms: [custom(), custom()] }),
  ];
  for (const raw of invalid) assert.throws(() => parseBackup(raw), raw.slice(0, 180));
});

test('復元時に特殊なメモキーを除外し、通常のメモは保持する', () => {
  const raw = '{"version":1,"customTerms":[],"bookmarks":[],"notes":{"__proto__":"bad","constructor":"bad","prototype":"bad","audio-fader":"残すメモ"}}';
  const result = parseBackup(raw);
  assert.deepEqual(result.notes, { 'audio-fader': '残すメモ' });
  assert.equal(Object.hasOwn(result.notes, '__proto__'), false);
  assert.equal({}.polluted, undefined);
});

test('バックアップ統合は現在の追加用語とメモを優先し、新規データを追加する', () => {
  const localTerm = custom({ definition: '現在の端末で編集した定義。' });
  const oldTerm = custom({ definition: '古いバックアップの定義。' });
  const addedTerm = custom({ id: 'custom-imported', name: '持込卓' });
  const current = {
    version: 1, customTerms: [localTerm], bookmarks: ['audio-fader', localTerm.id],
    notes: { 'audio-fader': '', [localTerm.id]: '現在のメモ' },
  };
  const incoming = {
    version: 1, customTerms: [oldTerm, addedTerm], bookmarks: ['audio-fader', 'stage-left'],
    notes: { 'audio-fader': '以前のメモ', [localTerm.id]: '古いメモ', 'stage-left': '新しいメモ' },
  };
  const beforeCurrent = structuredClone(current);
  const beforeIncoming = structuredClone(incoming);
  const result = mergeBackup(current, incoming);
  assert.equal(result.version, 1);
  assert.deepEqual(result.customTerms.find((row) => row.id === localTerm.id), localTerm);
  assert.deepEqual(result.customTerms.find((row) => row.id === addedTerm.id), addedTerm);
  assert.equal(result.customTerms.length, 2);
  assert.deepEqual(new Set(result.bookmarks), new Set(['audio-fader', localTerm.id, 'stage-left']));
  assert.deepEqual(result.notes, { 'audio-fader': '', [localTerm.id]: '現在のメモ', 'stage-left': '新しいメモ' });
  assert.deepEqual(current, beforeCurrent);
  assert.deepEqual(incoming, beforeIncoming);
  assert.deepEqual(mergeBackup(result, incoming), result, '同じバックアップを再度復元しても重複しない');
});

test('個別には有効でも統合後に一万語を超えるバックアップは拒否し、両方のデータを保つ', () => {
  const current = parseBackup(serialize({
    customTerms: Array.from({ length: 6000 }, (_, i) => custom({ id: `custom-current-${i}`, name: `現在の用語${i}` })),
    bookmarks: ['custom-current-0'], notes: { 'custom-current-0': '現在のメモ' },
  }));
  const incoming = parseBackup(serialize({
    customTerms: Array.from({ length: 6000 }, (_, i) => custom({ id: `custom-incoming-${i}`, name: `追加の用語${i}` })),
    bookmarks: ['custom-incoming-0'], notes: { 'custom-incoming-0': '追加のメモ' },
  }));
  const beforeCurrent = structuredClone(current);
  const beforeIncoming = structuredClone(incoming);

  assert.throws(() => mergeBackup(current, incoming), /10,000/);
  assert.deepEqual(current, beforeCurrent);
  assert.deepEqual(incoming, beforeIncoming);
});

test('用語・技術・機材・機能を区別し、従来の項目は用語として残す', () => {
  const rows = [term(),term({id:'network-clock',kind:'technology',category:'network'}),term({id:'audio-console',kind:'equipment'}),term({id:'audio-processing',kind:'feature'})];
  assert.deepEqual(ids(filterTerms(rows,{kind:'term'})),['audio-fader']);
  assert.deepEqual(ids(filterTerms(rows,{kind:'technology',category:'network'})),['network-clock']);
  assert.deepEqual(ids(filterTerms(rows,{kind:'equipment'})),['audio-console']);
  assert.deepEqual(ids(filterTerms(rows,{kind:'feature'})),['audio-processing']);
});

test('詳しい説明・場面・注意点・メーカー・仕様も検索でき、確認日順に並ぶ', () => {
  const entry=term({id:'audio-device',kind:'equipment',manufacturer:'メーカー確認用',detail:'複数の卓をつなぐ運用例',examples:['オーケストラ収録'],pitfalls:['バックアップとの違い'],specs:[{label:'光接続',value:'確認用の専用仕様'}],verifiedAt:'2026-11-03'});
  for (const query of ['メーカー確認用','複数の卓','オーケストラ収録','バックアップ','専用仕様']) assert.deepEqual(ids(filterTerms([entry],{query})),['audio-device']);
  const older=term({id:'audio-older',verifiedAt:'2026-10-01'});
  assert.deepEqual(ids(filterTerms([term(),older,entry],{sort:'verified'})),['audio-device','audio-older','audio-fader']);
});

test('追加用語の詳細と仕様をバックアップで保持し、不正な拡張フィールドを拒否する', () => {
  const rich=custom({kind:'equipment',category:'network',manufacturer:'確認用メーカー',detail:'個別の詳しい説明',examples:['公演で使用'],pitfalls:['接続条件は別途確認'],specs:[{label:'対応',value:'仕様確認済み'}],verifiedAt:'2026-11-03'});
  assert.deepEqual(parseBackup(serialize({customTerms:[rich]})).customTerms,[rich]);
  for (const overrides of [{kind:'unknown'},{specs:[{label:'仕様',value:4}]},{examples:'文字列だけ'},{detail:{bad:true}}]) assert.throws(()=>parseBackup(serialize({customTerms:[{...rich,...overrides}]})),/形式/);
});
