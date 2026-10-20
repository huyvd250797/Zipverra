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


/** Keeps compressed ZIP inside one Worker and returns only bounded metadata to React.
 * Worker is released on new selection, reset, error, and component unmount.
 */
export async function openArchiveOffThread(file,onProgress,createWorker,mode='standard') {
  if(typeof createWorker!=='function') {
    if (file.size>80*1024*1024) throw new Error('ZIP lớn yêu cầu trình duyệt hỗ trợ Web Worker. Hãy dùng Chrome/Edge/Safari mới hoặc chọn ZIP nhỏ hơn.');
    const {readArchive}=await import('./archive.js');
    const archive=await readArchive(file,onProgress,{mode});
    const map=new Map(archive.files.map(f=>[f.path,f.data]));
    return {archive,getFile:async path=>{if(!map.has(path))throw new Error('Không tìm thấy file trong ZIP.');return map.get(path);},close:()=>map.clear()};
  }
  let worker;
  try {worker=createWorker();}catch {throw new Error('Không khởi tạo được Web Worker để xử lý ZIP lớn.');}
  let closed=false,sequence=0;
  const pending=new Map();
  let watchdog;
  const open = new Promise((resolve,reject)=>{
    const fail=(error)=>{ if(closed)return; closed=true; clearTimeout(watchdog); for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(error);}pending.clear();worker.terminate();reject(error); };
    watchdog=setTimeout(()=>fail(new Error('Phân tích ZIP quá thời gian; thử ZIP nhỏ hơn hoặc chuyển sang PC.')),mode==='extended'?12*60_000:8*60_000);
    worker.onmessage=({data})=>{
      if(closed)return;
      if(data?.type==='progress') onProgress(data.value);
      if(data?.type==='error') fail(new Error(data.message||'Không phân tích được ZIP.'));
      if(data?.type==='complete'){clearTimeout(watchdog);resolve(data.archive);}
      if(data?.type==='file'||data?.type==='fileError') {
        const entry=pending.get(data.id);if(!entry)return;
        pending.delete(data.id);clearTimeout(entry.timer);
        if(data.type==='fileError')entry.reject(new Error(data.message||'Không đọc được file ZIP.'));
        else if (!(data.bytes instanceof Uint8Array) || data.path!==entry.path)entry.reject(new Error('Web Worker trả file không hợp lệ.'));
        else entry.resolve(data.bytes);
      }
    };
    worker.onerror=()=>fail(new Error('Web Worker xử lý ZIP gặp lỗi. Hãy phân tích lại.'));
    try{worker.postMessage({type:'open',file,mode});}catch{fail(new Error('Không chuyển được ZIP tới Web Worker.'));}
  });
  const close=()=>{
    if(closed)return;
    closed=true;clearTimeout(watchdog);
    for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(new Error('Phiên ZIP đã đóng.'));}
    pending.clear();worker.terminate();
  };
  try {
    const archive=await open;
    return {archive,close,getFile(path){
      if(closed)return Promise.reject(new Error('Phiên ZIP đã đóng.'));
      return new Promise((resolve,reject)=>{
        const id=++sequence;
        const timer=setTimeout(()=>{pending.delete(id);reject(new Error('Đọc file ZIP quá thời gian.'));},60_000);
        pending.set(id,{resolve,reject,timer,path});
        try{worker.postMessage({type:'read',id,path});}catch(error){pending.delete(id);clearTimeout(timer);reject(error);}
      });
    }};
  }catch(error){close();throw error;}
}
