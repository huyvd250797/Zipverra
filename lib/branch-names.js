const HEX = /^[a-f0-9]{8}$/;

export function assertReleaseBranch(branch) {
  if (typeof branch !== 'string' || !/^zipverra\/[a-z0-9][a-z0-9._-]{0,67}-[a-f0-9]{8}$/.test(branch) ||
    branch.includes('..') || branch.endsWith('.lock')) {
    throw new Error('Tên branch PR không hợp lệ; dùng zipverra/ten-phien-ban-xxxxxxxx.');
  }
  return branch;
}

export function makeReleaseBranch(filename, suffix) {
  if (typeof suffix !== 'string' || !HEX.test(suffix)) throw new Error('Mã nhánh không hợp lệ.');
  const slug = String(filename || 'source').replace(/\.zip$/i,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0, 48).replace(/-+$/,'') || 'source';
  return assertReleaseBranch(`zipverra/${slug}-${suffix}`);
}

