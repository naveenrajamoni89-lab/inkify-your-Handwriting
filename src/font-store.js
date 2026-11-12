import * as opentype from 'opentype.js';
let connection;
function db() {
  return connection ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('inkify-fonts', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('fonts', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function fontStore(operation, value) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('fonts', operation === 'getAll' ? 'readonly' : 'readwrite');
    const request = tx.objectStore('fonts')[operation](value);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Font storage aborted'));
  });
}
export async function activateFont(record) {
  const family = `Inkify_${record.id.replace(/[^a-zA-Z0-9]/g, '')}`;
  const face = await new FontFace(family, record.data).load();
  document.fonts.add(face);
  let glyphSource;
  try {
    const font = opentype.parse(record.data), alternates = new Map();
    for(const script of ['DFLT','latn']) for(const tag of ['salt','aalt']) {
      for(const item of font.substitution.getAlternates(tag,script)) alternates.set(item.sub,item.by);
    }
    if(alternates.size) glyphSource={font,alternates};
  } catch { /* Browser decoding still supports fonts such as WOFF2 without outline parsing. */ }
  return { ...record, family, face, glyphSource };
}
