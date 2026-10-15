const SKIP_DIRECTORIES = new Set([
  '__MACOSX', '.git', 'node_modules', '.next', '.vercel', 'dist', 'build', 'coverage', '.turbo',
]);
const KNOWN_PROJECT_DIRECTORIES = new Set([
  'src', 'app', 'pages', 'public', 'lib', 'components', 'assets', 'docs', 'tests',
  'test', 'styles', 'api', '.github', 'scripts', 'static', 'config', 'images',
]);

export function normalizeSourcePath(value) {
  if (typeof value !== 'string' || !value) throw new Error('ZIP chứa tên file không hợp lệ.');
  if (value.includes('\0') || value.startsWith('/') || value.startsWith('\\') || /^[a-zA-Z]:/.test(value)) {
    throw new Error('ZIP chứa đường dẫn tuyệt đối hoặc không an toàn.');
  }
  const path = value.replaceAll('\\', '/');
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '..' || part === '.' || /[\x00-\x1f]/.test(part))) {
    throw new Error(`ZIP chứa đường dẫn không an toàn: ${path}`);
  }
  if (path.length > 900) throw new Error('Đường dẫn file quá dài.');
  return path;
}

export function shouldIgnorePath(path) {
  const segments = path.split('/');
  if (segments.some((part) => SKIP_DIRECTORIES.has(part))) return true;
  const base = segments.at(-1);
  return base === '.DS_Store' || base === 'Thumbs.db' || base === 'desktop.ini';
}

export function isSensitiveContentPath(path) {
  if (typeof path !== 'string') return false;
  const name = path.split('/').at(-1).toLowerCase();
  return (/^\.env($|\.)/.test(name) && !/^\.env\.(example|sample|template)$/.test(name)) ||
    /\.(pem|p12|pfx|p8|jks|keystore)$/i.test(name) ||
    /^(id_rsa|id_ed25519|credentials\.json|service[._-]?account\.json|\.npmrc|\.pypirc)$/i.test(name);
}

export function assertSafeContentPath(path, { allowSensitive = false } = {}) {
  const normalized = normalizeSourcePath(path);
  if (normalized !== path) throw new Error('Đường dẫn Git phải sử dụng dấu / chuẩn.');
  // Structural path hazards are always rejected. Sensitive filenames are allowed only
  // in the ZIP->Review->consent->Push workflow, never in Quick Edit or Rollback.
  if (path.split('/').includes('.git')) throw new Error('Không được ghi đè thư mục .git.');
  if (!allowSensitive && isSensitiveContentPath(path)) {
    throw new Error(`File có khả năng chứa khóa/bí mật bị chặn: ${path}.`);
  }
  return path;
}

export function getWrapperFolder(paths) {
  if (!paths.length || paths.some((path) => !path.includes('/'))) return null;
  const roots = new Set(paths.map((path) => path.split('/')[0]));
  if (roots.size !== 1) return null;
  const root = [...roots][0];
  if (KNOWN_PROJECT_DIRECTORIES.has(root) || root.startsWith('.')) return null;
  return root;
}

export function zipCommitMessage(filename) {
  const raw = (filename || '').replace(/\.zip$/i, '').trim();
  return raw.slice(0, 200) || 'Update source via Zipverra';
}

export function assertRepoCoordinates(owner, repo, branch) {
  if (![owner, repo, branch].every((x) => typeof x === 'string')) throw new Error('Thiếu owner, repo hoặc branch.');
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(owner)) throw new Error('GitHub owner không hợp lệ.');
  if (!/^[\w.-]{1,100}$/.test(repo) || repo === '.' || repo === '..') throw new Error('Tên repository không hợp lệ.');
  if (branch.length > 240 || branch.startsWith('/') || branch.endsWith('/') || branch.startsWith('-') ||
      branch.includes('..') || branch.includes('//') || branch.includes('@{') || /[~^:?*\[\\\x00-\x20]/.test(branch) ||
      branch.split('/').some((p) => !p || p.startsWith('.') || p.endsWith('.') || p.endsWith('.lock'))) {
    throw new Error('Tên branch không hợp lệ.');
  }
  return { owner, repo, branch };
}

export function refPath(branch) {
  return branch.split('/').map(encodeURIComponent).join('/');
}
