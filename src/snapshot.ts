import {existsSync,realpathSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {isAbsolute,dirname,resolve} from 'node:path';
import {buildIndex} from './indexer.js';
import {contained} from './filesystem.js';
import {parseIndex} from './reconciliation.js';
/** Explicit local capture; read-only MCP tools do not invoke it. */
export function captureSnapshot(root: string, destination: string) {
  root=realpathSync(resolve(root));
  if(!destination||isAbsolute(destination)||/^[a-z]:|\\/i.test(destination))throw new Error('Snapshot path must be relative to the scan root');
  const file=resolve(root,destination);if(!contained(root,file)||file===root||destination.split(/[\\/]/).includes('.git'))throw new Error('Snapshot path escapes the scan root');
  let parent=dirname(file);while(!existsSync(parent))parent=dirname(parent);
  if(!contained(root,realpathSync(parent)))throw new Error('Snapshot parent escapes through a symlink');
  if(existsSync(file))throw new Error('Snapshot already exists; captures never overwrite a baseline');
  const index=buildIndex(root);if(!index.ok)throw new Error('Cannot capture an invalid capability graph');
  if(index.revision.dirty!==false)throw new Error('Capture requires a clean Git checkout; commit the starting state first');
  mkdirSync(dirname(file),{recursive:true});writeFileSync(file,JSON.stringify(index,null,2)+'\n',{flag:'wx'});
  const saved=parseIndex(JSON.parse(readFileSync(file,'utf8')));
  return {path:destination,digest:saved.digest,revision:saved.revision,cleanAtCapture:true,testsExecuted:false,caveat:'A verified clean snapshot records a starting state, not behavioral truth or a signed attestation.'};
}
