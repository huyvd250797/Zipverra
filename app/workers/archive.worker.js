import { readArchive } from '../../lib/archive.js';

self.onmessage = async ({ data }) => {
  try {
    let lastPercent = -1;
    const archive = await readArchive(data.file, (value) => {
      if (value > lastPercent) {
        lastPercent = value;
        self.postMessage({ type: 'progress', value });
      }
    });
    // Transfer, rather than copy, file buffers into the UI thread.
    const transfer = archive.files.map((file) => file.data.buffer);
    self.postMessage({ type: 'complete', archive }, transfer);
  } catch (e) {
    self.postMessage({ type: 'error', message: e instanceof Error ? e.message : 'ZIP không hợp lệ.' });
  }
};
