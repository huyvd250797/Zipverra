'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { virtualWindow } from '../../lib/viewport-layout.js';

const HEIGHT = 46;
/** Renders only visible rows when reviewing large ZIPs; no pagination clicks. */
export default function VirtualReviewList({changes,allCount,excludedPaths,busy,onToggle,onDiff,filterKey}) {
  const regionRef = useRef(null);
  const frameRef = useRef(0);
  const [position,setPosition] = useState({top:0,height:250});
  const excluded = useMemo(() => new Set(excludedPaths),[excludedPaths]);
  useEffect(() => {
    const node = regionRef.current;
    if (!node) return;
    node.scrollTop=0;
    setPosition(prev => ({...prev,top:0}));
  },[filterKey]);
  useEffect(() => {
    const node=regionRef.current;
    if (!node) return;
    const update = () => setPosition(prev => prev.height===node.clientHeight ? prev : ({...prev,height:node.clientHeight}));
    update();
    const ro=typeof ResizeObserver==='function' ? new ResizeObserver(update) : null;
    ro?.observe(node);
    return () => { ro?.disconnect(); cancelAnimationFrame(frameRef.current); };
  },[]);
  const onScroll = event => {
    const top=event.currentTarget.scrollTop;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current=requestAnimationFrame(() => {
      setPosition(p => p.top===top ? p : ({...p,top}));
      frameRef.current=0;
    });
  };
  const view=virtualWindow({length:changes.length,scrollTop:position.top,viewportHeight:position.height,rowHeight:HEIGHT});
  return <>
    {view.virtual && <div className="zip395-list-hint" aria-live="off">{changes.length} file · Cuộn để xem toàn bộ, không cần tải thêm</div>}
    <div ref={regionRef} className="change-list review-list zip395-review-list" role="region" tabIndex={0}
      aria-label="Danh sách thay đổi · Cuộn trong vùng này để xem thêm file" onScroll={onScroll}>
      {changes.length ? <div role="list" aria-label="Các file thay đổi">
        {view.virtual && <div aria-hidden="true" style={{height:view.padTop}}/>}
        {changes.slice(view.start,view.end).map((item,index) => <div role="listitem" aria-posinset={view.start+index+1} aria-setsize={changes.length}
          className={`change-row review-row ${excluded.has(item.path) ? 'excluded' : ''}`} key={item.path}>
          <label className="review-check"><input type="checkbox" checked={!excluded.has(item.path)} disabled={busy} onChange={() => onToggle(item.path)} aria-label={`Chọn ${item.path} để push`}/></label>
          <span className={`change-mark ${item.kind}`}>{item.kind === 'add' ? 'A' : item.kind === 'modify' ? 'M' : 'D'}</span>
          <span title={item.path} className="change-path">{item.path}</span>
          <button type="button" className="review-diff-button" disabled={busy} onClick={() => onDiff(item)} aria-label={`Xem diff ${item.path}`}>Diff</button>
        </div>)}
        {view.virtual && <div aria-hidden="true" style={{height:view.padBottom}}/>}
      </div> : <div className="empty-change">{allCount ? 'Không có file thuộc bộ lọc này.' : 'Không có thay đổi để commit.'}</div>}
    </div>
  </>;
}
