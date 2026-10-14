/**
 * Browser-only source ZIP preparation, with bounded memory.
 * Never forwards GitHub auth tokens or opens codeload URLs. Downloading into a
 * browser Blob is intentional: iOS standalone PWAs can then offer the native
 * file share sheet without leaving the app's current screen.
 */
export const MAX_IN_APP_ZIP_BYTES = 48 * 1024 * 1024;
export const ZIP_MIME = 'application/zip';

export class SourceZipClientError extends Error {
  constructor(message, code = 'DOWNLOAD_ERROR') {
    super(message);
    this.name = 'SourceZipClientError';
    this.code = code;
  }
}

export function sourceZipFilename(disposition, fallback = 'source-main.zip') {
  if (typeof disposition !== 'string') disposition = '';
  let candidate = '';
  // The server emits an ASCII, quoted filename. Accept RFC5987 for portability.
  const star = disposition.match(/(?:^|;)\s*filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (star) {
    try { candidate = decodeURIComponent(star[1].trim()); } catch { /* fallback */ }
  }
  if (!candidate) {
    const quoted = disposition.match(/(?:^|;)\s*filename\s*=\s*"([^"\r\n]*)"/i);
    const bare = disposition.match(/(?:^|;)\s*filename\s*=\s*([^;\r\n]+)/i);
    candidate = quoted?.[1] || bare?.[1]?.trim() || fallback;
  }
  // A path, control character or JS-untrusted header must never become a path.
  candidate = candidate.replace(/[\\/]/g, '_').replace(/[\x00-\x1f\x7f<>:"|?*]/g, '_')
    .replace(/\s+/g, '_').replace(/^[._ ]+|[._ ]+$/g, '').slice(0, 120);
  if (!candidate || !/\.zip$/i.test(candidate)) return 'source-main.zip';
  return candidate;
}

export function isZipMagic(bytes) {
  if (!bytes || bytes.length < 4) return false;
  return bytes[0] === 0x50 && bytes[1] === 0x4b &&
    ((bytes[2] === 0x03 && bytes[3] === 0x04) ||
     (bytes[2] === 0x05 && bytes[3] === 0x06) ||
     (bytes[2] === 0x07 && bytes[3] === 0x08));
}

export function downloadStatusMessage(status) {
  if (status === 401) return 'Phiên GitHub đã hết hạn. Hãy đăng nhập lại trong Settings.';
  if (status === 403) return 'Tài khoản chưa có quyền tải repository này. Kiểm tra GitHub App Access.';
  if (status === 404) return 'Repository không có branch main hoặc branch đang trống.';
  if (status === 413) return 'File ZIP vượt quá giới hạn hỗ trợ của máy chủ.';
  if (status === 429) return 'GitHub đang giới hạn lượt tải. Vui lòng thử lại sau.';
  return 'Không thể tải ZIP từ GitHub. Kiểm tra kết nối rồi thử lại.';
}

export async function readSourceZipResponse(response, { maxBytes = MAX_IN_APP_ZIP_BYTES, onProgress, signal } = {}) {
  if (!response?.ok) {
    try { await response?.body?.cancel(); } catch { /* response may be empty */ }
    throw new SourceZipClientError(downloadStatusMessage(response?.status), 'DOWNLOAD_HTTP');
  }
  const mime = (response.headers?.get('content-type') || '').toLowerCase();
  if (mime.includes('text/html') || mime.includes('application/json')) {
    try { await response.body?.cancel(); } catch { /* response may be empty */ }
    throw new SourceZipClientError('Máy chủ không trả về file ZIP hợp lệ.', 'DOWNLOAD_NOT_ZIP');
  }
  const lengthText = response.headers?.get('content-length');
  const total = lengthText && /^\d+$/.test(lengthText) ? Number(lengthText) : null;
  if (total !== null && (!Number.isSafeInteger(total) || total > maxBytes)) {
    try { await response.body?.cancel(); } catch { /* response may be empty */ }
    throw new SourceZipClientError('ZIP quá lớn để chuẩn bị trong iPhone. Dùng tùy chọn tải trực tiếp.', 'DOWNLOAD_TOO_LARGE');
  }
  if (!response.body || typeof response.body.getReader !== 'function')
    throw new SourceZipClientError('Trình duyệt không hỗ trợ luồng tải ZIP này.', 'DOWNLOAD_STREAM_UNSUPPORTED');
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  let signature = new Uint8Array(0);
  try {
    while (true) {
      if (signal?.aborted) throw new SourceZipClientError('Đã hủy chuẩn bị ZIP.', 'DOWNLOAD_CANCELLED');
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;
      received += value.byteLength;
      if (received > maxBytes) throw new SourceZipClientError('ZIP quá lớn để chuẩn bị trong iPhone. Dùng tùy chọn tải trực tiếp.', 'DOWNLOAD_TOO_LARGE');
      chunks.push(value);
      if (signature.byteLength < 4) {
        const wanted = Math.min(4 - signature.byteLength, value.byteLength);
        const next = new Uint8Array(signature.byteLength + wanted);
        next.set(signature);
        next.set(value.subarray(0, wanted), signature.byteLength);
        signature = next;
        if (signature.length === 4 && !isZipMagic(signature))
          throw new SourceZipClientError('Dữ liệu tải về không phải ZIP hợp lệ.', 'DOWNLOAD_NOT_ZIP');
      }
      onProgress?.({ received, total });
    }
    if (!isZipMagic(signature)) throw new SourceZipClientError('ZIP tải về không hoàn chỉnh.', 'DOWNLOAD_NOT_ZIP');
    if (total !== null && received !== total)
      throw new SourceZipClientError('Tải ZIP bị gián đoạn. Hãy thử lại.', 'DOWNLOAD_INCOMPLETE');
    const blob = new Blob(chunks, { type: ZIP_MIME });
    return { blob, size: received,
      filename: sourceZipFilename(response.headers.get('content-disposition')) };
  } catch (error) {
    try { await reader.cancel(); } catch { /* stream may already be errored */ }
    throw error;
  } finally {
    try { reader.releaseLock(); } catch { /* nothing to release */ }
  }
}

export function canShareZip(nav, file) {
  if (!nav || typeof nav.share !== 'function' || typeof nav.canShare !== 'function') return false;
  try { return Boolean(nav.canShare({ files: [file] })); } catch { return false; }
}

export function isIosLike(nav) {
  const agent = nav?.userAgent || '';
  return /iPhone|iPad|iPod/i.test(agent) || (nav?.platform === 'MacIntel' && nav?.maxTouchPoints > 1);
}
