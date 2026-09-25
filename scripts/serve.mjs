import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),path=resolve(root,'.'+(name==='/'?'/index.html':name));if(!path.startsWith(root.endsWith(sep)?root:root+sep))throw new Error('Invalid path');const body=await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('Classical Live: http://127.0.0.1:4173'));
