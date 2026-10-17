const fs = require('fs');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
// Serve build/ locally, then run: node scripts/checkProductionStartup.cjs http://localhost:PORT
if (!process.argv[2]) throw new Error('Pass the URL of the production build to check.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'prem-startup-'));
const errors = [];
const browser = spawn(process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless', '--disable-gpu', '--disable-background-networking', '--disable-component-update', '--disable-sync', '--no-first-run', '--user-data-dir=' + profile, '--remote-debugging-port=9237', 'about:blank'], { stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  let targets;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { targets = await (await fetch('http://127.0.0.1:9237/json')).json(); break; } catch { await pause(100); }
  }
  if (!targets) throw new Error('Chrome did not start');
  const socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => socket.once('open', resolve));
  let sequence = 0;
  const pending = new Map();
  socket.on('message', raw => { const value = JSON.parse(raw); if (pending.has(value.id)) { const {resolve,reject}=pending.get(value.id);pending.delete(value.id); value.error ? reject(value.error) : resolve(value.result); } });
  const send = (method, params = {}) => new Promise((resolve,reject) => { const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params})); });
  await send('Page.enable'); await send('Runtime.enable'); socket.on('message', raw => { const e=JSON.parse(raw); if(e.method==='Runtime.exceptionThrown') errors.push(e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text); });
  await send('Page.navigate', {url:process.argv[2] || 'http://127.0.0.1:8769'});
  await pause(6000);
  const rendered = await send('Runtime.evaluate',{expression:'document.getElementById("root")?.innerText || ""',returnByValue:true});
  if (errors.length) throw new Error(errors.join('\n'));
  if (!rendered.result.value.trim()) throw new Error('Production app rendered an empty root.');
  console.log('Production startup passed: app rendered without uncaught exceptions.');
  await send('Browser.close');
  socket.close();
})().catch(error => {console.error(error);process.exitCode=1;}).finally(()=>{browser.kill();fs.rmSync(profile,{recursive:true,force:true});});
