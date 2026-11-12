import * as opentype from 'opentype.js';
export const CHARACTERS = Array.from({ length: 94 }, (_, i) => String.fromCharCode(33 + i));
export const TEMPLATE = { width: 1200, height: 1400, left: 100, top: 180, cell: 100, columns: 10 };
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function makeTemplate() {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1400;
  const c = canvas.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, 1200, 1400);
  c.fillStyle = '#111'; c.font = '28px sans-serif'; c.fillText('Inkify — My handwriting template', 100, 65);
  c.font = '17px sans-serif';
  c.fillText('Write ONE matching character in each cell, below its label. Use a dark pen.', 100, 105);
  c.fillText('Keep letters inside the box. Align the baseline with the side ticks. Leave descenders below.', 100, 135);
  CHARACTERS.forEach((char, i) => {
    const x = 100 + i % 10 * 100, y = 180 + Math.floor(i / 10) * 100;
    c.strokeStyle = '#aaa'; c.strokeRect(x, y, 100, 100);
    c.fillStyle = '#555'; c.font = '15px monospace'; c.fillText(char, x + 6, y + 17);
    c.beginPath(); c.moveTo(x, y + 78); c.lineTo(x + 5, y + 78); c.moveTo(x + 95, y + 78); c.lineTo(x + 100, y + 78); c.stroke();
  });
  c.fillStyle = '#333'; c.fillText('Scan flat. Crop to the full outer page, keeping all four edges. Do not rotate or trim the grid.', 100, 1260);
  return canvas;
}
export async function extractTemplate(file, threshold = 135) {
  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > 40000000) throw new Error('Please use an image smaller than 40 megapixels.');
    if (Math.abs(image.width / image.height - 1200 / 1400) > 0.035) throw new Error('Crop the scan to the full template page (6:7 aspect ratio), then try again.');
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1400;
    const c = canvas.getContext('2d', { willReadFrequently: true }); c.fillStyle = '#fff'; c.fillRect(0, 0, 1200, 1400); c.drawImage(image, 0, 0, 1200, 1400);
    return CHARACTERS.map((char, i) => {
      const pixels = c.getImageData(100 + i % 10 * 100 + 8, 180 + Math.floor(i / 10) * 100 + 25, 84, 70);
      const preview = document.createElement('canvas'); preview.width = 84; preview.height = 70;
      const ink = new Uint8Array(84 * 70); let count = 0;
      for (let j = 0; j < ink.length; j++) {
        const p = j * 4; ink[j] = (pixels.data[p] + pixels.data[p + 1] + pixels.data[p + 2]) / 3 < threshold ? 1 : 0;
        count += ink[j]; pixels.data[p] = pixels.data[p + 1] = pixels.data[p + 2] = ink[j] ? 0 : 255; pixels.data[p + 3] = 255;
      }
      preview.getContext('2d').putImageData(pixels, 0, 0);
      return { char, ink, count, include: count >= 3, preview: preview.toDataURL() };
    });
  } finally { image.close(); }
}
export function buildFont(cells, name) {
  const glyphs = [new opentype.Glyph({ name: '.notdef', advanceWidth: 500, path: new opentype.Path() }), new opentype.Glyph({ name: 'space', unicode: 32, advanceWidth: 320, path: new opentype.Path() })];
  for (const cell of cells.filter(c => c.include && c.count)) {
    const path = new opentype.Path(); let left = 84, right = 0;
    cell.ink.forEach((v, i) => { if (v) { left = Math.min(left, i % 84); right = Math.max(right, i % 84); } });
    // Merge each horizontal run into one outline rectangle; preserves disconnected dots and punctuation.
    for (let y = 0; y < 70; y++) for (let x = left; x <= right; x++) {
      if (!cell.ink[y * 84 + x]) continue;
      const start = x; while (x < right && cell.ink[y * 84 + x + 1]) x++;
      const a = (start - left) * 12 + 35, b = (x + 1 - left) * 12 + 35, top = (53 - y) * 12;
      path.moveTo(a, top); path.lineTo(b, top); path.lineTo(b, top - 12); path.lineTo(a, top - 12); path.close();
    }
    glyphs.push(new opentype.Glyph({ name: `uni${cell.char.charCodeAt(0).toString(16).padStart(4, '0')}`, unicode: cell.char.charCodeAt(0), advanceWidth: (right - left + 1) * 12 + 90, path }));
  }
  if (glyphs.length < 3) throw new Error('No handwritten characters found. Fill the template before uploading.');
  return new opentype.Font({ familyName: name || 'My Handwriting', styleName: 'Regular', unitsPerEm: 1000, ascender: 850, descender: -250, glyphs }).toArrayBuffer();
}
