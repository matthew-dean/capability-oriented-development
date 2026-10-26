import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';

/** Read the real rendered screens. This observer never reads capability.json:
 * changing an expectation must not change what we observe or which screens run.
 */
export async function observe(root = fileURLToPath(new URL('../', import.meta.url)), screenshot) {
  const server = serve(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    const rows = [];

    for (const screen of ['settings', 'team']) {
      for (const state of ['idle', 'disabled', 'busy']) {
        await page.goto(`http://127.0.0.1:${server.address().port}/?screen=${screen}&state=${state}`);
        const button = page.getByRole('button');
        await button.waitFor();

        // Observe computed results, not component names or imported source text.
        const value = await button.evaluate(element => {
          const css = getComputedStyle(element);
          return {
            label: element.textContent,
            disabled: element.disabled,
            busy: element.getAttribute('aria-busy'),
            background: css.backgroundColor,
            radius: css.borderRadius,
            padding: css.padding,
            opacity: css.opacity,
            type: element.type,
          };
        });

        // Native click() does nothing on a disabled button. The screen's status
        // reveals whether its real action ran; checking a disabled attribute alone
        // would not establish that consequence.
        const priorStatus = await page.getByRole('status').textContent();
        await button.evaluate(element => element.click());
        const afterStatus = await page.getByRole('status').textContent();

        for (let attempt = 0; attempt < 6; attempt++) {
          await page.keyboard.press('Tab');
          if (await button.evaluate(element => document.activeElement === element)) break;
        }
        const keyboardReachable = await button.evaluate(element => document.activeElement === element);

        if (screenshot && screen === 'settings' && state === 'idle') {
          await page.screenshot({ path: screenshot });
        }
        rows.push({ screen, state, ...value, priorStatus, afterStatus, keyboardReachable });
      }
    }

    if (errors.length) throw Error(errors.join('\n'));
    return rows;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await observe(process.argv[2]), null, 2));
}
