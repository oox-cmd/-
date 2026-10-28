import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT || 4173);
const allowed=new Set(['/index.html','/styles.css','/app.js','/data.js','/assets/mark.svg','/assets/axis3d.js','/assets/models/zhengyangmen.glb','/assets/models/zhengyangmen.meta.json','/assets/vendor/THREE-LICENSE.txt']);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.glb':'model/gltf-binary','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  try{
    const requested=new URL(req.url,'http://127.0.0.1').pathname;
    const name=requested==='/'?'/index.html':requested;
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    if(!allowed.has(name)){res.writeHead(404);res.end('Not found');return;}
    const content=await readFile(path.join(root,name));
    res.writeHead(200,{'Content-Type':mime[path.extname(name)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(500);res.end('Unable to load local preview');}
});
server.on('error',error=>{console.error(`无法启动预览：${error.message}`);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
