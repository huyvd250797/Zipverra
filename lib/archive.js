import JSZip from 'jszip';
import { LIMITS, archiveCapacity } from './constants.js';
import { scanSourceFile, SECURITY_SCAN_VERSION } from './source-security.js';
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

/** Read archive once; in metadata mode, decompressed bytes stay transient in the Worker.
 *  JSZip still holds the compressed ZIP and a small per-entry buffer while decoding.
 *  It must not be confused with zero-copy / streaming ZIP parsing.
 */
export async function createArchiveReader(file, onProgress = () => {}, { mode = 'standard', metadataOnly = true } = {}) {
  const capacity = archiveCapacity(mode);
  if (!file?.name?.toLowerCase().endsWith('.zip')) throw new Error('Chỉ hỗ trợ file .zip.');
  if (!Number.isSafeInteger(file.size) || file.size <= 0) throw new Error('ZIP rỗng hoặc không hợp lệ.');
  if (file.size > capacity.zipBytes) throw new Error(`ZIP vượt giới hạn ${capacity.zipBytes / 1024 / 1024} MiB.`);
  const zip = await JSZip.loadAsync(file, { checkCRC32: false, createFolders: false });
  const archiveFiles = Object.values(zip.files).filter(entry => !entry.dir);
  if (Object.keys(zip.files).length > LIMITS.archiveMembers) throw new Error('ZIP có quá nhiều thành phần, vượt giới hạn an toàn của bộ đọc ZIP.');
  const normalized = archiveFiles.map(entry => ({ entry, name: normalizeSourcePath(entry.unsafeOriginalName || entry.name) }));
  const ignoredPaths = normalized.filter(x => shouldIgnorePath(x.name));
  const included = normalized.filter(x => !shouldIgnorePath(x.name));
  if (included.length > LIMITS.fileCount) throw new Error(`ZIP có quá ${LIMITS.fileCount} file source hợp lệ.`);
  const wrapper = getWrapperFolder(included.map(x => x.name));
  let declaredTotal = 0;
  const seen = new Set();
  const mapped = [];
  // Validate every path, mode, central-directory size, and case collision before decoding.
  for (const {entry, name} of included) {
    const bytes = entry._data?.uncompressedSize;
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error('ZIP không có thông tin dung lượng file hợp lệ.');
    if (bytes > LIMITS.fileBytes) throw new Error(`File ${entry.name} vượt giới hạn 2.5 MB mỗi file (giới hạn Vercel).`);
    declaredTotal += bytes;
    if (declaredTotal > capacity.unpackedBytes) throw new Error('ZIP giải nén vượt giới hạn giải nén.');
    const path = assertSafeContentPath(wrapper ? name.slice(wrapper.length + 1) : name, {allowSensitive:true});
    const key = path.toLowerCase();
    if (seen.has(key)) throw new Error(`ZIP có đường dẫn trùng hoặc xung đột chữ hoa/thường: ${path}`);
    seen.add(key);
    mapped.push({entry,path,mode:executableMode(entry),declaredBytes:bytes});
  }
  if (!mapped.length) throw new Error('Không tìm thấy source code hợp lệ trong ZIP.');
  const byPath = new Map(mapped.map(row => [row.path,row]));
  const files = [];
  const findings = [];
  let unpackedSize = 0;
  for (let index=0;index<mapped.length;index++) {
    const item = mapped[index];
    const data = await item.entry.async('uint8array');
    if (data.byteLength !== item.declaredBytes || data.byteLength > LIMITS.fileBytes)
      throw new Error(`Dung lượng giải nén không khớp với ZIP: ${item.path}`);
    unpackedSize += data.byteLength;
    if (unpackedSize > capacity.unpackedBytes) throw new Error('ZIP giải nén vượt giới hạn giải nén.');
    const sha = await gitBlobSha(data);
    findings.push(...scanSourceFile(item.path, data));
    const metadata = {path:item.path,sha,bytes:data.byteLength,mode:item.mode};
    // Send parsed, bounded manifest metadata only; never disclose raw package.json
    // contents to the UI unless explicitly requested for an allowed diff.
    if (item.path === 'package.json' && data.byteLength <= 96_000) {
      try {
        const pkg=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
        metadata.packageValid = Boolean(pkg && typeof pkg === 'object' && !Array.isArray(pkg));
        metadata.packageName = typeof pkg?.name==='string' ? pkg.name.slice(0,160).toLowerCase() : '';
        metadata.packageDependencies = Object.keys({...pkg?.dependencies,...pkg?.devDependencies}).slice(0,250);
      } catch { metadata.packageValid=false;metadata.packageName='';metadata.packageDependencies=[]; }
    }
    if (!metadataOnly) metadata.data = data;
    files.push(metadata);
    onProgress(Math.round((index+1)/mapped.length*100));
  }
  const critical=findings.filter(f=>f.severity==='critical').length;
  const warning=findings.filter(f=>f.severity==='warning').length;
  const archive = {files,ignored:ignoredPaths.length,ignoredPaths:ignoredPaths.slice(0,8).map(x=>x.name),wrapper,unpackedSize,
    security:{scanVersion:SECURITY_SCAN_VERSION,findings,critical,warning,info:findings.length-critical-warning,blocked:critical>0,scanned:files.length}};
  return {archive, async getFile(path) {
    const item=byPath.get(path);
    if (!item) throw new Error('File ZIP không tồn tại trong phiên phân tích.');
    const data=await item.entry.async('uint8array');
    const current=files.find(f=>f.path===path);
    if (data.byteLength!==current.bytes || await gitBlobSha(data)!==current.sha) throw new Error(`Nội dung ZIP đã thay đổi sau phân tích: ${path}`);
    return data;
  }, close() { byPath.clear(); zip.files=Object.create(null); }};
}

/** Legacy full-byte reader for small ZIPs or environments without Web Workers. */
export async function readArchive(file, onProgress = () => {}, {mode='standard'}={}) {
  const reader = await createArchiveReader(file,onProgress,{mode,metadataOnly:false});
  try { return reader.archive; } finally { reader.close(); }
}

export { encodeBase64 } from './base64.js';
