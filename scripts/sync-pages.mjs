import { cpSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const dist = 'dist';
const assetsDir = 'assets';

mkdirSync(assetsDir, { recursive: true });
for (const file of readdirSync(assetsDir)) {
    if (file.endsWith('.js')) {
        rmSync(join(assetsDir, file));
    }
}

const distAssets = join(dist, 'assets');
for (const file of readdirSync(distAssets)) {
    cpSync(join(distAssets, file), join(assetsDir, file));
}

const candidates = ['index.source.html', 'index.html'];
const builtHtml = candidates
    .map((name) => join(dist, name))
    .find((path) => existsSync(path));

if (!builtHtml) {
    throw new Error('No built HTML found in dist/');
}

let html = readFileSync(builtHtml, 'utf8');
html = html.replaceAll('./assets/', '/assets/');
writeFileSync('index.html', html);
writeFileSync(join(dist, 'index.html'), html.replaceAll('/assets/', './assets/'));

console.log(`Synced ${builtHtml} → root index.html + assets/ for GitHub Pages`);
