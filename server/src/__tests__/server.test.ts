import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { createApp } from '../app.js';
import { loadConfig } from '../config.js';
import { createDbClient } from '../db/database.js';
import { ensureSchema } from '../db/schema.js';
import type { OpenAICompatClient } from '../services/qwenService.js';

async function startTestServer(options?: {
  wechatFetch?: typeof fetch;
  qwenClient?: OpenAICompatClient;
  wechatOAuthEnabled?: boolean;
}) {
  const db = createDbClient({ sqlitePath: ':memory:' });
  await ensureSchema(db);
  const config = loadConfig({
    nodeEnv: 'test',
    jwtSecret: 'test-jwt-secret-with-at-least-32-chars',
    enableDevAuth: true,
    wechatAppId: 'wx_test_appid',
    wechatAppSecret: 'wx_test_secret',
    wechatWebhookToken: 'wx_test_token',
    wechatOAuthEnabled: options?.wechatOAuthEnabled,
    dashscopeApiKey: 'sk-test-dashscope',
    appOrigin: 'https://k12.vanpower.net',
    allowedOrigins: ['https://k12.vanpower.net', 'http://localhost:3000'],
  });

  const app = createApp({
    db,
    config,
    wechatFetch: options?.wechatFetch,
    qwenClient: options?.qwenClient,
  });

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    baseUrl,
    db,
    config,
    close: async () => {
      server.close();
      await db.close();
    },
  };
}

function extractSessionCookie(res: Response): string {
  const setCookies = res.headers.getSetCookie?.() || [];
  for (const c of setCookies) {
    if (c.startsWith('k12_cn_session=')) {
      return c.split(';')[0];
    }
  }
  const single = res.headers.get('set-cookie');
  if (single && single.startsWith('k12_cn_session=')) {
    return single.split(';')[0];
  }
  return '';
}

test('health, dev-login, profile/rewards sync, and logout flow', async () => {
  const srv = await startTestServer();
  try {
    const health = await fetch(`${srv.baseUrl}/api/health`).then((r) => r.json());
    assert.equal(health.ok, true);
    assert.equal(health.region, 'cn');
    assert.equal(health.dbDialect, 'sqlite');
    assert.equal(health.devAuthEnabled, true);

    const loginRes = await fetch(`${srv.baseUrl}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'student' }),
    });
    assert.equal(loginRes.status, 200);
    const cookie = extractSessionCookie(loginRes);
    assert.ok(cookie.startsWith('k12_cn_session='));

    const meRes = await fetch(`${srv.baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    const meJson = await meRes.json();
    assert.equal(meJson.user.uid, 'dev_student');
    assert.equal(meJson.user.email, 'u_dev_student@wechat.vanpower.net');

    const putProfileRes = await fetch(`${srv.baseUrl}/api/user/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        displayName: '小王同学',
        avatarId: 'rocket',
        grade: 'G7',
        updatedAt: Date.now(),
      }),
    });
    assert.equal(putProfileRes.status, 200);

    const stateRes = await fetch(`${srv.baseUrl}/api/user/state`, {
      headers: { Cookie: cookie },
    });
    const stateJson = await stateRes.json();
    assert.equal(stateJson.profile.displayName, '小王同学');
    assert.equal(stateJson.profile.grade, 'G7');

    const logoutRes = await fetch(`${srv.baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
    });
    assert.equal(logoutRes.status, 200);
  } finally {
    await srv.close();
  }
});

test('guardian invite code binding, parent RBAC access, and activity idempotency', async () => {
  const srv = await startTestServer();
  try {
    const parentLogin = await fetch(`${srv.baseUrl}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'parent' }),
    });
    const parentCookie = extractSessionCookie(parentLogin);

    const studentLogin = await fetch(`${srv.baseUrl}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'student' }),
    });
    const studentCookie = extractSessionCookie(studentLogin);

    const outsiderLogin = await fetch(`${srv.baseUrl}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'parent', suffix: 'outsider' }),
    });
    const outsiderCookie = extractSessionCookie(outsiderLogin);

    // Parent creates 6-digit invite
    const invRes = await fetch(`${srv.baseUrl}/api/guardian/invites`, {
      method: 'POST',
      headers: { Cookie: parentCookie },
    });
    assert.equal(invRes.status, 200);
    const { code } = await invRes.json();
    assert.match(code, /^\d{6}$/);

    // Parent cannot bind self
    const selfAccept = await fetch(`${srv.baseUrl}/api/guardian/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: parentCookie },
      body: JSON.stringify({ code }),
    });
    assert.equal(selfAccept.status, 400);

    // Student accepts invite
    const acceptRes = await fetch(`${srv.baseUrl}/api/guardian/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ code }),
    });
    assert.equal(acceptRes.status, 200);
    const { link } = await acceptRes.json();
    assert.equal(link.parentUid, 'dev_parent');
    assert.equal(link.studentUid, 'dev_student');

    // Student submits completed activity
    const now = Date.now();
    const actPayload = {
      activity: {
        id: 'act_math_1',
        studentUid: 'dev_student',
        studentEmail: 'u_dev_student@wechat.vanpower.net',
        studentEmailEncoded: 'u_dev_student%40wechat.vanpower.net',
        type: 'practice',
        subjectId: 'shanghai-math',
        title: '上海数学 · 每日练习',
        grade: 'G6',
        score: 7,
        maxScore: 8,
        accuracyPct: 88,
        durationSec: 120,
        summary: '答对 7/8 题',
        aiFeedback: null,
        essayContent: null,
        difficulty: 'standard',
        weakPoints: [],
        questionItems: [],
        wordItems: [],
        createdAt: now,
        updatedAt: now,
      },
      summary: {
        studentUid: 'dev_student',
        studentEmail: 'u_dev_student@wechat.vanpower.net',
        studentEmailEncoded: 'u_dev_student%40wechat.vanpower.net',
        displayName: '测试同学',
        avatarId: 'owl',
        photoURL: null,
        grade: 'G6',
        updatedAt: now,
        lastActivityAt: now,
        rewardsSummary: {
          coins: 24,
          xp: 15,
          activeTitleId: 'rookie',
          streakCurrent: 1,
          streakLongest: 1,
          lastCompletedDate: '2026-11-26',
          dailyDate: '2026-11-26',
          dailyTasks: { practice: true, wordsmith: false, challenge: false },
          dailyGoalAwarded: false,
          pendingRedemptionsCount: 0,
        },
        subjectStats: {},
        mathGeniusProfile: null,
        wordsmithStats: null,
        humanityProgress: null,
      },
      isComplete: true,
    };

    const postAct = await fetch(`${srv.baseUrl}/api/progress/me/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify(actPayload),
    });
    assert.equal(postAct.status, 200);
    assert.equal((await postAct.json()).skipped, false);

    // Duplicate/stale overwrite of completed activity is skipped
    const staleAct = await fetch(`${srv.baseUrl}/api/progress/me/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ ...actPayload, isComplete: false }),
    });
    assert.equal(staleAct.status, 200);
    assert.equal((await staleAct.json()).skipped, true);

    // Linked parent can read progress
    const parentRead = await fetch(`${srv.baseUrl}/api/parent/students/dev_student/progress`, {
      headers: { Cookie: parentCookie },
    });
    assert.equal(parentRead.status, 200);
    const parentData = await parentRead.json();
    assert.equal(parentData.activities.length, 1);
    assert.equal(parentData.activities[0].score, 7);

    // Unlinked outsider is blocked with 403
    const outsiderRead = await fetch(`${srv.baseUrl}/api/parent/students/dev_student/progress`, {
      headers: { Cookie: outsiderCookie },
    });
    assert.equal(outsiderRead.status, 403);
  } finally {
    await srv.close();
  }
});

test('WeChat webhook verification and QR scan login flow', async () => {
  const mockWeChatFetch: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('/cgi-bin/token')) {
      return new Response(JSON.stringify({ access_token: 'mock_access_token', expires_in: 7200 }));
    }
    if (url.includes('/cgi-bin/qrcode/create')) {
      return new Response(JSON.stringify({ ticket: 't123', url: 'https://weixin.qq.com/q/mock123' }));
    }
    if (url.includes('/cgi-bin/user/info')) {
      return new Response(
        JSON.stringify({
          openid: 'o_mock_openid_1',
          unionid: 'u_mock_unionid_1',
          nickname: '微信爸爸',
          headimgurl: 'https://thirdwx.qlogo.cn/mmopen/avatar.jpg',
        })
      );
    }
    return new Response('{}', { status: 404 });
  };

  const srv = await startTestServer({ wechatFetch: mockWeChatFetch });
  try {
    // 1. Webhook GET signature check
    const timestamp = '1700000000';
    const nonce = 'nonce123';
    const sig = crypto
      .createHash('sha1')
      .update(['wx_test_token', timestamp, nonce].sort().join(''))
      .digest('hex');

    const verifyRes = await fetch(
      `${srv.baseUrl}/api/wechat/webhook?signature=${sig}&timestamp=${timestamp}&nonce=${nonce}&echostr=hello_wx`
    );
    assert.equal(verifyRes.status, 200);
    assert.equal(await verifyRes.text(), 'hello_wx');

    // 2. Create QR login session
    const qrRes = await fetch(`${srv.baseUrl}/api/auth/wechat/qr/create`, { method: 'POST' });
    assert.equal(qrRes.status, 200);
    const { sceneId, qrDataUrl } = await qrRes.json();
    assert.ok(qrDataUrl.startsWith('data:image/png;base64,'));

    // 3. Pending before scan
    const poll1 = await fetch(`${srv.baseUrl}/api/auth/wechat/qr/status/${sceneId}`);
    assert.equal((await poll1.json()).status, 'pending');

    // 4. Simulate WeChat pushing SCAN XML webhook
    const xml = `<xml>
      <ToUserName><![CDATA[gh_service]]></ToUserName>
      <FromUserName><![CDATA[o_mock_openid_1]]></FromUserName>
      <CreateTime>1700000001</CreateTime>
      <MsgType><![CDATA[event]]></MsgType>
      <Event><![CDATA[SCAN]]></Event>
      <EventKey><![CDATA[${sceneId}]]></EventKey>
    </xml>`;

    const hookPost = await fetch(
      `${srv.baseUrl}/api/wechat/webhook?signature=${sig}&timestamp=${timestamp}&nonce=${nonce}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: xml,
      }
    );
    assert.equal(hookPost.status, 200);
    const replyXml = await hookPost.text();
    assert.ok(replyXml.includes('登录成功'));

    // 5. Polling confirms and sets HttpOnly session cookie
    const poll2 = await fetch(`${srv.baseUrl}/api/auth/wechat/qr/status/${sceneId}`);
    assert.equal(poll2.status, 200);
    const poll2Json = await poll2.json();
    assert.equal(poll2Json.status, 'confirmed');
    assert.equal(poll2Json.user.displayName, '微信爸爸');
    const wxCookie = extractSessionCookie(poll2);
    assert.ok(wxCookie.startsWith('k12_cn_session='));
  } finally {
    await srv.close();
  }
});

test('Qwen AI endpoints enforce enable_thinking=false, parse wrapped JSON, and cache Wordsmith dictionary', async () => {
  let llmCalls = 0;
  const seenThinkingFlags: unknown[] = [];

  const mockQwen: OpenAICompatClient = {
    chat: {
      completions: {
        create: async (body) => {
          llmCalls += 1;
          seenThinkingFlags.push(body.enable_thinking);
          const messages = (body.messages as Array<{ content: string }>) || [];
          const joined = messages.map((m) => m.content).join('\n');

          if (joined.includes('Provide dictionary JSON data')) {
            return {
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      items: [
                        {
                          word: 'Resilient',
                          partOfSpeech: 'adjective',
                          definition: 'Able to recover quickly from hard times.',
                          synonyms: ['strong', 'tough'],
                        },
                      ],
                    }),
                  },
                },
              ],
            };
          }

          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    items: [
                      {
                        question: 'What is 3/4 + 1/4?',
                        options: ['1', '1/2', '3/2', '2'],
                        answerIndex: 0,
                        explanation: '3/4 + 1/4 = 4/4 = 1.',
                        topic: 'Fractions',
                        difficulty: 'foundation',
                      },
                    ],
                  }),
                },
              },
            ],
          };
        },
      },
    },
  };

  const srv = await startTestServer({ qwenClient: mockQwen });
  try {
    const loginRes = await fetch(`${srv.baseUrl}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'student' }),
    });
    const cookie = extractSessionCookie(loginRes);

    // Practice generation
    const pracRes = await fetch(`${srv.baseUrl}/api/ai/practice-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'foundation',
        count: 1,
        recentStems: [],
      }),
    });
    assert.equal(pracRes.status, 200);
    const pracJson = await pracRes.json();
    assert.equal(pracJson.questions.length, 1);
    assert.equal(pracJson.questions[0].answerIndex, 0);

    // Wordsmith dictionary batch twice -> second call hits DB cache (no extra LLM call)
    const ws1 = await fetch(`${srv.baseUrl}/api/ai/wordsmith-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ words: ['Resilient'] }),
    });
    assert.equal(ws1.status, 200);
    assert.equal((await ws1.json()).data[0].word, 'Resilient');
    const callsAfterFirst = llmCalls;

    const ws2 = await fetch(`${srv.baseUrl}/api/ai/wordsmith-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ words: ['resilient'] }),
    });
    assert.equal(ws2.status, 200);
    assert.equal((await ws2.json()).data[0].word, 'Resilient');
    assert.equal(llmCalls, callsAfterFirst);
    assert.ok(seenThinkingFlags.every((f) => f === false));
  } finally {
    await srv.close();
  }
});

test('phone register, duplicate check, password login, and wechatOAuthEnabled toggle', async () => {
  const srv = await startTestServer({ wechatOAuthEnabled: false });
  try {
    const health = await fetch(`${srv.baseUrl}/api/health`).then((r) => r.json());
    assert.equal(health.wechatConfigured, false);

    // Register phone user
    const regRes = await fetch(`${srv.baseUrl}/api/auth/phone/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '13800138000',
        password: 'MySecretPassword123',
        displayName: '张同学',
        grade: 'G7',
      }),
    });
    assert.equal(regRes.status, 200);
    const regJson = await regRes.json();
    assert.equal(regJson.user.displayName, '张同学');
    assert.equal(regJson.user.provider, 'phone');
    assert.equal(regJson.user.phone, '138****8000');
    const regCookie = extractSessionCookie(regRes);
    assert.ok(regCookie.startsWith('k12_cn_session='));

    // Duplicate phone returns 409
    const dupRes = await fetch(`${srv.baseUrl}/api/auth/phone/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '13800138000',
        password: 'AnotherPassword123',
      }),
    });
    assert.equal(dupRes.status, 409);

    // Wrong password returns 401
    const badLogin = await fetch(`${srv.baseUrl}/api/auth/phone/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '13800138000',
        password: 'wrong-password',
      }),
    });
    assert.equal(badLogin.status, 401);

    // Correct password succeeds and /api/auth/me returns masked phone
    const okLogin = await fetch(`${srv.baseUrl}/api/auth/phone/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '13800138000',
        password: 'MySecretPassword123',
      }),
    });
    assert.equal(okLogin.status, 200);
    const loginCookie = extractSessionCookie(okLogin);
    assert.ok(loginCookie.startsWith('k12_cn_session='));

    const meRes = await fetch(`${srv.baseUrl}/api/auth/me`, {
      headers: { Cookie: loginCookie },
    });
    const meJson = await meRes.json();
    assert.equal(meJson.user.provider, 'phone');
    assert.equal(meJson.user.phone, '138****8000');
    assert.equal(meJson.user.displayName, '张同学');
  } finally {
    await srv.close();
  }
});
