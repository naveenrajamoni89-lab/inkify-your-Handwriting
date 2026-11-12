import test from 'node:test';
import assert from 'node:assert/strict';
import { paperLibrary, appendPapers, selectPaper } from '../src/paper-library.js';
const papers=(start,count)=>Array.from({length:count},(_,i)=>({id:String(start+i),name:`Paper ${start+i}`}));
test('successive batches accumulate without replacing earlier papers',()=>{
  let state=appendPapers(null,papers(1,3));
  const originals=[...state.library];
  state=appendPapers(state,papers(4,3));state=appendPapers(state,papers(7,3));state=appendPapers(state,papers(10,1));
  assert.equal(state.library.length,10);assert.deepEqual(state.library.slice(0,3),originals);
  assert.throws(()=>appendPapers(state,papers(11,3)),/10 papers/);
  assert.equal(state.library.length,10);
});
test('deselection preserves stored papers and selection order survives restoration',()=>{
  let state=appendPapers(null,papers(1,5));state=selectPaper(state,'2',false);state=selectPaper(state,'4',false);
  assert.equal(state.library.length,5);assert.deepEqual(state.items.map(p=>p.id),['1','3','5']);
  state=selectPaper(state,'2',true);
  assert.deepEqual(paperLibrary(state.library,state.selectedIds).items.map(p=>p.id),['1','3','5','2']);
});
test('deletion cleans selection and final selected paper has a fallback',()=>{
  const state=paperLibrary(papers(1,3),['2']);
  assert.throws(()=>selectPaper(state,'2',false),/at least one/);
  assert.deepEqual(paperLibrary(state.library.filter(p=>p.id!=='2'),state.selectedIds).selectedIds,['1']);
  assert.equal(paperLibrary([],[]),null);
});
