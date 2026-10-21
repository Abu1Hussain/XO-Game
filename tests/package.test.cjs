const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const root=path.join(__dirname,'..');

test('Build ships only local runtime assets and a self-contained two-game HTML',()=>{
  execFileSync(process.execPath,['scripts/build.cjs'],{cwd:root});
  const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
  for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.equal(/^(https?:|\/)/.test(match[1]),false,'Runtime assets must be relative');
    assert.equal(fs.existsSync(path.join(root,'dist',match[1])),true,match[1]);
  }
  assert.equal(fs.existsSync(path.join(root,'dist/xo.html')),true);
  assert.equal(fs.existsSync(path.join(root,'dist/.nojekyll')),true);
  const standalone=fs.readFileSync(path.join(root,'dist/XO-Party.html'),'utf8');
  assert.equal(/<script[^>]+src=/.test(standalone),false);
  assert.equal(/<link[^>]+stylesheet/.test(standalone),false);
  const scripts=[...standalone.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length,3);
  scripts.forEach((script,i)=>new vm.Script(script[1],{filename:'standalone-script-'+i}));
  assert.match(scripts[2][1],/xoFrame.*srcdoc=/);
  assert.equal(scripts[2][1].includes('winningLine'),true,'Standalone embeds the improved XO version');
});
