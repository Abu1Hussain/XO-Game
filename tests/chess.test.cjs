const {test,before} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
const source = file => fs.readFileSync(path.join(root,file),'utf8');
const engine = source('vendor/chess.js'), rules = source('assets/rules.js'), app = source('assets/app.js');
let Window;
before(async()=>({Window}=await import('happy-dom')));
function setup(t, preferences) {
  const window = new Window({url:'http://localhost/XO-Game/',settings:{disableJavaScriptFileLoading:true,disableIframePageLoading:true}});
  window.document.write(source('index.html').replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));
  const document=window.document;
  let now=0;
  const context=vm.createContext({window,document,console,localStorage:window.localStorage,
    performance:{now:()=>now},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,
    Blob:window.Blob,URL:window.URL});
  if(preferences)window.localStorage.setItem('boardroom-chess-preferences',JSON.stringify(preferences));
  vm.runInContext(engine,context);context.Chess=window.Chess;
  vm.runInContext(rules,context);vm.runInContext(app,context);
  t.after(()=>window.happyDOM.abort());
  const el=id=>document.getElementById(id);
  const run=expression=>vm.runInContext(expression,context);
  return {window,document,el,run,
    read:expression=>{const value=run(expression);return value===undefined?undefined:JSON.parse(JSON.stringify(value))},
    click:id=>el(id).click(),
    advance:ms=>{now+=ms;run('settleClock();updateClocks()')},
    move:(from,to)=>run(`chooseSquare('${from}');chooseSquare('${to}')`),
    start:(time='0',side='w')=>{el('timeControl').value=time;run(`showView('chess');selectSide('${side}')`);el('startChess').click()},
    position:fen=>{run(`chess.load(${JSON.stringify(fen)});fenHistory=[chess.fen()];viewPly=0;renderChess()`)}
  };
}
test('Initial and tactical move-generation reference counts',()=>{
  const context=vm.createContext({window:{}});vm.runInContext(engine,context);
  const Chess=context.window.Chess;
  const game=new Chess();
  assert.deepEqual([1,2,3,4].map(depth=>game.perft(depth)),[20,400,8902,197281]);
  const kiwipete=new Chess('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
  assert.deepEqual([1,2,3].map(depth=>kiwipete.perft(depth)),[48,2039,97862]);
});
test('Picker, setup, color assignment and 64 accessible squares',t=>{
  const g=setup(t);assert.equal(g.el('home').hidden,false);
  g.start('0','b');assert.equal(g.el('home').hidden,true);
  assert.deepEqual(g.read('cSides'),['b','w']);assert.equal(g.read('orientation'),'b');
  assert.equal(g.document.querySelectorAll('[data-square]').length,64);
  assert.equal(g.document.querySelector('[data-square]').dataset.square,'h1');
  assert.match(g.el('chessDetail').textContent,/Player 2/);
  assert.equal(g.read('canInteract()'),true);
});
test('Only legal moves can be played; pinned pieces cannot expose the king',t=>{
  const g=setup(t);g.start();g.move('e2','e5');assert.equal(g.read('chess.history().length'),0);
  g.move('e2','e4');assert.equal(g.read('chess.get("e4").type'),'p');
  g.move('d2','d4');assert.equal(g.read('chess.history().length'),1);
  g.position('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');
  assert.equal(g.read('legalAt("e2").some(move=>move.to==="d2")'),false);
  g.move('e2','d2');assert.equal(g.read('chess.get("e2").type'),'r');
});
test('Castling moves both pieces and is forbidden through check',t=>{
  const g=setup(t);g.start();g.position('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  g.move('e1','g1');assert.equal(g.read('chess.get("f1").type'),'r');assert.equal(g.read('chess.get("g1").type'),'k');
  g.position('r3kr1r/8/8/8/8/8/8/R3K2R w KQ - 0 1');
  assert.equal(g.read('legalAt("e1").some(move=>move.to==="g1")'),false);
});
test('En passant captures the adjacent pawn and expires after one move',t=>{
  const g=setup(t);g.start();g.position('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
  g.move('d7','d5');g.move('e5','d6');assert.equal(g.read('chess.get("d5")'),undefined);
  assert.equal(g.read('chess.get("d6").type'),'p');
  g.position('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');
  g.move('d7','d5');g.move('e1','f1');g.move('e8','f8');
  assert.equal(g.read('legalAt("e5").some(move=>move.to==="d6")'),false);
});
test('All four promotion choices are offered, cancellation is safe, and underpromotion works',t=>{
  const g=setup(t);g.start();g.position('7k/P7/8/8/8/8/8/7K w - - 0 1');
  g.move('a7','a8');assert.equal(g.el('promotionModal').hidden,false);
  assert.equal(g.document.querySelectorAll('[data-promote]').length,4);
  g.click('cancelPromotion');assert.equal(g.read('chess.get("a7").type'),'p');
  g.move('a7','a8');g.document.querySelector('[data-promote="n"]').click();
  assert.equal(g.read('chess.get("a8").type'),'n');assert.equal(g.read('cDraws'),1);
});
test('Fools mate awards one win, records result in PGN, and rematch swaps sides without losing scores',t=>{
  const g=setup(t);g.start();[['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']].forEach(move=>g.move(...move));
  assert.equal(g.read('cOver'),true);assert.deepEqual(g.read('cScores'),[0,1]);
  assert.match(g.el('chessResultDetail').textContent,/Checkmate/);assert.match(g.read('chess.pgn()'),/0-1/);
  g.run('detectEnd()');assert.deepEqual(g.read('cScores'),[0,1]);
  g.click('chessRematch');g.run("selectSide('b')");g.click('startChess');
  assert.deepEqual(g.read('cScores'),[0,1]);assert.deepEqual(g.read('cSides'),['b','w']);
  assert.equal(g.read('chess.history().length'),0);assert.equal(g.read('cOver'),false);
});
test('Stalemate, fifty moves and online insufficient-material cases end as draws',t=>{
  const positions=[
    ['7k/5K2/6Q1/8/8/8/8/8 b - - 0 1','Stalemate'],
    ['7k/8/8/8/8/8/R7/K7 w - - 100 60','50 moves'],
    ['7k/8/8/8/8/8/8/K7 w - - 0 1','Insufficient'],
    ['7k/8/8/8/8/8/5b2/KN6 w - - 0 1','Insufficient'],
    ['7k/8/8/8/8/8/8/KNN5 w - - 0 1','Insufficient']
  ];
  const g=setup(t);
  for(const [fen,reason] of positions){g.start();g.position(fen);g.run('detectEnd()');assert.equal(g.read('cOver'),true);assert.match(g.el('chessResultDetail').textContent,new RegExp(reason))}
  assert.equal(g.read('cDraws'),positions.length);
});
test('Threefold repetition is detected through played moves',t=>{
  const g=setup(t);g.start();
  for(let i=0;i<2;i++)[['g1','f3'],['g8','f6'],['f3','g1'],['f6','g8']].forEach(move=>g.move(...move));
  assert.equal(g.read('cDraws'),1);assert.match(g.el('chessResultDetail').textContent,/three times/);
});
test('Clocks start after the first move, apply increments, and pause at the game picker',t=>{
  const g=setup(t);g.start('180,2');g.advance(10000);
  assert.deepEqual(g.read('remaining'),{w:180000,b:180000});
  g.move('e2','e4');assert.equal(g.read('remaining.w'),182000);
  g.advance(5000);assert.equal(g.read('remaining.b'),175000);
  g.run("showView('home')");g.advance(5000);assert.equal(g.read('remaining.b'),175000);
  g.run("showView('chess')");g.advance(1000);assert.equal(g.read('remaining.b'),174000);
});
test('Timeout with sufficient material awards a win; lone minor draws instead',t=>{
  const g=setup(t);g.start('300,0');g.move('e2','e4');g.advance(300001);
  assert.deepEqual(g.read('cScores'),[1,0]);assert.match(g.el('chessResultDetail').textContent,/ran out of time/);
  g.start('300,0');g.position('7k/7p/8/8/8/8/8/KN6 w - - 0 1');
  g.move('a1','a2');g.advance(300001);
  assert.equal(g.read('cDraws'),1);assert.match(g.el('chessResultDetail').textContent,/insufficient mating material/);
});
test('Timeout material policy handles bishops, knights, rooks and queens',t=>{
  const g=setup(t);g.start();
  for(const [row,expected] of [['K7',false],['KB6',false],['KN6',false],['KNN5',true],['KBN5',true],['KBB5',true],['KR6',true],['KQ6',true]]){
    g.position('7k/7p/8/8/8/8/8/'+row+' w - - 0 1');
    assert.equal(g.read('BoardroomRules.timeoutCanWin(chess,"w")'),expected,row);
  }
});
test('Takeback requires consent, restores clocks, and history review cannot alter the live game',t=>{
  const g=setup(t);g.start('180,2');g.move('e2','e4');g.advance(5000);g.move('e7','e5');
  const live=g.read('chess.fen()');g.click('firstMove');g.move('d2','d4');assert.equal(g.read('chess.fen()'),live);
  g.click('liveMove');g.click('takeback');assert.equal(g.read('chess.history().length'),2);
  g.click('confirmNo');assert.equal(g.read('chess.history().length'),2);
  g.click('takeback');g.click('confirmYes');assert.equal(g.read('chess.history().length'),1);
  assert.deepEqual(g.read('remaining'),{w:182000,b:175000});
});
test('Draw and resignation need confirmation, award scores once, and block further moves',t=>{
  const g=setup(t);g.start();g.click('offerDraw');g.click('confirmNo');assert.equal(g.read('cOver'),false);
  g.click('offerDraw');g.click('confirmYes');assert.equal(g.read('cDraws'),1);
  g.start();g.click('resign');g.click('confirmYes');assert.deepEqual(g.read('cScores'),[0,1]);
  g.move('e2','e4');assert.equal(g.read('chess.history().length'),0);
});
test('Setup cancel, pause, stored preferences and modal focus state remain consistent',t=>{
  const g=setup(t,{side:'b',names:['Alice'],time:'300,0'});
  assert.deepEqual(g.read('cNames'),['Alice','Player 2']);g.start('300,0');g.move('e2','e4');
  g.click('pauseClock');assert.equal(g.el('chessView').inert,true);g.click('confirmYes');
  g.advance(5000);assert.equal(g.read('remaining.b'),300000);g.click('pauseClock');
  assert.equal(g.read('paused'),false);g.click('newChess');g.click('confirmYes');
  assert.equal(g.read('paused'),true);g.click('cancelSetup');assert.equal(g.read('paused'),false);
  assert.equal(g.el('chessView').inert,false);assert.equal(g.read('chess.history().length'),1);
});
test('Keyboard click and arrow navigation work; pointer dragging makes a legal move',t=>{
  const g=setup(t);g.start();
  let cell=g.document.querySelector('[data-square="e2"]');cell.focus();
  cell.dispatchEvent(new g.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  assert.equal(g.document.activeElement.dataset.square,'f2');
  cell.click();g.document.querySelector('[data-square="e4"]').click();
  assert.equal(g.read('chess.get("e4").color'),'w');
  cell=g.document.querySelector('[data-square="e7"]');
  cell.dispatchEvent(new g.window.PointerEvent('pointerdown',{pointerId:1,button:0,clientX:100,clientY:100,bubbles:true,cancelable:true}));
  g.document.dispatchEvent(new g.window.PointerEvent('pointermove',{pointerId:1,clientX:100,clientY:180,bubbles:true,cancelable:true}));
  assert.equal(g.el('dragGhost').hidden,false);
  g.document.elementFromPoint=()=>g.document.querySelector('[data-square="e5"]');
  g.document.dispatchEvent(new g.window.PointerEvent('pointerup',{pointerId:1,clientX:100,clientY:180,bubbles:true}));
  assert.equal(g.read('chess.get("e5").color'),'b');assert.equal(g.el('dragGhost').hidden,true);
});
test('Promotion clock can expire while choosing; cancelling cannot revive an ended game',t=>{
  const g=setup(t);g.start('300,0');g.position('7k/P6p/8/8/8/8/8/7K b - - 0 1');
  g.move('h7','h6');g.move('a7','a8');assert.equal(g.el('promotionModal').hidden,false);
  g.advance(300001);assert.equal(g.el('promotionModal').hidden,true);
  assert.equal(g.el('chessResult').hidden,false);assert.equal(g.read('cOver'),true);
  assert.deepEqual(g.read('cScores'),[0,1]);
});
test('PGN round-trip retains the complete legal game',t=>{
  const g=setup(t);g.start();[['e2','e4'],['e7','e5'],['g1','f3'],['b8','c6'],['f1','b5']].forEach(move=>g.move(...move));
  assert.equal(g.run('const restored=new Chess();restored.loadPgn(chess.pgn());restored.fen()===chess.fen()'),true);
});
