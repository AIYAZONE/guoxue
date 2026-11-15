# 站徽源文件

`logo.html` 是站徽的唯一真源：512×512 的 SVG，用浏览器打开后按 512×512 视口截图即可导出 `icons/icon-512.png`。

- 字体：**马善政毛笔楷书 Ma Shan Zheng**，SIL Open Font License 1.1，可商用（含商标/logo）
- 视觉：朱砂印泥底（`#a83e2c → #8a2c1f` 微渐变）+ 白文楷书「国学」竖排；无边框
- 质感：两层 `feTurbulence` 颗粒（一深一浅）+ 字形 `feDisplacementMap` 细碎墨边 + 径向压暗
- 派生：`maskable-512.png` 是把字形内容缩到 84%（安全区）后重新导出

## 重新导出

```bash
# 字体不随仓库提交（5.8 MB），首次导出前下载：
mkdir -p .logo-build
curl -L -o .logo-build/mashanzheng.ttf \
  https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf

# 起个静态服务，浏览器打开 scripts/logo/logo.html，按 512×512 视口截图：
python3 -m http.server 8000
```

导出后用 `sips -z 192 192`、`sips -z 180 180` 生成 `icon-192.png` 与 `apple-touch-icon.png`。
