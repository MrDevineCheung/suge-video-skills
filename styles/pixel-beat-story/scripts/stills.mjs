import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'path';
// usage: node stills.mjs（放到 Remotion 工程根目录运行） <compId> <outDir> <scale> frames...
const [id, out, sc, ...fs] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const comp = await selectComposition({serveUrl, id});
for (const fr of fs.map(Number)) {
  await renderStill({composition: comp, serveUrl, output: `${out}/${id}-${String(fr).padStart(5,'0')}.jpg`, frame: fr, scale: Number(sc), imageFormat: 'jpeg'});
  console.log('ok', fr);
}
