import JSZip from 'jszip';
import { LIMITS } from './constants.js';
import { assertSafeContentPath, getWrapperFolder, normalizeSourcePath, shouldIgnorePath } from './paths.js';

function bytesToHex(array) {
  return Array.from(new Uint8Array(array), (x) => x.toString(16).padStart(2, '0')).join('');
}

export async function gitBlobSha(bytes) {
  const prefix = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
  const combined = new Uint8Array(prefix.byteLength + bytes.byteLength);
  combined.set(prefix, 0);
  combined.set(bytes, prefix.byteLength);
  return bytesToHex(await crypto.subtle.digest('SHA-1', combined));
}

function executableMode(entry) {
  const permissions = entry.unixPermissions;
  const mode = typeof permissions === 'string' ? parseInt(permissions, 8) : permissions;
  if (typeof mode === 'number' && (mode & 0o170000) === 0o120000) {
    throw new Error(`ZIP chứa symbolic link không hỗ trợ: ${entry.name}`);
  }
  return typeof mode === 'number' && (mode & 0o111) !== 0 ? '100755' : '100644';
}

export async function readArchive(file, onProgress = () => {}) {
  if (!file?.name?.toLowerCase().endsWith('.zip')) throw new Error('Chỉ hỗ trợ file .zip.');
  if (file.size > LIMITS.zipBytes) throw new Error('ZIP vượt quá 20 MB.');
  if (file.size === 0) throw new Error('ZIP rỗng.');
  const zip = await JSZip.loadAsync(file, { checkCRC32: false, createFolders: false });
  const archiveFiles = Object.values(zip.files).filter((entry) => !entry.dir);
  if (archiveFiles.length > LIMITS.fileCount) throw new Error(`ZIP có quá ${LIMITS.fileCount} file.`);
  const normalized = archiveFiles.map((entry) => ({
    entry,
    name: normalizeSourcePath(entry.unsafeOriginalName || entry.name),
  }));
  const ignored = normalized.filter((x) => shouldIgnorePath(x.name)).length;
  const included = normalized.filter((x) => !shouldIgnorePath(x.name));
  const wrapper = getWrapperFolder(included.map((x) => x.name));
  // Check central-directory sizes before any decompression to reduce ZIP-bomb risk.
  let declaredTotal = 0;
  for (const { entry } of included) {
    const declared = entry._data?.uncompressedSize;
    if (!Number.isSafeInteger(declared) || declared < 0) throw new Error('ZIP không có thông tin dung lượng file hợp lệ.');
    if (declared > LIMITS.fileBytes) throw new Error(`File ${entry.name} vượt giới hạn 2.5 MB.`);
    declaredTotal += declared;
    if (declaredTotal > LIMITS.unpackedBytes) throw new Error('ZIP giải nén vượt 50 MB.');
  }
  let unpackedSize = 0;
  const seen = new Set();
  const files = [];
  for (let index = 0; index < included.length; index += 1) {
    const { entry, name } = included[index];
    executableMode(entry);
    const path = assertSafeContentPath(wrapper ? name.slice(wrapper.length + 1) : name);
    const key = path.toLowerCase();
    if (seen.has(key)) throw new Error(`ZIP có đường dẫn trùng hoặc xung đột chữ hoa/thường: ${path}`);
    seen.add(key);
    const data = await entry.async('uint8array');
    if (data.byteLength > LIMITS.fileBytes) throw new Error(`File ${path} vượt 2.5 MB; cần chia nhỏ hoặc dùng Git trên máy tính.`);
    unpackedSize += data.byteLength;
    if (unpackedSize > LIMITS.unpackedBytes) throw new Error('ZIP giải nén vượt 50 MB.');
    files.push({ path, data, sha: await gitBlobSha(data), bytes: data.byteLength, mode: executableMode(entry) });
    onProgress(Math.round(((index + 1) / Math.max(1, included.length)) * 100));
  }
  if (!files.length) throw new Error('Không tìm thấy source code hợp lệ trong ZIP.');
  return { files, ignored, wrapper, unpackedSize };
}

export function encodeBase64(data) {
  // Small fixed chunks avoid the stack blow-up caused by apply(...largeArray).
  const BLOCK = 0x8000;
  let binary = '';
  for (let i = 0; i < data.length; i += BLOCK) {
    binary += String.fromCharCode(...data.subarray(i, i + BLOCK));
  }
  return btoa(binary);
}
