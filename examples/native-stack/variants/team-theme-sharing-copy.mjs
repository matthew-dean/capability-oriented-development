// Sharing theme tokens is insufficient: this copy bypasses the component's radius rule.
import { buttonTheme } from './theme.mjs';
import { createButton } from './button.mjs';
export const unusedOptions = { createButton };
const copiedButton = (label, { disabled = false, busy = false, onClick = () => {} } = {}) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button';
  button.textContent = label;
  button.disabled = disabled || busy;
  if (busy) button.setAttribute('aria-busy', 'true');
  button.style.setProperty('--button-background', buttonTheme.background);
  button.style.setProperty('--button-radius', buttonTheme.radius);
  button.style.setProperty('--button-padding', buttonTheme.padding);
  button.addEventListener('click', onClick);
  return button;
};
export function createAction(options) {
  return copiedButton('Invite teammate', options);
}
