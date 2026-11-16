/** ZIP central-directory metadata, independent from undocumented JSZip _data internals.
 * Reads the small central directory rather than inflating each file to discover its size.
 * A broken, ambiguous, encrypted or multi-volume archive fails closed.
 */
const ZIP_EOCD=0x06054b50, ZIP_CENTRAL=0x02014b50, ZIP64_LOCATOR=0x07064b50, ZIP64_END=0x06064b50;
const MAX_MEMBERS=5000;
const utf8=new TextDecoder('utf-8');

function invalid(reason){return new Error(`ZIP không hợp lệ: ${reason}`);}
function safe64(view,offset,where){
  if(offset+8>view.byteLength)throw invalid(`thiếu dữ liệu ZIP64 (${where}).`);
  const value=view.getBigUint64(offset,true);
  if(value>BigInt(Number.MAX_SAFE_INTEGER))throw invalid(`giá trị ZIP64 quá lớn (${where}).`);
  return Number(value);
}
function boundedSlice(file,start,length){
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(length)||start<0||length<0||start+length>file.size)
    throw invalid('vị trí dữ liệu ZIP vượt kích thước gói.');
  return file.slice(start,start+length).arrayBuffer();
}
function getZip64Size(view,extraStart,extraEnd,needUnpacked,needPacked){
  let offset=extraStart;
  while(offset+4<=extraEnd){
    const type=view.getUint16(offset,true),len=view.getUint16(offset+2,true);
    offset+=4;
    if(offset+len>extraEnd)throw invalid('trường mở rộng Central Directory bị cắt.');
    if(type===0x0001){
      let at=offset;
      const unpacked=needUnpacked?safe64(view,at,'dung lượng giải nén'):null;
      if(needUnpacked)at+=8;
      const packed=needPacked?safe64(view,at,'dung lượng nén'):null;
      return {unpacked,packed};
    }
    offset+=len;
  }
  if(offset!==extraEnd)throw invalid('trường mở rộng Central Directory không hợp lệ.');
  if(needUnpacked||needPacked)throw invalid('thiếu metadata ZIP64 cần thiết.');
  return {};
}
const CRC_TABLE=Uint32Array.from({length:256},(_,index)=>{
  let value=index;
  for(let bit=0;bit<8;bit++)value=(value>>>1) ^ (value&1?0xedb88320:0);
  return value>>>0;
});
export function crc32(bytes){
  let result=0xffffffff;
  for(let i=0;i<bytes.length;i++)result=(result>>>8)^CRC_TABLE[(result^bytes[i])&255];
  return (result^0xffffffff)>>>0;
}
/** @returns {Promise<Map<string,{name:string,uncompressedSize:number,compressedSize:number,crc:number,flags:number}>>} */
export async function readZipDirectory(file){
  if(!file||!Number.isSafeInteger(file.size)||file.size<22)throw invalid('file bị cắt hoặc rỗng.');
  const tailLength=Math.min(file.size,65535+22);
  const tail=new DataView(await boundedSlice(file,file.size-tailLength,tailLength));
  let eocd=-1;
  for(let at=tail.byteLength-22;at>=0;at--){
    if(tail.getUint32(at,true)===ZIP_EOCD && at+22+tail.getUint16(at+20,true)===tail.byteLength){eocd=at;break;}
  }
  if(eocd<0)throw invalid('không tìm thấy bản ghi kết thúc Central Directory.');
  let count=tail.getUint16(eocd+10,true);
  let centralBytes=tail.getUint32(eocd+12,true);
  let centralOffset=tail.getUint32(eocd+16,true);
  if(tail.getUint16(eocd+4,true)!==0||tail.getUint16(eocd+6,true)!==0||
     (tail.getUint16(eocd+8,true)!==count&&count!==0xffff)) throw invalid('ZIP nhiều đĩa không được hỗ trợ.');
  if(count===0xffff||centralBytes===0xffffffff||centralOffset===0xffffffff){
    const locatorPosition=file.size-tailLength+eocd-20;
    const lv=new DataView(await boundedSlice(file,locatorPosition,20));
    if(lv.getUint32(0,true)!==ZIP64_LOCATOR||lv.getUint32(4,true)!==0||lv.getUint32(16,true)!==1)
      throw invalid('thiếu ZIP64 locator hợp lệ.');
    const zip64End=safe64(lv,8,'vị trí ZIP64');
    const zv=new DataView(await boundedSlice(file,zip64End,56));
    if(zv.getUint32(0,true)!==ZIP64_END||zv.getUint32(16,true)!==0||zv.getUint32(20,true)!==0)
      throw invalid('ZIP64 End of Central Directory không hợp lệ.');
    count=safe64(zv,32,'số thành phần');
    centralBytes=safe64(zv,40,'độ dài thư mục trung tâm');
    centralOffset=safe64(zv,48,'vị trí thư mục trung tâm');
  }
  if(count>MAX_MEMBERS)throw invalid(`quá nhiều thành phần (${count}).`);
  if(centralOffset+centralBytes>file.size||centralBytes>Math.max(32*1024*1024,count*2048))
    throw invalid('kích thước Central Directory không hợp lệ.');
  const view=new DataView(await boundedSlice(file,centralOffset,centralBytes));
  const names=new Map();let pos=0;
  for(let i=0;i<count;i++){
    if(pos+46>view.byteLength||view.getUint32(pos,true)!==ZIP_CENTRAL)
      throw invalid(`bản ghi Central Directory #${i+1} không hợp lệ.`);
    const flags=view.getUint16(pos+8,true);
    if(flags&1)throw invalid(`thành phần #${i+1} được mã hóa, không hỗ trợ.`);
    const compressed=view.getUint32(pos+20,true),uncompressed=view.getUint32(pos+24,true);
    const nameSize=view.getUint16(pos+28,true),extraSize=view.getUint16(pos+30,true),commentSize=view.getUint16(pos+32,true);
    const end=pos+46+nameSize+extraSize+commentSize;
    if(!nameSize||end>view.byteLength)throw invalid(`tên hoặc metadata thành phần #${i+1} không đầy đủ.`);
    const name=utf8.decode(new Uint8Array(view.buffer,view.byteOffset+pos+46,nameSize));
    if(!name||name.includes('\ufffd'))throw invalid(`tên thành phần #${i+1} không ở dạng UTF-8 hợp lệ.`);
    if(names.has(name))throw invalid(`đường dẫn bị lặp: ${name}`);
    const sizes=getZip64Size(view,pos+46+nameSize,pos+46+nameSize+extraSize,
      uncompressed===0xffffffff,compressed===0xffffffff);
    names.set(name,{name,uncompressedSize:sizes.unpacked??uncompressed,compressedSize:sizes.packed??compressed,
      crc:view.getUint32(pos+16,true),flags});
    pos=end;
  }
  if(pos!==view.byteLength)throw invalid('số lượng hoặc độ dài bản ghi Central Directory không khớp.');
  return names;
}
