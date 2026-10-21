module.exports = {
  required: [{ name: 'screens-use-shared-button', severity: 'error', module: { path: '^src/(settings|team)[.]mjs$' }, to: { path: '^src/button[.]mjs$' } }],
  forbidden: [{ name: 'button-independent-of-screens', severity: 'error', from: { path: '^src/(button|theme)[.]mjs$' }, to: { path: '^src/(settings|team)[.]mjs$' } }],
  options: { doNotFollow: { path: 'node_modules' } },
};
