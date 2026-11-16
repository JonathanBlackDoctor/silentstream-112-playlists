import { mkdir, copyFile, writeFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const name of ['index.html', 'style.css', 'app.js', 'data.mjs', 'icon.svg', 'playlists.json']) await copyFile(name, `dist/${name}`);
await writeFile('dist/.nojekyll', '');
console.log('Static site prepared in dist/. Design review files are excluded.');
