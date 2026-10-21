const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
const destination = path.join(root,'dist');
for (const file of ['vendor/chess.js','assets/rules.js','assets/app.js']) {
  new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
}
fs.mkdirSync(destination,{recursive:true});
for (const file of ['index.html','xo.html','.nojekyll','THIRD_PARTY_NOTICES.md']) {
  fs.copyFileSync(path.join(root,file),path.join(destination,file));
}
for (const directory of ['assets','vendor']) {
  fs.cpSync(path.join(root,directory),path.join(destination,directory),{recursive:true});
}
// A portable download with the exact same app and no external dependencies.
let html = fs.readFileSync(path.join(root,'index.html'),'utf8');
html = html.replace('<link rel="stylesheet" href="assets/style.css">',
  () => '<style>'+fs.readFileSync(path.join(root,'assets/style.css'),'utf8')+'</style>');
for (const file of ['vendor/chess.js','assets/rules.js','assets/app.js']) {
  let source=fs.readFileSync(path.join(root,file),'utf8');
  if(file==='assets/app.js') source=source.replace(
    "if(v==='xo'&&!$('xoFrame').getAttribute('src'))$('xoFrame').src='xo.html';",
    "if(v==='xo'&&!$('xoFrame').srcdoc)$('xoFrame').srcdoc="+JSON.stringify(fs.readFileSync(path.join(root,'xo.html'),'utf8'))+';');
  html=html.replace('<script src="'+file+'"></script>',()=>'<script>\n'+source.replace(/<\/script/gi,'<\\/script')+'\n</script>');
}
fs.writeFileSync(path.join(destination,'XO-Party.html'),html);
console.log('Built static site and standalone dist/XO-Party.html.');
