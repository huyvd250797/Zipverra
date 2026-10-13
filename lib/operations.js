import { LIMITS } from './constants.js';
import { assertSafeContentPath } from './paths.js';

export function calculateChanges(localFiles, remoteFiles, mode = 'merge') {
  if (!['merge', 'sync'].includes(mode)) throw new Error('Chế độ cập nhật không hợp lệ.');
  const existing = new Map(remoteFiles.filter((f) => f.type === 'blob').map((f) => [f.path, f]));
  const changes = [];
  const incomingPaths = new Set();
  for (const file of localFiles) {
    assertSafeContentPath(file.path);
    if (incomingPaths.has(file.path)) throw new Error('ZIP có đường dẫn file trùng nhau.');
    incomingPaths.add(file.path);
    const prev = existing.get(file.path);
    if (!prev) {
      changes.push({ path: file.path, kind: 'add', bytes: file.bytes, mode: file.mode === '100755' ? '100755' : '100644' });
    } else if (prev.sha !== file.sha || (prev.mode !== '100644' && prev.mode !== '100755')) {
      changes.push({ path: file.path, kind: 'modify', bytes: file.bytes, mode: prev.mode === '100755' ? '100755' : file.mode });
    }
  }
  if (mode === 'sync') {
    for (const remote of existing.values()) {
      // Do not remove existing submodules or symlinks implicitly.
      if (!incomingPaths.has(remote.path) && remote.mode !== '120000') {
        changes.push({ path: remote.path, kind: 'delete', bytes: 0, mode: remote.mode });
      }
    }
  }
  if (changes.length > LIMITS.commitEntries) throw new Error(`Quá ${LIMITS.commitEntries} thay đổi; hãy chia thành nhiều lần push.`);
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

export function countChanges(changes) {
  return {
    add: changes.filter((x) => x.kind === 'add').length,
    modify: changes.filter((x) => x.kind === 'modify').length,
    delete: changes.filter((x) => x.kind === 'delete').length,
  };
}
