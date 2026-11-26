import crypto from 'node:crypto';
import QRCode from 'qrcode';
import type { ServerConfig } from '../config.js';

export type FetchLike = typeof fetch;

export interface WeChatOAuthUserInfo {
  openid: string;
  unionid?: string;
  nickname?: string;
  headimgurl?: string;
}

export interface WeChatWebhookEvent {
  toUserName: string;
  fromUserName: string;
  msgType: string;
  event: string;
  eventKey: string;
  ticket: string;
}

export function verifyWeChatSignature(
  token: string,
  signature: string,
  timestamp: string,
  nonce: string
): boolean {
  if (!token || !signature || !timestamp || !nonce) return false;
  const sorted = [token, timestamp, nonce].sort().join('');
  const hash = crypto.createHash('sha1').update(sorted).digest('hex');
  return hash === signature;
}

function extractXmlTag(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();
  const plainRe = new RegExp(`<${tag}>([^<]*)<\\/${tag}>`, 'i');
  const plainMatch = xml.match(plainRe);
  return plainMatch ? plainMatch[1].trim() : '';
}

export function parseWeChatWebhookXml(xml: string): WeChatWebhookEvent {
  return {
    toUserName: extractXmlTag(xml, 'ToUserName'),
    fromUserName: extractXmlTag(xml, 'FromUserName'),
    msgType: extractXmlTag(xml, 'MsgType'),
    event: extractXmlTag(xml, 'Event'),
    eventKey: extractXmlTag(xml, 'EventKey'),
    ticket: extractXmlTag(xml, 'Ticket'),
  };
}

export function buildWeChatTextReplyXml(params: {
  toUser: string;
  fromUser: string;
  content: string;
}): string {
  const escapeCdata = (s: string) => s.replace(/\]\]>/g, '');
  const nowSec = Math.floor(Date.now() / 1000);
  return `<xml>
  <ToUserName><![CDATA[${escapeCdata(params.toUser)}]]></ToUserName>
  <FromUserName><![CDATA[${escapeCdata(params.fromUser)}]]></FromUserName>
  <CreateTime>${nowSec}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${escapeCdata(params.content)}]]></Content>
</xml>`;
}

export class WeChatService {
  private readonly config: ServerConfig;
  private readonly fetchImpl: FetchLike;
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(config: ServerConfig, fetchImpl: FetchLike = fetch) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  isConfigured(): boolean {
    return Boolean(this.config.wechatAppId && this.config.wechatAppSecret);
  }

  buildOAuthAuthorizeUrl(params: { redirectUri: string; state: string }): string {
    const query = new URLSearchParams({
      appid: this.config.wechatAppId,
      redirect_uri: params.redirectUri,
      response_type: 'code',
      scope: 'snsapi_userinfo',
      state: params.state,
    });
    return `https://open.weixin.qq.com/connect/oauth2/authorize?${query.toString()}#wechat_redirect`;
  }

  async getAccessToken(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('WECHAT_NOT_CONFIGURED');
    }
    const now = Date.now();
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > now + 300_000) {
      return this.accessTokenCache.token;
    }

    const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
    url.searchParams.set('grant_type', 'client_credential');
    url.searchParams.set('appid', this.config.wechatAppId);
    url.searchParams.set('secret', this.config.wechatAppSecret);

    const res = await this.fetchImpl(url.toString());
    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      errcode?: number;
      errmsg?: string;
    };
    if (!res.ok || !data.access_token) {
      throw new Error(`WeChat access_token failed: ${data.errcode ?? res.status} ${data.errmsg ?? ''}`);
    }
    const ttlMs = Math.max(60, Number(data.expires_in || 7200)) * 1000;
    this.accessTokenCache = { token: data.access_token, expiresAt: now + ttlMs };
    return data.access_token;
  }

  async exchangeOAuthCode(code: string): Promise<WeChatOAuthUserInfo> {
    if (!this.isConfigured()) {
      throw new Error('WECHAT_NOT_CONFIGURED');
    }

    const tokenUrl = new URL('https://api.weixin.qq.com/sns/oauth2/access_token');
    tokenUrl.searchParams.set('appid', this.config.wechatAppId);
    tokenUrl.searchParams.set('secret', this.config.wechatAppSecret);
    tokenUrl.searchParams.set('code', code);
    tokenUrl.searchParams.set('grant_type', 'authorization_code');

    const tokenRes = await this.fetchImpl(tokenUrl.toString());
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      openid?: string;
      unionid?: string;
      errcode?: number;
      errmsg?: string;
    };
    if (!tokenRes.ok || !tokenData.openid || !tokenData.access_token) {
      throw new Error(`WeChat OAuth token exchange failed: ${tokenData.errcode ?? tokenRes.status} ${tokenData.errmsg ?? ''}`);
    }

    try {
      const userUrl = new URL('https://api.weixin.qq.com/sns/userinfo');
      userUrl.searchParams.set('access_token', tokenData.access_token);
      userUrl.searchParams.set('openid', tokenData.openid);
      userUrl.searchParams.set('lang', 'zh_CN');
      const userRes = await this.fetchImpl(userUrl.toString());
      const userData = (await userRes.json()) as {
        openid?: string;
        unionid?: string;
        nickname?: string;
        headimgurl?: string;
      };
      const rawPhoto = typeof userData.headimgurl === 'string' ? userData.headimgurl.replace(/^http:\/\//i, 'https://') : undefined;
      return {
        openid: userData.openid || tokenData.openid,
        unionid: userData.unionid || tokenData.unionid,
        nickname: userData.nickname,
        headimgurl: rawPhoto,
      };
    } catch {
      return {
        openid: tokenData.openid,
        unionid: tokenData.unionid,
      };
    }
  }

  async getServiceUserProfile(openid: string): Promise<WeChatOAuthUserInfo> {
    try {
      const accessToken = await this.getAccessToken();
      const url = new URL('https://api.weixin.qq.com/cgi-bin/user/info');
      url.searchParams.set('access_token', accessToken);
      url.searchParams.set('openid', openid);
      url.searchParams.set('lang', 'zh_CN');
      const res = await this.fetchImpl(url.toString());
      const data = (await res.json()) as {
        openid?: string;
        unionid?: string;
        nickname?: string;
        headimgurl?: string;
      };
      const rawPhoto = typeof data.headimgurl === 'string' ? data.headimgurl.replace(/^http:\/\//i, 'https://') : undefined;
      return {
        openid: data.openid || openid,
        unionid: data.unionid,
        nickname: data.nickname,
        headimgurl: rawPhoto,
      };
    } catch {
      return { openid };
    }
  }

  async createLoginQrCode(sceneId: string, expireSeconds = 300): Promise<{ qrDataUrl: string; ticketUrl: string }> {
    const accessToken = await this.getAccessToken();
    const url = `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${encodeURIComponent(accessToken)}`;
    const res = await this.fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expire_seconds: expireSeconds,
        action_name: 'QR_STR_SCENE',
        action_info: {
          scene: { scene_str: sceneId },
        },
      }),
    });
    const data = (await res.json()) as {
      ticket?: string;
      url?: string;
      errcode?: number;
      errmsg?: string;
    };
    if (!res.ok || !data.url) {
      throw new Error(`WeChat QR create failed: ${data.errcode ?? res.status} ${data.errmsg ?? ''}`);
    }
    const qrDataUrl = await QRCode.toDataURL(data.url, { width: 240, margin: 2 });
    return { qrDataUrl, ticketUrl: data.url };
  }

  async sendReportTemplateMessage(params: {
    toOpenId: string;
    studentName: string;
    subjectTitle: string;
    scoreSummary: string;
    targetUrl: string;
  }): Promise<boolean> {
    if (!this.isConfigured() || !this.config.wechatTemplateIdReport || !params.toOpenId) {
      return false;
    }
    try {
      const accessToken = await this.getAccessToken();
      const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${encodeURIComponent(accessToken)}`;
      const nowStr = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const res = await this.fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          touser: params.toOpenId,
          template_id: this.config.wechatTemplateIdReport,
          url: params.targetUrl,
          data: {
            first: { value: `${params.studentName} 刚完成了今日学习任务` },
            keyword1: { value: params.subjectTitle },
            keyword2: { value: params.scoreSummary },
            keyword3: { value: nowStr },
            remark: { value: '点击查看详细作答记录与 AI 错题点评' },
          },
        }),
      });
      const data = (await res.json()) as { errcode?: number };
      return res.ok && data.errcode === 0;
    } catch (err) {
      console.warn('[WeChatService] Failed to send template message:', err);
      return false;
    }
  }
}
