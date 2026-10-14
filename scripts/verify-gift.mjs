// Browser checks against a production build; only the isolated test browser's clock is changed.
// node scripts/verify-gift.mjs (Chrome must be installed, or set CHROME_PATH)
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = join(root, 'build-preview', 'codex-gift-verify');
const shots = join(root, 'shots', 'gift-combined');
mkdirSync(shots, { recursive: true });
execFileSync(process.platform === 'win32' ? join(root, 'tools/hugo/hugo.exe') : 'hugo', ['--minify', '--destination', output], { cwd: root, stdio: 'inherit' });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
    try {
        let path = resolve(output, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
        if (path !== output && !path.startsWith(output + sep)) { res.writeHead(403).end(); return; }
        if (statSync(path).isDirectory()) path = join(path, 'index.html');
        res.writeHead(200, { 'content-type': mime[extname(path)] || 'application/octet-stream' }).end(readFileSync(path));
    } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const profile = mkdtempSync(join(tmpdir(), 'codex-gift-test-'));
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--autoplay-policy=user-gesture-required', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
let browser;
const errors = [];
try {
    const wsURL = await new Promise((resolveURL, reject) => {
        const timeout = setTimeout(() => reject(new Error('Chrome startup timed out')), 15000);
        let log = '';
        chrome.once('error', reject);
        chrome.stderr.on('data', data => {
            log += data;
            const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
            if (match) { clearTimeout(timeout); resolveURL(match[1]); }
        });
    });
    browser = new WebSocket(wsURL);
    await new Promise((r, j) => { browser.onopen = r; browser.onerror = j; });
    let id = 0;
    const pending = new Map();
    browser.onmessage = ({ data }) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
        if (!pending.has(msg.id)) return;
        const { resolve, reject, timeout } = pending.get(msg.id); pending.delete(msg.id); clearTimeout(timeout);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
        const key = ++id;
        const timeout = setTimeout(() => { pending.delete(key); reject(new Error(`CDP timed out: ${method}`)); }, 15000);
        pending.set(key, { resolve, reject, timeout }); browser.send(JSON.stringify({ id: key, method, params, sessionId }));
    });
    const page = async (width, height, date = '2026-10-15T12:00:00+08:00', reduced = false, path = '/gift/letter/') => {
        const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
        const call = (method, params) => send(method, params, sessionId);
        await call('Page.enable'); await call('Runtime.enable');
        await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
        if (reduced) await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
        await call('Page.addScriptToEvaluateOnNewDocument', { source: `
            Date.now = () => ${Date.parse(date)};
            window.__giftTime = 0;
            const originalRAF = requestAnimationFrame.bind(window);
            window.requestAnimationFrame = cb => originalRAF(t => cb(t + window.__giftTime));
        ` });
        if (path === '/gift/') {
            // A synthetic credential exists only in this test browser. No real answers are stored here.
            const hash = createHash('sha256').update('giftplaybackfixture').digest('hex');
            await call('Page.addScriptToEvaluateOnNewDocument', { source: `
                document.addEventListener('DOMContentLoaded', () => {
                    const quiz = document.querySelector('[data-gift-quiz]');
                    if (quiz) quiz.dataset.hash = '${hash}';
                }, { capture: true, once: true });
            ` });
        }
        const evaluate = async expression => {
            const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
            if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
            return result.result.value;
        };
        await call('Page.navigate', { url: `${base}${path}` });
        for (let i = 0; i < 80; i++) {
            if (await evaluate(path === '/gift/'
                ? "document.querySelector('[data-gift-form]')?.hidden === false || document.querySelector('[data-gift-state]')?.textContent"
                : "document.querySelector('[data-gift-show]')?.dataset.phase || document.querySelector('[data-gift-fallback]')?.hidden === false")) break;
            await new Promise(r => setTimeout(r, 50));
        }
        const advance = async t => {
            await evaluate(`window.__giftTime = ${t}`);
            await new Promise(r => setTimeout(r, 120));
        };
        const screenshot = async name => {
            const { data } = await call('Page.captureScreenshot', { format: 'png' });
            writeFileSync(join(shots, `${name}.png`), Buffer.from(data, 'base64'));
            return data;
        };
        const click = async selector => {
            const { x, y } = await evaluate(`(() => {
                const element = document.querySelector(${JSON.stringify(selector)});
                element.scrollIntoView({ block: 'center', behavior: 'instant' });
                const r = element.getBoundingClientRect();
                return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
            })()`);
            await call('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
            await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
            await new Promise(r => setTimeout(r, 180));
        };
        return { call, evaluate, advance, screenshot, click, close: () => send('Target.closeTarget', { targetId }) };
    };

    const checkLetterLayout = async (p, name) => {
        const layout = await p.evaluate(`(() => {
            const paper = document.querySelector('.gift-letter__paper').getBoundingClientRect();
            const footer = document.querySelector('.gift-letter__foot').getBoundingClientRect();
            const paragraphs = [...document.querySelectorAll('[data-gift-body] > p')];
            return {
                paperBottom: paper.bottom, footerBottom: footer.bottom,
                paragraphs: paragraphs.length,
                containsParagraphs: paragraphs.every(p => p.getBoundingClientRect().bottom <= paper.bottom),
                noHorizontalOverflow: document.querySelector('[data-gift-letter]').scrollWidth <= innerWidth,
            };
        })()`);
        assert.ok(layout.paragraphs > 1, 'The letter must retain separate paragraphs');
        assert.ok(layout.containsParagraphs && layout.paperBottom >= layout.footerBottom, 'Paper must contain the entire letter and signature');
        assert.equal(layout.noHorizontalOverflow, true, 'Reading layout must fit the viewport');
        await p.screenshot(`${name}-letter-top`);
        await p.evaluate("document.querySelector('[data-gift-letter]').scrollTop = document.querySelector('[data-gift-letter]').scrollHeight");
        await p.screenshot(`${name}-letter-bottom`);
    };

    const checks = [];
    const scenarios = [
        (async () => {
            const wrong = await page(390, 844, undefined, false, '/gift/');
            assert.equal(await wrong.evaluate("getComputedStyle(document.querySelector('[data-gift-show]')).display"), 'none');
            assert.equal(await wrong.evaluate("document.querySelector('[data-gift-audio]').paused"), true);
            await wrong.evaluate("document.querySelector('[data-gift-input]').value = 'incorrect-answer'");
            await wrong.click('[data-gift-submit]');
            await new Promise(r => setTimeout(r, 150));
            assert.equal(await wrong.evaluate("document.querySelector('[data-gift-show]').hidden"), true);
            assert.equal(await wrong.evaluate("document.querySelector('[data-gift-audio]').paused"), true, 'Wrong answer must never play audible music');
            assert.equal(await wrong.evaluate("document.querySelector('[data-gift-msg]').classList.contains('is-error')"), true);
            await wrong.close();
            for (const mode of ['click', 'enter']) {
                const p = await page(mode === 'click' ? 1440 : 390, mode === 'click' ? 900 : 844, undefined, false, '/gift/');
                await p.evaluate(`
                    window.__quizAudio = document.querySelector('[data-gift-audio]');
                    window.__quizDocument = document;
                    document.querySelector('[data-gift-input]').value = '{ Gift Playback Fixture }';
                `);
                if (mode === 'click') await p.click('[data-gift-submit]');
                else {
                    await p.evaluate("document.querySelector('[data-gift-input]').focus()");
                    await p.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter' });
                    await p.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter' });
                }
                for (let i = 0; i < 240; i++) {
                    if (await p.evaluate("!document.querySelector('[data-gift-show]').hidden && !document.querySelector('[data-gift-audio]').paused && document.querySelector('[data-gift-audio]').currentTime >= 30")) break;
                    await new Promise(r => setTimeout(r, 50));
                }
                assert.equal(await p.evaluate('location.pathname'), '/gift/letter/');
                assert.equal(await p.evaluate('document === window.__quizDocument'), true, 'No page reload after submit');
                assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]') === window.__quizAudio"), true, 'Keep the activated audio element');
                assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), false, `${mode} starts music without another gesture`);
                assert.ok(await p.evaluate("document.querySelector('[data-gift-audio]').currentTime") >= 30);
                assert.equal(await p.evaluate("document.querySelector('[data-gift-music]').textContent"), '关闭音乐');
                assert.equal(await p.evaluate("document.querySelector('[data-gift-quiz]').hidden"), true);
                await p.screenshot(`quiz-${mode}-autoplay`);
                await p.close();
            }
            for (const date of ['2026-10-14T12:00:00+08:00', '2026-10-16T12:00:00+08:00']) {
                const p = await page(390, 844, date, false, '/gift/');
                assert.equal(await p.evaluate("document.querySelector('[data-gift-form]').hidden"), true);
                assert.equal(await p.evaluate("document.querySelector('[data-gift-show]').hidden"), true);
                assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), true);
                await p.close();
            }
            return 'quiz: wrong answer stays silent, click/Enter automatically play, same document/audio, time locks';
        }),
        (async () => {
            const p = await page(1280, 720);
            for (let i = 0; i < 300; i++) {
                if (await p.evaluate("document.querySelector('[data-gift-audio]').readyState >= 2")) break;
                await new Promise(r => setTimeout(r, 50));
            }
            assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), true, 'Autoplay denial must leave a playable button');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-music]').textContent"), '开启音乐');
            await p.click('[data-gift-music]');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), false);
            await new Promise(r => setTimeout(r, 600));
            assert.ok(await p.evaluate("document.querySelector('[data-gift-audio]').currentTime") >= 30);
            await p.click('[data-gift-music]');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), true);
            await p.advance(7000); await p.click('[data-gift-music]');
            assert.ok(await p.evaluate("document.querySelector('[data-gift-audio]').currentTime") >= 37, 'Enable seeks inside the requested excerpt');
            const beforeEnvelope = await p.evaluate(`(() => {
                const audio = document.querySelector('[data-gift-audio]');
                window.__introEvents = [];
                for (const event of ['pause', 'play', 'seeking', 'emptied']) {
                    audio.addEventListener(event, () => window.__introEvents.push(event));
                }
                return audio.currentTime;
            })()`);
            await p.advance(45000);
            assert.deepEqual(await p.evaluate('window.__introEvents'), [], 'Envelope transition must not pause, seek, reload or restart audio');
            const afterEnvelope = await p.evaluate("document.querySelector('[data-gift-audio]').currentTime");
            assert.ok(afterEnvelope >= beforeEnvelope && afterEnvelope < beforeEnvelope + 2, 'Envelope preserves the playback position');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-envelope]').hidden"), false);
            assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), false, 'First song continues while waiting at the envelope');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-letter-audio]').paused"), true, 'Reading song waits for the click');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-music]').hidden"), false);
            await p.evaluate("document.querySelector('[data-gift-audio]').currentTime = 74.1");
            await new Promise(r => setTimeout(r, 600));
            assert.ok(await p.evaluate("document.querySelector('[data-gift-audio]').currentTime") > 74.1, 'Waiting continues naturally beyond 01:14');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), false);
            await p.evaluate('window.__giftTime = 0'); await p.click('[data-gift-replay]');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), false);
            assert.ok(await p.evaluate("document.querySelector('[data-gift-audio]').currentTime") < 32, 'Replay resets to the 30-second mark');
            await p.click('[data-gift-music]'); await p.click('[data-gift-skip]'); await p.click('[data-gift-replay]');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), true, 'Replay respects music off');
            await p.click('[data-gift-music]');
            await p.click('[data-gift-skip]');
            await p.click('[data-gift-open]');
            for (let i = 0; i < 100; i++) {
                if (await p.evaluate("document.querySelector('[data-gift-letter-audio]').currentTime > 0")) break;
                await new Promise(r => setTimeout(r, 50));
            }
            assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), true, 'Intro stops before reading');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-letter-audio]').paused"), false, 'Young for you plays when opening');
            assert.ok(await p.evaluate("document.querySelector('[data-gift-letter-audio]').currentTime") < 8, 'Reading track starts at the beginning');
            assert.equal(await p.evaluate("new URL(document.querySelector('[data-gift-letter-audio]').src).searchParams.get('id')"), '1438597142');
            await p.click('[data-gift-replay]');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-letter-audio]').paused"), true, 'Replay stops the reading track');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), false);
            await p.evaluate(`Date.now = () => ${Date.parse('2026-10-16T12:00:00+08:00')}`);
            await new Promise(r => setTimeout(r, 1100));
            assert.equal(await p.evaluate("document.querySelector('[data-gift-audio]').paused"), true, 'Expiry stops audio');
            await p.close(); return 'NetEase audio: actual streams, 30-second seek, autoplay denial, mute, skip, reading track switch, replay, expiry';
        }),
        (async () => {
            const p = await page(1440, 900);
            await p.advance(9800); await p.screenshot('desktop-heart');
            assert.equal(await p.evaluate("document.querySelector('[data-gift-show]').dataset.phase"), 'hold');
            assert.equal(await p.evaluate("document.documentElement.clientWidth === innerWidth"), true, 'No white scrollbar gutter');
            await p.advance(18000); await p.screenshot('desktop-wishes');
            assert.ok(await p.evaluate("[...document.querySelectorAll('.gift-wish')].filter(e => e.style.visibility === 'visible').length") > 180);
            await p.advance(25000); const cake = await p.screenshot('desktop-cake');
            await p.advance(26500); assert.notEqual(await p.screenshot('desktop-cake-motion'), cake, 'Cake must animate');
            await p.advance(45000);
            assert.equal(await p.evaluate("document.querySelector('[data-gift-envelope]').hidden"), false);
            await new Promise(r => setTimeout(r, 950));
            await p.screenshot('desktop-envelope');
            await p.evaluate("document.querySelector('[data-gift-open]').click()");
            await new Promise(r => setTimeout(r, 1000));
            assert.equal(await p.evaluate("document.querySelector('[data-gift-letter]').hidden"), false);
            await checkLetterLayout(p, 'desktop');
            // Replay and skip must clear the previous state and remain repeatable.
            await p.evaluate("window.__giftTime = 0; document.querySelector('[data-gift-replay]').click()");
            assert.equal(await p.evaluate("document.querySelector('[data-gift-letter]').hidden"), true);
            await p.evaluate("document.querySelector('[data-gift-skip]').click()");
            assert.equal(await p.evaluate("document.querySelector('[data-gift-envelope]').hidden"), false);
            await p.close(); return 'desktop: full sequence, animated cake, letter, replay, skip';
        }),
        (async () => {
            const p = await page(390, 844);
            await p.advance(9800); await p.screenshot('mobile-heart');
            const count = await p.evaluate("document.querySelectorAll('.gift-cell').length");
            for (const [width, height] of [[844, 390], [320, 568], [390, 844]]) {
                await p.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
                await new Promise(r => setTimeout(r, 70));
                assert.equal(await p.evaluate("document.querySelectorAll('.gift-cell').length"), count, 'Resize must not duplicate cards');
                assert.equal(await p.evaluate(`Array.from(document.querySelectorAll('.gift-cell')).every(e => {
                    const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
                })`), true, `Heart must fit ${width}x${height}`);
            }
            await p.advance(18000); await p.screenshot('mobile-wishes');
            await p.advance(25000); await p.screenshot('mobile-cake');
            assert.equal(await p.evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
            await p.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
            assert.equal(await p.evaluate("document.querySelector('[data-gift-envelope]').hidden"), false);
            await p.click('[data-gift-open]');
            await new Promise(r => setTimeout(r, 1000));
            await checkLetterLayout(p, 'mobile');
            await p.close(); return 'mobile: portrait, landscape, 320px, resize, escape';
        }),
        (async () => {
            for (const date of ['2026-10-14T12:00:00+08:00', '2026-10-16T12:00:00+08:00']) {
                const p = await page(1000, 700, date);
                assert.equal(await p.evaluate("document.querySelector('[data-gift-fallback]').hidden"), false);
                assert.equal(await p.evaluate("document.querySelectorAll('.gift-cell').length"), 0);
                await p.close();
            }
            const p = await page(390, 844, undefined, true);
            assert.equal(await p.evaluate("document.querySelector('[data-gift-envelope]').hidden"), false);
            assert.equal(await p.evaluate("document.querySelectorAll('.gift-cell').length"), 0);
            await p.evaluate("document.querySelector('[data-gift-open]').click()");
            await new Promise(r => setTimeout(r, 60));
            assert.equal(await p.evaluate("document.querySelector('[data-gift-letter]').hidden"), false);
            await p.close(); return 'before/after birthday locks and reduced motion';
        }),
    ];
    for (const scenario of scenarios) {
        try { checks.push({ status: 'fulfilled', value: await scenario() }); }
        catch (reason) { checks.push({ status: 'rejected', reason }); }
    }
    for (const result of checks) {
        if (result.status === 'fulfilled') console.log('PASS:', result.value);
        else { console.error(result.reason); process.exitCode = 1; }
    }
    if (process.argv.includes('--real-time')) {
        const p = await page(1280, 720);
        const start = performance.now();
        for (const [time, expected] of [[5000, 'heart'], [10000, 'hold'], [16500, 'wishes'], [26500, 'cake'], [45000, 'envelope']]) {
            await new Promise(r => setTimeout(r, Math.max(0, time - (performance.now() - start))));
            assert.equal(await p.evaluate("document.querySelector('[data-gift-show]').dataset.phase"), expected);
            await p.screenshot(`realtime-${expected}`);
        }
        await p.close(); console.log('PASS: real-time 44-second sequence');
    }
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log('Screenshots:', shots);
} finally {
    browser?.close(); chrome.kill(); server.close();
}
