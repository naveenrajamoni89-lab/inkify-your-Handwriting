import React, { useState } from 'react';
import { fontStore, activateFont } from './font-store';
import { makeTemplate, extractTemplate, buildFont, downloadBlob } from './template';

export default function FontManager({ fonts, onFontsChange: setFonts, onApply, onClose, onDelete }) {
  const [selected, setSelected] = useState(null), [name, setName] = useState('My handwriting');
  const [tab, setTab] = useState('library'), [cells, setCells] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [threshold, setThreshold] = useState(135), [scan, setScan] = useState(null);
  async function save(data, label, coverage, extension = 'otf') {
    const record = { id: crypto.randomUUID(), name: label, data, coverage, extension };
    const loaded = await activateFont(record); await fontStore('put', record);
    setFonts(list => [...list, loaded]); setSelected(loaded); setName(label); setTab('library');
  }
  async function upload(e) {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    setBusy(true); setError('');
    try {
      if (!/\.(ttf|otf|woff2?)$/i.test(file.name) || file.size > 5 * 1024 * 1024) throw new Error('Choose TTF, OTF, WOFF or WOFF2, up to 5 MB.');
      await save(await file.arrayBuffer(), file.name.replace(/\.[^.]+$/, ''), undefined, file.name.split('.').pop().toLowerCase());
    } catch (e) { setError(e.message || 'Unable to read or save font.'); } finally { setBusy(false); }
  }
  async function extract(file = scan) {
    if (!file) return; setBusy(true); setError('');
    try { if(file.size > 20000000) throw new Error('Use a scan smaller than 20 MB.'); setCells(await extractTemplate(file, threshold)); setScan(file); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function create() {
    setBusy(true); setError('');
    try { const data = buildFont(cells, name.trim()); await save(data, name.trim() || 'My handwriting', cells.filter(c => c.include).map(c => c.char).join('')); }
    catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  async function rename() {
    if (!selected || !name.trim()) return;
    try { const { face, family, glyphSource, ...record } = selected; record.name = name.trim(); await fontStore('put', record); setFonts(list => list.map(f => f.id === record.id ? { ...f, name: record.name } : f)); setSelected({ ...selected, name: record.name }); }
    catch { setError('Could not save the new name.'); }
  }
  async function remove() {
    try { await fontStore('delete', selected.id); onDelete(selected.id); document.fonts.delete(selected.face); setFonts(list => list.filter(f => f.id !== selected.id)); setSelected(null); }
    catch { setError('Could not delete the font.'); }
  }
  return <div className="modal-backdrop" onClick={onClose}><section className="font-manager" role="dialog" aria-modal="true" aria-label="Custom Font Manager" onClick={e => e.stopPropagation()} onKeyDown={e => {
    if(e.key === 'Escape') onClose();
    if(e.key === 'Tab') { const items = [...e.currentTarget.querySelectorAll('button,input,select')].filter(el => !el.disabled && el.offsetParent !== null); const first=items[0], last=items.at(-1); if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();} }
  }}><button autoFocus className="modal-close" aria-label="Close font manager" onClick={onClose}>✕</button><h2>Custom Font Manager</h2><p>Uploads are saved automatically and appear in Handwriting Style. Preview here, then apply whenever you want.</p>
    <div className="manager-tabs"><button onClick={() => setTab('library')} aria-pressed={tab==='library'}>Font library</button><button onClick={() => setTab('create')} aria-pressed={tab==='create'}>Create My Handwriting Font</button></div>
    {error && <p role="alert" className="manager-error">{error}</p>}
    {tab === 'library' ? <><label className="upload-label">Upload a font<input aria-label="Upload custom font" disabled={busy} type="file" accept=".ttf,.otf,.woff,.woff2" onChange={upload}/></label><div className="font-library">{fonts.map(font => <button key={font.id} aria-pressed={selected?.id===font.id} onClick={() => {setSelected(font);setName(font.name);}} style={{fontFamily:font.family}}>{font.name}</button>)}{!fonts.length && <p>No saved fonts yet. Upload a font or fill a handwriting template.</p>}</div>
      {selected && <><div className="font-name"><input aria-label="Custom font name" value={name} maxLength={60} onChange={e => setName(e.target.value)}/><button onClick={rename}>Save name</button></div><div className="font-specimen" style={{fontFamily:selected.family}}><p>The quick brown fox jumps over the lazy dog.</p><p>ABCDEFGHIJKLMNOPQRSTUVWXYZ<br/>abcdefghijklmnopqrstuvwxyz<br/>0123456789<br/>.,;:!? '" () [] / + − = % &amp;</p><p>Research methodology<br/>1. Identify the problem.<br/>Observation → hypothesis → results.</p></div>{selected.coverage && <p>Template coverage: {selected.coverage.length}/94 characters. Missing characters use the browser fallback.</p>}<div className="manager-actions"><button className="primary-button" onClick={() => {onApply(selected);onClose();}}>Apply to notes</button><button onClick={() => downloadBlob(new Blob([selected.data]), `${selected.name.replace(/[^a-z0-9 -]/gi,'_')}.${selected.extension || 'otf'}`)}>Download font</button><button onClick={remove}>Delete font</button></div></>}
    </> : <><p>1. Download and fill the labeled template. 2. Scan it flat and crop to the full page. 3. Review detected characters and save your font.</p><p>Free-form notes like the references cannot be automatically mapped by this template workflow. Use the supplied grid for reliable character labels.</p><button onClick={() => makeTemplate().toBlob(blob => downloadBlob(blob,'inkify-handwriting-template.png'))}>Download handwriting template</button><label className="upload-label">Upload completed template<input aria-label="Upload handwriting template" disabled={busy} type="file" accept="image/png,image/jpeg" onChange={e => {const file=e.target.files?.[0];if(file) extract(file);}}/></label><label>Ink threshold <input type="range" min="60" max="200" value={threshold} onChange={e => setThreshold(+e.target.value)}/>{threshold}</label><button disabled={!scan || busy} onClick={() => extract()}>Re-detect characters</button>
    {cells.length > 0 && <><p>Review every cell. Uncheck incorrect or empty shapes. Re-scan if letters cross cell boundaries. This first version traces pixel outlines; smooth curves and automatic photo deskewing are not included.</p><div className="glyph-review">{cells.map((cell,i) => <label key={cell.char}><span>{cell.char}</span><img src={cell.preview} alt={`Extracted ${cell.char}`}/><input aria-label={`Include ${cell.char}`} type="checkbox" checked={cell.include} onChange={e => setCells(list => list.map((c,j) => j===i ? {...c,include:e.target.checked} : c))}/></label>)}</div><label>Font name <input value={name} maxLength={60} onChange={e=>setName(e.target.value)}/></label><button className="primary-button" disabled={busy || !cells.some(c=>c.include)} onClick={create}>Create and preview font</button></>}
    </>}{busy && <p role="status">Processing…</p>}</section></div>;
}
