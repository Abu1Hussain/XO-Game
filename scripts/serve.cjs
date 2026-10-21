const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../dist');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.md':'text/plain; charset=utf-8'};
http.createServer((request,response)=>{
  let route;
  try { route=decodeURIComponent(new URL(request.url,'http://localhost').pathname); }
  catch { response.writeHead(400).end();return; }
  const file=path.resolve(root,'.'+route+(route.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep)) {response.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){response.writeHead(404).end('Not found');return;}
    response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}).end(data);
  });
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
