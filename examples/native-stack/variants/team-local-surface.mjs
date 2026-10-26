// This uses the real component, then replaces one part of its owned appearance.
import { createButton } from './button.mjs';
export function createAction(options) {
  const button = createButton("Invite teammate", options);
  button.style.setProperty('--button-background', '#3154d9');
  return button;
}
