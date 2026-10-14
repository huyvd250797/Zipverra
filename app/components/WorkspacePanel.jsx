'use client';

import { useEffect, useMemo, useState } from 'react';
import { makeLineDiff } from '../../lib/smart-push.js';
import { highlightSegments } from '../../lib/workspace-highlight.js';

function pickLanguage(path) {
  if (/\.(?:jsx?|tsx?|mjs|cjs)$/i.test(path)) return 'JavaScript / TypeScript';
  if (/\.json$/i.test(path)) return 'JSON';
  if (/\.css$/i.test(path)) return 'CSS';
  if (/\.md$/i.test(path)) return 'Markdown';
  if (/\.ya?ml$/i.test(path)) return 'YAML';
  if (/\.html?$/i.test(path)) return 'HTML';
  return 'Text';
}
function shortenHash(value) { return typeof value === 'string' ? value.slice(0, 10) : '—'; }
function parentOf(path) {return path.includes('/')?path.slice(0,path.lastIndexOf('/')):'';}
function splitCrumb(directory) {
  const p=directory.split('/').filter(Boolean),items=[{label:'root',path:''}];
  p.forEach((part,i)=>items.push({label:part,path:p.slice(0,i+1).join('/')}));
  return items;
}

export default function WorkspacePanel({ authenticated, owner, repo, branch, online, busy, onBack, api, onCommit }) {
  const [directory,setDirectory]=useState('');
  const [listing,setListing]=useState(null);
  const [selected,setSelected]=useState(null);
  const [draft,setDraft]=useState('');
  const [message,setMessage]=useState('');
  const [filter,setFilter]=useState('');
  const [searchResults,setSearchResults]=useState(null);
  const [editing,setEditing]=useState(false);
  const [review,setReview]=useState(null);
  const [confirmed,setConfirmed]=useState(false);
  const [allowEmpty,setAllowEmpty]=useState(false);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState(null);
  const [history,setHistory]=useState(null);
  const [historyBusy,setHistoryBusy]=useState(false);
  const coords=useMemo(()=>({owner,repo,branch}),[owner,repo,branch]);
  const dirty=selected && draft!==selected.content;
  const locked=busy||working||!authenticated||!online;
  const diff=useMemo(()=>selected && dirty ? makeLineDiff(selected.content,draft) : null,[selected,draft,dirty]);
  const codeLines=useMemo(()=>selected?selected.content.split('\n'):[],[selected]);
  const entries=searchResults ? searchResults.entries : (listing?.entries||[]).filter(e=>e.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const viewReady=Boolean(owner && repo && branch && authenticated);

  function clearEditor(){setSelected(null);setDraft('');setReview(null);setEditing(false);setConfirmed(false);setAllowEmpty(false);setHistory(null);}
  function mayDiscard(){return !dirty || window.confirm('Bản chỉnh sửa chưa được commit sẽ bị bỏ. Tiếp tục?');}
  async function openDirectory(path){
    if(locked||!mayDiscard())return;
    clearEditor();setSuccess(null);setFilter('');setSearchResults(null);setError('');setWorking(true);
    try{const result=await api('workspace/list',{...coords,directory:path});setListing(result);setDirectory(path);}
    catch(e){setError(e.message);}
    finally{setWorking(false);}
  }
  async function refresh(){await openDirectory(directory);}
  async function globalSearch(){
    if(locked||!filter.trim())return;
    setWorking(true);setError('');setSearchResults(null);
    try{const x=await api('workspace/search',{...coords,query:filter.trim()});setSearchResults(x);}catch(e){setError(e.message);}finally{setWorking(false);}
  }
  async function openFile(path){
    if(locked||!mayDiscard())return;
    clearEditor();setError('');setSuccess(null);setWorking(true);
    try{
      const value=await api('workspace/file',{...coords,path});
      setSelected(value);setDraft(value.content);setMessage(`Quick edit: ${path}`);
    }catch(e){setError(e.message);}
    finally{setWorking(false);}
  }
  function changeDraft(text){setDraft(text);setReview(null);setConfirmed(false);setSuccess(null);}
  async function preview(){
    if(locked||!selected||!dirty)return;
    setError('');setReview(null);setConfirmed(false);setWorking(true);
    try{
      const result=await api('workspace/preview',{...coords,path:selected.path,expectedHead:selected.head,originalSha:selected.sha,content:draft,allowEmpty});
      setReview(result);
    }catch(e){setError(e.message);}
    finally{setWorking(false);}
  }
  function refreshListingAfterSave(){
    api('workspace/list',{...coords,directory}).then(setListing).catch(()=>{setListing(null);});
  }
  async function save(){
    if(locked||!confirmed||!review||!selected||!dirty)return;
    setWorking(true);setError('');setSuccess(null);
    const request={proof:review.proof,content:draft,message,confirmed:true,allowEmpty};
    try{
      const result=await api('workspace/save',request);
      setSuccess({kind:'saved',sha:result.sha,url:result.url,path:selected.path});
      clearEditor();refreshListingAfterSave();
      onCommit?.(result);
    }catch(e){
      // A timed-out save can have succeeded. Only READ current file to verify; never auto-resend a mutation.
      if(e.network || e.httpStatus===503){
        try{
          const latest=await api('workspace/file',{...coords,path:selected.path});
          if(latest.sha===review.newSha){
            setSuccess({kind:'verified',path:selected.path,sha:latest.head,url:null});
            clearEditor();refreshListingAfterSave();
            onCommit?.({sha:latest.head,path:selected.path});
            return;
          }
        }catch{/* cannot verify */}
        setError('Kết quả commit chưa xác định do lỗi kết nối. Kiểm tra History trên GitHub và tải lại file; KHÔNG nhấn commit lần nữa trước khi xác minh.');
      }else setError(e.message);
    }finally{setWorking(false);}
  }
  async function readHistory(){
    if(!selected||historyBusy)return;
    setHistoryBusy(true);setError('');
    try{const x=await api('workspace/history',{...coords,path:selected.path});setHistory(x.commits);}catch(e){setError(e.message);}finally{setHistoryBusy(false);}
  }
  useEffect(()=>{
    if(!dirty)return;
    const warn=e=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);
  useEffect(()=>{
    if(!viewReady)return;
    let cancelled=false;
    setWorking(true);
    api('workspace/list',{...coords,directory:''}).then(v=>{if(!cancelled){setDirectory('');setListing(v);clearEditor();}})
      .catch(e=>{if(!cancelled)setError(e.message);})
      .finally(()=>{if(!cancelled)setWorking(false);});
    return()=>{cancelled=true;};
  },[owner,repo,branch,authenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return <article className="panel workspace-panel" data-mobile-view="repositories" aria-label="Repository Workspace">
    <div className="workspace-heading"><div><span className="mini-label">ZIPVERRA / WORKSPACE</span><h2>Repository Explorer</h2><p>{owner}/{repo} · <code>{branch}</code></p></div><button type="button" className="button secondary workspace-back" disabled={working||busy} onClick={()=>{if(mayDiscard())onBack();}}>← Repos</button></div>
    <div className="workspace-intro">Duyệt source và chỉnh sửa nhanh file text. ZIP Push vẫn là luồng cập nhật chính. Không chỉnh sửa hoặc đưa credentials vào repository.</div>
    {success && <div className="workspace-success" role="status"><strong>{success.kind==='verified'?'Nội dung đã được xác minh':'Commit thành công'}</strong><span>{success.path} · {shortenHash(success.sha)}</span>{success.url&&<a href={success.url} target="_blank" rel="noopener noreferrer">Mở commit GitHub ↗</a>}</div>}
    {error&&<div className="error-banner" role="alert">{error}</div>}
    {!online&&<p className="workspace-caution">Thiết bị đang offline. Chức năng Workspace chỉ hoạt động khi có mạng.</p>}
    <div className="workspace-toolbar"><div className="workspace-crumbs">{splitCrumb(directory).map((c,i)=><button type="button" key={c.path||'root'} disabled={locked||directory===c.path} onClick={()=>openDirectory(c.path)}>{i>0&&<span className="workspace-slash">/</span>}{c.label}</button>)}</div><button type="button" className="button secondary" onClick={refresh} disabled={locked}>↻ Refresh</button></div>
    {working&&<p className="workspace-loading" role="status">Đang kết nối GitHub…</p>}
    {!selected?<>
      <div className="workspace-search"><label htmlFor="workspace-filter">Tìm file</label><div className="workspace-search-row"><input id="workspace-filter" type="search" placeholder="Lọc thư mục hoặc tìm toàn repo" value={filter} onChange={e=>{setFilter(e.target.value);setSearchResults(null);}} onKeyDown={e=>{if(e.key==='Enter')globalSearch();}}/><button type="button" className="button secondary" onClick={globalSearch} disabled={locked||!filter.trim()}>Tìm toàn repo</button></div>{searchResults&&<small className="workspace-note">{searchResults.entries.length} kết quả{searchResults.truncated?' · Giới hạn 60 kết quả':''} · <button type="button" onClick={()=>{setSearchResults(null);setFilter('');}} className="workspace-clear">Xóa tìm kiếm</button></small>}</div>
      {listing?.entries?.length===0&&<p className="workspace-empty">Thư mục chưa có file được hỗ trợ.</p>}
      <div className="workspace-file-list">{entries.map(e=><button key={e.path} type="button" disabled={locked||!['file','directory'].includes(e.kind)} onClick={()=>e.kind==='directory'?openDirectory(e.path):openFile(e.path)} className="workspace-file"><span className="workspace-file-icon">{e.kind==='directory'?'▣':e.kind==='file'?'▤':'⊘'}</span><span className="workspace-file-info"><strong>{e.name}</strong><small>{e.kind==='directory'?'Folder':e.kind==='file'?`${e.size??'—'} bytes · ${pickLanguage(e.name)}`:'Unsupported'}</small></span><span className="workspace-file-chevron">›</span></button>)}</div>
      {listing?.entries?.length>0&&entries.length===0&&<p className="workspace-empty">Không tìm thấy kết quả.</p>}
      {listing&&<small className="workspace-note">Đang duyệt branch HEAD {shortenHash(listing.head)} · {entries.length} mục. File nhị phân và file quá 64 KiB không chỉnh sửa được.</small>}
    </>:<div className="workspace-editor">
      <div className="workspace-editor-title"><button type="button" className="workspace-return" disabled={working} onClick={()=>{if(mayDiscard())clearEditor();}}>← Danh sách</button><strong>{selected.path}</strong><span className="workspace-language">{pickLanguage(selected.path)}</span></div>
      <div className="workspace-editor-meta">HEAD: <code>{shortenHash(selected.head)}</code> · File SHA: <code>{shortenHash(selected.sha)}</code> · {selected.bytes} bytes</div>
      <div className="workspace-editor-actions"><button type="button" className={`button ${editing?'secondary':'primary'}`} disabled={locked} onClick={()=>{if(editing&&!mayDiscard())return;setEditing(!editing);if(editing)changeDraft(selected.content);}}> {editing?'Thoát chỉnh sửa':'Edit file'}</button><button type="button" className="button secondary" disabled={locked} onClick={readHistory}>{historyBusy?'Đang tải…':'File history'}</button><a className="button secondary" href={selected.url} target="_blank" rel="noopener noreferrer">GitHub ↗</a></div>
      {history&&<div className="workspace-history"><strong>Lịch sử của file</strong>{history.length?history.map(h=><a key={h.sha} href={h.url||`https://github.com/${owner}/${repo}/commit/${h.sha}`} target="_blank" rel="noopener noreferrer"><code>{shortenHash(h.sha)}</code> {h.message}</a>):<p>Không có commit gần đây.</p>}</div>}
      {editing?<>
        <label className="workspace-input-label" htmlFor="workspace-editor-input">Source editor · UTF-8</label>
        <textarea id="workspace-editor-input" className="workspace-textarea" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={draft} onChange={e=>changeDraft(e.target.value)} disabled={locked} rows={14} aria-label="Chỉnh sửa file source"/>
        <div className="workspace-editor-foot"><span>{new TextEncoder().encode(draft).length} / 65.536 bytes</span><span>{dirty?'● Chưa lưu':'Không có thay đổi'}</span></div>
        {!draft.length&&<label className="workspace-empty-confirm"><input type="checkbox" checked={allowEmpty} onChange={e=>{setAllowEmpty(e.target.checked);setReview(null);setConfirmed(false);}}/> Tôi xác nhận muốn lưu file rỗng.</label>}
        <label className="workspace-input-label" htmlFor="workspace-commit-message">Commit message</label><input id="workspace-commit-message" value={message} maxLength={200} disabled={locked} onChange={e=>{setMessage(e.target.value);setReview(null);setConfirmed(false);}}/>
        <button type="button" className="button primary full" disabled={locked||!dirty||(!draft&&!allowEmpty)||new TextEncoder().encode(draft).length>65536} onClick={preview}>Review Changes</button>
        {review&&<div className="workspace-review"><strong>Review · {selected.path}</strong><p>So sánh từ <code>{shortenHash(review.head)}</code> đến phiên bản mới. Preview hết hạn sau 5 phút.</p>{review.security?.findings?.length>0 && <div className="workspace-security"><strong>Security Scan · {review.security.warning} Warning</strong>{review.security.findings.map((f,i)=><p key={i}>{f.title} · {f.path}{f.line>0?`:${f.line}`:''}. {f.action}</p>)}</div>}<div className="workspace-diff">{diff?.truncated?<p>Diff quá dài để hiển thị đầy đủ. Xem lại nội dung trong editor và GitHub trước khi xác nhận.</p>:(diff?.lines||[]).map((line,i)=><div key={i} className={`diff-line diff-${line.kind}`}><span>{line.kind==='add'?'+':line.kind==='delete'?'−':' '}</span><code>{line.text||' '}</code></div>)}</div><label className="confirm-row"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={locked}/><span>Tôi đã kiểm tra thay đổi và đồng ý tạo commit trên <b>{branch}</b>.</span></label><button type="button" className="button primary full" disabled={!confirmed||locked} onClick={save}>Commit & Save File</button></div>}
      </>:<><pre className="workspace-code" aria-label="Nội dung file"><code>{codeLines.slice(0,900).map((line,i)=><span key={i} className="workspace-code-line">{highlightSegments(line,pickLanguage(selected.path)).map((token,j)=><span key={j} className={`workspace-syntax-${token.kind}`}>{token.text}</span>)}{i < codeLines.length - 1?'\n':''}</span>)}</code></pre>{codeLines.length>900&&<p className="workspace-note">Viewer chỉ hiển thị 900 dòng đầu tiên. Dùng Edit để xem toàn bộ file.</p>}</>}
    </div>}
  </article>;
}
