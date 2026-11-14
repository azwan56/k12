import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGuardianLinkId,
  isValidEmailAddress,
  normalizeEmail,
  resolveGuardianWebhookTargets,
  sanitizeGuardianLink,
} from '../guardianLinks';

const VALID_HOOK_1 = 'https://discord.com/api/webhooks/123456789012345678/abcDEF_123-xyz';
const VALID_HOOK_2 = 'https://ptb.discord.com/api/webhooks/987654321098765432/token_987';

describe('guardianLinks email normalization and ID builder', () => {
  it('normalizes whitespace, casing, and rejects malformed addresses', () => {
    assert.equal(normalizeEmail('  Kid.Name@Gmail.COM \u0007 '), 'kid.name@gmail.com');
    assert.equal(isValidEmailAddress('Kid.Name@Gmail.COM'), true);
    assert.equal(isValidEmailAddress('not-an-email'), false);
    assert.equal(isValidEmailAddress(''), false);
  });

  it('builds deterministic link IDs without collisions', () => {
    const id1 = buildGuardianLinkId('parentUid123', 'A.B@example.com');
    const id2 = buildGuardianLinkId('parentUid123', 'a_b@example.com');
    assert.notEqual(id1, id2);
    assert.equal(id1, 'parentUid123__a.b%40example.com');
  });
});

describe('sanitizeGuardianLink', () => {
  it('accepts valid parent-added student links and strips malicious webhook/photo values', () => {
    const parsed = sanitizeGuardianLink('link-1', {
      parentUid: 'p1',
      parentEmail: 'Mom@Example.com',
      parentName: '妈妈',
      studentEmail: 'Kid@Example.com',
      discordWebhookUrl: VALID_HOOK_1,
      studentPhotoURL: 'javascript:alert(1)',
      studentAvatarId: 'rocket',
      createdAt: 1000,
      updatedAt: 2000,
    });
    assert.deepEqual(parsed, {
      id: 'link-1',
      parentUid: 'p1',
      parentEmail: 'mom@example.com',
      parentName: '妈妈',
      studentEmail: 'kid@example.com',
      studentUid: null,
      studentName: '',
      studentAvatarId: 'rocket',
      studentPhotoURL: null,
      discordWebhookUrl: VALID_HOOK_1,
      createdAt: 1000,
      updatedAt: 2000,
    });

    const badWebhook = sanitizeGuardianLink('link-2', {
      parentUid: 'p1',
      parentEmail: 'mom@example.com',
      studentEmail: 'kid@example.com',
      discordWebhookUrl: 'https://evil.example.com/steal',
    });
    assert.equal(badWebhook?.discordWebhookUrl, '');
    assert.equal(sanitizeGuardianLink('link-3', { parentUid: 'p1' }), null);
  });
});

describe('resolveGuardianWebhookTargets', () => {
  it('prefers unique valid guardian webhooks over student personal webhook', () => {
    const targets = resolveGuardianWebhookTargets(
      [
        { discordWebhookUrl: VALID_HOOK_1 },
        { discordWebhookUrl: VALID_HOOK_1 },
        { discordWebhookUrl: VALID_HOOK_2 },
      ],
      'https://discord.com/api/webhooks/111111111111111111/ownToken'
    );
    assert.deepEqual(targets, [
      { webhookUrl: VALID_HOOK_1, isGuardian: true },
      { webhookUrl: VALID_HOOK_2, isGuardian: true },
    ]);
  });

  it('falls back to student own webhook when no guardian webhook is configured', () => {
    const own = 'https://discord.com/api/webhooks/111111111111111111/ownToken';
    assert.deepEqual(
      resolveGuardianWebhookTargets([{ discordWebhookUrl: '' }], own),
      [{ webhookUrl: own, isGuardian: false }]
    );
    assert.deepEqual(resolveGuardianWebhookTargets([], ''), []);
  });
});
