export const LIMITS = Object.freeze({
  zipBytes: 80 * 1024 * 1024,
  fileBytes: 2_500_000,
  unpackedBytes: 160 * 1024 * 1024,
  fileCount: 2500,
  archiveMembers: 10000,
  trackedFiles: 12000,
  commitEntries: 2500,
});

export const DEFAULT_BRANCH = 'main';
