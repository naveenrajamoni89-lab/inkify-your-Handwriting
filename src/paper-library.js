export const PAPER_LIMIT = 10;

/** Default per-paper fit settings applied when a paper is first uploaded. */
export const DEFAULT_FIT = { paperFit:'stretch', margin:130, topMargin:100, rightMargin:90, bottomMargin:100 };

/** Merge stored fit settings onto a paper item, filling gaps with defaults. */
export function itemFit(item) {
  return {
    paperFit:    item.paperFit    ?? DEFAULT_FIT.paperFit,
    margin:      item.margin      ?? DEFAULT_FIT.margin,
    topMargin:   item.topMargin   ?? DEFAULT_FIT.topMargin,
    rightMargin: item.rightMargin ?? DEFAULT_FIT.rightMargin,
    bottomMargin:item.bottomMargin?? DEFAULT_FIT.bottomMargin,
  };
}

export function paperLibrary(library, selectedIds) {
  const ids=new Set(library.map(item=>item.id));
  const selected=[...new Set(selectedIds || [])].filter(id=>ids.has(id));
  if(!selected.length && library.length) selected.push(library[0].id);
  return library.length ? {library,selectedIds:selected,items:selected.map(id=>library.find(item=>item.id===id))} : null;
}
export function appendPapers(current, additions) {
  const library=current?.library||[];
  if(library.length+additions.length>PAPER_LIMIT) throw new Error(`Your library holds 10 papers. You have ${PAPER_LIMIT-library.length} free slot(s). Delete a saved paper before adding more.`);
  return paperLibrary([...library,...additions],[...(current?.selectedIds||[]),...additions.map(item=>item.id)]);
}
export function selectPaper(current,id,selected) {
  if(!current.library.some(item=>item.id===id)) throw new Error('Paper not found.');
  if(!selected && current.selectedIds.length===1 && current.selectedIds[0]===id) throw new Error('Keep at least one paper selected, or switch to a built-in paper.');
  return paperLibrary(current.library,selected?[...current.selectedIds,id]:current.selectedIds.filter(value=>value!==id));
}

/** Update fit settings on a single paper by id. Returns new library state. */
export function updatePaperFit(current, id, fit) {
  const library = current.library.map(item => item.id === id ? { ...item, ...fit } : item);
  return paperLibrary(library, current.selectedIds);
}
