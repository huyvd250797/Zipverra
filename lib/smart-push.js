/** Zipverra v1.8.0 — pure, bounded mobile review and safety helpers. */
export const FAVORITES_KEY = 'zipverra.favoriteRepositories.v1';
export const TEXT_PREVIEW_BYTES = 64 * 1024;
export const TEXT_PREVIEW_LINES = 320;

const DANGEROUS_PATTERN = /(^|\/)(\.env(?:\.[^/]+)?|\.npmrc|\.pypirc|credentials\.json|id_rsa|id_ed25519|[^/]+\.(?:pem|p8|p12|pfx|jks))$/i;
const CONFIG_PATTERN = /(^|\/)(?:package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|next\.config\.[^/]+|vite\.config\.[^/]+|vercel\.json|\.github\/workflows\/[^/]+\.ya?ml)$/i;
const BINARY_PATTERN = /\.(?:png|jpe?g|webp|ico|gif|avif|pdf|woff2?|ttf|otf|zip|wasm|mp[34]|mov|heic)$/i;

export function detectProjectType(files = []) {
  const paths = new Set(files.map(file => file.path));
  let packageData = null;
  const packageFile = files.find(file => file.path === 'package.json' && file.bytes < 96_000);
  if (packageFile) {
    try { packageData = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(packageFile.data)); }
    catch { /* invalid manifest is surfaced in warnings */ }
  }
  const deps = { ...packageData?.dependencies, ...packageData?.devDependencies };
  let type = 'Source files';
  if (paths.has('pubspec.yaml')) type = 'Flutter';
  else if (paths.has('pom.xml') || paths.has('build.gradle')) type = 'Java / Gradle';
  else if (paths.has('requirements.txt') || paths.has('pyproject.toml')) type = 'Python';
  else if (deps.next || [...paths].some(x => x.startsWith('app/') && x.endsWith('/page.jsx'))) type = 'Next.js';
  else if (deps.vite) type = 'Vite';
  else if (deps['react-scripts'] || deps.react) type = 'React';
  else if (paths.has('package.json')) type = 'Node.js';
  else if (paths.has('index.html')) type = 'Static website';
  return { type, hasPackageJson: paths.has('package.json'), hasReadme: [...paths].some(x => /^readme(?:\.md)?$/i.test(x)), packageValid: !packageFile || !!packageData };
}

export function analyzeSource({ files = [], changes = [], ignored = 0, wrapper = null, ignoredPaths = [] } = {}) {
  const framework = detectProjectType(files);
  const warnings = [];
  const caution = (code, title, description, severity = 'notice') => warnings.push({ code, title, description, severity });
  if (wrapper) caution('WRAPPER', 'Đã bỏ thư mục ZIP bao ngoài', `Đường dẫn source đã được chuẩn hóa từ ${wrapper}/.`);
  if (ignored) caution('IGNORED', `Bỏ qua ${ignored} thành phần không cần thiết`, `Các thư mục build/cache và file hệ thống không được push.${ignoredPaths.length ? ` Ví dụ: ${ignoredPaths.slice(0,3).join(', ')}` : ''}`);
  if (!framework.packageValid) caution('PACKAGE_INVALID', 'package.json không đọc được', 'Kiểm tra cú pháp JSON trước khi push.', 'warning');
  if (framework.type === 'Source files') caution('UNKNOWN_FRAMEWORK', 'Chưa nhận diện framework', 'Hãy xem lại danh sách file và xác nhận đúng repository.');
  const critical = files.filter(f => DANGEROUS_PATTERN.test(f.path) && !/\.env\.(?:example|sample|template)$/i.test(f.path));
  if (critical.length) caution('SECRET_FILE', 'File nhạy cảm cần xác nhận', `${critical.length} file có tên nhạy cảm. Bạn có thể bỏ chọn hoặc chấp nhận rủi ro trong Security Scan để tiếp tục.`, 'warning');
  const workflow = changes.filter(c => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(c.path));
  if (workflow.length) caution('WORKFLOWS', `Thay đổi ${workflow.length} GitHub Actions workflow`, 'Cần quyền Workflows: write và nên kiểm tra cấu hình CI.', 'warning');
  const configChanges = changes.filter(c => CONFIG_PATTERN.test(c.path));
  if (configChanges.length) caution('CONFIG', `${configChanges.length} file cấu hình quan trọng`, 'Review các file cấu hình và lockfile trước khi commit.', 'warning');
  const deletions = changes.filter(c => c.kind === 'delete');
  if (deletions.length) caution('DELETIONS', `Dự kiến xóa ${deletions.length} file`, 'Chế độ Sync có thể xóa file không có trong ZIP. Có thể bỏ chọn từng file để giữ nguyên.', 'warning');
  return { framework, warnings, hasBlockingWarning: warnings.some(w => w.severity === 'block'), binaryCount: files.filter(f => BINARY_PATTERN.test(f.path)).length };
}

/** Explicit exclusion never becomes a deletion, even when updating in Sync mode. */
export function selectChanges(changes = [], excludedPaths = []) {
  const exclusions = new Set(excludedPaths);
  return changes.filter(c => !exclusions.has(c.path));
}
export function toggleExcluded(changes = [], excluded = [], path) {
  if (!changes.some(c => c.path === path)) return excluded;
  const list = new Set(excluded);
  if (list.has(path)) list.delete(path); else list.add(path);
  return [...list];
}
export function filterReview(changes = [], filter = 'all', term = '') {
  const q = term.toLocaleLowerCase().trim();
  return changes.filter(c => (filter === 'all' || c.kind === filter) && (!q || c.path.toLocaleLowerCase().includes(q)));
}
export function updateFavorites(previous = [], name, max = 8) {
  if (!/^[a-z\d-]{1,39}\/[a-z\d_.-]{1,100}$/i.test(name || '')) return previous.slice(0,max);
  return previous.includes(name) ? previous.filter(v => v !== name) : [name, ...previous].slice(0,max);
}
export function sortedRepositories(repositories = [], favorites = [], recents = []) {
  const pinned = new Map(favorites.map((name,index)=>[name.toLowerCase(),index]));
  const used = new Map(recents.map((name,index)=>[name.toLowerCase(),index]));
  return [...repositories].sort((a,b) => {
    const aa = a.full_name.toLowerCase(), bb = b.full_name.toLowerCase();
    return (pinned.has(aa)?0:1)-(pinned.has(bb)?0:1) ||
      (pinned.get(aa)??Infinity)-(pinned.get(bb)??Infinity) ||
      (used.get(aa)??Infinity)-(used.get(bb)??Infinity) || aa.localeCompare(bb);
  });
}

export function isTextPreviewable(file) {
  return !!file && file.bytes <= TEXT_PREVIEW_BYTES && !BINARY_PATTERN.test(file.path) && (!DANGEROUS_PATTERN.test(file.path) || /\.env\.(?:example|sample|template)$/i.test(file.path));
}
export function decodePreview(bytes) {
  if (!bytes || bytes.length > TEXT_PREVIEW_BYTES) return null;
  try {
    const text = new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    if (/\x00|[\x01-\x08\x0b\x0c\x0e-\x1f]/.test(text)) return null;
    return text;
  } catch { return null; }
}

/** Line-level LCS diff, bounded to protect iPhone RAM. Suitable for short text. */
export function makeLineDiff(before = '', after = '', limit = TEXT_PREVIEW_LINES) {
  const aa=before.split('\n'),bb=after.split('\n');
  if (aa.length > limit || bb.length > limit) return { lines: [], truncated:true, message:`Chỉ hỗ trợ tối đa ${limit} dòng mỗi phía khi xem diff.` };
  const dp=Array.from({length:aa.length+1},()=>new Uint16Array(bb.length+1));
  for(let i=aa.length-1;i>=0;i--)for(let j=bb.length-1;j>=0;j--) dp[i][j]=aa[i]===bb[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const lines=[];let i=0,j=0;
  while(i<aa.length||j<bb.length){
    if(i<aa.length&&j<bb.length&&aa[i]===bb[j]){lines.push({kind:'context',text:aa[i]});i++;j++;}
    else if(j<bb.length&&(i===aa.length||dp[i][j+1]>=dp[i+1][j])){lines.push({kind:'add',text:bb[j++]});}
    else {lines.push({kind:'delete',text:aa[i++]});}
  }
  return {lines,truncated:false,message:null};
}

/** Displays upload rate; throughput is an estimate based on sampled completed bytes. */
export function transferEstimate(completedBytes, totalBytes, elapsedMs) {
  const safeCompleted=Math.max(0,completedBytes), safeTotal=Math.max(0,totalBytes);
  const speed=elapsedMs>0 && safeCompleted>0 ? safeCompleted/(elapsedMs/1000) : 0;
  const etaSeconds=speed>0 ? Math.ceil(Math.max(0,safeTotal-safeCompleted)/speed):null;
  return { speedBytesPerSec:speed, etaSeconds, doneBytes:safeCompleted, totalBytes:safeTotal };
}
