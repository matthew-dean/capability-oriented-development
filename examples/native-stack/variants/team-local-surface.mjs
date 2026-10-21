import { createButton } from './button.mjs';
export function createAction(options) {
  const button = createButton("Invite teammate", options);
  button.style.setProperty('--button-background', '#3154d9');
  return button;
}
