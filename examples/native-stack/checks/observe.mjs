import { chromium } from '@playwright/test';
import { serve } from '../serve.mjs';
import { fileURLToPath } from 'node:url';

// Observe the actual screen DOM and computed styles, not the component or token source.
export async function observe(root = fileURLToPath(new URL('../', import.meta.url)), screenshot) {
  const server = serve(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    const errors = []; page.on('pageerror', error => errors.push(String(error)));
    const rows = [];
    for (const screen of ['settings', 'team']) for (const state of ['idle', 'disabled', 'busy']) {
      await page.goto('http://127.0.0.1:' + server.address().port + '/?screen=' + screen + '&state=' + state);
      const button = page.getByRole('button');
      await button.waitFor();
      const value = await button.evaluate(el => {
        const css = getComputedStyle(el);
        return { label: el.textContent, disabled: el.disabled, busy: el.getAttribute('aria-busy'), background: css.backgroundColor, radius: css.borderRadius, padding: css.padding, opacity: css.opacity, type: el.type };
      });
      const priorStatus = await page.getByRole('status').textContent();
      await button.evaluate(el => el.click());
      const afterStatus = await page.getByRole('status').textContent();
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        if (await button.evaluate(el => document.activeElement === el)) break;
      }
      const keyboardReachable = await button.evaluate(el => document.activeElement === el);
      if (screenshot && screen === 'settings' && state === 'idle') await page.screenshot({ path: screenshot });
      rows.push({ screen, state, ...value, priorStatus, afterStatus, keyboardReachable });
    }
    if (errors.length) throw Error(errors.join('\n'));
    return rows;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await observe(process.argv[2])));
