/** Zipverra v1.12.0 — bounded, deterministic, redacted source scanning.
 * Shared by browser/Web Worker and server. No content, matched value, or secret
 * fragment is ever returned from this module.
 */
export const SECURITY_SCAN_VERSION = 1;
/** Sensitive names, confirmed credentials and plausible hard-coded credentials require
 * explicit user consent. Config changes and generic notices alone do not. */
export function needsSensitiveConsent(findings = []) {
  return findings.some(f => f.severity === 'critical' || f.code === 'POSSIBLE_CREDENTIAL');
}
export const MAX_SCAN_BYTES = 2_500_000;
const dec = new TextDecoder('utf-8', { fatal: true });
const binaryExt = /\.(?:png|jpe?g|gif|webp|avif|ico|pdf|zip|gz|tar|woff2?|ttf|otf|mp[34]|heic|mov|wasm|exe|dll|sqlite|db|class|jar|bin)$/i;
const unsafeName = /(^|\/)(?:\.env(?:\.[^/]+)?|\.npmrc|\.pypirc|id_rsa|id_ed25519|credentials\.json|service[._-]?account\.json|[^/]+\.(?:pem|p8|p12|pfx|jks|keystore))$/i;
const safeEnvExample = /(^|\/)\.env\.(?:example|sample|template)$/i;
const configName = /(^|\/)(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|next\.config\.[^/]+|vite\.config\.[^/]+|vercel\.json|dockerfile|\.github\/workflows\/[^/]+\.ya?ml)$/i;
const definite = [
  ['PRIVATE_KEY', /-----BEGIN (?:RSA |DSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g, 'Khóa riêng tư có trong source'],
  ['GITHUB_TOKEN', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{24,})\b/g, 'GitHub token xuất hiện trong file'],
  ['AWS_ACCESS_KEY', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, 'AWS access key xuất hiện trong file'],
  ['SLACK_TOKEN', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g, 'Slack token xuất hiện trong file'],
  ['GOOGLE_API_KEY', /\bAIza[0-9A-Za-z_-]{35}\b/g, 'Google API key xuất hiện trong file'],
  ['STRIPE_SECRET', /\bsk_live_[A-Za-z0-9]{20,}\b/g, 'Stripe live secret key xuất hiện trong file'],
  ['OPENAI_KEY', /\bsk-proj-[A-Za-z0-9_-]{40,}\b/g, 'OpenAI project key xuất hiện trong file'],
  ['GITLAB_TOKEN', /\bglpat-[A-Za-z0-9_-]{20,}\b/g, 'GitLab token xuất hiện trong file'],
];
const credAssignment = /\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|secret[_-]?key|private[_-]?key|database[_-]?url|db[_-]?password)\b["']?\s*[=:]\s*["'`]?([^\s"'`,;#\]}]{10,180})/gi;
const placeholders = /^(?:process\.env\.|import\.meta\.env\.|env\.|\$\{|\$\(|<|\*+|x{6,}|0{6,}|example|sample|test|fake|dummy|replace|change|your|placeholder|todo|redacted|undefined|null|[{}])/i;

function issue(path, line, severity, code, title, action) {
  return { path, line, severity, code, title, action }; // matched credentials NEVER included
}
function looksBinary(bytes) {
  if (binaryExt.test(bytes.path)) return true;
  const data = bytes.data;
  const sample = Math.min(data.length, 2048);
  for (let i=0; i<sample; i++) if (data[i] === 0) return true;
  return false;
}
function linesBefore(text, offset) {
  let n=1;
  for (let i=0; i<offset; i++) if (text.charCodeAt(i)===10) n++;
  return n;
}

/** Restrict match count and file size; return no source snippets, matched tokens or values. */
export function scanSourceFile(path, data) {
  if (typeof path !== 'string' || !path || path.length > 900 || !(data instanceof Uint8Array) || data.byteLength > MAX_SCAN_BYTES)
    throw new Error('File cần quét không hợp lệ hoặc vượt giới hạn.');
  const findings=[];
  if (unsafeName.test(path) && !safeEnvExample.test(path))
    findings.push(issue(path, 0, 'critical','SENSITIVE_PATH','Tên file có thể chứa credentials','Loại bỏ file nhạy cảm khỏi bản cập nhật.'));
  if (configName.test(path))
    findings.push(issue(path, 0, 'warning','CONFIG_CHANGE','Thay đổi cấu hình dự án','Kiểm tra tác động đến dependencies, CI hoặc deployment.'));
  if (data.length === 0) return findings;
  if (looksBinary({path,data})) {
    findings.push(issue(path,0,'info','BINARY_NOT_SCANNED','File nhị phân không được quét nội dung','Kiểm tra nguồn file nhị phân bằng công cụ chuyên dụng nếu cần.'));
    return findings;
  }
  let text;
  try { text=dec.decode(data); }
  catch {
    findings.push(issue(path,0,'info','BINARY_NOT_SCANNED','Nội dung không phải UTF-8','File này không được quét nội dung vì không phải text UTF-8.'));
    return findings;
  } // binary bytes must not be rendered as text
  const seen = new Set();
  const append = (code, severity, title, action, offset) => {
    const line=linesBefore(text,offset);
    const key=`${code}:${line}`;
    if (seen.has(key) || findings.length >= 28) return;
    seen.add(key);findings.push(issue(path,line,severity,code,title,action));
  };
  for (const [code, pattern, title] of definite) {
    pattern.lastIndex=0;
    let match;
    while((match=pattern.exec(text)) && findings.length<28)
      append(code,'critical',title,'Thu hồi/rotate credential nếu từng bị chia sẻ; không commit file này.',match.index);
  }
  credAssignment.lastIndex=0;
  let match;
  while((match=credAssignment.exec(text)) && findings.length<28) {
    const value=match[1]||'';
    if (placeholders.test(value) || /^https?:\/\/(?:localhost|127\.0\.0\.1|example\.com|your[-.])/i.test(value)) continue;
    append('POSSIBLE_CREDENTIAL','warning','Có chuỗi giống thông tin xác thực được gán trực tiếp','Kiểm tra xem có đang hardcode secret và chuyển sang biến môi trường.',match.index);
  }
  return findings;
}

/** Accept archived file metadata with Uint8Array, scan selected non-deleted changes only. */
export function scanSelectedChanges(files=[], changes=[]) {
  const map=new Map(files.map(f=>[f.path,f]));
  const findings=[];
  for(const change of changes) {
    if (change.kind === 'delete') {
      if (configName.test(change.path)) findings.push(issue(change.path,0,'warning','CONFIG_DELETE','Xóa file cấu hình','Kiểm tra thay đổi trước khi Sync.'));
      continue;
    }
    const file=map.get(change.path);
    if (!file) throw new Error(`Không tìm thấy dữ liệu file cần quét: ${change.path}`);
    findings.push(...scanSourceFile(file.path,file.data));
  }
  const critical=findings.filter(f=>f.severity==='critical').length;
  const warning=findings.filter(f=>f.severity==='warning').length;
  return { scanVersion:SECURITY_SCAN_VERSION, findings, critical, warning, info:findings.length-critical-warning, blocked:critical>0, scanned:changes.length };
}

/** Filter the Worker scan's findings against selected changes; O(findings), not O(ZIP bytes). */
export function reportSelectedSecurity(archiveReport, changes=[]) {
  const paths=new Set(changes.filter(c=>c.kind!=='delete').map(c=>c.path));
  const findings=(archiveReport?.findings||[]).filter(f=>paths.has(f.path));
  for(const change of changes) if(change.kind==='delete'&&configName.test(change.path))
    findings.push(issue(change.path,0,'warning','CONFIG_DELETE','Xóa file cấu hình','Kiểm tra thay đổi trước khi Sync.'));
  // Show Critical before numerous binary informational notices.
  const order={critical:0,warning:1,info:2};
  findings.sort((a,b)=>(order[a.severity]??3)-(order[b.severity]??3));
  const critical=findings.filter(f=>f.severity==='critical').length;
  const warning=findings.filter(f=>f.severity==='warning').length;
  return {scanVersion:SECURITY_SCAN_VERSION, findings,critical,warning,info:findings.length-critical-warning,blocked:critical>0,scanned:changes.length};
}
