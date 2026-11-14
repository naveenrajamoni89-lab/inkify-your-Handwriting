export const PAGE = { width: 1240, height: 1754 };
export const STYLES = {
  research: { name: 'Research notes', font: 'Indie Flower', scale: 1 },
  everyday: { name: 'Everyday', font: 'Caveat', scale: 1.12 },
  neat: { name: 'Neat & tidy', font: 'Patrick Hand', scale: 0.95 },
  journal: { name: 'Journal', font: 'Kalam', scale: 0.88 },
};
export const INKS = { pen: '#263070', blue: '#24529b', black: '#303440', red: '#b4474e', green: '#397563' };
export const defaults = { style: 'research', ink: 'black', paper: 'plain', size: 44, spacing: 64, margin: 85, realism: true, weight: 400, slant: -3, width: 1.06, tracking: 1, wordGap: 9, variation: 60, rotation: 3, baseline: 3, intensity: 92, thickness: 0.2, consistency: 70, finish: 'white', headings: false, connected: false, exportScale: 2 };
export const PRESETS = {
  neat: { name: 'Neat Student Handwriting', settings: { ...defaults, style:'neat', variation:20, rotation:1, baseline:1, consistency:90, wordGap:5 } },
  college: { name:'Natural College Notes', settings:{ ...defaults, headings:true, variation:60 } },
  quick: { name:'Quick Classroom Notes', settings:{ ...defaults, style:'everyday', variation:85, rotation:4, baseline:5, consistency:45, wordGap:6, slant:-6 } },
};
defaults.paperFit = 'contain';
defaults.topMargin = 155;
defaults.rightMargin = 90;
defaults.bottomMargin = 100;
defaults.showWritingArea = true;
defaults.paperMode = 'cycle';
defaults.spacingVariation = 3;
Object.assign(defaults, { cornerText: '', cornerSize: 40, cornerThickness: .3, cornerUnderline: false, cornerAnchor: 'top-right', cornerX: 90, cornerY: 65 });
Object.assign(defaults, {cornerStyle:'research',cornerInk:'pen',cornerIntensity:92,cornerVariation:65});
// Presets predate paper controls; keep their default layout compatible.
for (const preset of Object.values(PRESETS)) Object.assign(preset.settings, { paperFit: 'contain', topMargin: 155 });

export function normalizeSettings(value = {}) {
  const result = { ...defaults };
  if (STYLES[value.cornerStyle]) result.cornerStyle = value.cornerStyle;
  if (INKS[value.cornerInk]) result.cornerInk = value.cornerInk;
  if (Number.isFinite(value.cornerVariation)) result.cornerVariation = Math.max(0,Math.min(100,value.cornerVariation));
  if (Number.isFinite(value.cornerIntensity)) result.cornerIntensity = Math.max(40,Math.min(100,value.cornerIntensity));
  if (typeof value.cornerText === 'string') result.cornerText = value.cornerText.replace(/[\r\n]+/g, ' ').slice(0,120);
  if (typeof value.cornerUnderline === 'boolean') result.cornerUnderline = value.cornerUnderline;
  if (['top-left','top-right','bottom-left','bottom-right'].includes(value.cornerAnchor)) result.cornerAnchor = value.cornerAnchor;
  for (const [key,min,max] of [['cornerSize',12,100],['cornerThickness',0,4],['cornerX',0,1228],['cornerY',0,1748]]) {
    if (Number.isFinite(value[key])) result[key] = Math.max(min, Math.min(max,value[key]));
  }
  for (const [key, min, max] of [['size', 12, 64], ['spacing', 12, 100], ['margin', 30, 350], ['weight', 400, 700], ['slant', -15, 15], ['width', 0.8, 1.3], ['tracking', 0, 6], ['wordGap', 0, 24], ['variation', 0, 100], ['rotation',0,6], ['baseline',0,6], ['intensity',40,100], ['thickness',0,1], ['consistency',0,100], ['exportScale',1,2], ['spacingVariation',0,3]]) {
    const number = Number(value[key]);
    if (value[key] !== undefined && Number.isFinite(number)) result[key] = Math.max(min, Math.min(max, number));
  }
  if (STYLES[value.style]) result.style = value.style;
  if(['contain','cover','stretch'].includes(value.paperFit)) result.paperFit=value.paperFit;
  if(Number.isFinite(value.topMargin)) result.topMargin=Math.min(700,Math.max(40,value.topMargin));
  for (const key of ['rightMargin','bottomMargin']) if(Number.isFinite(value[key])) result[key]=Math.min(400,Math.max(30,value[key]));
  if(typeof value.showWritingArea==='boolean') result.showWritingArea=value.showWritingArea;
  if(['cycle','single'].includes(value.paperMode)) result.paperMode=value.paperMode;
  if (INKS[value.ink]) result.ink = value.ink;
  if (['plain', 'ruled', 'graph', 'custom'].includes(value.paper)) result.paper = value.paper;
  if (typeof value.realism === 'boolean') result.realism = value.realism;
  for(const key of ['headings','connected']) if(typeof value[key] === 'boolean') result[key]=value[key];
  if(['white','paper','photo'].includes(value.finish)) result.finish=value.finish;
  if(typeof value.fontId === 'string') result.fontId=value.fontId;
  if(result.paper==='custom' && value.paperLayoutVersion!==2) {
    Object.assign(result,{paperFit:'stretch',margin:130,topMargin:100,rightMargin:90,bottomMargin:100});
  }
  result.paperLayoutVersion=2;
  return result;
}
export const sample = `The art of slowing down\n\nSome of the best ideas begin with a blank page.\nA little space to think, a moment to pause,\nand a few words that are entirely your own.\n\nIn a world that moves so quickly, there is\nsomething lovely about handwritten notes.\nThey remind us to pay attention to the little\nthings — the shape of a letter, the flow of an\nidea, the feeling of putting pen to paper.\n\nMake room for what matters.\nKeep learning. Stay curious.\nAnd always, make it your own.`;

export function random(seed) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

// Layout uses the same measured glyph advances as rendering, so preview and exports match.
export const lineHeight = settings => Math.max(12, settings.spacing);
export const paperIndex = (settings, pageIndex, count) => count ? (settings.paperMode==='single'?0:pageIndex%count) : 0;
export function paperForPage(settings, pageIndex=0) {
  const images=settings.paperImages?.filter(Boolean);
  return images?.length ? images[paperIndex(settings,pageIndex,images.length)] : settings.paperImage;
}

/** Resolve effective fit settings for a single paper item (per-paper overrides global). */
export function resolveItemFit(item, settings) {
  if (!item) return settings;
  return {
    ...settings,
    cornerAnchor: item.cornerAnchor ?? settings.cornerAnchor,
    cornerX: item.cornerX ?? settings.cornerX,
    cornerY: item.cornerY ?? settings.cornerY,
    paperFit:    item.paperFit    ?? settings.paperFit    ?? 'stretch',
    margin:      item.margin      ?? settings.margin      ?? 130,
    topMargin:   item.topMargin   ?? settings.topMargin   ?? 100,
    rightMargin: item.rightMargin ?? settings.rightMargin ?? 90,
    bottomMargin:item.bottomMargin?? settings.bottomMargin?? 100,
  };
}

export function writingAreaForPage(settings, pageIndex = 0) {
  if (settings.paper !== 'custom') {
    return {
      x: settings.margin,
      y: settings.topMargin ?? 155,
      width: PAGE.width - settings.margin - 90,
      height: PAGE.height - (settings.topMargin ?? 155) - 75,
      start: settings.topMargin ?? 155,
      capacity: Math.max(1, Math.floor((PAGE.height - (settings.topMargin ?? 155) - 75) / lineHeight(settings)))
    };
  }

  const items = settings.paperItems || [];
  const activeItem = items.length ? items[paperIndex(settings, pageIndex, items.length)] : null;
  const image = paperForPage(settings, pageIndex);
  const resolved = resolveItemFit(activeItem, settings);

  const placement = image ? paperPlacement(image.width, image.height, resolved.paperFit) : { x: 0, y: 0, width: PAGE.width, height: PAGE.height };
  const x = Math.max(0, placement.x), y = Math.max(0, placement.y);
  const width = Math.min(PAGE.width, placement.x + placement.width) - x;
  const height = Math.min(PAGE.height, placement.y + placement.height) - y;

  const left = Math.min(resolved.margin ?? 130, width * 0.45);
  const right = Math.min(resolved.rightMargin ?? 90, width * 0.45);
  const top = Math.min(resolved.topMargin ?? 100, height * 0.45);
  const bottom = Math.min(resolved.bottomMargin ?? 100, height * 0.45);

  const innerWidth = Math.max(100, width - left - right);
  const innerHeight = Math.max(100, height - top - bottom);
  const start = y + top + settings.size * 1.2 + 12;
  const capacity = Math.max(1, Math.floor((y + height - bottom - settings.size * 0.6 - 12 - start) / lineHeight(settings)) + 1);

  return {
    x: x + left,
    y: y + top,
    width: innerWidth,
    height: innerHeight,
    start,
    capacity
  };
}

export function writingArea(settings, pageIndex) {
  if (pageIndex !== undefined) {
    return writingAreaForPage(settings, pageIndex);
  }
  if (settings.paper === 'custom' && settings.paperImages?.length) {
    const items = settings.paperMode === 'single'
      ? settings.paperItems?.slice(0, 1) ?? []
      : settings.paperItems ?? [];
    const images = settings.paperMode === 'single'
      ? settings.paperImages.slice(0, 1)
      : settings.paperImages;
    const areas = images.map((paperImage, i) => {
      const item = items[i];
      const resolved = resolveItemFit(item, settings);
      return writingAreaForPage({ ...resolved, paperItems: undefined, paperImages: undefined, paperImage }, 0);
    });
    const x = Math.max(...areas.map(a => a.x)), y = Math.max(...areas.map(a => a.y));
    const width = Math.min(...areas.map(a => a.x + a.width)) - x, height = Math.min(...areas.map(a => a.y + a.height)) - y;
    const start = y + settings.size * 1.2 + 12;
    return { x, y, width, height, start, capacity: Math.max(1, Math.floor((y + height - settings.size * 0.6 - 12 - start) / lineHeight(settings)) + 1) };
  }
  return writingAreaForPage(settings, 0);
}

export function layoutText(text, settings, measure) {
  const pages = [];
  let currentPageIndex = 0;
  let currentArea = writingAreaForPage(settings, currentPageIndex);
  let currentWidth = currentArea.width - (settings.paper === 'custom' ? settings.size * 0.8 + 24 : 0);
  let currentCapacity = currentArea.capacity;
  let currentLines = [];

  const paragraphs = text.replace(/\r\n?/g, '\n').split('\n');

  for (let p = 0; p < paragraphs.length; p++) {
    const paragraph = paragraphs[p];
    const words = paragraph.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      if (currentLines.length >= currentCapacity) {
        pages.push(currentLines);
        currentPageIndex++;
        currentArea = writingAreaForPage(settings, currentPageIndex);
        currentWidth = currentArea.width - (settings.paper === 'custom' ? settings.size * 0.8 + 24 : 0);
        currentCapacity = currentArea.capacity;
        currentLines = [];
      }
      currentLines.push('');
      continue;
    }

    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= currentWidth) {
        line = candidate;
      } else {
        if (line) {
          currentLines.push(line);
          if (currentLines.length >= currentCapacity) {
            pages.push(currentLines);
            currentPageIndex++;
            currentArea = writingAreaForPage(settings, currentPageIndex);
            currentWidth = currentArea.width - (settings.paper === 'custom' ? settings.size * 0.8 + 24 : 0);
            currentCapacity = currentArea.capacity;
            currentLines = [];
          }
          line = '';
        }
        if (measure(word) <= currentWidth) {
          line = word;
        } else {
          for (const char of word) {
            if (line && measure(line + char) > currentWidth) {
              currentLines.push(line);
              if (currentLines.length >= currentCapacity) {
                pages.push(currentLines);
                currentPageIndex++;
                currentArea = writingAreaForPage(settings, currentPageIndex);
                currentWidth = currentArea.width - (settings.paper === 'custom' ? settings.size * 0.8 + 24 : 0);
                currentCapacity = currentArea.capacity;
                currentLines = [];
              }
              line = '';
            }
            line += char;
          }
        }
      }
    }
    if (line) {
      currentLines.push(line);
      if (currentLines.length >= currentCapacity && (p < paragraphs.length - 1)) {
        pages.push(currentLines);
        currentPageIndex++;
        currentArea = writingAreaForPage(settings, currentPageIndex);
        currentWidth = currentArea.width - (settings.paper === 'custom' ? settings.size * 0.8 + 24 : 0);
        currentCapacity = currentArea.capacity;
        currentLines = [];
      }
    }
  }

  if (currentLines.length > 0) {
    pages.push(currentLines);
  }

  return pages.length ? pages : [['']];
}

export function configureFont(ctx, settings) {
  ctx.font = `${settings.weight ?? 400} ${settings.size * STYLES[settings.style].scale}px "${settings.customFont || STYLES[settings.style].font}"`;
}

export function glyphAdvance(ctx, char, settings) {
  let width=ctx.measureText(char).width;
  const source=settings.fontGlyphs;
  if(source && !settings.connected) {
    const id=source.font.charToGlyphIndex(char), choices=source.alternates.get(id);
    if(choices) width=Math.max(width,...[id,...choices].map(i=>source.font.glyphs.get(i).advanceWidth/source.font.unitsPerEm*settings.size*STYLES[settings.style].scale));
  }
  return width * (settings.width ?? 1) + (settings.tracking ?? 0) + (char === ' ' ? settings.wordGap ?? 0 : 0);
}

export function measureText(ctx, text, settings) {
  const units = settings.connected ? text.match(/\S+|\s/g) || [] : [...text];
  return units.reduce((sum, char) => sum + glyphAdvance(ctx, char, settings) * (settings.realism ? 1.08 : 1) + (settings.realism ? settings.spacingVariation??3 : 0), 0);
}
export function spacingJitter(settings, randomValue) {
  return settings.realism ? (settings.spacingVariation??3)*(1+2*randomValue)/3 : 0;
}

export function paperPlacement(width, height, fit = 'contain') {
  if(fit==='stretch') return {x:0,y:0,width:PAGE.width,height:PAGE.height};
  const scale=(fit==='cover'?Math.max:Math.min)(PAGE.width/width,PAGE.height/height);
  return {x:(PAGE.width-width*scale)/2,y:(PAGE.height-height*scale)/2,width:width*scale,height:height*scale};
}
export function cornerTextBounds(ctx, settings) {
  const size = settings.cornerSize ?? 40;
  configureFont(ctx, {style:settings.cornerStyle ?? 'research',size,weight:400});
  const right = (settings.cornerAnchor ?? 'top-right').endsWith('right');
  const bottom = (settings.cornerAnchor ?? 'top-right').startsWith('bottom');
  const insetX = settings.cornerX ?? 90, insetY = settings.cornerY ?? 65;
  const available = Math.max(1, PAGE.width-insetX-12);
  const width = Math.min(ctx.measureText(settings.cornerText || '').width,available);
  const x = right ? PAGE.width-insetX-width : insetX;
  const y = bottom ? PAGE.height-insetY-size*1.3 : insetY;
  return {x:Math.max(0,x),y:Math.max(0,Math.min(PAGE.height-size*1.3-6,y)),width,height:size*1.3,size,available,right,bottom};
}

export function moveCornerText(settings, bounds, dx, dy) {
  const x = Math.max(0,Math.min(PAGE.width-bounds.width-12,bounds.x+dx));
  const y = Math.max(0,Math.min(PAGE.height-bounds.height-6,bounds.y+dy));
  return {
    cornerX: Math.round(bounds.right ? PAGE.width-x-bounds.width : x),
    cornerY: Math.round(bounds.bottom ? PAGE.height-y-bounds.height : y),
  };
}

export function drawCornerText(ctx, settings, pageIndex = 0) {
  if (!settings.cornerText?.trim()) return;
  ctx.save();
  const {x,y,width,size,available} = cornerTextBounds(ctx,settings);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = ctx.strokeStyle = INKS[settings.cornerInk ?? 'pen'];
  ctx.globalAlpha = (settings.cornerIntensity ?? 92)/100;
  const amount = (settings.cornerVariation ?? 65)/100;
  if (amount) {
    const rand = random(19237 + pageIndex*7919);
    const chars = [...settings.cornerText];
    const advances = chars.map(char=>ctx.measureText(char).width*(1+(rand()-.5)*amount*.12));
    const total = advances.reduce((sum,value)=>sum+value,0);
    const padding = Math.min(size*.08,width*.08);
    const fit = Math.max(0,width-padding*2)/Math.max(1,total);
    let cursor = 0;
    const slope = (rand()-.5)*amount*.012;
    ctx.save(); ctx.translate(x+padding,y+size*.06); ctx.scale(fit,1);
    chars.forEach((char,index)=>{
      ctx.save();
      ctx.translate(cursor,(rand()-.5)*amount*size*.07+cursor*fit*slope);
      ctx.rotate((rand()-.5)*amount*.09);
      ctx.scale(1,1-rand()*amount*.09);
      ctx.globalAlpha = (settings.cornerIntensity ?? 92)/100*(1-rand()*amount*.18);
      ctx.fillText(char,0,0);
      if(settings.cornerThickness) {
        ctx.lineWidth=settings.cornerThickness*(1-rand()*amount*.25);
        ctx.strokeText(char,0,0);
      }
      ctx.restore();
      cursor+=advances[index];
    });
    ctx.restore();
  } else {
    ctx.fillText(settings.cornerText,x,y,available);
    if (settings.cornerThickness) {
      ctx.lineWidth = settings.cornerThickness;
      ctx.strokeText(settings.cornerText,x,y,available);
    }
  }
  if (settings.cornerUnderline) {
    ctx.lineWidth = Math.max(1.2,settings.cornerThickness ?? 0);
    // A stable seed gives every page its own pen stroke and keeps exports identical.
    const rand = random(7351 + pageIndex * 997);
    const baseline = y + size*1.18;
    const start = baseline + (rand()-.5)*3;
    const end = baseline + (rand()-.5)*4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x,start);
    ctx.bezierCurveTo(x+width*.32, baseline+2+rand()*3, x+width*.72, baseline-1-rand()*3, x+width,end);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderPage(canvas, lines, settings, pageIndex = 0, resolution = 1) {
  // Apply per-paper fit for the active page's paper item
  const activeItem = settings.paper === 'custom' ? settings.paperItems?.[paperIndex(settings, pageIndex, settings.paperItems?.length || 0)] : null;
  settings = { ...settings, paperImage: paperForPage(settings, pageIndex), ...resolveItemFit(activeItem, settings) };
  canvas.width = PAGE.width * resolution;
  canvas.height = PAGE.height * resolution;
  const ctx = canvas.getContext('2d');
  ctx.scale(resolution, resolution);
  const rand = random(2026 + pageIndex * 997);
  // Keep paper pure white: variation affects ink only, never the background.
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, PAGE.width, PAGE.height);
  if(settings.paper === 'custom' && settings.paperImage) {
    const p=paperPlacement(settings.paperImage.width,settings.paperImage.height,settings.paperFit);
    ctx.drawImage(settings.paperImage,p.x,p.y,p.width,p.height);
  } else if(settings.paper !== 'custom' && settings.finish && settings.finish !== 'white') {
    ctx.fillStyle='#f7f6ef'; ctx.fillRect(0,0,PAGE.width,PAGE.height);
    for(let i=0;i<22000;i++){ctx.fillStyle=`rgba(70,60,40,${rand()*0.045})`;ctx.fillRect(rand()*PAGE.width,rand()*PAGE.height,1,1);}
    if(settings.finish === 'photo') {
      const light=ctx.createLinearGradient(0,0,PAGE.width,PAGE.height);light.addColorStop(0,'rgba(255,255,255,0.25)');light.addColorStop(.55,'rgba(255,255,255,0)');light.addColorStop(1,'rgba(40,42,50,0.12)');ctx.fillStyle=light;ctx.fillRect(0,0,PAGE.width,PAGE.height);
    }
  }
  // Auto edge fade: soft vignette on all 4 edges for a natural paper-scan look.
  const edgeW=38,edgeH=50;
  const edgeL=ctx.createLinearGradient(0,0,edgeW,0);edgeL.addColorStop(0,'rgba(30,35,40,.10)');edgeL.addColorStop(1,'rgba(30,35,40,0)');ctx.fillStyle=edgeL;ctx.fillRect(0,0,edgeW,PAGE.height);
  const edgeR=ctx.createLinearGradient(PAGE.width,0,PAGE.width-edgeW,0);edgeR.addColorStop(0,'rgba(30,35,40,.08)');edgeR.addColorStop(1,'rgba(30,35,40,0)');ctx.fillStyle=edgeR;ctx.fillRect(PAGE.width-edgeW,0,edgeW,PAGE.height);
  const edgeT=ctx.createLinearGradient(0,0,0,edgeH);edgeT.addColorStop(0,'rgba(30,35,40,.07)');edgeT.addColorStop(1,'rgba(30,35,40,0)');ctx.fillStyle=edgeT;ctx.fillRect(0,0,PAGE.width,edgeH);
  const edgeB=ctx.createLinearGradient(0,PAGE.height,0,PAGE.height-edgeH);edgeB.addColorStop(0,'rgba(30,35,40,.07)');edgeB.addColorStop(1,'rgba(30,35,40,0)');ctx.fillStyle=edgeB;ctx.fillRect(0,PAGE.height-edgeH,PAGE.width,edgeH);

  const area = writingAreaForPage(settings, pageIndex);
  const start = area.start;
  const left = settings.paper==='custom'?area.x+settings.size*.4+12:settings.margin;
  const leading = lineHeight(settings);
  if (settings.paper === 'ruled' || settings.paper === 'graph') {
    ctx.strokeStyle = settings.paper === 'graph' ? '#d9e5e7' : '#cddde9'; ctx.lineWidth = 1.2;
    const step = settings.paper === 'graph' ? 40 : leading;
    for (let y = start + 13; y < PAGE.height - 65; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PAGE.width, y); ctx.stroke();
    }
    if (settings.paper === 'graph') for (let x = 40; x < PAGE.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 90); ctx.lineTo(x, PAGE.height - 65); ctx.stroke();
    }
    if (settings.paper === 'ruled') {
      ctx.strokeStyle = '#e8b5b3'; ctx.beginPath(); ctx.moveTo(settings.margin - 28, 0); ctx.lineTo(settings.margin - 28, PAGE.height); ctx.stroke();
    }
  }
  configureFont(ctx, settings);
  ctx.save();
  if(settings.paper==='custom') {ctx.beginPath();ctx.rect(area.x,area.y,area.width,area.height);ctx.clip();}
  ctx.fillStyle = INKS[settings.ink];
  const amount = settings.realism ? (settings.variation ?? 60) / 100 : 0;
  const skew = Math.tan((settings.slant ?? 0) * Math.PI / 180);
  // Pre-compute a unique per-line vertical nudge (1–3 px) so each line sits at a
  // slightly different height — no two lines share the same gap, like real handwriting.
  const lineNudges = lines.map(() => (rand() * 2 + 1) * (rand() < 0.5 ? 1 : -1));
  lines.forEach((line, row) => {
    let x = left + (rand() - 0.5) * amount * 8;
    const drift = (rand() - 0.5) * amount * 5;
    const slope = (rand() - 0.5) * amount * 0.008;
    let phase = rand() * Math.PI * 2;
    // Per-line nudge: 1–3 px jitter independent of the existing realism baseline variation.
    const lineY = start + row * leading + lineNudges[row] + drift;
    const units = settings.connected ? line.match(/\S+|\s/g) || [] : [...line];
    for (const char of units) {
      if (char === ' ') phase += 1.1;
      const scale = 1 - rand() * amount * 0.12;
      const baseline = Math.sin(phase + x / 100) * amount * (settings.baseline ?? 3) + (rand() - 0.5) * amount * 2;
      ctx.save();
      ctx.translate(x, lineY + baseline + (x - left) * slope);
      ctx.rotate((rand() - 0.5) * amount * (settings.rotation ?? 3) * Math.PI / 90);
      ctx.transform((settings.width ?? 1) * (1-rand()*amount*.08), 0, skew, scale, 0, 0);
      ctx.globalAlpha = (settings.intensity ?? 92)/100 * (1 - rand() * amount * 0.16);
      const source=settings.fontGlyphs;
      const glyphId=source && !settings.connected ? source.font.charToGlyphIndex(char) : null;
      const alternatives=source?.alternates.get(glyphId);
      if(alternatives?.length && amount) {
        const choices=[glyphId,...alternatives], id=choices[Math.floor(rand()*choices.length)];
        const path=source.font.glyphs.get(id).getPath(0,0,settings.size*STYLES[settings.style].scale);
        path.fill=INKS[settings.ink];path.stroke=settings.thickness?INKS[settings.ink]:null;path.strokeWidth=settings.thickness||0;path.draw(ctx);
      } else {
        ctx.fillText(char, 0, 0);
        if(settings.thickness) {ctx.strokeStyle=INKS[settings.ink];ctx.lineWidth=settings.thickness*(1-rand()*amount*.35);ctx.strokeText(char,0,0);}
      }
      ctx.restore();
      // Bounded positive spacing variation stays inside the layout's conservative width.
      x += glyphAdvance(ctx, char, settings) * (1 + rand() * amount * (1-(settings.consistency ?? 70)/100) * .08) + spacingJitter(settings,rand());
    }
    if(settings.headings && line.length && (line.endsWith(':') || (row===0 && pageIndex===0))) {
      ctx.save();ctx.strokeStyle=INKS[settings.ink];ctx.lineWidth=1.2;ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(left,lineY+9);ctx.quadraticCurveTo((left+x)/2,lineY+12,x,lineY+8);ctx.stroke();ctx.restore();
    }
  });
  ctx.restore();
  drawCornerText(ctx, settings, pageIndex);
  if(settings.paper!=='custom') {
    ctx.font = '18px sans-serif'; ctx.fillStyle = '#a9aaa7'; ctx.textAlign = 'center';
    ctx.fillText(String(pageIndex + 1), PAGE.width / 2, PAGE.height - 38);
  }
}
