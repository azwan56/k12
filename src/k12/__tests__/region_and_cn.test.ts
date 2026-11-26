import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAccountDisplay,
  getCookieDomain,
  isSyntheticCnEmail,
  isWeChatBrowser,
  resolveAppRegion,
} from '../../lib/region';

test('resolveAppRegion prioritizes VITE_APP_REGION and falls back to hostname', () => {
  assert.equal(resolveAppRegion({ envRegion: 'cn', hostname: 'k12.vanpower.live' }), 'cn');
  assert.equal(resolveAppRegion({ envRegion: 'global', hostname: 'k12.vanpower.net' }), 'global');
  assert.equal(resolveAppRegion({ envRegion: '', hostname: 'k12.vanpower.net' }), 'cn');
  assert.equal(resolveAppRegion({ envRegion: '', hostname: 'vanpower.net' }), 'cn');
  assert.equal(resolveAppRegion({ envRegion: '', hostname: 'k12.vanpower.live' }), 'global');
  assert.equal(resolveAppRegion({ envRegion: '', hostname: 'localhost' }), 'global');
});

test('isSyntheticCnEmail & formatAccountDisplay hide internal synthetic addresses', () => {
  assert.equal(isSyntheticCnEmail('u_wx12345@wechat.vanpower.net'), true);
  assert.equal(isSyntheticCnEmail('student@gmail.com'), false);

  assert.equal(
    formatAccountDisplay('u_wx12345@wechat.vanpower.net', 'wechat'),
    '微信已登录 · 家庭学习档案'
  );
  assert.equal(
    formatAccountDisplay('u_ph12345@wechat.vanpower.net', 'phone', '138****8000'),
    '138****8000'
  );
  assert.equal(formatAccountDisplay('leo@example.com', 'google'), 'leo@example.com');
});

test('isWeChatBrowser and getCookieDomain detect environments accurately', () => {
  assert.equal(
    isWeChatBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) MicroMessenger/8.0.50'),
    true
  );
  assert.equal(
    isWeChatBrowser('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
    false
  );

  assert.equal(getCookieDomain('k12.vanpower.net'), '.vanpower.net');
  assert.equal(getCookieDomain('k12.vanpower.live'), '.vanpower.live');
  assert.equal(getCookieDomain('localhost'), 'localhost');
});
