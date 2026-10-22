---
name: suge-video-skills
description: 「苏格拉没有底」视频工坊：两种已验证风格：【漫画口播】（混知式彩色漫画 + 用户自录口播逐字对齐，竖屏 1080×1920）与【像素卡点】（像素暖光故事、无口播、文字对白，画面卡在配乐乐句上，4:3 1440×1080）。做本账号任何视频时加载，先按 §1 选风格，再读对应 STYLE.md。
---

# 苏格拉没有底 · 视频工坊（综合 skill）

## 1. 选风格

| | 漫画口播 | 像素卡点 |
|---|---|---|
| 目录 | `styles/comic-explainer/` | `styles/pixel-beat-story/` |
| 适合 | 社科/时事/历史"讲清楚一件事"：新闻追问、制度、概念辨析 | 社会痛点"讲一个人的故事"：孤独症、阿尔茨海默、留守、独居… |
| 驱动 | **用户自录口播**，逐字时间轴（faster-whisper + difflib） | **配乐**，节拍/乐句网格（beats.py） |
| 画幅 | 竖屏 1080×1920 / 30fps | 横屏 4:3 1440×1080 / 30fps（可改） |
| 时长 | 跟配音走（样板 10 分钟，7 章） | 3–4.5 分钟 |
| 画面 | 暖米纸底、Q 版彩色漫画角色（绿幕生图抠图）、章节卡、盖章、程序化图标 | 像素小屋夜景、精灵角色、会说话的小物件、HUD 计数器、打字对白 |
| 声音 | 原声一字不剪 + 程序化钢琴配乐 + 音效 + ducking | 配乐（接长/断点/回来）+ 程序化雨雷环境声，最痛处音乐停 |
| 引擎 | node 22 + @napi-rs/canvas（`render_example.js` DSL） | Remotion（weilanx-claude-videos 工程，`Ep54-example.tsx`） |
| 样板 | 《数据已经这么多，为什么还要成立一家央企？》 | 《他不是不说》《他不是来自星星》 |

判断不了就问用户一句："这期做漫画口播，还是像素卡点？"

选定后 **read_file 对应的 `STYLE.md` 全文**，按它的流程做。

## 2. 两种风格共用的账号规范（必须）

1. **封面当首帧**：每条都自制封面并压进成片开头（漫画口播：前 0.4s；像素卡点：第 0 帧）。另存一份封面图交付。
2. **水印融进画面，不加角标**：「苏格拉没有底」写进招牌、铭牌、App 顶栏、窗口标题、片尾署名等；用户明确拒绝右下角角标。
3. **先样片后全片**：漫画口播出开头到第一章（约 80s）；像素卡点出第一幕（60–70s）。用户确认画风再做全片。
4. **剧本先过审**：用户自己写稿/录音；我负责核事实（web_fetch 原始报道/研究原文）、指出多音字、逻辑跳跃、敏感表述，再动手。
5. **音频底线**：用户原声不剪不重排、不用 TTS 顶替；配乐与音效必须原创/程序化或有授权，占位曲每次交付都提醒替换。拼接音频一律 numpy 等功率交叉淡化（ffmpeg acrossfade 拆同一输入会截断）。
6. **响度**：整片 -15 LUFS，两遍 loudnorm（`shared/loudnorm.sh`），结尾淡出。
7. **角色好看**：干净、友好、精神；用户不接受丑的人物，配角也要顺眼；同一角色固定提示词骨架；绿幕/纯色底生图再抠（漫画口播 `key.py`，像素卡点 `cutout.py`）。
8. **抽帧自查再渲染**：拼联系表用 read_file 看——文字不出画、不压脸、首帧是封面、水印在、关键台词/关键词对上声音。
9. **渲染**：2 核沙箱分段并行（每段 concurrency=1），先写 /tmp 再拷进工作区（faststart 写网络盘会 IO 报错）；只改音频不重渲画面，小改只重渲受影响帧段再覆盖。
10. **内容伦理**（像素卡点尤其）：不说 AI 能治愈任何病；不把弱势群体浪漫化或他者化；故事标注虚构，不用真实儿童隐私；片尾数据写出处与年份。

## 3. 目录

```
SKILL.md                         ← 本文件（选风格 + 共用规范）
shared/loudnorm.sh               两遍 loudnorm
styles/comic-explainer/        【漫画口播】
  STYLE.md                       风格规格、版式坐标、动画 DSL、对齐与混音流程
  templates/ lib.js render_example.js audio.py wh.py align2.py key.py mux.sh
  examples/  封面/抽帧示例、角色样例、文字稿格式（#开头 / #章节 标记）
styles/pixel-beat-story/       【像素卡点】
  STYLE.md                       风格、剧本公式、卡点规则、配乐整形、版式、QA
  references/ story.md layout.md
  scripts/ beats.py music_tools.py sfx.sh cutout.py contact.sh stills.mjs render.sh mux.sh
  template/ Ep54-example.tsx ep54-music-ops.json ep54-script-example.md assets/
```

## 4. 环境

- 通用：ffmpeg ≥6、python3 + numpy scipy pillow；中文字体。
- 漫画口播：node 22 + `@napi-rs/canvas`；faster-whisper（喂 numpy 数组，别传文件路径）；字体 LXGW WenKai → `fonts/wk.ttf`。`lib.js` 还需要工程目录里的 `assets/`、`map/`、`heads.json`（头像裁切表 `{name:[cx,cy,size]}`），新项目自己建。
- 像素卡点：Remotion 工程（weilanx-claude-videos，MIT；Remotion 个人/≤3 人公司免费）；Noto Sans/Serif SC。沙箱里每条 node 命令前 `export NODE_OPTIONS=--max-old-space-size=4096`，用 `./node_modules/.bin/remotion` 不用 npx。

## 5. 交付话术

一条消息说清：片长、两三个亮点（漫画口播：章节与关键画面；像素卡点：卡点设计）、音乐是否占位、问哪里想调。附成片 mp4 + 封面。
