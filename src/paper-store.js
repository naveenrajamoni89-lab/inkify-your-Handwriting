import { PAPER_LIMIT, paperLibrary, appendPapers, selectPaper, updatePaperFit } from './paper-library';
let connection;
async function store(mode, value) {
  const db = await (connection ??= new Promise((resolve, reject) => {
    const r = indexedDB.open('inkify-paper', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('paper');
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  }));
  return new Promise((resolve, reject) => {
    const tx = db.transaction('paper', mode === 'get' ? 'readonly' : 'readwrite');
    const s = tx.objectStore('paper');
    const r = mode === 'put' ? s.put(value, 'current') : s[mode]('current');
    tx.oncomplete = () => resolve(r.result);
    tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('Paper storage failed'));
  });
}
export async function loadPaper() {
  const record = await store('get');
  if(!record) return null;
  // Preserve the single background saved by earlier app versions.
  const records=record.library || record.items || [record];
  const items=[];
  try {for(const item of records) items.push({...item,id:item.id||crypto.randomUUID(),image:await createImageBitmap(item.blob)});}
  catch(error){items.forEach(item=>item.image.close());throw error;}
  const result=paperLibrary(items,record.selectedIds||items.map(item=>item.id));
  if(!record.library) await persist(result);
  return result;
}
async function preparePaper(file) {
  if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) throw new Error('Choose a PNG, JPG or WebP image up to 15 MB.');
  const original = await createImageBitmap(file);
  try {
    if (original.width * original.height > 40000000) throw new Error('Choose a paper image smaller than 40 megapixels.');
    const scale = Math.min(1, 3508 / Math.max(original.width, original.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(original.width * scale)); canvas.height = Math.max(1,Math.round(original.height * scale));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(original,0,0,canvas.width,canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if(!blob) throw new Error('Could not process this image.');
    const record={id:crypto.randomUUID(),name:file.name,blob};
    return {...record,image:await createImageBitmap(blob)};
  } finally { original.close(); }
}
async function persist(result) {
  if(result) await store('put',{
    library:result.library.map(({image,...record})=>record),
    selectedIds:result.selectedIds
  });
  else await store('delete');
  return result;
}
export async function savePapers(files, current) {
  if(!files.length) throw new Error('Choose a paper image.');
  if(files.length+(current?.library.length||0)>PAPER_LIMIT) throw new Error(`Only ${PAPER_LIMIT-(current?.library.length||0)} library slot(s) available. Choose fewer images or delete a saved paper.`);
  const prepared=[];
  try {
    for(const file of files) prepared.push(await preparePaper(file));
    return await persist(appendPapers(current,prepared));
  } catch(error){prepared.forEach(item=>item.image.close());throw error;}
}
export async function removePaper(current, id) {
  return persist(paperLibrary(current.library.filter(item=>item.id!==id),current.selectedIds.filter(value=>value!==id)));
}
export const togglePaper = (current,id,selected) => persist(selectPaper(current,id,selected));
export async function movePaper(current,index,direction) {
  const items=[...current.selectedIds];const target=index+direction;
  if(target<0 || target>=items.length) return current;
  [items[index],items[target]]=[items[target],items[index]];
  return persist(paperLibrary(current.library,items));
}
export async function savePaperFit(current, id, fit) {
  return persist(updatePaperFit(current, id, fit));
}
