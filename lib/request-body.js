/** Bounded JSON body parser for GitHub mutation and read APIs.
 * Vercel's HTTP payload limit is lower than the total ZIP limit, so each
 * blob request stays below 4 MiB. Streaming bounds also protect requests with
 * absent or deliberately incorrect Content-Length headers.
 */
export const MAX_JSON_BODY_BYTES = 4 * 1024 * 1024;

export class RequestBodyError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'RequestBodyError';
    this.status = status;
  }
}

export async function readLimitedJson(request, maxBytes = MAX_JSON_BODY_BYTES) {
  const declared = request.headers.get('content-length');
  if (declared !== null && /^\d+$/.test(declared) && Number(declared) > maxBytes) {
    throw new RequestBodyError('Payload vượt giới hạn của máy chủ.', 413);
  }
  if (!request.body) throw new RequestBodyError('Payload JSON trống.');
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new RequestBodyError('Payload không hợp lệ.');
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new RequestBodyError('Payload vượt giới hạn của máy chủ.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total === 0) throw new RequestBodyError('Payload JSON trống.');
  const content = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { content.set(chunk, offset); offset += chunk.length; }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(content));
  } catch {
    throw new RequestBodyError('Payload JSON không hợp lệ.');
  }
}
