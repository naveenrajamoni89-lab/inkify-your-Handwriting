import React, { useMemo, useRef } from 'react';
import { PAGE, cornerTextBounds, moveCornerText, resolveItemFit } from './engine';

export default function CornerGuide({settings, activePaper, onSaveFit, setSettings}) {
  const drag = useRef(null);
  const effective = resolveItemFit(activePaper,settings);
  const bounds = useMemo(()=>cornerTextBounds(document.createElement('canvas').getContext('2d'),effective),[settings,activePaper]);
  function update(value) {
    if (activePaper) onSaveFit(value);
    else setSettings(s=>({...s,...value}));
  }
  return <button type="button" className="corner-guide" aria-label="Move corner text" title="Drag to move corner text. Arrow keys move 1 px; Shift moves 10 px."
    style={{left:bounds.x/PAGE.width*100+'%',top:bounds.y/PAGE.height*100+'%',width:bounds.width/PAGE.width*100+'%',height:bounds.height/PAGE.height*100+'%'}}
    onPointerDown={e=>{
      e.preventDefault(); e.currentTarget.focus();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = e.currentTarget.closest('.paper-shadow').querySelector('canvas').getBoundingClientRect();
      drag.current={x:e.clientX,y:e.clientY,bounds,settings:effective,scaleX:PAGE.width/rect.width,scaleY:PAGE.height/rect.height};
    }}
    onPointerMove={e=>{
      const d=drag.current; if(!d) return;
      update(moveCornerText(d.settings,d.bounds,(e.clientX-d.x)*d.scaleX,(e.clientY-d.y)*d.scaleY));
    }}
    onPointerUp={e=>{drag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
    onLostPointerCapture={()=>{drag.current=null;}}
    onKeyDown={e=>{
      const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
      if(!delta)return;
      e.preventDefault(); const step=e.shiftKey?10:1;
      update(moveCornerText(effective,bounds,delta[0]*step,delta[1]*step));
    }}><span>Move corner text</span></button>;
}
