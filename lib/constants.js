export const LIMITS = Object.freeze({
  zipBytes: 120 * 1024 * 1024,
  fileBytes: 2_500_000,
  unpackedBytes: 240 * 1024 * 1024,
  fileCount: 2500,
  archiveMembers: 10000,
  trackedFiles: 12000,
  commitEntries: 2500,
});

export const DEFAULT_BRANCH = 'main';

// User opt-in is per selected ZIP; no permanent high-memory setting is stored.
export const ARCHIVE_CAPACITY = Object.freeze({
  standard: Object.freeze({zipBytes: 120 * 1024 * 1024, unpackedBytes: 240 * 1024 * 1024}),
  extended: Object.freeze({zipBytes: 200 * 1024 * 1024, unpackedBytes: 400 * 1024 * 1024}),
});

export function archiveCapacity(mode = 'standard') {
  if (!Object.hasOwn(ARCHIVE_CAPACITY, mode)) throw new Error('Chế độ dung lượng ZIP không hợp lệ.');
  return ARCHIVE_CAPACITY[mode];
}
