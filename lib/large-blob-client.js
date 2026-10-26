import { LIMITS } from './constants.js';
/** Browser sends >3MB bytes directly to Private Blob, never through a Function request. */
export async function uploadLargeSourceFile({source,bytes,input,allowSensitiveUpload,request,uploadPrivate,onUploadProgress=()=>{}}) {
  if(bytes.byteLength!==source.bytes || bytes.byteLength<=LIMITS.directFileBytes || bytes.byteLength>LIMITS.fileBytes)
    throw new Error('Dung lượng file không khớp bản Review hoặc vượt giới hạn.');
  const {pathname,ticket}=await request('large-blob/ticket',{
    ...input,path:source.path,sha:source.sha,bytes:source.bytes});
  let uploaded=false,finalizeStarted=false;
  try {
    const file = new Blob([bytes],{type:'application/octet-stream'});
    const result=await uploadPrivate(pathname,file,{access:'private',contentType:'application/octet-stream',
      handleUploadUrl:'/api/large-upload',clientPayload:ticket,multipart:true,
      onUploadProgress:({percentage})=>onUploadProgress(Math.min(100,Math.max(0,percentage||0)))});
    if(result.pathname!==pathname) throw new Error('Đường dẫn Blob trả về không khớp.');
    uploaded=true;
    finalizeStarted=true;
    return await request('large-blob/finalize',{ticket,pathname,allowSensitiveUpload});
  } catch(error) {
    // A timeout after Finalize was sent is ambiguous: server may still be
    // retrieving and verifying bytes. Never race it with a client delete.
    if(uploaded && !finalizeStarted) {try {await request('large-blob/discard',{ticket,pathname});}catch{}}
    throw error;
  }
}
