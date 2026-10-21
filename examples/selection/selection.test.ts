import { strict as assert } from 'node:assert';
import { select, clear } from './selection.js';
assert.deepEqual([...select(clear(), ['a', 'a'])], ['a']);
