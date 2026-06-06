# imagedown

一个简单易用的图片下载爬虫 CLI 工具，用于从网页中批量下载图片。

## 安装

```bash
npx @yujiangan/imagedown
```

## 使用方法

```bash
npx @yujiangan/imagedown [选项] <网页URL> <保存文件夹>
```

### 参数说明

- `<网页URL>`: 要爬取图片的网页地址
- `<保存文件夹>`: 图片保存的本地文件夹路径
- `-c, --concurrency <数量>`: 并发下载数量（默认: 1）

### 使用示例

```bash
# 基础用法：下载图片到 ./images 文件夹
npx @yujiangan/imagedown https://www.bing.com/images/ ./images

# 使用 5 个并发下载
npx @yujiangan/imagedown -c 5 https://www.bing.com/images/ ./images

# 查看帮助信息
npx @yujiangan/imagedown --help
```

## 推荐测试网站

以下网站没有反爬虫限制，适合测试使用：

- **Bing 图片**: `https://www.bing.com/images/`

## 功能特性

- 🚀 支持并发下载，提高下载速度
- 🎯 自动识别图片格式（JPG, PNG, GIF, WebP, SVG 等）
- 📦 支持多种图片来源（网络 URL 和 Data URI）
- 🔄 自动添加 User-Agent，提高兼容性
- 📁 自动创建保存目录

## 技术栈

- TypeScript
- Node.js Fetch API
- Yargs（命令行参数解析）

## License

ISC
