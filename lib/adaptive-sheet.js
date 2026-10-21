/** v3.9.4: Pure UI decisions. No navigation, security state or GitHub mutations. */
export const ADAPTIVE_SHEET_BREAKPOINT = 760;
export const SHEET_DRAG_DISMISS_PX = 112;
export const SHEET_DRAG_FAST_VELOCITY = 0.72;

/** Picker and diff occupy a side panel on desktop; consent remains a dialog. */
export function adaptiveSheetPresentation(variant, viewportWidth) {
  if (viewportWidth <= ADAPTIVE_SHEET_BREAKPOINT && ['picker', 'diff', 'sheet'].includes(variant)) return 'bottom';
  if (viewportWidth > ADAPTIVE_SHEET_BREAKPOINT && ['picker', 'diff'].includes(variant)) return 'side';
  return 'dialog';
}

/** A drag may dismiss only from the sheet handle, never from scrollable content. */
export function shouldDismissSheetDrag({ distanceX = 0, distanceY = 0, elapsedMs = 0, fromHandle = false, keyboardOpen = false }) {
  if (!fromHandle || keyboardOpen || distanceY <= 0 || Math.abs(distanceX) > distanceY) return false;
  const velocity = distanceY / Math.max(16, elapsedMs);
  return distanceY >= SHEET_DRAG_DISMISS_PX || (distanceY >= 48 && velocity >= SHEET_DRAG_FAST_VELOCITY);
}

/** Compute local scroll correction only; never scroll the document behind a sheet. */
export function focusedFieldScrollDelta(fieldRect, regionRect, margin = 16) {
  if (!fieldRect || !regionRect) return 0;
  const top = regionRect.top + margin;
  const bottom = regionRect.bottom - margin;
  if (fieldRect.bottom > bottom) return Math.round(fieldRect.bottom - bottom);
  if (fieldRect.top < top) return Math.round(fieldRect.top - top);
  return 0;
}
