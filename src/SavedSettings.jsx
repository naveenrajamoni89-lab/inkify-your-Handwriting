import React, { useState } from 'react';
import { normalizeSettings } from './engine';

const STORAGE = 'inkify-settings-v1';
function readPresets() {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE));
    return Array.isArray(records) ? records.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && p.settings && typeof p.settings === 'object') : [];
  } catch { return []; }
}

export default function SavedSettings({ settings, onApply, notify, disabled }) {
  const [presets, setPresets] = useState(readPresets);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  function persist(records, message) {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(records));
      setPresets(records);
      notify(message);
      return true;
    } catch { notify('Could not save settings. Browser storage may be full or unavailable.'); return false; }
  }
  function save(update = false) {
    const trimmed = name.trim();
    if (!trimmed) { notify('Enter a name for your settings.'); return; }
    const id = update ? selected : crypto.randomUUID();
    const { customFont, fontGlyphs, ...stored } = settings;
    const record = { id, name: trimmed, settings: normalizeSettings(stored) };
    const records = update ? presets.map(p => p.id === id ? record : p) : [...presets, record];
    if (persist(records, 'Settings saved as “' + trimmed + '”.')) setSelected(id);
  }
  return <section className="saved-settings" aria-label="Saved settings">
    <div className="section-label">MY SAVED SETTINGS</div>
    <label className="preset-name">Custom name<input aria-label="Settings name" maxLength={80} value={name} placeholder="e.g. Compact class notes" onChange={e => setName(e.target.value)}/></label>
    <div className="settings-actions"><button className="outline-button" disabled={disabled || !name.trim()} onClick={() => save()}>Save as new</button><button className="outline-button" disabled={disabled || !selected || !name.trim()} onClick={() => save(true)}>Update selected</button></div>
    <label className="preset-name">Saved settings<select aria-label="Saved settings" value={selected} onChange={e => { const id = e.target.value; setSelected(id); setName(presets.find(p => p.id === id)?.name || ''); }}><option value="">Choose saved settings</option>{presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <div className="settings-actions"><button className="outline-button" disabled={disabled || !selected} onClick={() => { const preset = presets.find(p => p.id === selected); if (preset) onApply(normalizeSettings(preset.settings), preset.name); }}>Apply settings</button><button className="text-button" disabled={disabled || !selected} onClick={() => { if (persist(presets.filter(p => p.id !== selected), 'Saved settings deleted.')) { setSelected(''); setName(''); } }}>Delete selected</button></div>
    <p className="control-note">Saved in this browser. Includes handwriting, spacing, ink, export quality and general paper settings. Your text and uploaded paper library stay separate; each uploaded paper keeps its own fit.</p>
  </section>;
}
