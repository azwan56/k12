# Vanpower K12 国内版（阿里云 + 微信服务号 H5 + 通义千问）部署指南

本目录用于将 Vanpower K12 国内版部署至阿里云 ECS（`k12.vanpower.net`），与海外版 `k12.vanpower.live`（Firebase）完全双轨并行、互不影响。

## 1. 本地联调

1. 启动后端（SQLite 自动建表 + 测试登录）：
   ```bash
   cd server
   ENABLE_DEV_AUTH=true DASHSCOPE_API_KEY=sk-xxx npm run dev
   ```
2. 启动前端 CN 模式：
   ```bash
   npm run dev:cn
   ```
   浏览器打开 `http://localhost:3000`，点击登录即可看到微信扫码 UI 与本地测试登录按钮。

## 2. 阿里云 ECS 生产部署

1. 复制环境变量模板并填写真实密钥：
   ```bash
   cp deploy/cn/.env.cn.example deploy/cn/.env
   ```
2. 启动容器栈（监听本机 `127.0.0.1:8088`）：
   ```bash
   docker compose --env-file deploy/cn/.env -f deploy/cn/docker-compose.yml up -d --build
   ```
3. 在宿主机 Nginx 配置 `k12.vanpower.net` HTTPS 反向代理到 `http://127.0.0.1:8088`。

## 3. 微信服务号后台配置

1. **网页授权域名**（公众号后台 → 设置与开发 → 功能设置）：添加 `k12.vanpower.net`（并按微信要求放验证文件或配置 Nginx）。
2. **JS 接口安全域名**：添加 `k12.vanpower.net`。
3. **服务器配置（用于 PC/iPad 扫码事件）**：
   - URL：`https://k12.vanpower.net/api/wechat/webhook`
   - Token：与 `.env` 中 `WECHAT_WEBHOOK_TOKEN` 一致
   - 消息加解密方式：明文模式或兼容模式
4. **模板消息（可选）**：申请学习完成通知模板后，将模板 ID 填入 `WECHAT_TEMPLATE_ID_REPORT`。
