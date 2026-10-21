import { behavior, root } from './support.mjs';
await behavior(process.argv[2] || root);
