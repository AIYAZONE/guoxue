# 国学经典共读

> guoxue.aiyazone.com — 经典古籍在线共读入口

《大学》《中庸》《止学》《素书》《长短经》五部经典共读网站的汇总导航页面。未来持续扩充更多书目。

---

## 设计理念

古文阅读有三道门槛：**生僻字不认识**、**文言句式看不懂**、**历史背景不明所以**。

每个共读网站都内置了完整的助学体系：

| 功能 | 说明 |
|---|---|
| 🔤 逐句译文 | 原文与现代汉语逐句对照，不再"望文生义" |
| 📝 生僻字注音 | 通假字、异读字逐一标注，点按即看说明 |
| 🔍 多视角解读 | 串讲疏通文义 + 历史背景 + 现代生活启发 |
| 🧭 研读专区 | 结构脉络、概念词典、名句摘录，一目了然 |
| 📱 手机优先 | 一章一页碎片阅读，通勤午休随时翻一章 |
| 💡 章尾省察 | 每章配提问式自省，把古人智慧用在自己身上 |

---

## 已收录

| 书名 | 作者/出处 | 篇数 | 在线阅读 | GitHub |
|---|---|---|---|---|
| 大学 | 《礼记》· 曾子述 | 11 章 | [daxue.aiyazone.com](https://daxue.aiyazone.com/) | [GitHub](https://github.com/AIYAZONE/daxue) |
| 中庸 | 《礼记》· 子思述 | 33 章 | [zhongyong.aiyazone.com](https://zhongyong.aiyazone.com/) | [GitHub](https://github.com/AIYAZONE/zhongyong) |
| 止学 | 隋·王通 | 10 章 | [zhixue.aiyazone.com](https://zhixue.aiyazone.com/) | [GitHub](https://github.com/AIYAZONE/zhixue) |
| 素书 | 秦·黄石公 | 6 章 | [sushu.aiyazone.com](https://sushu.aiyazone.com/) | [GitHub](https://github.com/AIYAZONE/sushu) |
| 长短经 | 唐·赵蕤 | 64 篇 | [changduanjing.aiyazone.com](https://changduanjing.aiyazone.com/) | [GitHub](https://github.com/AIYAZONE/changduanjing) |

---

## 即将上线

- **道德经** — 老子 · 八十一章
- **冰鉴** — 曾国藩 · 七篇

---

## 技术说明

- **纯静态**：单文件 HTML，内嵌 CSS + JS，零依赖
- **数据驱动**：`BOOKS` 数组定义所有书目，新增书籍只需加一条
- **响应式**：手机 / 平板 / 桌面三断点自适应
- **体积**：约 12 KB，秒开

---

## 部署

```bash
# Vercel
cd guoxue
vercel --prod

# 绑定自定义域名
# Vercel Dashboard → Domains → guoxue.aiyazone.com
# DNS CNAME → cname.vercel-dns.com
```

---

## 底本说明

各书原文出自公有领域古籍底本精校。逐句译文、注释、解读等说明文字均为编者自撰，不摘引受版权保护的现代出版物内容。

---

## 许可

MIT License © 2026 BruceWang