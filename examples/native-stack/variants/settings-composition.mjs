// A wrapper is allowed when it preserves the shared button's decisions.
import { createButton } from './button.mjs';
const wrap = options => createButton('Save changes', options);
export function createAction(options) {
  return wrap(options);
}
