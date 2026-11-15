'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function catalog() {
  const sandbox = {
    URL, localStorage: { getItem: () => null }, window: {},
    document: {
      addEventListener() {},
      createElement: () => ({ attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } }),
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../catalog.js'), 'utf8'), sandbox);
  return sandbox;
}

test('course embeds reject executable URLs, untrusted hosts and same-origin pages', () => {
  const { safeEmbed } = catalog();
  for (const url of ['javascript:alert(1)', 'data:text/html,evil', 'https://attacker.example/embed', 'https://fintrust.dev/admin.html', 'https://www.youtube.com.attacker.example/embed', 'https://user:pass@www.youtube.com/embed/a', 'http://www.youtube.com/embed/a']) {
    const mount = { textContent: '', appendChild: () => assert.fail('unsafe iframe was created') };
    safeEmbed(mount, url, 'Video');
  }
});

test('approved video providers receive sandboxed frames without referrer information', () => {
  const { safeEmbed } = catalog();
  let iframe;
  safeEmbed({ textContent: '', appendChild: node => { iframe = node; } }, 'https://www.youtube-nocookie.com/embed/test', 'Video');
  assert.equal(iframe.src, 'https://www.youtube-nocookie.com/embed/test');
  assert.equal(iframe.referrerPolicy, 'no-referrer');
  assert.doesNotMatch(iframe.attributes.sandbox, /allow-top-navigation/);
  assert.match(iframe.attributes.sandbox, /allow-scripts/);
});

test('download settings cannot replace the installer with executable URLs or another repository', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../gntools.html'), 'utf8');
  const script = [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(code => code.includes('function renderG()'));
  assert.ok(script);
  const download = { href: 'trusted-default.exe' };
  const sandbox = { URL, window: {}, GN_LANG: 'ru', document: { getElementById: () => download, querySelectorAll: () => [] } };
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  for (const url of ['javascript:alert(1)//.exe', 'https://attacker.example/app.exe', 'https://github.com/attacker/repo/releases/download/x/app.exe', 'http://github.com/GNFinTrust/GNFinTrust.github.io/releases/download/gntools/GNTools.exe']) {
    sandbox.G.url = url; sandbox.renderG();
    assert.equal(download.href, 'trusted-default.exe');
  }
  const valid = 'https://github.com/GNFinTrust/GNFinTrust.github.io/releases/download/gntools/GNTools.exe';
  sandbox.G.url = valid; sandbox.renderG();
  assert.equal(download.href, valid);
});
