import { createButton } from './button.mjs';
export function createAction(options) {
  const button = createButton("Save changes", options);
  button.style.setProperty('--button-background', '#3154d9');
  return button;
}
