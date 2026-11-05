import { useRef, useState } from 'react';
import Icon from '../Icon.jsx';
import Dialog from './Dialog.jsx';
import { parseBackup } from '../library.js';

export default function DataDialog({ data, total, onClose, onImport, notify, unreadableRaw }) {
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  function download(raw) {
    const blob = new Blob([typeof raw === 'string' ? raw : JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `stage-bank-${new Date().toLocaleDateString('sv-SE')}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('バックアップを書き出しました');
  }
  async function read(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setPending(null);
    try { if (file.size > 20000000) throw new Error('ファイルが大きすぎます。'); setPending(parseBackup(await file.text())); }
    catch (error) { setError(error instanceof SyntaxError ? 'JSON ファイルを読み込めませんでした。' : error.message); }
    e.target.value = '';
  }
  return <Dialog title="データ" onClose={onClose}><>{unreadableRaw ? <div className="import-preview"><p>以前のデータを読み込めませんでした。元の内容をファイルに保存できます。</p><button className="button" onClick={() => download(unreadableRaw)}>元のデータを書き出す</button></div> : null}</><div className="data-stats"><span>収録用語<b>{total.toLocaleString()}<small>語</small></b></span><span>追加した用語<b>{data.customTerms.length}<small>語</small></b></span><span>保存した用語<b>{data.bookmarks.length}<small>語</small></b></span></div><p className="dialog-description">保存した用語・追加した用語・メモを、このブラウザに保存しています。バックアップを使って別のブラウザに移せます。</p><div className="data-actions"><button className="button" onClick={() => download()}><Icon name="download" size={18}/>書き出す</button><button className="button" onClick={() => fileRef.current.click()}><Icon name="upload" size={18}/>読み込む</button><input hidden ref={fileRef} type="file" accept=".json,application/json" onChange={read}/></div>{pending ? <div className="import-preview"><p>追加用語 {pending.customTerms.length} 語・保存 {pending.bookmarks.length} 件・メモ {Object.keys(pending.notes).length} 件</p><p className="muted">現在のデータに追加します。重複する編集内容は現在のものを残します。</p><button className="button primary-button" onClick={() => { if (onImport(pending) !== false) setPending(null); }}>取り込む</button></div> : null}{error ? <p role="alert" className="error-text">{error}</p> : null}<details className="data-about"><summary>収録範囲について</summary><p>舞台・音響・照明から、映像、制作、安全、衣裳・メイク、楽器・音楽、電源・通信まで収録しています。用語・技術・機材・機能を種類で絞り込めます。日本・米国・英国の表現と、一部の欧州の表現を掲載しています。各用語の「出典・参考」から資料を確認できます。</p><p>名称や担当範囲には地域・劇場・機種ごとの差があります。用語集は随時追加できます。</p></details></Dialog>;
}
