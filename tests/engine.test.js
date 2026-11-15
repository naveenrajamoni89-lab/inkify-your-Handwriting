import test from 'node:test';
import assert from 'node:assert/strict';
import { drawCornerText, cornerTextBounds, moveCornerText, resolveItemFit, writingAreaForPage } from '../src/engine.js';
import { paperLibrary, updatePaperFit } from '../src/paper-library.js';
import {headingText,drawHeadingUnderline,drawPaperTexture,PRESETS} from '../src/engine.js';

test('reference headings underline only their label and have varied stable pen strokes',()=>{
  assert.equal(headingText('Data analysis: After collecting data',2,0),'Data analysis:');
  assert.equal(headingText('Ordinary body sentence',2,0),'');
  assert.equal(headingText('My title',0,0),'My title');
  function render(seed) {
    const calls=[];
    const ctx={save(){},restore(){},beginPath(){},moveTo:(...p)=>calls.push(['start',...p]),lineTo:(...p)=>calls.push(['lead',...p]),bezierCurveTo:(...p)=>calls.push(['curve',...p]),stroke(){}};
    drawHeadingUnderline(ctx,80,100,300,seed,'black');return calls;
  }
  assert.deepEqual(render(123),render(123));
  assert.notDeepEqual(render(123),render(124));
  for(const seed of [1,123,124,9127,10124]) {
    const calls=render(seed);
    const starts=calls.filter(c=>c[0]==='start');
    const curves=calls.filter(c=>c[0]==='curve');
    assert.ok(starts.length>4,'Underlines include several short pen movements');
    assert.equal(curves.length,starts.length);
    const joins=starts.slice(1).map((start,i)=>start[1]-curves[i][5]);
    assert.ok(joins.some(gap=>gap>0 && gap<4),'Small pen lifts break the line');
    assert.ok(joins.some(gap=>gap<0 && gap>-8),'Retraced segments overlap');
    assert.ok(new Set(starts.map(start=>start[2])).size>4,'The hand drifts vertically');
  }
  assert.deepEqual(render(123).slice(0,4).map(c=>c[0]),['start','curve','start','curve']);
});

test('heading underlines keep the body ink and remain thin and subdued at its intensity',()=>{
  for(const ink of ['#263070','#303440','#b4474e']) {
    function strokes(intensity) {
      const result=[];
      const ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},bezierCurveTo(){},stroke(){result.push({ink:this.strokeStyle,width:this.lineWidth,alpha:this.globalAlpha});}};
      drawHeadingUnderline(ctx,80,100,300,9127,ink,intensity);
      return result;
    }
    const normal=strokes(92),light=strokes(40);
    assert.ok(normal.length>4);
    normal.forEach((stroke,i)=>{
      assert.equal(stroke.ink,ink);
      assert.ok(stroke.width>=.65 && stroke.width<=.9);
      assert.ok(stroke.alpha<.92);
      assert.ok(light[i].alpha<stroke.alpha);
    });
  }
});

test('paper texture is repeatable, optional, and reference effects survive saving',()=>{
  function texture(strength,seed) {
    let count=0,signature=0;
    const ctx={save(){},restore(){},fillRect:(x,y)=>{count++;signature+=x+y;},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
    drawPaperTexture(ctx,strength,seed);return {count,signature};
  }
  assert.equal(texture(0,1).count,0);
  assert.deepEqual(texture(55,1),texture(55,1));
  assert.notDeepEqual(texture(55,1),texture(55,2));
  const restored=normalizeSettings(PRESETS.reference.settings);
  assert.equal(restored.penMarks,25);
  assert.equal(restored.textureStrength,55);
  assert.equal(restored.finish,'photo');
  assert.equal(normalizeSettings({penMarks:500,textureStrength:-20}).penMarks,100);
  assert.equal(normalizeSettings({penMarks:500,textureStrength:-20}).textureStrength,0);
});

test('corner letters vary on every page including repeated backgrounds, with stable redraws', () => {
  const settings={...defaults,cornerText:'252U1R1210',cornerUnderline:false};
  function render(page,extra={}) {
    const calls=[];
    const ctx={save(){},restore(){},measureText:text=>({width:text.length*20}),translate:(...p)=>calls.push(['position',...p]),scale:(...p)=>calls.push(['scale',...p]),rotate:p=>calls.push(['angle',p]),fillText:(...p)=>calls.push(['letter',...p,ctx.globalAlpha]),strokeText(){}};
    drawCornerText(ctx,{...settings,...extra},page);
    return calls;
  }
  const first=render(0);
  assert.deepEqual(first,render(0),'Preview and export reproduce the same lettering');
  for(let page=1;page<6;page++) assert.notDeepEqual(first,render(page));
  assert.equal(first.filter(c=>c[0]==='letter').map(c=>c[1]).join(''),settings.cornerText);
  assert.deepEqual(render(0,{cornerVariation:0}),render(1,{cornerVariation:0}));
  assert.equal(normalizeSettings({cornerVariation:150}).cornerVariation,100);
});

test('hand-drawn corner underlines vary by page and stay stable for exports', () => {
  function stroke(pageIndex, weight=400) {
    const calls=[];
    const ctx={save(){},restore(){},translate(){},scale(){},rotate(){},measureText:()=>({width:200}),fillText(){},strokeText(){},beginPath(){},moveTo:(...p)=>calls.push(p),bezierCurveTo:(...p)=>calls.push(p),stroke(){}};
    drawCornerText(ctx,{...defaults,cornerText:'252U1R1210',cornerUnderline:true,weight},pageIndex);
    return {calls,font:ctx.font};
  }
  assert.deepEqual(stroke(0),stroke(0));
  assert.notDeepEqual(stroke(0).calls,stroke(1).calls);
  assert.deepEqual(stroke(0,700),stroke(0,400),'Body font weight does not alter corner text');
  assert.equal(stroke(0).calls[1].length,6,'Underline uses a cubic pen curve');
});

test('body handwriting controls do not change the separate corner label', () => {
  function render(body) {
    const calls=[];
    const ctx={save(){},restore(){},translate(){},scale(){},rotate(){},measureText:()=>({width:200}),fillText:(...args)=>calls.push(args),strokeText(){},beginPath(){},moveTo(){},bezierCurveTo(){},stroke(){}};
    drawCornerText(ctx,{...defaults,cornerText:'252U1R1210',...body});
    return {calls,font:ctx.font,ink:ctx.fillStyle,alpha:ctx.globalAlpha};
  }
  assert.deepEqual(render({}),render({style:'journal',size:64,weight:700,ink:'red',intensity:40,thickness:1,customFont:'BodyOnlyFont'}));
  const corner=normalizeSettings({cornerStyle:'neat',cornerInk:'green',cornerIntensity:65});
  assert.equal(corner.cornerStyle,'neat');
  assert.equal(corner.cornerInk,'green');
  assert.equal(corner.cornerIntensity,65);
});

test('dragging corner text works from all anchors and stays within the page', () => {
  for(const cornerAnchor of ['top-left','top-right','bottom-left','bottom-right']) {
    const settings={...defaults,cornerText:'123',cornerAnchor};
    const ctx={measureText:()=>({width:200})};
    const bounds=cornerTextBounds(ctx,settings);
    const moved=moveCornerText(settings,bounds,20,30);
    const next=cornerTextBounds(ctx,{...settings,...moved});
    assert.equal(next.x,bounds.x+20);
    assert.equal(next.y,bounds.y+30);
    for (const [dx,dy] of [[-9999,-9999],[9999,9999]]) {
      const position=moveCornerText(settings,bounds,dx,dy);
      const restored=cornerTextBounds(ctx,normalizeSettings({...settings,...position}));
      assert.ok(restored.x>=0 && restored.x+restored.width<=PAGE.width);
      assert.ok(restored.y>=0 && restored.y+restored.height<=PAGE.height);
    }
  }
});

test('corner text survives draft restoration with safe control bounds', () => {
  const settings = normalizeSettings({cornerText:'Roll\n123',cornerSize:200,cornerThickness:2,cornerUnderline:true,cornerAnchor:'bottom-left',cornerX:140,cornerY:180});
  assert.equal(settings.cornerText,'Roll 123');
  assert.equal(settings.cornerSize,100);
  assert.equal(settings.cornerThickness,2);
  assert.equal(settings.cornerUnderline,true);
  assert.equal(settings.cornerAnchor,'bottom-left');
  assert.equal(settings.cornerX,140);
  assert.equal(settings.cornerY,180);
});

test('corner text renders plain or underlined independently from body headings', () => {
  const calls=[];
  const ctx={save(){},restore(){},translate(){},scale(){},rotate(){},measureText:()=>({width:200}),fillText:(...args)=>calls.push(['text',...args]),strokeText:(...args)=>calls.push(['thick',...args]),beginPath(){},moveTo:(...args)=>calls.push(['start',...args]),bezierCurveTo:(...args)=>calls.push(['curve',...args]),lineTo:(...args)=>calls.push(['end',...args]),stroke:()=>calls.push(['underline'])};
  const settings={...defaults,cornerText:'123',cornerVariation:0,cornerAnchor:'top-right',cornerX:90,cornerY:65,cornerThickness:2};
  drawCornerText(ctx,settings);
  assert.deepEqual(calls[0],['text','123',PAGE.width-290,65,PAGE.width-102]);
  assert.equal(calls.filter(c=>c[0]==='thick').length,1);
  assert.equal(calls.filter(c=>c[0]==='underline').length,0);
  calls.length=0;
  drawCornerText(ctx,{...settings,cornerAnchor:'bottom-left',cornerUnderline:true});
  assert.equal(calls[0][2],90);
  assert.equal(calls[0][3],PAGE.height-65-settings.cornerSize*1.3);
  assert.ok(calls.filter(c=>c[0]==='underline').length>1);
  calls.length=0;
  drawCornerText(ctx,{...settings,cornerText:''});
  assert.equal(calls.length,0);
});

test('separate paper positions follow the background when cycling or reordering', () => {
  let library=paperLibrary([{id:'a',margin:100,topMargin:100,cornerX:30},{id:'b',margin:200,topMargin:300,cornerX:180}],['a','b']);
  library=updatePaperFit(library,'a',{margin:150,cornerX:60,cornerY:80});
  const settings={...defaults,paper:'custom',paperItems:library.items};
  assert.equal(writingAreaForPage(settings,0).x,150);
  assert.equal(writingAreaForPage(settings,1).x,200);
  assert.equal(writingAreaForPage(settings,2).x,150);
  assert.equal(resolveItemFit(library.items[1],settings).cornerX,180);
  const restored=paperLibrary(JSON.parse(JSON.stringify(library.library)),['b','a']);
  assert.equal(restored.items[1].cornerX,60);
  assert.equal(restored.items[1].cornerY,80);
  assert.equal(restored.items[0].topMargin,300);
});
import { paperPlacement, writingArea, paperForPage, spacingJitter, lineHeight } from '../src/engine.js';
import { layoutText, defaults, PAGE, random, normalizeSettings, configureFont, measureText, glyphAdvance } from '../src/engine.js';
const measure = text => [...text].length * 20;

test('tight line spacing survives restoration and increases page capacity', () => {
  const tight = normalizeSettings({ ...defaults, size: 34, spacing: 20 });
  assert.equal(tight.spacing, 20);
  assert.equal(lineHeight(tight), 20, 'No font-size floor silently increases the requested spacing');
  assert.equal(normalizeSettings({ spacing: -5, size: 4 }).spacing, 12);
  assert.equal(normalizeSettings({ size: 14 }).size, 14);
  const text = Array.from({ length: 100 }, (_, i) => 'Line ' + i).join('\n');
  const compactPages = layoutText(text, tight, measure);
  const loosePages = layoutText(text, { ...tight, spacing: 52 }, measure);
  assert.ok(compactPages.length < loosePages.length);
  assert.deepEqual(compactPages.flat(), loosePages.flat(), 'Tighter pagination preserves every line');
  assert.equal(lineHeight(defaults), 64, 'Existing default spacing is unchanged');
});
test('extra spacing is bounded to 1–3 pixels and disabled with natural effects',()=>{
  const rng=random(2026),values=Array.from({length:100},()=>spacingJitter({...defaults,spacingVariation:3},rng()));
  assert.ok(values.every(value=>value>=1&&value<=3));assert.ok(new Set(values).size>90);
  assert.equal(spacingJitter({...defaults,realism:false},.7),0);
  assert.equal(spacingJitter({...defaults,spacingVariation:0},.7),0);
  const ctx={measureText:()=>({width:20})};
  assert.equal(measureText(ctx,'ab',{...defaults,tracking:0,width:1,spacingVariation:3}),49.2);
});
test('paper sequence repeats in order over ten pages and supports fewer images', () => {
  const paperImages=[{name:'one'},{name:'two'},{name:'three'}];
  assert.deepEqual(Array.from({length:10},(_,i)=>paperForPage({paperImages},i).name),['one','two','three','one','two','three','one','two','three','one']);
  assert.equal(paperForPage({paperImages:paperImages.slice(0,2)},2),paperImages[0]);
  assert.equal(paperForPage({paperImages:[paperImages[0]]},9),paperImages[0]);
  assert.equal(paperForPage({paperImages,paperMode:'single'},8),paperImages[0]);
  assert.equal(paperForPage({paperImages,paperMode:'cycle'},8),paperImages[2]);
  assert.equal(normalizeSettings({paperMode:'single'}).paperMode,'single');
  assert.equal(normalizeSettings({}).paperMode,'cycle');
});
test('cycling mixed image proportions shares a writing rectangle within every image', () => {
  const settings={...defaults,paper:'custom',paperFit:'contain',paperImages:[{width:900,height:1600},{width:1600,height:900},{width:1200,height:1400}]};
  const common=writingArea(settings);
  for(const paperImage of settings.paperImages){
    const single=writingArea({...settings,paperImages:undefined,paperImage});
    assert.ok(common.x>=single.x && common.y>=single.y);
    assert.ok(common.x+common.width<=single.x+single.width);
    assert.ok(common.y+common.height<=single.y+single.height);
  }
});
test('custom paper fits without distortion or fills with centered cropping', () => {
  const fit=paperPlacement(1000,1000,'contain');
  assert.deepEqual(fit,{x:0,y:257,width:1240,height:1240});
  const crop=paperPlacement(1000,1000,'cover');
  assert.deepEqual(crop,{x:-257,y:0,width:1754,height:1754});
  assert.deepEqual(paperPlacement(800,600,'stretch'),{x:0,y:0,width:1240,height:1754});
});
test('moving writing down reduces page capacity without losing text', () => {
  const text=Array(60).fill('Notes').join('\n');
  const pages=layoutText(text,{...defaults,topMargin:700},measure);
  assert.equal(pages.length,4);
  assert.equal(pages.flat().join('\n'),text);
});
test('custom writing stays within the displayed image for portrait and landscape backgrounds', () => {
  for(const paperFit of ['contain','cover','stretch']) for(const [width,height] of [[1600,900],[900,1600]]) {
    const settings={...defaults,paper:'custom',paperFit,paperImage:{width,height},margin:130,topMargin:100,rightMargin:100,bottomMargin:120};
    const area=writingArea(settings),p=paperPlacement(width,height,paperFit);
    assert.ok(area.x>=Math.max(0,p.x)); assert.ok(area.y>=Math.max(0,p.y));
    assert.ok(area.x+area.width<=Math.min(PAGE.width,p.x+p.width));
    assert.ok(area.y+area.height<=Math.min(PAGE.height,p.y+p.height));
    assert.ok(area.start+(area.capacity-1)*settings.spacing+settings.size*.6<=area.y+area.height);
    const text=Array(500).fill('A full page of notes.').join(' ');
    const pages=layoutText(text,settings,measure);
    assert.equal(pages.flat().join(' '),text);
    assert.ok(pages.every(page=>page.length<=area.capacity));
  }
});
test('wraps text within writable page width without losing words', () => {
  const text = Array(200).fill('a handwritten sentence').join(' ');
  const pages = layoutText(text, defaults, measure);
  assert.ok(pages.length > 1);
  assert.equal(pages.flat().join(' '), text);
  for (const page of pages) {
    assert.ok(page.length <= Math.floor((PAGE.height - 230) / defaults.spacing));
    for (const line of page) assert.ok(measure(line) <= PAGE.width - defaults.margin - 90);
  }
});
test('preserves deliberate paragraph breaks and empty content', () => {
  assert.deepEqual(layoutText('first\r\n\r\nsecond', defaults, measure), [['first', '', 'second']]);
  assert.deepEqual(layoutText('', defaults, measure), [['']]);
});
test('splits oversized words and keeps every character', () => {
  const text = 'abcdefghij'.repeat(100);
  const lines = layoutText(text, defaults, measure).flat();
  assert.equal(lines.join(''), text);
  assert.ok(lines.every(line => measure(line) <= PAGE.width - defaults.margin - 90));
});
test('variation is deterministic across previews and exports', () => {
  const a = random(2026), b = random(2026);
  assert.deepEqual(Array.from({ length: 100 }, a), Array.from({ length: 100 }, b));
});

test('custom spacing and width use the same glyph advances for layout and rendering', () => {
  const ctx = { measureText: text => ({ width: text === ' ' ? 5 : 10 }) };
  const settings = { ...defaults, realism: false, width: 1.2, tracking: 2, wordGap: 8 };
  assert.equal(glyphAdvance(ctx, 'A', settings), 14);
  assert.equal(glyphAdvance(ctx, ' ', settings), 16);
  assert.equal(measureText(ctx, 'A B', settings), 44);
  const lines = layoutText('A B '.repeat(100), settings, text => measureText(ctx, text, settings)).flat();
  assert.ok(lines.every(line => measureText(ctx, line, settings) <= PAGE.width - settings.margin - 90));
});

test('restores old drafts with defaults and clamps invalid style controls', () => {
  const old = normalizeSettings({ style: 'everyday', size: 38 });
  assert.equal(old.style, 'everyday');
  assert.equal(old.wordGap, defaults.wordGap);
  const invalid = normalizeSettings({ width: 99, weight: -5, slant: Infinity, variation: 'bad', customFont: 'missing font' });
  assert.equal(invalid.width, 1.3);
  assert.equal(invalid.weight, 400);
  assert.equal(invalid.slant, defaults.slant);
  assert.equal(invalid.variation, defaults.variation);
  assert.equal(invalid.customFont, undefined);
});

test('canvas font honors custom family and weight', () => {
  const ctx = {};
  configureFont(ctx, { ...defaults, weight: 700, customFont: 'InkifyCustom123' });
  assert.equal(ctx.font, '700 44px "InkifyCustom123"');
});
