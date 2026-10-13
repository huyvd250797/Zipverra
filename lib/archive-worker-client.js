/** Offload ZIP decompression and Git SHA hashing to a Web Worker on supported browsers. */
export async function readArchiveOffThread(file, onProgress, createWorker, fallback) {
  if (typeof createWorker !== 'function') return fallback(file, onProgress);
  let worker;
  try { worker = createWorker(); }
  catch { return fallback(file, onProgress); }
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      worker.terminate();
      fn(value);
    };
    const watchdog = setTimeout(() => finish(reject, new Error('Giải nén ZIP quá thời gian. Hãy kiểm tra kích thước và thử lại trên thiết bị đủ bộ nhớ.')), 4 * 60 * 1000);
    worker.onmessage = ({ data }) => {
      if (data?.type === 'progress') onProgress(data.value);
      else if (data?.type === 'complete') finish(resolve, data.archive);
      else if (data?.type === 'error') finish(reject, new Error(data.message || 'Không đọc được ZIP.'));
    };
    worker.onerror = () => finish(reject, new Error('Web Worker xử lý ZIP gặp lỗi. Hãy thử một ZIP nhỏ hơn.'));
    try { worker.postMessage({ file }); }
    catch { finish(reject, new Error('Không chuyển được ZIP tới Web Worker.')); }
  });
}
