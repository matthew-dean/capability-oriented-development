import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, compileScript } from '@vue/compiler-sfc';
import { chromium } from '@playwright/test';

// Compile these real SFCs on request. Production projects should use their
// existing build server; this small fixture needs no separate bundler setup.
export async function observe() {
  const root = process.cwd();
  const server = createServer((request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/vendor/vue.js') {
        response.setHeader('Content-Type', 'text/javascript');
        response.end(readFileSync(fileURLToPath(import.meta.resolve('vue/dist/vue.esm-browser.prod.js'))));
        return;
      }
      const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + sep)) throw Error('Path escapes application');
      const source = readFileSync(file, 'utf8');
      if (file.endsWith('.vue')) {
        const { descriptor, errors } = parse(source, { filename: file });
        if (errors.length) throw Error(String(errors));
        response.setHeader('Content-Type', 'text/javascript');
        response.end(compileScript(descriptor, { id: pathname, inlineTemplate: true }).content);
      } else {
        response.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : 'text/javascript');
        response.end(source);
      }
    } catch (error) {
      response.writeHead(500);
      response.end(String(error));
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    const results = [];
    for (const busy of [false, true]) {
      await page.goto(`http://127.0.0.1:${server.address().port}/?busy=${busy}`);
      const button = page.getByRole('button');
      await button.waitFor();
      const radius = await button.evaluate(element => getComputedStyle(element).borderRadius);
      const disabled = await button.isDisabled();
      const ariaBusy = await button.getAttribute('aria-busy');
      await button.evaluate(element => element.click());
      results.push({ busy, radius, disabled, ariaBusy, status: await page.getByRole('status').textContent() });
    }
    if (errors.length) throw Error(errors.join('\n'));
    return results;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
