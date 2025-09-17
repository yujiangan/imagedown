
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

// 命令行参数
const argv = yargs(hideBin(process.argv))
  .usage('Usage: imagedown [--concurrency N] <url> <folder>')
  .option('concurrency', {
    alias: 'c',
    type: 'number',
    default: 1,
    description: 'Download concurrency number'
  })
  .help()
  .alias('h', 'help')
  .argv;

// 取url和folder

const url = argv._[0];
const folder = argv._[1];

// 处理格式不对情况
if (!url || !folder) {
  yargs.showHelp();
  process.exit(1);
}

// 提示信息
console.log(`Target URL: ${url}`);
console.log(`Save folder: ${folder}`);
console.log(`Concurrency: ${argv.concurrency}`);

// 使用fetch获取HTML
async function downloadHTML(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch HTML: ${response.statusText}`);
  }
  return await response.text();
}

// 根据正则表达式提取图片链接 
function extractImageURLs(html: string, baseURL: string): string[] {
  const imgRegex = /<img[^>]+src="([^">]+)"/g;
  const urls: string[] = [];
  let match;

  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    const absoluteURL = new URL(src, baseURL).href;
    urls.push(absoluteURL);
  }

  return urls;
}

// 文件夹存在问题处理
function ensureDirectoryExists(folder: string): void {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
}

// 并发控制函数
async function concurrentDownload(
  urls: string[],
  folder: string,
  concurrency: number,
  callback: (index: number, total: number, url: string) => Promise<void>
): Promise<void> {
  let index = 0;
  const total = urls.length;
  const workers = [];

  for (let i = 0; i < concurrency; i++) {
    const worker = async () => {
      while (index < urls.length) {
        const currentIndex = index++;
        const url = urls[currentIndex];
        try {
          await callback(currentIndex + 1, total, url);
        } catch (err) {
          console.error(`Failed to process ${url}:`, (err as Error).message);
        }
      }
    };
    workers.push(worker());
  }

  await Promise.all(workers);
}

// 下载图片
async function downloadImage(url: string, folder: string, index: number, total: number): Promise<void> {
  
  try {
    console.log(`(${index}/${total}) downloading ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载失败: ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    let ext = path.extname(url).toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      ext = '.jpg';
    }
    
    const customFilename = `image_${index}${ext}`;
    const filepath = path.join(folder, customFilename);
    await fs.promises.writeFile(filepath, imageBuffer);
  } catch (err) {
    console.error(`处理 ${url} 出错:`, (err as Error).message);
    throw err;  
  }
}

// 主逻辑
(async () => {
  try {
    // 下载 HTML
    const html = await downloadHTML(url);
    // 提取图片链接
    const imageUrls = extractImageURLs(html, url);
    console.log('imageUrls:', imageUrls);
    console.log(`extracted ${imageUrls.length} images from html  images:`);
    console.log('downloading images...');

    // 创建文件夹
    ensureDirectoryExists(folder);

    // 并发下载图片
    await concurrentDownload(imageUrls, folder, argv.concurrency, async (index, total, url) => {
      await downloadImage(url, folder, index, total);
    });

    console.log('All images downloaded.');
  } catch (err) {
    console.error('Error:', (err as Error).message);
    process.exit(1);
  }
})();