'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { makeLineDiff } from '../../lib/smart-push.js';
import { highlightSegments } from '../../lib/workspace-highlight.js';
import { workspaceBreadcrumbs, workspaceEntries, workspaceInsert } from '../../lib/workspace-ux.js';

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
export default function WorkspacePanel({ authenticated, owner, repo, branch, online, busy, onBack, api, onCommit, onDirtyChange }) {
  const [directory,setDirectory]=useState('');
  const [listing,setListing]=useState(null);
  const [selected,setSelected]=useState(null);
  const [draft,setDraft]=useState('');
  const [message,setMessage]=useState('');
  const [filter,setFilter]=useState('');
  const [searchResults,setSearchResults]=useState(null);
  const [pane,setPane]=useState('code');
  const [favoriteFolders,setFavoriteFolders]=useState([]);
  const [copied,setCopied]=useState(false);
  const editorRef=useRef(null);
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
  const entries=useMemo(()=>workspaceEntries(searchResults ? searchResults.entries : listing?.entries, searchResults ? '' : filter),[searchResults,listing,filter]);
  const crumbItems=useMemo(()=>workspaceBreadcrumbs(directory),[directory]);
  const viewReady=Boolean(owner && repo && branch && authenticated);

  function clearEditor(){onDirtyChange?.(false);setSelected(null);setDraft('');setReview(null);setPane('code');setConfirmed(false);setAllowEmpty(false);setHistory(null);}
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
  function changeDraft(text){onDirtyChange?.(Boolean(selected && text!==selected.content));setDraft(text);setReview(null);setConfirmed(false);setSuccess(null);if(pane==='review')setPane('edit');}
  async function preview(){
    if(locked||!selected||!dirty)return;
    setError('');setReview(null);setConfirmed(false);setWorking(true);
    try{
      const result=await api('workspace/preview',{...coords,path:selected.path,expectedHead:selected.head,originalSha:selected.sha,content:draft,allowEmpty});
      setReview(result);setPane('review');
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
    try{const x=await api('workspace/history',{...coords,path:selected.path});setHistory(x.commits);setPane('history');}catch(e){setError(e.message);}finally{setHistoryBusy(false);}
  }
  useEffect(()=>{onDirtyChange?.(Boolean(dirty));return()=>onDirtyChange?.(false);},[dirty,onDirtyChange]);
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

  function insertIndent() {
    if(!selected||locked)return;
    const textarea=editorRef.current;
    const next=workspaceInsert(draft,textarea?.selectionStart ?? draft.length,textarea?.selectionEnd ?? draft.length,'  ');
    if(new TextEncoder().encode(next.value).length>65536)return;
    changeDraft(next.value);
    requestAnimationFrame(()=>{textarea?.focus();textarea?.setSelectionRange(next.caret,next.caret);});
  }
  async function copyPath() {
    if(!selected||!navigator.clipboard?.writeText)return;
    try{await navigator.clipboard.writeText(selected.path);setCopied(true);}catch{setCopied(false);}
  }
  function toggleFolder(path){setFavoriteFolders(current=>current.includes(path)?current.filter(x=>x!==path):[...current.slice(-5),path]);}

  return <article className="panel workspace-panel" data-mobile-view="repositories" aria-label="Repository Workspace">
    <div className="workspace-heading"><div><span className="mini-label">ZIPVERRA / WORKSPACE</span><h2>Repository Explorer</h2><p>{owner}/{repo} · <code>{branch}</code></p></div><button type="button" className="button secondary workspace-back" disabled={working||busy} onClick={()=>{if(mayDiscard())onBack();}}>← Repos</button></div>
    <div className="workspace-intro">Duyệt source, xem code, chỉnh sửa và kiểm tra lịch sử file ngay trên điện thoại. ZIP Push vẫn là luồng chính.</div>
    {success && <div className="workspace-success" role="status"><strong>{success.kind==='verified'?'Nội dung đã được xác minh':'Commit thành công'}</strong><span>{success.path} · {shortenHash(success.sha)}</span>{success.url&&<a href={success.url} target="_blank" rel="noopener noreferrer">Mở commit GitHub ↗</a>}</div>}
    {error&&<div className="error-banner" role="alert">{error}</div>}
    {!online&&<p className="workspace-caution">Thiết bị đang offline. Chức năng Workspace chỉ hoạt động khi có mạng.</p>}
    <div className="workspace-toolbar" aria-label="Đường dẫn thư mục hiện tại">
      <nav className="workspace-crumbs" aria-label="Breadcrumb Workspace">{crumbItems.map((c,i)=><button type="button" key={c.path||'root'} title={c.path||'Repository root'} aria-current={directory===c.path?'location':undefined} disabled={locked||directory===c.path} onClick={()=>openDirectory(c.path)}>{i>0&&<span className="workspace-slash" aria-hidden="true">/</span>}{c.label}</button>)}</nav>
      <button type="button" className="button secondary workspace-refresh" onClick={refresh} disabled={locked} aria-label="Làm mới thư mục">↻</button>
    </div>
    {working&&<p className="workspace-loading" role="status">Đang kết nối GitHub…</p>}
    {!selected?<>
      <div className="workspace-search"><label htmlFor="workspace-filter">Tìm file trong repository</label><div className="workspace-search-row"><input id="workspace-filter" type="search" placeholder="Lọc thư mục hoặc tìm toàn repo" value={filter} onChange={e=>{setFilter(e.target.value);setSearchResults(null);}} onKeyDown={e=>{if(e.key==='Enter')globalSearch();}}/><button type="button" className="button secondary" onClick={globalSearch} disabled={locked||!filter.trim()}>Tìm toàn repo</button></div>{searchResults&&<small className="workspace-note">{searchResults.entries.length} kết quả{searchResults.truncated?' · Giới hạn 60 kết quả':''} · <button type="button" onClick={()=>{setSearchResults(null);setFilter('');}} className="workspace-clear">Xóa tìm kiếm</button></small>}</div>
      {favoriteFolders.length>0&&<div className="workspace-favorites" aria-label="Thư mục đã ghim"><span className="mini-label">THƯ MỤC GẦN ĐÂY ĐÃ GHIM</span><div>{favoriteFolders.map(path=><button type="button" key={path} disabled={locked} title={path} onClick={()=>openDirectory(path)}>☆ {path.split('/').pop()}</button>)}</div></div>}
      {directory&&<div className="workspace-directory-actions"><button type="button" className="workspace-parent" disabled={locked} onClick={()=>openDirectory(directory.includes('/')?directory.slice(0,directory.lastIndexOf('/')):'')}>← Thư mục trước</button><button type="button" aria-pressed={favoriteFolders.includes(directory)} className="workspace-pin" disabled={locked} onClick={()=>toggleFolder(directory)}>{favoriteFolders.includes(directory)?'★ Bỏ ghim':'☆ Ghim thư mục'}</button></div>}
      {listing?.entries?.length===0&&<p className="workspace-empty">Thư mục chưa có file được hỗ trợ.</p>}
      <div className="workspace-file-list" role="list" aria-label="Danh sách file và thư mục">{entries.map(e=><button key={e.path} type="button" role="listitem" disabled={locked||!['file','directory'].includes(e.kind)} onClick={()=>e.kind==='directory'?openDirectory(e.path):openFile(e.path)} className="workspace-file"><span className="workspace-file-icon" aria-hidden="true">{e.kind==='directory'?'▣':e.kind==='file'?'▤':'⊘'}</span><span className="workspace-file-info"><strong>{e.name}</strong><small>{e.kind==='directory'?'Folder':e.kind==='file'?`${e.size??'—'} bytes · ${pickLanguage(e.name)}`:'Unsupported'}</small></span><span className="workspace-file-chevron" aria-hidden="true">›</span></button>)}</div>
      {listing?.entries?.length>0&&entries.length===0&&<p className="workspace-empty">Không tìm thấy kết quả.</p>}
      {listing&&<small className="workspace-note">Đang duyệt HEAD {shortenHash(listing.head)} · {entries.length} mục. File nhị phân và file trên 64 KiB chỉ đọc / không hỗ trợ chỉnh sửa.</small>}
    </>:<div className="workspace-editor">
      <div className="workspace-editor-title"><button type="button" className="workspace-return" disabled={working} onClick={()=>{if(mayDiscard())clearEditor();}}>← Danh sách</button><strong>{selected.path}</strong><span className="workspace-language">{pickLanguage(selected.path)}</span></div>
      <div className="workspace-editor-meta">HEAD: <code>{shortenHash(selected.head)}</code> · File SHA: <code>{shortenHash(selected.sha)}</code> · {selected.bytes} bytes</div>
      <nav className="workspace-view-tabs" aria-label="Chế độ xem và chỉnh sửa file">
        {[{id:'code',label:'Code'},{id:'edit',label:'Edit'},{id:'review',label:'Review',disabled:!review},{id:'history',label:'History'}].map(tab=><button type="button" key={tab.id} aria-current={pane===tab.id?'page':undefined} className={pane===tab.id?'active':''} disabled={locked||tab.disabled} onClick={()=>{if(tab.id==='history'){if(history)setPane('history');else readHistory();}else setPane(tab.id);}}>{tab.label}</button>)}
      </nav>
      <div className="workspace-editor-actions"><button type="button" className="button secondary" onClick={copyPath} disabled={!navigator?.clipboard || locked}>{copied?'✓ Đã copy':'Copy path'}</button><a className="button secondary" href={selected.url} target="_blank" rel="noopener noreferrer">GitHub ↗</a>{dirty&&<span className="workspace-unsaved" role="status">● Chưa commit</span>}</div>
      {pane==='history'&&<section className="workspace-history" aria-label="Lịch sử file"><strong>Lịch sử của file</strong>{historyBusy?<p>Đang tải lịch sử…</p>:history?.length?history.map(h=><a key={h.sha} href={h.url||`https://github.com/${owner}/${repo}/commit/${h.sha}`} target="_blank" rel="noopener noreferrer"><code>{shortenHash(h.sha)}</code><span>{h.message}</span><span aria-hidden="true">↗</span></a>):<p>Chưa tìm thấy commit gần đây.</p>}</section>}
      {pane==='edit'&&<section className="workspace-edit-pane" aria-label="Quick Edit">
        <label className="workspace-input-label" htmlFor="workspace-editor-input">Source editor · UTF-8</label>
        <div className="workspace-mobile-tools" role="toolbar" aria-label="Công cụ chỉnh sửa"><button type="button" disabled={locked} onClick={insertIndent}>↳ Indent</button><button type="button" disabled={locked||!dirty} onClick={()=>{if(window.confirm('Hoàn tác toàn bộ chỉnh sửa chưa commit?'))changeDraft(selected.content);}}>↶ Reset</button><span>{new TextEncoder().encode(draft).length.toLocaleString('vi-VN')} / 65.536 B</span></div>
        <textarea ref={editorRef} id="workspace-editor-input" className="workspace-textarea" spellCheck={false} autoCapitalize="off" autoCorrect="off" value={draft} onChange={e=>changeDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Tab'){e.preventDefault();insertIndent();}else if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();preview();}}} disabled={locked} rows={14} aria-label="Chỉnh sửa file source"/>
        <div className="workspace-editor-foot"><span>Chỉ lưu file text tối đa 64 KiB</span><span>{dirty?'● Chưa lưu':'Không có thay đổi'}</span></div>
        {!draft.length&&<label className="workspace-empty-confirm"><input type="checkbox" checked={allowEmpty} onChange={e=>{setAllowEmpty(e.target.checked);setReview(null);setConfirmed(false);}}/> Tôi xác nhận muốn lưu file rỗng.</label>}
        <label className="workspace-input-label" htmlFor="workspace-commit-message">Commit message</label><input id="workspace-commit-message" value={message} maxLength={200} disabled={locked} onChange={e=>{setMessage(e.target.value);setReview(null);setConfirmed(false);}}/>
        <button type="button" className="button primary full" disabled={locked||!dirty||(!draft&&!allowEmpty)||new TextEncoder().encode(draft).length>65536} onClick={preview}>Review Changes</button>
      </section>}
      {pane==='review'&&review&&<section className="workspace-review" aria-label="Review thay đổi"><strong>Review · {selected.path}</strong><p>So sánh từ <code>{shortenHash(review.head)}</code> đến phiên bản mới. Preview hết hạn sau 5 phút.</p>{review.security?.findings?.length>0 && <div className="workspace-security"><strong>Security Scan · {review.security.warning} Warning</strong>{review.security.findings.map((f,i)=><p key={i}>{f.title} · {f.path}{f.line>0?`:${f.line}`:''}. {f.action}</p>)}</div>}<div className="workspace-diff">{diff?.truncated?<p>Diff quá dài để hiển thị đầy đủ. Xem lại nội dung trong editor và GitHub trước khi xác nhận.</p>:(diff?.lines||[]).map((line,i)=><div key={i} className={`diff-line diff-${line.kind}`}><span>{line.kind==='add'?'+':line.kind==='delete'?'−':' '}</span><code>{line.text||' '}</code></div>)}</div><label className="confirm-row"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={locked}/><span>Tôi đã kiểm tra thay đổi và đồng ý tạo commit trên <b>{branch}</b>.</span></label><button type="button" className="button primary full" disabled={!confirmed||locked} onClick={save}>Commit & Save File</button><button type="button" className="button secondary full" disabled={locked} onClick={()=>setPane('edit')}>← Trở lại chỉnh sửa</button></section>}
      {pane==='code'&&<section className="workspace-code-pane" aria-label="Xem nội dung file"><pre className="workspace-code" aria-label="Nội dung file"><code>{codeLines.slice(0,900).map((line,i)=><span key={i} className="workspace-code-line"><span className="workspace-line-number" aria-hidden="true">{i+1}</span>{highlightSegments(line,pickLanguage(selected.path)).map((token,j)=><span key={j} className={`workspace-syntax-${token.kind}`}>{token.text}</span>)}</span>)}</code></pre>{codeLines.length>900&&<p className="workspace-note">Viewer chỉ hiển thị 900 dòng đầu tiên. Dùng Edit để xem toàn bộ file.</p>}</section>}
    </div>}
  </article>;
}
