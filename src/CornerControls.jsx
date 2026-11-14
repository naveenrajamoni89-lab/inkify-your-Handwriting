import React from 'react';
import { defaults, STYLES, INKS } from './engine';

export default function CornerControls({settings, setSettings, activePaper, onSaveFit}) {
  settings = {...defaults,...settings};
  const set = (key,value) => setSettings(s=>({...s,[key]:value}));
  const position = key => activePaper?.[key] ?? settings[key];
  function move(key,value) {
    if (activePaper) onSaveFit({[key]:value});
    else set(key,value);
  }
  return <section className="custom-paper" aria-label="Repeating corner text">
    <h3>Corner text</h3>
    <p>Enter your roll number, name, or label here. It repeats on every page. All controls in this tab adjust only this label.</p>
    <label className="corner-text-input">Text to display on every page<input aria-label="Corner text" type="text" maxLength={120} placeholder="e.g. 252U1R1210" value={settings.cornerText ?? ''} onChange={e=>set('cornerText',e.target.value)}/></label>
    <label className="setting-row">Corner handwriting<select aria-label="Corner handwriting" value={settings.cornerStyle} onChange={e=>set('cornerStyle',e.target.value)}>{Object.entries(STYLES).map(([id,style])=><option key={id} value={id}>{style.name}</option>)}</select></label>
    <label className="setting-row">Corner ink<select aria-label="Corner ink" value={settings.cornerInk} onChange={e=>set('cornerInk',e.target.value)}>{Object.keys(INKS).map(id=><option key={id} value={id}>{id==='pen'?'Ballpoint navy':id}</option>)}</select></label>
    <div className="paper-margins">
      {[['cornerSize','Corner font size',12,100,1,'px'],['cornerThickness','Corner stroke thickness',0,4,.1,'px']].map(([key,label,min,max,step,unit])=><label className="slider-label" key={key}>{label}<span>{settings[key]} {unit}</span><input aria-label={label} type="range" min={min} max={max} step={step} value={settings[key]} onChange={e=>set(key,+e.target.value)}/></label>)}
    </div>
    <label className="setting-row">Decoration<select aria-label="Corner text decoration" value={settings.cornerUnderline?'underline':'plain'} onChange={e=>set('cornerUnderline',e.target.value==='underline')}><option value="plain">Plain</option><option value="underline">Hand-drawn underline</option></select></label>
    <p>{activePaper ? `Position saved separately for ${activePaper.name}. Navigate pages to adjust each paper.` : 'Position applies to built-in papers.'} Font size, thickness, and text apply to every page.</p>
    <label className="setting-row">Corner<select aria-label="Corner text position" value={position('cornerAnchor') ?? 'top-right'} onChange={e=>move('cornerAnchor',e.target.value)}>{[['top-right','Top right'],['top-left','Top left'],['bottom-right','Bottom right'],['bottom-left','Bottom left']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <div className="paper-margins">
      {[['cornerX','Horizontal inset',1228,90],['cornerY','Vertical inset',1748,65]].map(([key,label,max,fallback])=><label className="slider-label" key={key}>{label}<span>{position(key) ?? fallback} px</span><input aria-label={'Corner text '+label.toLowerCase()} type="range" min={0} max={max} value={position(key) ?? fallback} onChange={e=>move(key,+e.target.value)}/></label>)}
    </div>
    <p>Drag the corner text on the preview, or use arrow keys when it is selected (Shift moves 10 px). Insets are measured from the selected page corner. Each page gets a slightly different hand-drawn underline.</p>
    <button className="outline-button" onClick={()=>set('cornerText','')}>Clear corner text</button>
  </section>;
}
