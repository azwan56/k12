import { Router } from 'express';
import type { ServerConfig } from '../config.js';
import type { DbClient } from '../db/database.js';
import { upsertWeChatUser } from '../services/userService.js';
import {
  buildWeChatTextReplyXml,
  parseWeChatWebhookXml,
  verifyWeChatSignature,
  type WeChatService,
} from '../services/wechatService.js';

export function createWeChatWebhookRouter(deps: {
  db: DbClient;
  config: ServerConfig;
  wechatService: WeChatService;
}): Router {
  const { db, config, wechatService } = deps;
  const router = Router();

  router.get('/', (req, res) => {
    const signature = String(req.query.signature || '');
    const timestamp = String(req.query.timestamp || '');
    const nonce = String(req.query.nonce || '');
    const echostr = String(req.query.echostr || '');

    if (!verifyWeChatSignature(config.wechatWebhookToken, signature, timestamp, nonce)) {
      res.status(403).send('Invalid signature');
      return;
    }
    res.status(200).send(echostr);
  });

  router.post('/', async (req, res) => {
    const signature = String(req.query.signature || '');
    const timestamp = String(req.query.timestamp || '');
    const nonce = String(req.query.nonce || '');

    if (!verifyWeChatSignature(config.wechatWebhookToken, signature, timestamp, nonce)) {
      res.status(403).send('Invalid signature');
      return;
    }

    const xmlBody = typeof req.body === 'string' ? req.body : '';
    if (!xmlBody) {
      res.status(200).send('success');
      return;
    }

    const evt = parseWeChatWebhookXml(xmlBody);
    const eventName = evt.event.toLowerCase();
    let sceneId = '';

    if (eventName === 'scan' && evt.eventKey) {
      sceneId = evt.eventKey;
    } else if (eventName === 'subscribe' && evt.eventKey.startsWith('qrscene_')) {
      sceneId = evt.eventKey.slice('qrscene_'.length);
    }

    if (sceneId && evt.fromUserName) {
      const qrRow = await db.queryOne<{ scene_id: string; status: string; expires_at: number }>(
        `SELECT scene_id, status, expires_at FROM wechat_qr_sessions WHERE scene_id = $1`,
        [sceneId]
      );

      if (qrRow && qrRow.status === 'pending' && Date.now() <= Number(qrRow.expires_at)) {
        const profile = await wechatService.getServiceUserProfile(evt.fromUserName);
        const user = await upsertWeChatUser(db, profile);
        await db.execute(
          `UPDATE wechat_qr_sessions SET status = 'confirmed', user_id = $1 WHERE scene_id = $2`,
          [user.id, sceneId]
        );

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(
          buildWeChatTextReplyXml({
            toUser: evt.fromUserName,
            fromUser: evt.toUserName,
            content: 'Vanpower K12 登录成功！请返回电脑或平板页面继续学习 ✨',
          })
        );
        return;
      }
    }

    res.status(200).send('success');
  });

  return router;
}
