import { AppError, assertAppRepoGrant, github } from './github.js';
import { assertRepoCoordinates } from './paths.js';

/**
 * Browser-safe, same-origin source ZIP delivery.
 * GitHub issues a temporary codeload URL. It must be fetched on the server,
 * not opened as a new iOS PWA browser tab. No GitHub or codeload credential
 * is sent to the device. The response is streamed, never buffered in JS.
 */
export const DOWNLOAD_BRANCH = 'main';
export const MAX_SOURCE_ZIP_BYTES = 512 * 1024 * 1024;
const SHA = /^[a-f0-9]{40}$/i;

export function validateSourceZipRequest(owner, repo) {
  try {
    assertRepoCoordinates(owner, repo, DOWNLOAD_BRANCH);
  } catch {
    throw new AppError('Tên repository không hợp lệ. Vui lòng chọn lại repository trong Zipverra.', 400,
      { code: 'INVALID_ARCHIVE_REPOSITORY', stage: 'DOWNLOAD_SOURCE' });
  }
  return { owner, repo, branch: DOWNLOAD_BRANCH };
}

/** Protect the server-side codeload fetch against arbitrary redirects / SSRF. */
export function validateArchiveRedirect(location, owner, repo) {
  if (typeof location !== 'string' || !location || location.length > 4096) {
    throw new AppError('GitHub chưa cấp liên kết tải ZIP hợp lệ.', 502, { code: 'ARCHIVE_REDIRECT_INVALID', stage: 'DOWNLOAD_SOURCE' });
  }
  try {
    const url = new URL(location);
    const segments = url.pathname.split('/').filter(Boolean);
    if (url.protocol !== 'https:' || url.hostname !== 'codeload.github.com' ||
      url.port || url.username || url.password || url.hash ||
      segments.length < 4 || segments[0].toLowerCase() !== owner.toLowerCase() ||
      segments[1].toLowerCase() !== repo.toLowerCase() ||
      !['legacy.zip', 'zip'].includes(segments[2].toLowerCase())) {
      throw new Error('Archive location does not match repository.');
    }
    return url.href;
  } catch {
    throw new AppError('GitHub trả về liên kết tải ZIP không hợp lệ.', 502,
      { code: 'ARCHIVE_REDIRECT_INVALID', stage: 'DOWNLOAD_SOURCE' });
  }
}

/** Filename is derived from the HEAD commit subject, not Zipverra-main. */
export function commitZipFilename(message, repo, sha) {
  const fallback = `${String(repo || 'source').replace(/[^a-zA-Z0-9._-]/g, '_')}-${SHA.test(sha || '') ? sha.slice(0, 12) : 'main'}`;
  const subject = typeof message === 'string' ? message.split(/\r?\n/, 1)[0] : '';
  const normalized = subject.normalize('NFKD').replace(/[đĐ]/g, 'd').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, ' ').trim()
    .replace(/[\s_]+/g, '_').replace(/_+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '').slice(0, 105)
    .replace(/[._-]+$/g, '');
  const safe = normalized && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(normalized) ? normalized : fallback;
  return `${safe}.zip`;
}

function archiveStatusError(response) {
  if (response.status === 401 || response.status === 403) return new AppError('Không đủ quyền đọc ZIP. Kiểm tra GitHub App Contents và đăng nhập lại.', 403,
    { code: 'ARCHIVE_ACCESS_DENIED', stage: 'DOWNLOAD_SOURCE' });
  if (response.status === 404) return new AppError('GitHub không tìm thấy ZIP của branch main. Repository có thể đang trống.', 404,
    { code: 'MAIN_ARCHIVE_MISSING', stage: 'DOWNLOAD_SOURCE' });
  if (response.status === 429) return new AppError('GitHub đang giới hạn yêu cầu. Hãy thử lại sau.', 429,
    { code: 'ARCHIVE_RATE_LIMITED', stage: 'DOWNLOAD_SOURCE' });
  return new AppError('GitHub không tạo được ZIP. Hãy thử lại sau.', 502,
    { code: 'ARCHIVE_UNAVAILABLE', stage: 'DOWNLOAD_SOURCE' });
}

/**
 * Returns metadata and a GitHub-signed archive URL, strictly server-side.
 * The branch ref is resolved to a SHA and the archive is requested by that
 * immutable SHA to prevent HEAD changing between naming and download.
 */
export async function getMainSourceZipInfo(token, owner, repo, options = {}) {
  validateSourceZipRequest(owner, repo);
  const checkGrant = options.checkGrant || assertAppRepoGrant;
  const read = options.read || github;
  const fetcher = options.fetcher || fetch;
  await checkGrant(token, owner, repo);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  let mainRef;
  try {
    mainRef = await read(token, `${base}/git/ref/heads/main`);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) throw new AppError('Repository không có branch main. Zipverra chỉ tải ZIP của main ở phiên bản này.', 404,
      { code: 'MAIN_BRANCH_MISSING', stage: 'DOWNLOAD_SOURCE' });
    throw error;
  }
  const sha = mainRef?.object?.sha;
  if (!SHA.test(sha || '')) throw new AppError('Chưa xác minh được commit HEAD trên branch main.', 502,
    { code: 'MAIN_HEAD_INVALID', stage: 'DOWNLOAD_SOURCE' });
  // GitHub can occasionally delay commit metadata; the SHA remains a safe fallback.
  let message = '';
  try {
    const commit = await read(token, `${base}/git/commits/${sha}`);
    message = typeof commit?.message === 'string' ? commit.message : '';
  } catch { /* Never turn missing metadata into a failed archive download. */ }

  let response;
  try {
    response = await fetcher(`https://api.github.com${base}/zipball/${sha}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Zipverra' },
      redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(25000),
    });
  } catch {
    throw new AppError('Không kết nối được GitHub để lấy ZIP. Kiểm tra mạng rồi tải lại.', 503,
      { code: 'ARCHIVE_NETWORK_ERROR', stage: 'DOWNLOAD_SOURCE' });
  }
  if (response.status !== 302) {
    try { await response.body?.cancel(); } catch { /* ignore */ }
    throw archiveStatusError(response);
  }
  return { url: validateArchiveRedirect(response.headers.get('location'), owner, repo),
    sha, filename: commitZipFilename(message, repo, sha) };
}

// Backwards-compatible helper for tests and other server-side consumers.
export async function getMainSourceZipUrl(token, owner, repo, options = {}) {
  return (await getMainSourceZipInfo(token, owner, repo, options)).url;
}

/**
 * Validates the ZIP bytes and returns an incremental stream without buffering
 * the entire source archive in the Vercel Function or mobile JavaScript.
 */
export async function getMainSourceZipStream(token, owner, repo, options = {}) {
  const info = await getMainSourceZipInfo(token, owner, repo, options);
  const fetcher = options.downloadFetcher || fetch;
  let response;
  try {
    response = await fetcher(info.url, { method:'GET', redirect:'manual', cache:'no-store',
      // The signed URL authenticates itself; do not forward the GitHub token.
      headers: { Accept: 'application/zip,application/octet-stream' },
      signal: AbortSignal.timeout(250000) });
  } catch {
    throw new AppError('Không thể kết nối kho lưu ZIP của GitHub. Hãy thử lại sau.', 503,
      { code:'CODELOAD_UNREACHABLE', stage:'DOWNLOAD_SOURCE' });
  }
  if (!response.ok || response.status !== 200 || !response.body) {
    try { await response.body?.cancel(); } catch { /* ignore */ }
    throw new AppError('GitHub chưa trả về file ZIP hợp lệ. Hãy thử lại sau.', 502,
      { code:'CODELOAD_INVALID_RESPONSE', stage:'DOWNLOAD_SOURCE' });
  }
  const sizeText = response.headers.get('content-length');
  const size = sizeText && /^\d+$/.test(sizeText) ? Number(sizeText) : null;
  if (size !== null && (!Number.isSafeInteger(size) || size > MAX_SOURCE_ZIP_BYTES)) {
    try { await response.body.cancel(); } catch { /* ignore */ }
    throw new AppError('ZIP vượt quá giới hạn tải 512 MiB của Zipverra.', 413,
      { code:'SOURCE_ZIP_TOO_LARGE', stage:'DOWNLOAD_SOURCE' });
  }
  const reader = response.body.getReader();
  let first = new Uint8Array(0);
  try {
    // ZIP local header / empty ZIP marker, not a 200 HTML error page.
    while (first.byteLength < 4) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const merged = new Uint8Array(first.byteLength + chunk.value.byteLength);
      merged.set(first); merged.set(chunk.value, first.byteLength);
      first = merged;
      if (first.byteLength > MAX_SOURCE_ZIP_BYTES) break;
    }
  } catch {
    try { await reader.cancel(); } catch { /* ignore */ }
    throw new AppError('GitHub ngắt kết nối khi chuẩn bị tải ZIP.', 503,
      { code:'CODELOAD_NETWORK_ERROR', stage:'DOWNLOAD_SOURCE' });
  }
  if (first.byteLength < 4 || first[0] !== 0x50 || first[1] !== 0x4b ||
      !((first[2] === 0x03 && first[3] === 0x04) || (first[2] === 0x05 && first[3] === 0x06) || (first[2] === 0x07 && first[3] === 0x08))) {
    try { await reader.cancel(); } catch { /* ignore */ }
    throw new AppError('GitHub trả về dữ liệu không phải ZIP. Vui lòng thử lại sau.', 502,
      { code:'CODELOAD_NOT_ZIP', stage:'DOWNLOAD_SOURCE' });
  }
  let bytes = first.byteLength;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(first); },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        bytes += value.byteLength;
        if (bytes > MAX_SOURCE_ZIP_BYTES) {
          await reader.cancel();
          controller.error(new Error('Giới hạn dữ liệu ZIP đã đạt.'));
          return;
        }
        controller.enqueue(value);
      } catch {
        controller.error(new Error('Kết nối tải ZIP bị gián đoạn.'));
      }
    },
    async cancel(reason) { try { await reader.cancel(reason); } catch { /* ignore */ } },
  }, { highWaterMark: 1 });
  return { ...info, stream, contentLength: size };
}
