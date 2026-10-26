// This screen selects the shared owner and supplies only its own label and options.
import { createButton } from './button.mjs';
export function createAction(options) {
  return createButton('Save changes', options);
}
