import {readFileSync} from 'node:fs';
import {formatRelativeTime} from './live/owner.mjs';
import {run} from './live/consumer.mjs';
const examples=JSON.parse(readFileSync(new URL('./examples.json',import.meta.url),'utf8'));
// The control establishes changed provider execution; only consumer outputs establish propagation.
process.stdout.write(JSON.stringify({control:formatRelativeTime(0),consumer:examples.map(({input})=>run(input))}));
