# Vanpower K12 统一学习门户（Monorepo）

Vanpower K12 (`https://k12.vanpower.live`) 是面向六年级 / 七年级学生的全科整合学习平台，将原各单科独立应用、Cloud Functions 与家长督学看板统一收敛至同一个仓库维护与部署。

## 目录结构

```text
/Users/azwan/Projects/k12
├── src/
│   ├── k12/                      # 门户核心（首页、学科页、题库练习、作文、头像/勋章、家长绑定、督学看板 `#/parent`）
│   ├── apps/
│   │   ├── wordsmith/            # 英语 Wordsmith AI 造句与词库
│   │   ├── mathgenius/           # 数学 MathGenius 自适应 AI 出题与错题诊断
│   │   └── humanity/             # 中华人文大闯关（3 季共 30 关 / 300 题）
│   ├── components/               # 控制台弹窗（门户资料、家长/学生邮箱绑定、心愿核销）
│   ├── data/                     # 年级与学科/练习题库数据
│   ├── hooks/                    # Auth / Profile / Rewards React Context Hooks
│   └── lib/                      # Firebase 初始化与安全校验工具
├── functions/                    # 统一托管的 K12 Firebase Cloud Functions (`codebase: "k12"`)
│   ├── index.js                  # generateMathQuestions, getFinalFeedback, generateWordsmithBatch, evaluateWordsmithSentence
│   └── package.json
├── firestore.rules               # Firestore 安全规则（含 /users, /guardian_links, /student_progress 及 activities 子集合）
└── firebase.json                 # Hosting (k12-vanpower), Firestore, Functions (codebase: k12)
```

## 常用命令

```bash
npm install
npm run dev      # 启动本地开发服务器 (port 3000)
npm test         # 运行 src/k12/__tests__ 单元测试
npm run lint     # TypeScript 类型检查 (tsc --noEmit)
npm run build    # 构建生产包至 dist/
```

## 部署注意事项（重要）

Firebase 项目 `vanpower-f15f9` 与主站及其他服务共享云函数命名空间。**严禁**执行无过滤的全局 `firebase deploy --only functions`。请仅定向部署本仓库维护的 4 个 K12 函数：

```bash
firebase deploy --only firestore:rules,hosting --project vanpower-f15f9
firebase deploy --only functions:k12:generateMathQuestions,functions:k12:getFinalFeedback,functions:k12:evaluateWordsmithSentence,functions:k12:generateWordsmithBatch --project vanpower-f15f9
```

## 家长督学功能说明

1. 家长登录 K12 门户，在「控制台 -> 添加与管理学生」或 `#/parent` 页面绑定孩子登录使用的 Google 邮箱。
2. 孩子使用该邮箱登录 K12 门户并学习或完成练习后，系统自动回写授权标识（`studentUid`）并同步 `/student_progress/{uid}` 与 `/activities/{id}` 明细。
3. 家长即可在顶部入口或控制台打开 `#/parent`「家长督学看板」，查看孩子各科掌握度、每日打卡、连胜、能量币、心愿核销状态以及逐题对错/AI点评/作文正文。
