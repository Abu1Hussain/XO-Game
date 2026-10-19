const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

// A small DOM adapter runs the actual delivered HTML script, without dependencies.
function game(storage = new Map()) {
  let document;
  class Element {
    constructor(id='') {
      this.id=id; this.hidden=false; this.disabled=false; this.value='';
      this.dataset={}; this.style={}; this.children=[]; this.attributes={};
      this.className=''; this.classList={toggle(){},add(){}};
    }
    setAttribute(key,value){this.attributes[key]=String(value)}
    appendChild(child){this.children.push(child)}
    replaceChildren(){this.children=[]}
    focus(){document.activeElement=this}
    addEventListener(type,handler){this['on'+type]=handler}
    querySelectorAll(){return []}
  }
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1],new Element(match[1])]));
  elements.get('setup').hidden=true; elements.get('result').hidden=true;
  const choices=['X','O'].map(icon=>{const e=new Element();e.dataset.icon=icon;return e});
  const main=new Element(), header=new Element();
  document={
    body:new Element(),activeElement:null,
    getElementById:id=>elements.get(id),createElement:()=>new Element(),addEventListener(){},
    querySelectorAll(selector){
      if(selector==='[data-icon]')return choices;
      if(selector==='.cell')return elements.get('board').children;
      throw new Error('Unexpected selector: '+selector);
    },
    querySelector(selector){
      if(selector==='main')return main;
      if(selector==='header')return header;
      if(selector==='.cell')return elements.get('board').children[0];
      const icon=selector.match(/data-icon="([XO])"/);
      if(icon)return choices.find(e=>e.dataset.icon===icon[1]);
      throw new Error('Unexpected selector: '+selector);
    }
  };
  const context=vm.createContext({document,
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    matchMedia:()=>({matches:true}),setTimeout:()=>1,clearTimeout(){},console});
  vm.runInContext(script,context);
  return {context,storage,el:id=>elements.get(id),
    click:id=>elements.get(id).onclick(), choose:icon=>choices.find(e=>e.dataset.icon===icon).onclick(),
    move:i=>elements.get('board').children[i].onclick(),
    read:expression=>JSON.parse(JSON.stringify(vm.runInContext(expression,context)))};
}
function start(g,icon='X') {g.choose(icon);g.click('start')}
function play(g,moves){moves.forEach(i=>g.move(i))}
function winningSequence(target, wanted) {
  function visit(board, moves, turn) {
    const win=lines.find(line=>board[line[0]]&&line.every(i=>board[i]===board[line[0]]));
    if(win)return board[win[0]]===wanted && win.join()===target.join()?moves:null;
    if(moves.length===9)return null;
    for(let i=0;i<9;i++)if(!board[i]) {
      board[i]=turn;
      const found=visit(board,[...moves,i],turn==='X'?'O':'X');
      board[i]='';
      if(found)return found;
    }
    return null;
  }
  return visit(Array(9).fill(''),[],'X');
}
test('Opening always shows icon selection, including with a saved preference',()=>{
  const g=game();assert.equal(g.el('setup').hidden,false);assert.equal(g.read('started'),false);
  g.choose('O');g.click('save');start(g,'O');
  const reopened=game(g.storage);
  assert.equal(reopened.el('setup').hidden,false);assert.equal(reopened.read('selected'),'O');
  assert.equal(reopened.read('started'),false);
});
test('All eight winning lines work for X and O; winners score exactly once',()=>{
  for(const icon of ['X','O'])for(const line of lines) {
    const g=game();start(g);play(g,winningSequence(line,icon));
    assert.equal(g.read('over'),true);assert.equal(g.el('result').hidden,false);
    assert.deepEqual(g.read('scores'),icon==='X'?[1,0]:[0,1]);
    assert.match(g.el('resultTitle').textContent,/wins!/);
    g.move(0);assert.deepEqual(g.read('scores'),icon==='X'?[1,0]:[0,1]);
  }
});
test('Draw shows a result and counts no player win',()=>{
  const g=game();start(g);play(g,[0,1,2,4,3,5,7,6,8]);
  assert.equal(g.read('draws'),1);assert.deepEqual(g.read('scores'),[0,0]);
  assert.equal(g.el('resultTitle').textContent,"It's a draw!");
});
test('Continue requires icon confirmation and retains scores when players swap',()=>{
  const g=game();start(g);play(g,[0,3,1,4,2]);g.click('continue');
  assert.equal(g.el('setup').hidden,false);assert.equal(g.read('round'),1);
  start(g,'O');assert.equal(g.read('round'),2);assert.deepEqual(g.read('scores'),[1,0]);
  play(g,[0,3,1,4,2]);assert.deepEqual(g.read('scores'),[1,1]);
});
test('Pick other icon returns to result with Continue, Restart and icon controls',()=>{
  const g=game();start(g);play(g,[0,3,1,4,2]);g.click('resultPick');g.choose('O');g.click('start');
  assert.equal(g.el('result').hidden,false);assert.equal(g.el('setup').hidden,true);
  for(const id of ['continue','resultRestart','resultPick'])assert.equal(g.el(id).hidden,false);
  g.click('continue');assert.equal(g.el('result').hidden,true);
  assert.equal(g.el('setup').hidden,true);assert.deepEqual(g.read('icons'),['O','X']);
  assert.equal(g.read('round'),2);assert.deepEqual(g.read('scores'),[1,0]);
});
test('Restart from result clears the match after icon selection',()=>{
  const g=game();start(g);play(g,[0,3,1,4,2]);g.click('resultRestart');
  assert.deepEqual(g.read('scores'),[1,0]);start(g,'O');
  assert.deepEqual(g.read('scores'),[0,0]);assert.equal(g.read('round'),1);
  assert.equal(g.read('draws'),0);assert.equal(g.read('board.every(x=>!x)'),true);
});
test('Occupied cells reject a second move; X starts even when player 1 picks O',()=>{
  const g=game();start(g,'O');assert.equal(g.read('turn'),'X');
  assert.match(g.el('turn').textContent,/Player 2/);g.move(0);g.move(0);
  assert.equal(g.read('board[0]'),'X');assert.equal(g.read('turn'),'O');
});
test('Cancel during a round preserves names, board and symbol assignments',()=>{
  const g=game();start(g);g.move(0);g.click('change');g.choose('O');
  g.el('name0').value='Changed';g.click('save');g.click('back');
  assert.deepEqual(g.read('icons'),['X','O']);assert.equal(g.read('names[0]'),'Player 1');
  assert.equal(g.read('board[0]'),'X');assert.equal(g.read('turn'),'O');
});
test('Unavailable or malformed browser storage does not prevent play',()=>{
  const g=game(new Map([['xo-party-icons','invalid JSON']]));start(g);g.move(0);
  assert.equal(g.read('board[0]'),'X');
  const partial=game(new Map([['xo-party-icons',JSON.stringify({icon:'O',names:['One']})]]));
  assert.deepEqual(partial.read('names'),['One','Player 2']);
  vm.runInContext("localStorage.setItem=()=>{throw Error('blocked')}",partial.context);
  partial.click('save');start(partial,'O');assert.equal(partial.read('started'),true);
});
