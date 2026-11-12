# Inkify AI

A local-first React MVP for turning typed text into handwritten notebook pages.

## Run

Requires Node.js 20.19+ or 22+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates a static production build in `dist`; `npm run preview` serves it locally. `npm test` runs the layout tests.

For optional browser verification with Node 22+ and a local Chromium browser, set `BROWSER_PATH` to its executable and run `node tests/browser.mjs` while the development server is running. This checks real rendering, style changes, multi-page PNG/PDF downloads, draft recovery and mobile overflow. It uses an isolated browser profile and writes ignored artifacts to `.browser-check/`.

## Working features

- Live canvas preview with four bundled handwriting fonts (Indie Flower, Caveat, Patrick Hand, Kalam).
- Reference-inspired Research notes preset: open, rounded letters, looser word spacing and uneven baselines. This is a visual approximation of the supplied samples, not an extracted font or handwriting clone.
- Blue, black, red and green ink; ruled, plain A4 and graph paper.
- Custom paper/background upload (PNG, JPG, WebP, up to 15 MB / 40 megapixels). Choose whole-image fit, cropped fill or stretch to A4. Adjust the writing start position; left margin and line spacing align text to the uploaded paper. A library stores up to 10 paper images across visits. Each new upload batch appends without replacing previous papers; a batch exceeding the remaining capacity is rejected in full. Check any saved papers to include them in the cycle, and use arrows to set their order. Unchecking keeps the image saved; deleting permanently removes it and frees a slot. Keep at least one selected paper, or use a built-in paper instead. Only the selected papers cycle across preview and PNG/PDF exports. The library, selection and cycle order persist locally; older single-paper and three-paper drafts migrate automatically. Storage is specific to this browser/site address and can be lost if browser data is cleared. All cycling images share a safe writing rectangle when their proportions differ. Images are normalized to at most 3508 pixels on the longest edge; existing writing in an uploaded image remains visible.
- Custom paper defaults to a full-page static background. **Fit writing to full page** resets its fit and safe margins. Four margin controls define the writing rectangle; wrapping and pagination share that rectangle with the renderer, including when the image is letterboxed. A dashed preview-only guide helps avoid photographed edges and binding. Custom-paper exports omit added page numbers. The app does not detect or straighten the physical sheet inside a photograph; adjust the margins or upload a tightly cropped page for that case.
- **Background on next pages** explicitly chooses **Alternate selected papers** (default) or **Use the same paper** (first selected image). Select at least two papers to alternate. The compact desktop preview stays visible while scrolling the controls, identifies the current background, and has a page selector. PDF exports all pages with a unique image identifier per page; PNG exports only the current page.
- Adjustable size, weight, line spacing, margin, slant, letter width, letter spacing, word spacing and variation intensity.
- Deterministic letter rotation, independent height/width variation, bounded spacing variation, baseline drift, stroke thickness and ink intensity. Three presets: Neat Student Handwriting, Natural College Notes and Quick Classroom Notes.
- Pure white paper remains the default; optional textured and photographed finishes add grain, lighting and an edge shadow. Headings can be underlined without changing their text.
- Custom Font Manager: upload WOFF/WOFF2/TTF/OTF up to 5 MB, preview, apply, rename, download and delete. Font files persist locally in IndexedDB; the selected font restores with the draft. Static fonts may use synthesized weights.
- Uploaded and template-created fonts also appear directly in **Handwriting Style** as saved font cards. Select them alongside the built-in styles; renaming or deleting a font in the manager updates its card immediately. Saved cards load on startup even when a built-in font is selected. Fonts are stored in this browser/site address, not synced between devices.
- Create My Handwriting Font: download a 94-character template, upload a flat PNG/JPEG scan, adjust ink threshold, review/exclude cells, build and save an OpenType font.
- Automatic word wrapping and pagination, including long unbroken text.
- Current-page PNG and all-page A4 PDF exports: 1240 × 1754 (approximately 150 DPI) or 2480 × 3508 (approximately 300 DPI). PDF uses lossless PNG page images.
- Plain text import, editable notebook title and browser-local draft recovery.
- Responsive interface. Text processing and exports run in the browser; fonts are bundled locally.

## Architecture and limits

The existing React/Vite application remains browser-only. main.jsx owns editor state and pagination; engine.js shares measured layout and seeded rendering between preview and export. FontManager.jsx manages library and template review; font-store.js persists font bytes in IndexedDB. template.js thresholds labeled cells and converts horizontal ink runs into OpenType outlines with opentype.js. No service receives text, fonts or handwriting images.

Individual-letter mode varies glyph dimensions and spacing. Uploaded fonts with readable OpenType salt/aalt tables can supply real alternate outlines. Connected mode uses the browser's native word shaping, preserving available contextual forms and ligatures; per-letter spacing/variation is not applied inside connected words. WOFF2 fonts still render through the browser when outline parsing is unavailable. We do not invent letter alternatives when the font has none.

The four supplied photos guide the visual style: open rounded forms, long descenders, uneven baselines, underlined headings and loose spacing. Their text is never treated as instructions. This is a simulation rather than a claim of exact handwriting reproduction.

Template extraction requires the supplied grid, scanned flat and cropped to the whole page at a 6:7 ratio. It does not recognize arbitrary paragraphs, correct perspective, or smooth pixel outlines into curves. Review every glyph; missing glyphs use browser fallback. The generated font covers selected ASCII characters, not arbitrary Unicode. For repeat variants, use a font with alternate glyphs. Font and draft storage can be lost if browser data is cleared.

Line spacing has a minimum based on font size to protect descenders. Paragraph breaks, punctuation and capitalization are preserved; runs of whitespace normalize to single spaces. Exported PDFs contain raster pages, not selectable text. Large 300-DPI documents consume more memory. Input remains limited to 50,000 characters.

The browser smoke test checks font persistence after refresh, a synthetic template extraction and font load, controls, pagination, current-page PNG dimensions, three-page PDF export and mobile overflow. It is not a validation against real scanned handwriting or a subjective realism score.

# inkify-your-Handwriting
