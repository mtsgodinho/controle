import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, copyFile, rm, cp, readFile, writeFile } from 'node:fs/promises';
const emulator = process.argv.includes('--emulator');
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyFile('public/style.css', 'dist/style.css');
await cp('public/assets', 'dist/assets', { recursive: true });
await build({ entryPoints: ['src/app.js'], bundle: true, outfile: 'dist/app.js', format: 'iife', target: ['es2022'], minify: true, define: { __EMULATOR__: String(emulator) } });
// A URL muda com o conteúdo para impedir mistura com arquivos antigos em cache.
const version = async file => createHash('sha256').update(await readFile(`dist/${file}`)).digest('hex').slice(0, 16);
let html = await readFile('public/index.html', 'utf8');
html = html.replace('./style.css', `./style.css?v=${await version('style.css')}`).replace('./app.js', `./app.js?v=${await version('app.js')}`);
await writeFile('dist/index.html', html);
await copyFile('dist/app.js', 'public/app.js');
console.log(emulator ? 'Build para emuladores locais concluído. Não publique este build.' : 'Build Firebase concluído em dist/.');
