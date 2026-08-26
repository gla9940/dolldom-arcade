import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const app = readFileSync(resolve(root, 'app.js'), 'utf8');
const image = readFileSync(resolve(root, 'og.png')).toString('base64');

mkdirSync(resolve(root, 'dist/server'), { recursive: true });
mkdirSync(resolve(root, 'dist/client'), { recursive: true });

const worker = `
const html=${JSON.stringify(html)};
const app=${JSON.stringify(app)};
const image=${JSON.stringify(image)};
const headers={
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'self'",
  'referrer-policy':'strict-origin-when-cross-origin',
  'x-content-type-options':'nosniff'
};
export default {
  async fetch(request) {
    const url=new URL(request.url);
    if(url.pathname==='/app.js') return new Response(app,{headers:{...headers,'content-type':'text/javascript; charset=utf-8','cache-control':'public, max-age=3600'}});
    if(url.pathname==='/og.png') {
      const bytes=Uint8Array.from(atob(image),c=>c.charCodeAt(0));
      return new Response(bytes,{headers:{...headers,'content-type':'image/png','cache-control':'public, max-age=86400'}});
    }
    if(url.pathname==='/'||url.pathname==='/index.html') {
      const page=html.replaceAll('content="/og.png"', 'content="'+url.origin+'/og.png"');
      return new Response(page,{headers:{...headers,'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=60'}});
    }
    return new Response('Not found',{status:404,headers});
  }
};
`;

writeFileSync(resolve(root, 'dist/server/index.js'), worker);
writeFileSync(resolve(root, 'dist/client/index.html'), html);
writeFileSync(resolve(root, 'dist/client/app.js'), app);
copyFileSync(resolve(root, 'og.png'), resolve(root, 'dist/client/og.png'));
console.log('Built dist/server/index.js and static assets.');
