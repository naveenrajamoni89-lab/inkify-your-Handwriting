import { inflateSync } from 'node:zlib';
// Optional real-browser smoke check. Run after `npm run dev`.
// BROWSER_PATH must point to a Chromium executable; no browser is downloaded.
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const executable = process.env.BROWSER_PATH;
if (!executable) throw new Error('Set BROWSER_PATH to your Chrome/Chromium executable.');
const origin = process.env.APP_URL || 'http://127.0.0.1:5173';
const artifacts = path.resolve('.browser-check', 'run-' + Date.now());
await mkdir(artifacts, { recursive: true });
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=9223', `--user-data-dir=${path.join(artifacts, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const pause = ms => new Promise(r => setTimeout(r, ms));
let socket;
try {
  let targets;
  for (let i = 0; i < 50; i++) {
    try { targets = await (await fetch('http://127.0.0.1:9223/json/list')).json(); break; } catch { await pause(200); }
  }
  assert.ok(targets?.length, 'Chromium starts');
  socket = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0;
  const pending = new Map();
  const errors = [];
  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.text);
    if (data.id && pending.has(data.id)) { const { resolve, reject } = pending.get(data.id); pending.delete(data.id); data.error ? reject(data.error) : resolve(data.result); }
  };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const until = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); } throw new Error(`Timed out: ${expression}`); };
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: artifacts });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await cdp('Page.navigate', { url: origin });
  await until(`document.querySelector('.primary-button') && !document.querySelector('.primary-button').disabled`);
  await evaluate(`localStorage.clear()`);
  await cdp('Page.reload');
  await pause(500);
  await until(`document.querySelector('textarea')?.value.startsWith('The art of slowing down') && !document.querySelector('.primary-button').disabled`);
  assert.equal(await evaluate(`document.querySelector('canvas').width`), 1240);
  await evaluate(`document.fonts.ready`);
  const desktop = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path.join(artifacts, 'desktop.png'), Buffer.from(desktop.data, 'base64'));
  assert.deepEqual(await evaluate(`Array.from(document.querySelector('canvas').getContext('2d').getImageData(10,10,1,1).data)`), [255, 255, 255, 255], 'Blank paper is pure white');
  await evaluate(`document.querySelectorAll('.tabs button')[1].click()`);
  await until(`!!document.querySelector('[aria-label="Letter slant"]')`);
  const before = await evaluate(`document.querySelector('canvas').toDataURL()`);
  await evaluate(`(() => { const input = document.querySelector('[aria-label="Letter slant"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '12'); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  await pause(200);
  assert.notEqual(await evaluate(`document.querySelector('canvas').toDataURL()`), before, 'Slant control changes rendered output');
  await evaluate(`document.querySelector('.intro button').click()`);
  await until(`!!document.querySelector('[aria-label="Upload custom font"]')`);
  const { root } = await cdp('DOM.getDocument');
  const { nodeId } = await cdp('DOM.querySelector', { nodeId: root.nodeId, selector: '[aria-label="Upload custom font"]' });
  await cdp('DOM.setFileInputFiles', { nodeId, files: [path.resolve('node_modules/@fontsource/indie-flower/files/indie-flower-latin-400-normal.woff2')] });
  await until(`!!document.querySelector('.font-specimen')`);
  await evaluate(`(()=>{const input=document.querySelector('[aria-label="Custom font name"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'My saved handwriting');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate(`document.querySelector('.font-name button').click()`);
  await until(`document.querySelector('.custom-font-card small')?.innerText==='My saved handwriting'`);
  await evaluate(`document.querySelector('[aria-label="Close font manager"]').click()`);
  await evaluate(`document.querySelector('.custom-font-card').click()`);
  await pause(200);
  assert.equal(await evaluate(`document.querySelectorAll('.style-card.selected').length`), 1, 'Uploaded font is selectable directly in Handwriting Style');
  await pause(800);
  await cdp('Page.reload'); await pause(600);
  await until(`document.querySelector('.primary-button') && !document.querySelector('.primary-button').disabled`);
  assert.equal(await evaluate(`document.querySelectorAll('.style-card.selected').length`),1,'Saved font style selection restored after refresh');
  assert.equal(await evaluate(`document.querySelectorAll('.custom-font-card').length`),1,'Saved font card restores without opening the manager');
  assert.equal(await evaluate(`document.querySelector('.custom-font-card small').innerText`),'My saved handwriting','Custom font name persists');
  await evaluate(`document.querySelectorAll('.style-card')[0].click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.custom-font-card').length`),1,'Switching to a built-in style keeps the custom font');
  await evaluate(`document.querySelector('.custom-font-card').click();document.querySelector('.intro button').click()`);
  await until(`!!document.querySelector('.font-library button')`);
  await evaluate(`document.querySelector('.font-library button').click()`);
  await evaluate(`Array.from(document.querySelectorAll('.manager-actions button')).find(b=>b.textContent==='Delete font').click()`);
  await until(`document.querySelectorAll('.custom-font-card').length===0`);
  await evaluate(`document.querySelector('[aria-label="Close font manager"]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.style-card.selected').length`),1,'Deleting the active font restores the built-in style');
  const extraction = await evaluate(`(async()=>{const t=await import('/src/template.js');const canvas=t.makeTemplate();const c=canvas.getContext('2d');c.fillStyle='#000';c.font='40px sans-serif';c.fillText('!',120,255);const blob=await new Promise(r=>canvas.toBlob(r));const cells=await t.extractTemplate(blob);const data=t.buildFont(cells,'Test writing');const font=await new FontFace('ExtractedTest',data).load();document.fonts.add(font);return {count:cells.filter(c=>c.include).length,bytes:data.byteLength};})()`);
  assert.equal(extraction.count,1,'Template excludes printed labels and detects written ink');assert.ok(extraction.bytes>500);
  await evaluate(`document.querySelectorAll('.tabs button')[1].click()`);
  await evaluate(`document.querySelector('.reference-preset').click()`);
  await until(`document.querySelector('[aria-label="Letter slant"]').value === '-3'`);
  await evaluate(`document.querySelectorAll('.tabs button')[0].click()`);
  // Exercise a style switch, an ink change and natural variation toggle.
  await evaluate(`document.querySelectorAll('.style-card')[1].click(); document.querySelector('[aria-label="red ink"]').click(); document.querySelector('[role="switch"]').click();`);
  await pause(300);
  assert.equal(await evaluate(`document.querySelectorAll('.style-card')[1].getAttribute('aria-pressed')`), 'true');
  assert.equal(await evaluate(`document.querySelector('[aria-label="red ink"]').getAttribute('aria-pressed')`), 'true');
  await evaluate(`(async()=>{const c=document.createElement('canvas');c.width=600;c.height=600;const ctx=c.getContext('2d');const dt=new DataTransfer();for(const [i,color] of ['#f0deb9','#d2e6f5','#e3efd5'].entries()){ctx.fillStyle=color;ctx.fillRect(0,0,600,600);const blob=await new Promise(r=>c.toBlob(r));dt.items.add(new File([blob],'test-paper-'+i+'.png',{type:'image/png'}));}const input=document.querySelector('[aria-label="Upload custom paper"]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(`document.querySelector('#paper').value==='custom'`);
  await evaluate(`(()=>{const input=document.querySelector('[aria-label="Paper image fit"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(input,'stretch');input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await pause(200);
  assert.deepEqual(await evaluate(`Array.from(document.querySelector('canvas').getContext('2d').getImageData(10,10,1,1).data)`),[240,222,185,255],'Custom paper is rendered behind handwriting');
  assert.ok(await evaluate(`document.querySelector('.use-papers-button').classList.contains('primary-button')`),'Use selected papers is a prominent action');
  const oldMargin=await evaluate(`Number(document.querySelector('[aria-label="Writing left margin"]').value)`);
  await evaluate(`document.querySelector('[aria-label="Adjust left writing edge"]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))`);
  assert.equal(await evaluate(`Number(document.querySelector('[aria-label="Writing left margin"]').value)`),oldMargin+1,'Keyboard edge adjustment moves 1 pixel');
  await evaluate(`document.querySelector('.preview-panel').scrollIntoView({block:'center'})`);
  const handle=await evaluate(`(()=>{const r=document.querySelector('[aria-label="Adjust left writing edge"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:handle.x,y:handle.y,button:'left',clickCount:1});
  await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:handle.x+8,y:handle.y,button:'left',buttons:1});
  await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:handle.x+8,y:handle.y,button:'left',clickCount:1});
  assert.ok(await evaluate(`Number(document.querySelector('[aria-label="Writing left margin"]').value)`)>oldMargin+1,'Dragging the edge changes the writing margin');
  await evaluate(`(()=>{const input=document.querySelector('[aria-label="Writing left margin"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'130');input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate(`window.scrollTo(0,0)`);
  // Input through the native setter to exercise React's input handler.
  await evaluate(`(() => { const input = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, ('A page of handwritten thoughts.\\n').repeat(60)); input.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  await until(`document.querySelector('.pagination').innerText.includes('/ 3')`);
  await evaluate(`document.querySelector('[aria-label="Next page"]').click()`);
  await until(`document.querySelector('[aria-label="Go to page"]').value==='1'`);
  await evaluate(`(()=>{const input=document.querySelector('[aria-label="Background sequence mode"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(input,'single');input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(150);
  assert.deepEqual(await evaluate(`Array.from(document.querySelector('canvas').getContext('2d').getImageData(10,10,1,1).data)`),[240,222,185,255],'Same-paper mode uses the first paper on page two');
  await evaluate(`(()=>{const input=document.querySelector('[aria-label="Background sequence mode"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(input,'cycle');input.dispatchEvent(new Event('change',{bubbles:true}));})()`);await pause(150);
  assert.deepEqual(await evaluate(`Array.from(document.querySelector('canvas').getContext('2d').getImageData(10,10,1,1).data)`),[210,230,245,255],'Alternate mode switches page two to the second paper');
  await evaluate(`document.querySelector('.export-actions .outline-button').click()`);
  await until(`!document.querySelector('.primary-button').disabled`);
  await evaluate(`document.querySelector('.export-actions .primary-button').click()`);
  await until(`!document.querySelector('.primary-button').disabled`);
  await pause(500);
  const files = await readdir(artifacts);
  const png = files.find(f => f.endsWith('page 2.png'));
  const pdf = files.find(f => f.endsWith('.pdf'));
  assert.ok(png, 'Selected-page PNG downloads');
  assert.ok(pdf, 'Multi-page PDF downloads');
  const pdfBytes = await readFile(path.join(artifacts, pdf));
  assert.ok(pdfBytes.toString('latin1').includes('/Count 3'), 'PDF contains three pages');
  const drawnImages=[];
  for(const match of pdfBytes.toString('latin1').matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)){
    let data=Buffer.from(match[1],'latin1');try{data=inflateSync(data);}catch{}
    drawnImages.push(...(data.toString('latin1').match(/\/I\d+\s+Do/g)||[]));
  }
  assert.equal(drawnImages.length,3,'Each PDF page draws its own full-page image');
  assert.equal(new Set(drawnImages).size,3,'PDF pages do not reuse the first image');
  const pngBytes = await readFile(path.join(artifacts, png));
  assert.equal(pngBytes.readUInt32BE(16), 2480);
  assert.equal(pngBytes.readUInt32BE(20), 3508);
  assert.deepEqual(await evaluate(`(async()=>{const bytes=Uint8Array.from(atob('${pngBytes.toString('base64')}'),c=>c.charCodeAt(0));const img=await createImageBitmap(new Blob([bytes],{type:'image/png'}));const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return Array.from(ctx.getImageData(10,10,1,1).data);})()`),[210,230,245,255],'PNG download includes the second paper in the cycle');
  await pause(700);
  await cdp('Page.reload');
  await until(`document.querySelector('textarea')?.value.includes('A page of handwritten thoughts.')`);
  await until(`document.querySelector('.primary-button') && !document.querySelector('.primary-button').disabled`);
  assert.equal(await evaluate(`document.querySelector('#paper').value`),'custom','Custom paper selection restores');
  assert.deepEqual(await evaluate(`Array.from(document.querySelector('canvas').getContext('2d').getImageData(10,10,1,1).data)`),[240,222,185,255],'Paper image restores from local storage');
  assert.equal(await evaluate(`document.querySelectorAll('.paper-slot img').length`),3,'Three backgrounds restore after refresh');
  await evaluate(`(()=>{const input=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,('A page of handwritten thoughts.\\n').repeat(240));input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await pause(300);
  const colors=[[240,222,185,255],[210,230,245,255],[227,239,213,255]];
  for(let i=0;i<10;i++){
    assert.deepEqual(await evaluate(`Array.from(document.querySelector('canvas').getContext('2d').getImageData(10,10,1,1).data)`),colors[i%3], 'Paper cycle on page '+(i+1));
    if(i<9){await evaluate(`document.querySelector('[aria-label="Next page"]').click()`);await pause(150);}
  }
  await evaluate(`document.querySelector('[aria-label="Move paper 1 later"]').click()`);await pause(300);
  assert.deepEqual(await evaluate(`Array.from(document.querySelector('canvas').getContext('2d').getImageData(10,10,1,1).data)`),colors[1],'Reordering updates the active page');
  await evaluate(`(async()=>{const c=document.createElement('canvas');c.width=40;c.height=60;const ctx=c.getContext('2d');ctx.fillStyle='#eee';ctx.fillRect(0,0,40,60);const blob=await new Promise(r=>c.toBlob(r));const dt=new DataTransfer();for(let i=4;i<=10;i++)dt.items.add(new File([blob],'saved-paper-'+i+'.png',{type:'image/png'}));const input=document.querySelector('[aria-label="Upload custom paper"]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(`document.querySelectorAll('.paper-slot img').length===10`);
  assert.ok(await evaluate(`document.querySelector('.paper-actions .outline-button').disabled`),'Upload disabled when ten papers are saved');
  assert.ok(await evaluate(`document.querySelector('.paper-slot span').innerText.includes('test-paper-0')`),'Earlier paper preserved after new batch');
  for(const index of [1,4,5,6,7,8,9,10]){
    await evaluate(`document.querySelector('[aria-label="Select paper '+${index}+'"]').click()`);
    await until(`!document.querySelector('[aria-label="Select paper 2"]').disabled`);
  }
  assert.equal(await evaluate(`document.querySelectorAll('.paper-select input:checked').length`),2,'Only chosen papers are in the cycle');
  assert.equal(await evaluate(`document.querySelectorAll('.paper-slot img').length`),10,'Unselected papers remain saved');
  await pause(700); await cdp('Page.reload'); await pause(600);
  await until(`document.querySelector('.primary-button') && !document.querySelector('.primary-button').disabled`);
  assert.equal(await evaluate(`document.querySelectorAll('.paper-slot img').length`),10,'Library restores after reload');
  assert.equal(await evaluate(`document.querySelectorAll('.paper-select input:checked').length`),2,'Selection restores after reload');
  assert.deepEqual(await evaluate(`Array.from(document.querySelector('canvas').getContext('2d').getImageData(10,10,1,1).data)`),colors[1],'Selected cycle order restores');
  await evaluate(`document.querySelector('[aria-label="Delete saved paper 10"]').click()`);
  await until(`document.querySelectorAll('.paper-slot img').length===9`);
  assert.ok(await evaluate(`!document.querySelector('.paper-actions .outline-button').disabled`),'Deleting a saved paper frees a slot');
  const compact=await evaluate(`(()=>{document.querySelector('.custom-paper').scrollIntoView();const preview=document.querySelector('.preview-panel').getBoundingClientRect();const nav=document.querySelector('.preview-bottom').getBoundingClientRect();return {height:preview.height,top:preview.top,bottom:nav.bottom,viewport:innerHeight};})()`);
  assert.ok(compact.height<compact.viewport,'Preview stays compact rather than stretching to library height');
  assert.ok(compact.top>=0 && compact.bottom<=compact.viewport,'Preview navigation stays visible while editing papers');
  await evaluate(`window.scrollTo(0,0)`);
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(300);
  assert.ok(await evaluate(`document.documentElement.scrollWidth <= 390`), 'Mobile layout does not overflow');
  const mobile = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path.join(artifacts, 'mobile.png'), Buffer.from(mobile.data, 'base64'));
  assert.deepEqual(errors, [], 'No browser exceptions');
  console.log('Browser checks passed: white paper, handwriting controls, custom font upload, preview, styles, ink, pagination, PNG/PDF exports, draft recovery, mobile layout. Screenshots: .browser-check/');
} finally { socket?.close(); browser.kill(); }
