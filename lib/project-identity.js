/** Read-only, advisory project-mismatch heuristics. Never a gate to GitHub writes. */
const IGNORED = /^(?:readme(?:\.[^/]*)?|license(?:\.[^/]*)?|\.gitignore|\.gitattributes|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|\.editorconfig|\.prettierrc[^/]*|\.github\/.*|public\/.*|assets\/.*)$/i;
const NOISE = /(?:^|\/)(?:__tests__|__snapshots__|fixtures|snapshots|node_modules|dist|build)\//i;
export function significantPaths(files = []) {
  return new Set(files.filter(x => x && x.type !== 'commit' && typeof x.path === 'string')
    .map(x => x.path).filter(path => path && !IGNORED.test(path) && !NOISE.test(path)));
}
export function packageNameFromArchive(files = []) {
  const item = files.find(f => f.path === 'package.json' && f.data && f.bytes <= 96000);
  if (!item) return '';
  try {const value = JSON.parse(new TextDecoder().decode(item.data));return typeof value.name === 'string' ? value.name.trim().toLowerCase() : '';}
  catch {return '';}
}
export function packageNameFromText(text) {
  if (typeof text !== 'string' || text.length > 96000) return '';
  try {const v=JSON.parse(text);return typeof v.name==='string'?v.name.trim().toLowerCase():'';}catch{return '';}
}
export function compareProjectIdentity({archiveFiles=[], remoteFiles=[], localName='', remoteName=''} = {}) {
  const local = significantPaths(archiveFiles), remote = significantPaths(remoteFiles);
  const common = [...local].filter(x => remote.has(x)).length;
  const min = Math.min(local.size, remote.size);
  const overlap = min ? common/min : 0;
  const remoteHashes = new Map(remoteFiles.filter(f => f && typeof f.path === 'string' && typeof f.sha === 'string').map(f => [f.path, f.sha]));
  const identicalContent = archiveFiles.filter(f => local.has(f.path) && typeof f.sha === 'string' && remoteHashes.get(f.path) === f.sha).length;
  const identicalContentShare = common ? identicalContent/common : 0;
  const differentNames=Boolean(localName && remoteName && localName!==remoteName);
  const sameNames=Boolean(localName && remoteName && localName===remoteName);
  // No deterministic detection for empty/new repositories, small patches or a few shared config files.
  if (remote.size < 8 || local.size < 8) return {severity:'unknown',common,localCount:local.size,remoteCount:remote.size,overlap,differentNames,sameNames,identicalContent,identicalContentShare};
  const disjoint=common<=Math.max(1,Math.floor(min*.10));
  const lowOverlap=overlap<.20;
  const stronglyDifferent=disjoint && (differentNames || (min>=14 && overlap<.08));
  // Rebrands with the same actual blobs are not mistaken for another codebase.
  const suspicious=stronglyDifferent || (differentNames && identicalContentShare < .50);
  return {
    severity:suspicious?'critical':lowOverlap?'uncertain':'matched',common,localCount:local.size,remoteCount:remote.size,
    overlap,differentNames,sameNames,identicalContent,identicalContentShare,
  };
}
