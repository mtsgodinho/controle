import { build } from 'esbuild';
import { mkdir, copyFile, rm } from 'node:fs/promises';
const emulator = process.argv.includes('--emulator');
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await Promise.all(['index.html', 'style.css'].map(file => copyFile(`public/${file}`, `dist/${file}`)));
await build({ entryPoints: ['src/app.js'], bundle: true, outfile: 'dist/app.js', format: 'iife', target: ['es2022'], minify: true, define: { __EMULATOR__: String(emulator) } });
await copyFile('dist/app.js', 'public/app.js');
console.log(emulator ? 'Build para emuladores locais concluído. Não publique este build.' : 'Build Firebase concluído em dist/.');
