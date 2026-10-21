import { strict as assert } from 'node:assert';
import { toolbarActions } from './toolbar.js';
assert.deepEqual(toolbarActions(new Set()), []);
