import { createArchiveReader } from '../../lib/archive.js';

let reader=null;
let generation=0;
self.onmessage=async ({data})=>{
  if (data?.type==='close') {
    generation++; reader?.close(); reader=null;
    self.close(); return;
  }
  if (data?.type==='open') {
    const next=++generation;
    reader?.close();reader=null;
    try {
      const session=await createArchiveReader(data.file, value=>{
        if (next===generation) self.postMessage({type:'progress',value});
      },{mode:data.mode,metadataOnly:true});
      if(next!==generation){session.close();return;}
      reader=session;
      self.postMessage({type:'complete',archive:session.archive});
    } catch (error) {
      if(next===generation) self.postMessage({type:'error',message:error?.message||'ZIP không hợp lệ.'});
    }
    return;
  }
  if(data?.type==='read') {
    const id=data.id;
    if(!reader){self.postMessage({type:'fileError',id,message:'Phiên ZIP không còn hoạt động. Hãy phân tích lại.'});return;}
    try {
      const bytes=await reader.getFile(data.path);
      self.postMessage({type:'file',id,path:data.path,bytes},[bytes.buffer]);
    } catch(error){self.postMessage({type:'fileError',id,message:error?.message||'Không đọc được file ZIP.'});}
  }
};
