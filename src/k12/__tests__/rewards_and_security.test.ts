import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyActivityReward,
  createInitialRewardsState,
  diffDays,
  getActiveTitle,
  mergeRewards,
  normalizeForToday,
  sanitizeRewardsState
} from '../rewards';
import { isAllowedVanpowerRedirectUrl, isValidDiscordWebhookUrl } from '../../lib/security';

test('initial state sets updatedAt=0 so fresh devices do not overwrite remote wishes', () => {
  const localFresh = createInitialRewardsState('2026-11-14');
  assert.equal(localFresh.updatedAt, 0);

  const remoteParentConfigured = {
    ...createInitialRewardsState('2026-11-13'),
    wishes: [{ id: 'custom_1', title: '周末去科技馆', cost: 120, emoji: '🚀' }],
    updatedAt: 1_700_000_000_000
  };

  const merged = mergeRewards(localFresh, remoteParentConfigured);
  assert.equal(merged.wishes.length, 1);
  assert.equal(merged.wishes[0].title, '周末去科技馆');
  assert.equal(merged.updatedAt, 1_700_000_000_000);
});

test('daily goal, streak freeze consumption, 5-checkin shield grant, and milestones', () => {
  let state = createInitialRewardsState('2026-11-01');
  assert.equal(state.streak.freezes, 1);

  // Day 1: complete 2 tasks -> daily goal bonus (+20), streak = 1
  let out = applyActivityReward(state, { coinsEarned: 12, xpEarned: 15, taskKey: 'practice', today: '2026-11-01' });
  assert.equal(out.dailyGoalJustCompleted, false);
  state = out.nextState;

  out = applyActivityReward(state, { coinsEarned: 10, xpEarned: 10, taskKey: 'wordsmith', today: '2026-11-01' });
  assert.equal(out.dailyGoalJustCompleted, true);
  assert.equal(out.bonusCoins, 20);
  assert.equal(out.nextState.coins, 42);
  assert.equal(out.nextState.streak.current, 1);
  state = out.nextState;

  // Third task same day does NOT re-award daily goal bonus
  out = applyActivityReward(state, { coinsEarned: 20, xpEarned: 20, taskKey: 'challenge', today: '2026-11-01' });
  assert.equal(out.dailyGoalJustCompleted, false);
  assert.equal(out.bonusCoins, 0);
  state = out.nextState;

  // Skip 2026-11-02 -> complete on 2026-11-03 (gap=2): consumes starter freeze, streak = 2
  state = applyActivityReward(state, { coinsEarned: 12, xpEarned: 15, taskKey: 'practice', today: '2026-11-03' }).nextState;
  out = applyActivityReward(state, { coinsEarned: 10, xpEarned: 10, taskKey: 'wordsmith', today: '2026-11-03' });
  assert.equal(out.freezeUsed, true);
  assert.equal(out.nextState.streak.freezes, 0);
  assert.equal(out.nextState.streak.current, 2);
  state = out.nextState;

  // 2026-11-04 (consecutive): streak = 3 -> 3-day milestone (+20 bonus on top of +20 daily bonus = +40)
  state = applyActivityReward(state, { coinsEarned: 12, xpEarned: 15, taskKey: 'practice', today: '2026-11-04' }).nextState;
  out = applyActivityReward(state, { coinsEarned: 10, xpEarned: 10, taskKey: 'wordsmith', today: '2026-11-04' });
  assert.equal(out.milestoneReached, 3);
  assert.equal(out.bonusCoins, 40);
  state = out.nextState;

  // 2026-11-05 (4th check-in) & 2026-11-06 (5th check-in -> earns +1 shield card)
  state = applyActivityReward(state, { coinsEarned: 12, xpEarned: 15, taskKey: 'practice', today: '2026-11-05' }).nextState;
  state = applyActivityReward(state, { coinsEarned: 10, xpEarned: 10, taskKey: 'wordsmith', today: '2026-11-05' }).nextState;
  state = applyActivityReward(state, { coinsEarned: 12, xpEarned: 15, taskKey: 'practice', today: '2026-11-06' }).nextState;
  out = applyActivityReward(state, { coinsEarned: 10, xpEarned: 10, taskKey: 'wordsmith', today: '2026-11-06' });
  assert.equal(out.freezeEarned, true);
  assert.equal(out.nextState.streak.freezes, 1);
  assert.equal(diffDays('2026-11-01', '2026-11-06'), 5);
});

test('sanitizeRewardsState & getActiveTitle block tampered/corrupted values', () => {
  const dirty = sanitizeRewardsState(
    {
      coins: -999,
      xp: Number.NaN,
      activeTitleId: 'guardian', // requires 600 XP
      wishes: [
        { id: 'w1', title: 'Valid Wish', cost: -50, emoji: '🍦' },
        { id: '', title: 'Broken Wish', cost: 10, emoji: '❌' }
      ],
      redemptions: [
        {
          id: 'r1',
          wishId: 'w1',
          title: 'Test',
          cost: 99999999,
          emoji: '🎁',
          status: 'hacked' as 'pending',
          requestedAt: -10
        }
      ]
    },
    '2026-11-14'
  );

  assert.equal(dirty.coins, 0);
  assert.equal(dirty.xp, 0);
  assert.equal(getActiveTitle(dirty).id, 'rookie');
  assert.equal(dirty.wishes.length, 1);
  assert.equal(dirty.wishes[0].cost, 1);
  assert.equal(dirty.redemptions[0].status, 'pending');
  assert.equal(dirty.redemptions[0].cost, 100_000);
  assert.equal(normalizeForToday(dirty, '2026-11-15').daily.date, '2026-11-15');
});

test('isAllowedVanpowerRedirectUrl blocks open redirects, XSS schemes, and spoofing', () => {
  assert.equal(isAllowedVanpowerRedirectUrl('https://vanpower.live/dashboard', false), true);
  assert.equal(isAllowedVanpowerRedirectUrl('https://k12.vanpower.live/#/s/english', false), true);
  assert.equal(isAllowedVanpowerRedirectUrl('https://wordsmith.vanpower.live/?foo=1', false), true);

  // Rejects spoofing, scheme downgrades, javascript:, data:, and localhost in prod
  assert.equal(isAllowedVanpowerRedirectUrl('https://vanpower.live.evil.com/steal', false), false);
  assert.equal(isAllowedVanpowerRedirectUrl('https://evilvanpower.live/', false), false);
  assert.equal(isAllowedVanpowerRedirectUrl('http://k12.vanpower.live/', false), false);
  assert.equal(isAllowedVanpowerRedirectUrl('javascript:alert(document.cookie)', false), false);
  assert.equal(isAllowedVanpowerRedirectUrl('data:text/html,<script>alert(1)</script>', false), false);
  assert.equal(isAllowedVanpowerRedirectUrl('http://localhost:3000/', false), false);
  assert.equal(isAllowedVanpowerRedirectUrl('http://localhost:3000/', true), true);
});

test('isValidDiscordWebhookUrl blocks SSRF/non-Discord URLs and accepts genuine webhooks', () => {
  assert.equal(
    isValidDiscordWebhookUrl('https://discord.com/api/webhooks/123456789012345678/AbCdEfGhIjKlMnOpQrStUvWxYz-123_456'),
    true
  );
  assert.equal(
    isValidDiscordWebhookUrl('https://discordapp.com/api/v10/webhooks/987654321/token_abc'),
    true
  );

  assert.equal(isValidDiscordWebhookUrl('http://discord.com/api/webhooks/123/abc'), false);
  assert.equal(isValidDiscordWebhookUrl('https://discord.com.attacker.io/api/webhooks/123/abc'), false);
  assert.equal(isValidDiscordWebhookUrl('http://127.0.0.1:8787/api/v1/events'), false);
  assert.equal(isValidDiscordWebhookUrl('https://discord.com/channels/123/456'), false);
  assert.equal(isValidDiscordWebhookUrl('javascript:alert(1)'), false);
});
