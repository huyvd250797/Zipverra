/** Responsive layout decisions, pure and unit-testable. */
export function clampWorkspaceHeight({viewportHeight, gridTop, reservedBottom = 18}) {
  if (![viewportHeight, gridTop, reservedBottom].every(Number.isFinite)) return 0;
  // A short laptop must be able to scroll the page if the UI cannot fit.
  return Math.max(260, Math.floor(viewportHeight - Math.max(0, gridTop) - Math.max(0,reservedBottom)));
}
export function keyboardOccluded({layoutHeight, visualHeight, offsetTop = 0, editableFocused = false}) {
  if (!editableFocused || !Number.isFinite(layoutHeight) || !Number.isFinite(visualHeight)) return false;
  return layoutHeight - visualHeight - Math.max(0,offsetTop) >= 120;
}
export function virtualWindow({length, scrollTop, viewportHeight, rowHeight = 46, overscan = 5, threshold = 90}) {
  const total = Math.max(0,Math.floor(Number(length) || 0));
  if (total <= threshold) return {start:0,end:total,padTop:0,padBottom:0,virtual:false};
  const size=Math.max(1,rowHeight);
  const first=Math.max(0,Math.floor(Math.max(0,scrollTop||0)/size)-overscan);
  const count=Math.max(1,Math.ceil(Math.max(size,viewportHeight||size)/size)+overscan*2);
  const start=Math.min(first,Math.max(0,total-count));
  const end=Math.min(total,start+count);
  return {start,end,padTop:start*size,padBottom:(total-end)*size,virtual:true};
}
