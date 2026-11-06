// Servidor de desenvolvimento estático. A produção usa Firebase Hosting.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = { '/assets/routine.svg': ['assets/routine.svg', 'image/svg+xml'], '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
const server = http.createServer(async (req, res) => {
  const file = files[new URL(req.url, 'http://localhost').pathname];
  if (!file || req.method !== 'GET') { res.writeHead(404); return res.end('Página não encontrada.'); }
  try {
    const data = await readFile(new URL(`./dist/${file[0]}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  } catch { res.writeHead(503); res.end('Execute npm run build antes de iniciar.'); }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`Vida em dia: servidor estático na porta ${server.address().port}`));
