/** Encode Uint8Array without spreading huge inputs onto the call stack. */
export function encodeBase64(data) {
  const BLOCK = 0x8000;
  let binary = '';
  for (let i = 0; i < data.length; i += BLOCK) {
    binary += String.fromCharCode(...data.subarray(i, i + BLOCK));
  }
  return btoa(binary);
}
