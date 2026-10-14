import { readArchive } from '../../lib/archive.js';
import { scanSelectedChanges } from '../../lib/source-security.js';

self.onmessage = async ({ data }) => {
  try {
    let lastPercent = -1;
    const archive = await readArchive(data.file, (value) => {
      if (value > lastPercent) {
        lastPercent = value;
        self.postMessage({ type: 'progress', value });
      }
    });
    archive.security = scanSelectedChanges(archive.files,archive.files.map(file=>({path:file.path,kind:'add'})));
    // Transfer, rather than copy, file buffers into the UI thread.
    const transfer = archive.files.map((file) => file.data.buffer);
    self.postMessage({ type: 'complete', archive }, transfer);
  } catch (e) {
    self.postMessage({ type: 'error', message: e instanceof Error ? e.message : 'ZIP không hợp lệ.' });
  }
};
