import React, { useRef } from 'react';
import { PAGE } from './engine';
import { itemFit, DEFAULT_FIT } from './paper-library';

const edges = [
  {name:'left',key:'margin',axis:'x',sign:1,min:30,max:350},
  {name:'right',key:'rightMargin',axis:'x',sign:-1,min:30,max:400},
  {name:'top',key:'topMargin',axis:'y',sign:1,min:40,max:700},
  {name:'bottom',key:'bottomMargin',axis:'y',sign:-1,min:30,max:400},
];

function detectEdge(canvas, edge) {
  const ctx = canvas.getContext('2d');
  const { width: cw, height: ch } = canvas;
  if (!cw || !ch) return null;
  const scaleX = PAGE.width / cw;
  const scaleY = PAGE.height / ch;
  const SAMPLE = 6;
  const THRESHOLD = 28;
  const CONFIRM = 3;
  function scanAxis(axis, sign) {
    const len   = axis === 'x' ? cw : ch;
    const cross = axis === 'x' ? ch : cw;
    let count = 0;
    for (let i = (sign === 1 ? 0 : len - 1); sign === 1 ? i < len : i >= 0; i += sign) {
      let edgeLike = 0;
      for (let j = Math.floor(cross * 0.2); j < cross * 0.8; j += SAMPLE) {
        const [x0, y0] = axis === 'x' ? [i, j] : [j, i];
        const [x1, y1] = axis === 'x' ? [i + sign, j] : [j, i + sign];
        if (x1 < 0 || x1 >= cw || y1 < 0 || y1 >= ch) continue;
        const d0 = ctx.getImageData(x0, y0, 1, 1).data;
        const d1 = ctx.getImageData(x1, y1, 1, 1).data;
        const b0 = (d0[0] + d0[1] + d0[2]) / 3;
        const b1 = (d1[0] + d1[1] + d1[2]) / 3;
        if (Math.abs(b1 - b0) > THRESHOLD) edgeLike++;
      }
      if (edgeLike >= 2) { count++; if (count >= CONFIRM) return i; }
      else count = 0;
    }
    return null;
  }
  const px = scanAxis(edge.axis, edge.sign);
  if (px === null) return null;
  const margin = edge.axis === 'x'
    ? (edge.sign === 1 ? px * scaleX : (cw - px) * scaleX)
    : (edge.sign === 1 ? px * scaleY : (ch - px) * scaleY);
  return Math.round(Math.max(edge.min, Math.min(edge.max, margin)));
}

export default function WritingGuide({ area, settings, setSettings, activePaper, onSaveFit }) {
  const drag = useRef(null);

  // Effective fit values: per-paper overrides global
  const fit = activePaper ? itemFit(activePaper) : {
    paperFit: settings.paperFit ?? DEFAULT_FIT.paperFit,
    margin: settings.margin,
    topMargin: settings.topMargin ?? DEFAULT_FIT.topMargin,
    rightMargin: settings.rightMargin ?? DEFAULT_FIT.rightMargin,
    bottomMargin: settings.bottomMargin ?? DEFAULT_FIT.bottomMargin,
  };

  function updateFit(key, value) {
    const edge = edges.find(e => e.key === key);
    const clamped = Math.round(Math.max(edge.min, Math.min(edge.max, value)));
    const newFit = { ...fit, [key]: clamped };
    // Update global settings for live preview
    setSettings(s => ({ ...s, [key]: clamped }));
    // Save to paper item
    onSaveFit?.({ [key]: clamped });
  }

  function autoAdjust() {
    const canvas = document.querySelector('.paper-shadow canvas');
    if (!canvas) return;
    const updates = {};
    for (const edge of edges) {
      const v = detectEdge(canvas, edge);
      if (v !== null) updates[edge.key] = v;
    }
    if (!Object.keys(updates).length) return;
    setSettings(s => ({ ...s, ...updates }));
    onSaveFit?.(updates);
  }

  return (
    <div className="writing-guide" style={{
      left: area.x / PAGE.width * 100 + '%',
      top: area.y / PAGE.height * 100 + '%',
      width: area.width / PAGE.width * 100 + '%',
      height: area.height / PAGE.height * 100 + '%',
    }}>
      <span>
        Drag edges to adjust · preview only
        <button type="button" className="auto-detect-btn" title="Auto-detect paper edges from the image" onClick={autoAdjust}>Auto-adjust edges</button>
      </span>
      {edges.map(edge => (
        <button
          key={edge.name}
          type="button"
          className={'edge-handle edge-' + edge.name}
          aria-label={'Adjust ' + edge.name + ' writing edge'}
          title={'Drag the ' + edge.name + ' edge. Arrow keys move 1 px; Shift moves 10 px.'}
          onPointerDown={e => {
            e.preventDefault();
            e.currentTarget.focus();
            e.currentTarget.setPointerCapture(e.pointerId);
            const rect = e.currentTarget.closest('.paper-shadow').querySelector('canvas').getBoundingClientRect();
            drag.current = {
              edge,
              start: edge.axis === 'x' ? e.clientX : e.clientY,
              value: fit[edge.key] ?? 100,
              scale: edge.axis === 'x' ? PAGE.width / rect.width : PAGE.height / rect.height,
            };
          }}
          onPointerMove={e => {
            const d = drag.current;
            if (!d || d.edge !== edge) return;
            const delta = (edge.axis === 'x' ? e.clientX : e.clientY) - d.start;
            const raw = d.value + delta * d.scale * edge.sign;
            const clamped = Math.round(Math.max(edge.min, Math.min(edge.max, raw)));
            d.latestValue = clamped;
            setSettings(s => ({ ...s, [edge.key]: clamped }));
          }}
          onPointerUp={e => {
            if (drag.current && drag.current.latestValue !== undefined) {
              onSaveFit?.({ [drag.current.edge.key]: drag.current.latestValue });
            }
            drag.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onLostPointerCapture={() => { drag.current = null; }}
          onKeyDown={e => {
            const direction = edge.axis === 'x'
              ? { ArrowLeft: -1, ArrowRight: 1 }
              : { ArrowUp: -1, ArrowDown: 1 };
            if (direction[e.key]) {
              e.preventDefault();
              updateFit(edge.key, (fit[edge.key] ?? 100) + direction[e.key] * edge.sign * (e.shiftKey ? 10 : 1));
            }
          }}
        />
      ))}
    </div>
  );
}
