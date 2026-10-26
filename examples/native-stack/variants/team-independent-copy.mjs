// This copy matches today's contract but cannot follow a later owner change.
const copiedButton = (label, { disabled = false, busy = false, onClick = () => {} } = {}) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'button';
  button.textContent = label;
  button.disabled = disabled || busy;
  if (busy) button.setAttribute('aria-busy', 'true');
  button.style.setProperty('--button-background', '#3154d9');
  button.style.setProperty('--button-radius', '10px');
  button.style.setProperty('--button-padding', '10px 18px');
  button.addEventListener('click', onClick);
  return button;
};
export function createAction(options) {
  return copiedButton('Invite teammate', options);
}
