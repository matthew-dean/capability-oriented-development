import { followsPolicy, root } from './support.mjs';
try { process.exitCode = await followsPolicy(root) ? 0 : 1; } catch (error) { console.error(error); process.exitCode = 2; }
