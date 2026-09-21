import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await build({
  entryPoints: ['src/content.js', 'src/background.js'],
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  target: 'chrome110',
  sourcemap: false,
  minify: false,
});
await cp('manifest.json', 'dist/manifest.json');
console.log('Built dist/');
