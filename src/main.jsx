import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Feather, ArrowUpRight, ChevronLeft, ChevronRight, Download, FileText, Image, RotateCcw, Check, SlidersHorizontal, Sparkles, BookOpen, PenLine, X, Plus, Save } from 'lucide-react';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/caveat/400.css';
import '@fontsource/patrick-hand/400.css';
import '@fontsource/kalam/400.css';
import '@fontsource/indie-flower/400.css';
import { PAGE, STYLES, INKS, defaults, sample, layoutText, configureFont, renderPage, measureText, normalizeSettings } from './engine';
import './style.css';
import FontManager from './FontManager';
import { fontStore, activateFont } from './font-store';
import { PRESETS, writingArea, writingAreaForPage, paperIndex } from './engine';
import PaperControls from './PaperControls';
import { loadPaper, savePaperFit } from './paper-store';
import WritingGuide from './WritingGuide';
import CornerGuide from './CornerGuide';
import SavedSettings from './SavedSettings';
import CornerControls from './CornerControls';

const STORAGE = 'inkify-draft-v1';
function restore() {
  try {
    const draft = JSON.parse(localStorage.getItem(STORAGE));
    if (!draft || typeof draft.text !== 'string') return null;
    return { text: draft.text.slice(0, 50000), title: typeof draft.title === 'string' ? draft.title : 'Untitled notebook', settings: normalizeSettings(draft.settings || {}) };
  } catch { return null; }
}
function App() {
  const [initial] = useState(restore);
  const [text, setText] = useState(initial?.text ?? sample);
  const [title, setTitle] = useState(initial?.title ?? 'A little space to think');
  const [settings, setSettings] = useState(initial?.settings ?? defaults);
  const [pages, setPages] = useState([[]]);
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('write');
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(true);
  const [paper, setPaper] = useState(null);
  const [savedFonts,setSavedFonts] = useState([]);
  const canvas = useRef(null);
  const upload = useRef(null);
  const bodyAppearance = value => setSettings(s => ({...value,...Object.fromEntries(Object.entries(s).filter(([key])=>key.startsWith('corner')))}));
  const set = (key, value) => setSettings(s => ({ ...s, [key]: value }));
  useEffect(() => { (async () => { try {
      await Promise.all(Object.values(STYLES).map(s => document.fonts.load('40px "' + s.font + '"')));
      try {
        const records=await fontStore('getAll');
        const results=await Promise.allSettled(records.map(activateFont));
        const fonts=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
        setSavedFonts(fonts);
        if(initial?.settings.fontId){const active=fonts.find(f=>f.id===initial.settings.fontId);if(active)setSettings(s=>({...s,customFont:active.family,fontGlyphs:active.glyphSource}));else{setSettings(s=>({...s,fontId:undefined,customFont:undefined,fontGlyphs:undefined}));setToast('Saved font unavailable. Using built-in handwriting.');}}
        if(fonts.length!==records.length)setToast('Some saved fonts could not load. You can upload them again in My handwriting.');
      } catch {setToast('Saved fonts could not load. Using built-in handwriting.');}

      try { const savedPaper=await loadPaper();setPaper(savedPaper);if(initial?.settings.paper==='custom'&&!savedPaper){setSettings(s=>({...s,paper:'plain'}));setToast('Saved paper unavailable. Please upload it again.');}} catch {if(initial?.settings.paper==='custom'){setSettings(s=>({...s,paper:'plain'}));setToast('Saved paper could not load. Please upload it again.');}}
      setReady(true);
    } catch {setToast('Handwriting fonts could not load. Please reload.');} })(); }, []);
  useEffect(() => {
    if (!ready) return;
    const ctx = document.createElement('canvas').getContext('2d');
    configureFont(ctx, settings);
    const measure = value => measureText(ctx, value, settings);
    const result = layoutText(text, {...settings,paperImages:paper?.items.map(item=>item.image),paperItems:paper?.items}, measure);
    setPages(result); setPage(p => Math.min(p, result.length - 1));
  }, [text, settings, ready, paper]);
  useEffect(() => { if (ready && canvas.current) renderPage(canvas.current, pages[page] || [], {...settings,paperImages:paper?.items.map(item=>item.image),paperItems:paper?.items}, page); }, [pages, page, settings, ready, paper]);
  useEffect(() => {
    setSaved(false);
    const timer = setTimeout(() => {
      try {
        const { customFont, fontGlyphs, ...storedSettings } = settings;
        localStorage.setItem(STORAGE, JSON.stringify({ text, title, settings: storedSettings })); setSaved(true);
      }
      catch { setToast('Browser storage is unavailable. Export to keep your notes.'); }
    }, 600);
    return () => clearTimeout(timer);
  }, [text, title, settings]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer); }, [toast]);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const filename = (title.trim() || 'Inkify notes').replace(/[<>:"/\\|?*]/g, '-');
  async function exportNotes(type) {
    if (!ready || busy || !(text.trim() || settings.cornerText?.trim())) return;
    setBusy(true);
    try {
      await new Promise(r => setTimeout(r, 30));
      const output = document.createElement('canvas');
      if (type === 'png') {
        renderPage(output, pages[page], {...settings,paperImages:paper?.items.map(item=>item.image),paperItems:paper?.items}, page, settings.exportScale);
        const blob = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('PNG generation failed');
        const url = URL.createObjectURL(blob); const link = document.createElement('a');
        link.href = url; link.download = `${filename} - page ${page + 1}.png`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
        for (let i = 0; i < pages.length; i++) {
          if (i) pdf.addPage();
          renderPage(output, pages[i], {...settings,paperImages:paper?.items.map(item=>item.image),paperItems:paper?.items}, i, settings.exportScale);
          pdf.addImage(output.toDataURL('image/png'), 'PNG', 0, 0, 210, 297, 'inkify-page-' + i);
          await new Promise(r => setTimeout(r, 0));
        }
        pdf.save(`${filename}.pdf`);
      }
      setToast(type === 'pdf' ? `Exported ${pages.length} page${pages.length === 1 ? '' : 's'} as PDF` : `Exported page ${page + 1} as PNG`);
    } catch { setToast('Export failed. Please try again.'); } finally { setBusy(false); }
  }
  async function importText(event) {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 200000) { setToast('Please choose a text file smaller than 200 KB.'); return; }
    try { const content = await file.text(); setText(content.slice(0, 50000)); setTitle(file.name.replace(/\.txt$/i, '')); setPage(0); setToast(content.length > 50000 ? 'Imported the first 50,000 characters.' : 'Text imported'); }
    catch { setToast('Could not read this file. Try a plain .txt file.'); }
    event.target.value = '';
  }
  const activePaper=paper?.items[paperIndex(settings,page,paper?.items.length||0)];
  const guide=writingAreaForPage({...settings,paperImages:paper?.items.map(item=>item.image),paperItems:paper?.items}, page);
  const paperRef = useRef(paper);
  paperRef.current = paper;
  const fitQueue = useRef(Promise.resolve());
  async function saveActivePaperFit(fit) {
    if(!paper||!activePaper) return;
    const id = activePaper.id;
    const current = paperRef.current;
    const library = current.library.map(item => item.id === id ? {...item,...fit} : item);
    const updated = {...current,library,items:current.selectedIds.map(key=>library.find(item=>item.id===key))};
    paperRef.current = updated;
    setPaper(updated);
    fitQueue.current = fitQueue.current.catch(()=>{}).then(()=>savePaperFit(updated,id,fit));
    try { await fitQueue.current; } catch { setToast('Could not save paper position. Please try again.'); }
  }
  function applySavedSettings(value, name) {
    const font = savedFonts.find(f => f.id === value.fontId);
    const missingFont = value.fontId && !font;
    const missingPaper = value.paper === 'custom' && !paper;
    setSettings({ ...value, fontId: font?.id, customFont: font?.family, fontGlyphs: font?.glyphSource, paper: missingPaper ? 'plain' : value.paper });
    setPage(0);
    setToast('Applied “' + name + '”.' + (missingFont ? ' Saved font unavailable; using built-in handwriting.' : '') + (missingPaper ? ' Upload paper to restore the custom background.' : ''));
  }
  return <div className="app">
    <header className="header"><a className="brand" href="./" aria-label="Inkify home"><span className="brand-icon"><Feather size={23}/></span>inkify<span className="ai">AI</span></a><span className="header-divider"/><span className="header-label">Your words. A personal touch.</span><div className="header-right"><span className="local-badge"><span/> Private by design</span><button className="avatar" title="Notes are stored in this browser" aria-label="Local workspace">N</button></div></header>
    <main>
      <div className="intro"><div><div className="eyebrow"><span/> A LITTLE MORE HUMAN</div><h1>Good ideas deserve <span>great handwriting.</span></h1><p>Turn your everyday text into notes that feel like you.</p></div><button className="outline-button" onClick={() => setModal(true)}><PenLine size={16}/> My handwriting </button></div>
      <div className="workspace-bar"><div className="notebook-title"><BookOpen size={17}/><input aria-label="Notebook title" value={title} maxLength={80} onChange={e => setTitle(e.target.value)}/><span className="draft-label">DRAFT</span></div><span className="save-status">{saved ? <Check size={14}/> : <Save size={14}/>} {saved ? 'Saved on this device' : 'Saving…'}</span></div>
      <div className="workspace">
        <section className="editor-panel" aria-label="Note editor"><div className="tabs"><button className={tab === 'write' ? 'active' : ''} onClick={() => setTab('write')}><FileText size={16}/> Your text</button><button className={tab === 'style' ? 'active' : ''} onClick={() => setTab('style')}><SlidersHorizontal size={16}/> Body appearance</button><button className={tab === 'corner' ? 'active' : ''} onClick={() => setTab('corner')}><PenLine size={16}/> Corner text</button></div>
          {tab === 'write' ? <><div className="editor-heading"><span>LET YOUR THOUGHTS FLOW</span><button className="text-button" onClick={() => upload.current.click()}>Import .txt <ArrowUpRight size={13}/></button><input ref={upload} type="file" accept=".txt,text/plain" hidden onChange={importText}/></div><textarea aria-label="Your note text" placeholder="A blank page. Endless possibilities. Start writing here…" value={text} maxLength={50000} onChange={e => setText(e.target.value)}/><div className="editor-bottom"><span>{words} words <b>·</b> {text.length.toLocaleString()} / 50,000 characters</span><button className="text-button" onClick={() => { setText(sample); setPage(0); setToast('Example note loaded'); }}>Try an example <ArrowUpRight size={13}/></button></div></> : tab === 'corner' ? <div className="format-panel corner-editor"><CornerControls settings={settings} setSettings={setSettings} activePaper={settings.paper==='custom'?activePaper:null} onSaveFit={saveActivePaperFit}/></div> : <div className="format-panel"><h3>Give your writing a character.</h3><p>Reference-inspired shapes and rhythm. Fine-tune your own version.</p>
            <button className="outline-button reference-preset" onClick={() => { bodyAppearance({...settings,...PRESETS.reference.settings,paper:settings.paper,paperFit:settings.paperFit,margin:settings.margin,topMargin:settings.topMargin,rightMargin:settings.rightMargin,bottomMargin:settings.bottomMargin}); setToast('Photographed research notes applied'); }}><PenLine size={15}/> Use photographed research notes</button>
            <p className="reference-note">Reference-inspired handwriting with varied heading strokes, subtle pen marks, and paper grain.</p>
            <button className="outline-button" onClick={()=>setModal(true)}>Custom Font Manager · Create my font</button>
            <div className="preset-list">{Object.entries(PRESETS).map(([id,preset])=><button key={id} onClick={()=>setSettings(s=>({...preset.settings, ...Object.fromEntries(Object.entries(s).filter(([key])=>key.startsWith('corner'))), customFont:s.customFont,fontId:s.fontId,fontGlyphs:s.fontGlyphs}))}>{preset.name}</button>)}</div>
            <SavedSettings settings={settings} onApply={applySavedSettings} notify={setToast} disabled={!ready || busy}/>
            <label className="setting-row">Paper finish<select value={settings.finish} onChange={e=>set('finish',e.target.value)}><option value="white">Pure white</option><option value="paper">Textured paper</option><option value="photo">Photographed paper</option></select></label>
            <label className="setting-row"><input type="checkbox" checked={settings.headings} onChange={e=>set('headings',e.target.checked)}/> Subtle double pen underlines for title and heading labels ending in a colon</label>
            <label className="setting-row"><input type="checkbox" checked={settings.connected} onChange={e=>set('connected',e.target.checked)}/> Connected writing (font-native word shaping)</label><p className="control-note">Connected writing preserves a font's ligatures and contextual forms. Letter spacing and per-letter variation apply in individual-letter mode.</p>
            <label className="setting-row">Export quality<select value={settings.exportScale} onChange={e=>set('exportScale',+e.target.value)}><option value="1">150 DPI · smaller file</option><option value="2">300 DPI · print quality</option></select></label>
            <section className="spacing-controls" aria-label="Tighter line spacing">
              <label className="setting-row">Exact line spacing (px)<input aria-label="Exact line spacing" type="number" min="12" max="100" step="1" value={settings.spacing} onChange={e => { if (e.target.value !== '') set('spacing', Math.max(12, Math.min(100, Number(e.target.value)))); }}/></label>
              <div className="settings-actions">{[['Comfortable', 1.3], ['Tight', 1], ['Extra tight', .8]].map(([label, ratio]) => <button className="outline-button" key={label} onClick={() => set('spacing', Math.max(12, Math.round(settings.size * ratio)))}>{label}</button>)}</div>
              <p className="control-note">Baseline distance: {settings.spacing} px. Reduce it to 12 px using the slider or exact value. Tight and Extra tight set it relative to your letter size. Smaller letters also help lines fit; lower baseline irregularity and character rotation for steadier writing.</p>
              {settings.spacing < settings.size && <p className="spacing-warning" role="status">Lines may overlap at this spacing. Reduce letter size or increase line spacing if needed.</p>}
            </section>
            <div className="sliders-grid">{[
              ['penMarks','Small pen marks',0,100,1,'%'],
              ['textureStrength','Paper texture strength',0,100,1,'%'],
              ['size', 'Letter size', 12, 64, 1, ' px'],
              ['weight', 'Font weight', 400, 700, 100, ''],
              ['spacing', 'Line spacing', 12, 100, 1, ' px'],
              ['margin', 'Left margin', 30, 350, 1, ' px'],
              ['slant', 'Letter slant', -15, 15, 1, '°'],
              ['width', 'Letter width', 0.8, 1.3, 0.01, '×'],
              ['tracking', 'Letter spacing', 0, 6, 0.5, ' px'],
              ['wordGap', 'Extra word spacing', 0, 24, 1, ' px'],
              ['spacingVariation', 'Spacing variation', 0, 3, .5, ' px'],
              ['variation', 'Natural variation', 0, 100, 1, '%'],
              ['rotation','Character rotation',0,6,.5,'°'],
              ['baseline','Baseline irregularity',0,6,.5,' px'],
              ['intensity','Ink intensity',40,100,1,'%'],
              ['thickness','Stroke thickness',0,1,.1,' px'],
              ['consistency','Writing consistency',0,100,1,'%'],
            ].map(([key, label, min, max, step, unit]) => <label key={key} className="slider-label">{label}<span>{settings[key]??(key==='spacingVariation'?3:0)}{unit}</span><input aria-label={label} type="range" min={min} max={max} step={step} value={settings[key]??(key==='spacingVariation'?3:0)} onChange={e => set(key, +e.target.value)}/></label>)}</div><p className="control-note">Turn natural effects on below to apply baseline, size and ink variation. Font weight may be synthesized for fonts with one weight.</p><button className="outline-button" onClick={() => bodyAppearance({ ...defaults })}><RotateCcw size={14}/> Reset appearance</button></div>}
          {tab !== 'corner' && <div className="customization"><div className="section-label">HANDWRITING STYLE <span>Make every word your own</span></div><div className="style-options">{Object.entries(STYLES).map(([id, style]) => <button key={id} className={`style-card ${!settings.customFont && settings.style === id ? 'selected' : ''}`} onClick={() => setSettings(s => ({ ...s, style: id, customFont: undefined, fontGlyphs: undefined, fontId: undefined }))} aria-pressed={!settings.customFont && settings.style === id}><span style={{ fontFamily: style.font }}>Hello, you.</span><small>{style.name}</small>{!settings.customFont && settings.style === id && <span className="style-check"><Check size={10}/></span>}</button>)}{savedFonts.map(font=><button key={font.id} data-font-id={font.id} aria-label={'Use saved font '+font.name} aria-pressed={settings.fontId===font.id} className={'style-card custom-font-card '+(settings.fontId===font.id?'selected':'')} onClick={()=>setSettings(s=>({...s,customFont:font.family,fontId:font.id,fontGlyphs:font.glyphSource}))}><span style={{fontFamily:font.family}}>Hello, you.</span><small title={font.name}>{font.name}</small><em>Saved font</em>{settings.fontId===font.id && <span className="style-check"><Check size={10}/></span>}</button>)}</div><div className="saved-font-actions"><span>{savedFonts.length} custom font{savedFonts.length===1?'':'s'} saved on this device</span><button className="text-button" onClick={()=>setModal(true)}>Add / manage fonts <Plus size={12}/></button></div><div className="appearance-row"><div><div className="section-label">INK COLOR</div><div className="ink-options">{Object.entries(INKS).map(([id, color]) => { const label={pen:'Ballpoint pen (navy)',blue:'Blue ink',black:'Black ink',red:'Red ink',green:'Green ink'}[id]||(id+' ink'); return <button key={id} style={{ '--ink': color }} title={label} aria-label={label} aria-pressed={settings.ink === id} className={settings.ink === id ? 'selected' : ''} onClick={() => set('ink', id)}>{settings.ink === id && <Check size={14}/>}</button>; })}</div></div><div className="paper-control"><label className="section-label" htmlFor="paper">PAPER TYPE</label><select id="paper" value={settings.paper} onChange={e => set('paper', e.target.value)}><option value="ruled">Ruled notebook</option><option value="plain">Plain A4</option><option value="graph">Graph paper</option>{paper && <option value="custom">My uploaded paper</option>}</select></div></div><PaperControls paper={paper} settings={settings} setSettings={setSettings} onPaper={setPaper} disabled={busy || !ready} notify={setToast} pageIndex={page} onSaveFit={saveActivePaperFit} activePaper={activePaper}/><div className="realism"><span className="sparkle-icon"><Sparkles size={17}/></span><div><strong>A beautifully imperfect touch</strong><span>Variable baselines, letter shapes & ink pressure</span></div><button role="switch" aria-checked={settings.realism} aria-label="Natural handwriting effects" className={`switch ${settings.realism ? 'on' : ''}`} onClick={() => set('realism', !settings.realism)}><span/></button></div></div>}
        </section>
        <section className="preview-panel" aria-label="Handwritten preview"><div className="preview-toolbar"><span><span className="live-dot"/> LIVE PREVIEW</span><span className="paper-spec">A4 <b>·</b> 210 × 297 mm</span></div>{settings.paper==='custom' && activePaper && <div className="active-paper" aria-live="polite"><strong>Page {page+1} of {pages.length}</strong><span>Paper {(paper.library.findIndex(item=>item.id===activePaper.id)+1)} · {activePaper.name}</span><small>{settings.paperMode==='single'?'Same paper on every page':'Alternating '+paper.items.length+' selected papers'}</small></div>}<div className="preview-stage"><div className="paper-shadow"><canvas ref={canvas} aria-label={`Handwritten note preview, page ${page + 1} of ${pages.length}`}/>{settings.paper==='custom' && settings.showWritingArea && tab !== 'corner' && ready && <WritingGuide area={guide} settings={settings} setSettings={setSettings} activePaper={activePaper} onSaveFit={saveActivePaperFit}/>}{ready && tab === 'corner' && settings.cornerText?.trim() && <CornerGuide settings={settings} setSettings={setSettings} activePaper={settings.paper==='custom'?activePaper:null} onSaveFit={saveActivePaperFit}/>} {!ready && <div className="loading">Preparing your pen…</div>}</div></div><div className="preview-bottom"><span><span className="tiny-dot"/> {ready ? 'All changes appear instantly' : 'Loading handwriting fonts…'}</span><div className="pagination"><button aria-label="Previous page" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16}/></button><label className="page-jump"><span className="sr-only">Go to page</span><select aria-label="Go to page" value={page} onChange={e=>setPage(+e.target.value)}>{pages.map((_,i)=><option key={i} value={i}>{i+1}</option>)}</select><b>/ {pages.length}</b></label><button aria-label="Next page" disabled={page === pages.length - 1} onClick={() => setPage(p => p + 1)}><ChevronRight size={16}/></button></div></div></section>
      </div>
      <div className="export-bar"><div className="export-note"><span className="export-icon"><Feather size={19}/></span><div><strong>Your notebook, ready to go.</strong><span>{pages.length} {pages.length === 1 ? 'page' : 'pages'} of your thoughts. A little more personal.</span></div></div><div className="export-actions"><button className="outline-button" disabled={!ready || busy || !(text.trim() || settings.cornerText?.trim())} onClick={() => exportNotes('png')}><Image size={16}/> Save PNG <span className="button-hint">Current page</span></button><button className="primary-button" disabled={!ready || busy || !(text.trim() || settings.cornerText?.trim())} onClick={() => exportNotes('pdf')}><Download size={17}/>{busy ? 'Preparing…' : 'Download PDF'}<span className="button-hint">All pages</span></button></div></div>
      <footer><span>Made for the joy of putting thoughts on paper.</span><span><span className="footer-dot"/> Your notes stay in your browser.</span></footer>
    </main>
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
    {modal && <FontManager fonts={savedFonts} onFontsChange={setSavedFonts} onClose={()=>setModal(false)} onApply={font=>setSettings(s=>({...s, customFont:font.family,fontId:font.id,fontGlyphs:font.glyphSource}))} onDelete={id=>setSettings(s=>s.fontId===id?{...s,fontId:undefined,customFont:undefined,fontGlyphs:undefined}:s)}/>} 
  </div>;
}
createRoot(document.getElementById('root')).render(<App/>);
