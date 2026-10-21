import { select, clear } from './selection.js';
const selected = select(clear(), ['a', 'b']);
if (!selected.has('a')) throw new Error('selection failed');
