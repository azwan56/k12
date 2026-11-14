import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRADE_STORAGE_KEY,
  MAX_DISPLAY_NAME_LENGTH,
  PROFILE_STORAGE_KEY,
  createInitialProfile,
  extractRemoteProfile,
  loadLocalProfile,
  mergeProfile,
  resolveAvatarId,
  resolveProfileName,
  sanitizeDisplayName,
  sanitizeProfile,
  saveLocalProfile,
} from '../profile';

describe('sanitizeDisplayName & sanitizeProfile', () => {
  it('trims, strips control characters, collapses whitespace, and caps length', () => {
    assert.equal(sanitizeDisplayName('  Alice\u0007   Bob \n '), 'Alice Bob');
    assert.equal(sanitizeDisplayName(null), '');
    const long = 'A'.repeat(MAX_DISPLAY_NAME_LENGTH + 10);
    assert.equal(sanitizeDisplayName(long).length, MAX_DISPLAY_NAME_LENGTH);
  });

  it('creates fresh initial profile with updatedAt = 0 so remote data is never overwritten', () => {
    const initial = createInitialProfile('G7');
    assert.deepEqual(initial, {
      displayName: '',
      avatarId: 'owl',
      grade: 'G7',
      updatedAt: 0,
    });
  });

  it('sanitizes untrusted profile objects safely', () => {
    assert.deepEqual(sanitizeProfile('corrupt', 'G7'), {
      displayName: '',
      avatarId: 'owl',
      grade: 'G7',
      updatedAt: 0,
    });

    const cleaned = sanitizeProfile({
      displayName: '  小明\t\u0000 ',
      avatarId: 'xss-script',
      grade: 7,
      updatedAt: -50,
    });
    assert.deepEqual(cleaned, {
      displayName: '小明',
      avatarId: 'owl',
      grade: 'G7',
      updatedAt: 0,
    });
  });
});

describe('extractRemoteProfile & mergeProfile', () => {
  it('prefers k12Profile and falls back to top-level name when displayName is empty', () => {
    const remote = extractRemoteProfile(
      {
        name: '云端昵称',
        k12Profile: {
          displayName: '',
          avatarId: 'rocket',
          grade: 'G7',
          updatedAt: 500,
        },
      },
      'G6',
      true
    );
    assert.deepEqual(remote, {
      displayName: '云端昵称',
      avatarId: 'rocket',
      grade: 'G7',
      updatedAt: 500,
    });
  });

  it('hydrates from legacy mathgeniusProfile or top-level name when k12Profile is missing', () => {
    const fromMath = extractRemoteProfile(
      {
        name: '旧名字',
        mathgeniusProfile: {
          displayName: '数学达人',
          avatarId: 'bot',
          grade: '7年级',
          updatedAt: 200,
        },
      },
      'G6',
      false
    );
    assert.deepEqual(fromMath, {
      displayName: '数学达人',
      avatarId: 'bot',
      grade: 'G7',
      updatedAt: 200,
    });

    const fromNameOnly = extractRemoteProfile({ name: 'Leo' }, 'G6', true);
    assert.deepEqual(fromNameOnly, {
      displayName: 'Leo',
      avatarId: 'google',
      grade: 'G6',
      updatedAt: 1,
    });
    assert.equal(extractRemoteProfile({}, 'G6', true), null);
  });

  it('merges untouched local profile with remote without overwriting remote', () => {
    const local = createInitialProfile('G6');
    const remote = {
      displayName: '远端同学',
      avatarId: 'cat' as const,
      grade: 'G7' as const,
      updatedAt: 1000,
    };
    assert.deepEqual(mergeProfile(local, remote), remote);
  });

  it('prefers newer local edits over older remote and backfills blank names', () => {
    const local = {
      displayName: '',
      avatarId: 'star' as const,
      grade: 'G7' as const,
      updatedAt: 2000,
    };
    const remote = {
      displayName: '历史昵称',
      avatarId: 'owl' as const,
      grade: 'G6' as const,
      updatedAt: 1000,
    };
    assert.deepEqual(mergeProfile(local, remote), {
      displayName: '历史昵称',
      avatarId: 'star',
      grade: 'G7',
      updatedAt: 2000,
    });
  });
});

describe('resolveAvatarId & resolveProfileName', () => {
  it('falls back google avatar to owl when photoURL is absent', () => {
    assert.equal(resolveAvatarId('google', null), 'owl');
    assert.equal(resolveAvatarId('google', 'https://example.com/a.jpg'), 'google');
    assert.equal(resolveAvatarId('rocket', null), 'rocket');
  });

  it('resolves display name priority: custom -> Firebase displayName -> email -> fallback', () => {
    assert.equal(
      resolveProfileName(
        { displayName: '  自定义昵称 ' },
        { displayName: 'Google Name', email: 'leo@example.com' }
      ),
      '自定义昵称'
    );
    assert.equal(
      resolveProfileName(
        { displayName: '' },
        { displayName: 'Google Name', email: 'leo@example.com' }
      ),
      'Google Name'
    );
    assert.equal(
      resolveProfileName(
        { displayName: '' },
        { displayName: '', email: 'leo@example.com' }
      ),
      'leo'
    );
    assert.equal(resolveProfileName({ displayName: '' }, null), '小探索者');
  });
});

describe('localStorage persistence', () => {
  const originalStorage = (globalThis as any).localStorage;

  afterEach(() => {
    if (originalStorage === undefined) {
      delete (globalThis as any).localStorage;
    } else {
      (globalThis as any).localStorage = originalStorage;
    }
  });

  it('saves and loads profile while keeping k12_grade synchronized and surviving corrupt JSON', () => {
    const store = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };

    saveLocalProfile({
      displayName: '星辰',
      avatarId: 'rocket',
      grade: 'G7',
      updatedAt: 12345,
    });

    assert.equal(store.get(GRADE_STORAGE_KEY), 'G7');
    assert.deepEqual(loadLocalProfile(), {
      displayName: '星辰',
      avatarId: 'rocket',
      grade: 'G7',
      updatedAt: 12345,
    });

    store.set(PROFILE_STORAGE_KEY, '{not-valid-json');
    assert.deepEqual(loadLocalProfile(), {
      displayName: '',
      avatarId: 'owl',
      grade: 'G7',
      updatedAt: 0,
    });
  });
});
