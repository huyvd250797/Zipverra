import { AppError, assertAppRepoGrant, github } from './github.js';
import { assertRepoCoordinates } from './paths.js';

/**
 * GitHub's archive endpoint issues a short-lived 302 Location to codeload.
 * Do not proxy a potentially large ZIP through a Vercel Function, and NEVER
 * forward the GitHub access token to the device or to codeload.github.com.
 */
export const DOWNLOAD_BRANCH = 'main';

export function validateSourceZipRequest(owner, repo) {
  try {
    assertRepoCoordinates(owner, repo, DOWNLOAD_BRANCH);
  } catch {
    throw new AppError('Tên repository không hợp lệ. Vui lòng chọn lại repository trong Zipverra.', 400,
      { code: 'INVALID_ARCHIVE_REPOSITORY', stage: 'DOWNLOAD_SOURCE' });
  }
  return { owner, repo, branch: DOWNLOAD_BRANCH };
}

/** Prevent GitHub's redirect from being repurposed as an arbitrary redirect. */
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

export async function getMainSourceZipUrl(token, owner, repo, options = {}) {
  validateSourceZipRequest(owner, repo);
  // App installation AND the signed-in user's write grant, consistent with the
  // repository picker. Never trust user-supplied installation IDs.
  const checkGrant = options.checkGrant || assertAppRepoGrant;
  const read = options.read || github;
  const fetcher = options.fetcher || fetch;
  await checkGrant(token, owner, repo);
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  let mainRef;
  try {
    mainRef = await read(token, `${base}/git/ref/heads/main`);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) {
      throw new AppError('Repository không có branch main. Zipverra chỉ tải ZIP của main ở phiên bản này.', 404,
        { code: 'MAIN_BRANCH_MISSING', stage: 'DOWNLOAD_SOURCE' });
    }
    throw error;
  }
  if (!/^[a-f0-9]{40}$/i.test(mainRef?.object?.sha || '')) {
    throw new AppError('Chưa xác minh được commit HEAD trên branch main.', 502,
      { code: 'MAIN_HEAD_INVALID', stage: 'DOWNLOAD_SOURCE' });
  }

  let response;
  try {
    response = await fetcher(`https://api.github.com${base}/zipball/main`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Zipverra',
      },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    throw new AppError('Không kết nối được GitHub để lấy ZIP. Kiểm tra mạng rồi tải lại.', 503,
      { code: 'ARCHIVE_NETWORK_ERROR', stage: 'DOWNLOAD_SOURCE' });
  }
  // For any unexpected non-redirect response, cancel the stream immediately;
  // we must never buffer a large archive in a Vercel Function.
  if (response.status !== 302) {
    try { await response.body?.cancel(); } catch { /* response may have no body */ }
    if (response.status === 404) throw new AppError('GitHub không tìm thấy ZIP của branch main. Repository có thể đang trống.', 404,
      { code: 'MAIN_ARCHIVE_MISSING', stage: 'DOWNLOAD_SOURCE' });
    if (response.status === 401 || response.status === 403) throw new AppError('Không đủ quyền đọc ZIP. Kiểm tra GitHub App Contents và đăng nhập lại.', 403,
      { code: 'ARCHIVE_ACCESS_DENIED', stage: 'DOWNLOAD_SOURCE' });
    if (response.status === 429) throw new AppError('GitHub đang giới hạn yêu cầu. Hãy thử lại sau.', 429,
      { code: 'ARCHIVE_RATE_LIMITED', stage: 'DOWNLOAD_SOURCE' });
    throw new AppError('GitHub không tạo được liên kết ZIP. Hãy thử lại sau.', 502,
      { code: 'ARCHIVE_UNAVAILABLE', stage: 'DOWNLOAD_SOURCE' });
  }
  return validateArchiveRedirect(response.headers.get('location'), owner, repo);
}
