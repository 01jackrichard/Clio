import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const SCRATCH_DIR = 'C:/Users/jackr/.gemini/antigravity/brain/5f4e42a4-9daf-4db3-a382-3b7de3944625/scratch';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class SimpleCDP {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    const WS = globalThis.WebSocket;
    return new Promise((resolve, reject) => {
      this.ws = new WS(this.wsUrl);
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
      this.ws.onmessage = (event) => {
        const parsed = JSON.parse(event.data);
        if (parsed.id && this.callbacks.has(parsed.id)) {
          const { res, rej } = this.callbacks.get(parsed.id);
          this.callbacks.delete(parsed.id);
          if (parsed.error) rej(parsed.error);
          else res(parsed.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const id = this.id++;
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function main() {
  console.log('Launching headless Chrome...');
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9333',
    '--disable-gpu',
    '--window-size=1440,900',
    'about:blank',
  ]);

  let versionInfo = null;
  for (let i = 0; i < 20; i++) {
    try {
      versionInfo = await fetchJson('http://127.0.0.1:9333/json/version');
      if (versionInfo) break;
    } catch {
      await sleep(300);
    }
  }

  if (!versionInfo) {
    chrome.kill();
    throw new Error('Chrome failed to start debugger on port 9333');
  }

  console.log('Debugger connected. Target URL:', versionInfo.webSocketDebuggerUrl);
  const targets = await fetchJson('http://127.0.0.1:9333/json/list');
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];

  const cdp = new SimpleCDP(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();

  console.log('Navigating to http://localhost:3000/...');
  await cdp.send('Page.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Page.navigate', { url: 'http://localhost:3000/' });
  await sleep(2500);

  // 1. Desktop - The Study (at top of archive-reveal)
  await cdp.send('Runtime.evaluate', {
    expression: `
      const el = document.getElementById('archive-reveal');
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top + 100);
      }
    `,
  });
  await sleep(1000);

  let shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCRATCH_DIR, 'reveal_01_the_study_desktop.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved reveal_01_the_study_desktop.png');

  // 2. Desktop - Mid Dissolve (progress ~ 0.5)
  await cdp.send('Runtime.evaluate', {
    expression: `
      const el = document.getElementById('archive-reveal');
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top + 900);
      }
    `,
  });
  await sleep(1000);

  shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCRATCH_DIR, 'reveal_02_mid_dissolve_desktop.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved reveal_02_mid_dissolve_desktop.png');

  // 3. Desktop - The Archive (progress ~ 1.0)
  await cdp.send('Runtime.evaluate', {
    expression: `
      const el = document.getElementById('archive-reveal');
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top + 1800);
      }
    `,
  });
  await sleep(1000);

  shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCRATCH_DIR, 'reveal_03_the_archive_desktop.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved reveal_03_the_archive_desktop.png');

  // 4. Mobile Viewport (390 x 844)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await cdp.send('Runtime.evaluate', {
    expression: `
      const el = document.getElementById('archive-reveal');
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top + 100);
      }
    `,
  });
  await sleep(1000);

  shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(SCRATCH_DIR, 'reveal_04_the_study_mobile.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved reveal_04_the_study_mobile.png');

  cdp.close();
  chrome.kill();
  console.log('All screenshots captured successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
