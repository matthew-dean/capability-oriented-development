import { createButton } from './button.mjs';
const wrap = options => createButton('Invite teammate', options);
export function createAction(options) { return wrap(options); }
