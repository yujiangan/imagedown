
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'node:fs/promises';
import path from 'node:path'; 
import { concurrentTask } from './concurrentDownload.js';
import { log } from 'node:console';
 

const argv = yargs(hideBin(process.argv))
  .usage('Usage: imagedown [--concurrency N] <url> <folder> \n下载指定网页中的图片到本地文件夹')
  .command(
    '$0 <url> <folder>',
    '下载图片的主命令',
    (yargs) => {
      return yargs
      .positional('url',{
        describe:'要下载的网页URL',
        type: 'string',
        demandOption: true,
      })
      .positional('folder',{
        describe:'要保存图片的文件夹',
        type: 'string',
        demandOption: true,
      })
      .option( 'concurrency', {
        alias: 'c',
        type: 'number',
        default: 1,
        description: '控制图片下载的并发数量',
        coerce: (value) => {
            if (value < 1) {
              throw new Error('并发数量必须大于0');
            }
            return value;
        },
      })

    })
  
  .help()
  .alias('h', 'help')
  .showHelpOnFail(true)
  .strict()
  .parse()

 const { url, folder, concurrency } = argv;
 

// 提示信息
console.log(`Target URL: ${url}`);
console.log(`Save folder: ${folder}`);
console.log(`Concurrency: ${concurrency}`);

// 使用fetch获取HTML
async function downloadHTML(url: string)  {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch HTML: ${response.statusText}`);
  }
  return response.text();
}

// 根据正则表达式提取图片链接 
function extractImageURLs(html: string, baseURL: string) {
  const imgRegex = /<img[^>]+src=["']([^"'>]+)["'][^>]*>/gi;
  const matchs = html.matchAll(imgRegex); 
  const resultArray = [...matchs];
  
  
  const urls:string[] = [];
  for (const match of resultArray) {
    const src = match[1]
    if (src) {
      urls.push(new URL(src, baseURL).href)
    } 
  }
  

  return urls;
}

// 文件夹存在问题处理
async function ensureDirectoryExists(folder: string) {
  try {
    await fs.access(folder);
  } catch {
    await fs.mkdir(folder, { recursive: true });
  }
}

 

// 下载图片
async function downloadImage(url: string, folder: string, index: number, total: number) {
  
  try{
    console.log(`(${index}/${total}) downloading ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`下载失败: ${url}`);
    }
    
    // 从响应头获取Content-Type
    const contentType = response.headers.get('content-type');
    const mime = contentType?.split(';')[0] || '';
    
    // MIME类型到文件扩展名的映射
    const mimeToExtension: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
      'image/vnd.microsoft.icon': '.ico'
    };
    
    // 优先从MIME类型获取扩展名
    let ext = mimeToExtension[mime] || '';
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.tiff', '.ico'];
    
    // 如果MIME类型没有提供有效扩展名，则从URL获取
    if (!ext || !validExtensions.includes(ext)) {
      ext = path.extname(url).toLowerCase();
    }

    // 确保扩展名有效，如果无效则使用默认值
    if (!ext || !validExtensions.includes(ext)) {
      ext = '.jpg';
     
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    
    const customFilename = `image_${index}${ext}`;
    const filepath = path.join(folder, customFilename);
    await fs.writeFile(filepath, imageBuffer);
    }
  } catch (err) {
    console.error(`处理 ${url} 出错:`, (err as Error).message);
    throw err;  
  }
}


// 主逻辑
 
try {
  // 确保保存目录存在
  await ensureDirectoryExists(folder);
  // 下载 HTML
  const html = await downloadHTML(url);
  // 提取图片链接
  const imageUrls = extractImageURLs(html, url);
  console.log('imageUrls:', imageUrls);
  console.log(`extracted ${imageUrls.length} images from html`);
  console.log('downloading images...');
   
  // 并发下载图片
  await concurrentTask(imageUrls, concurrency, async (task, total, index) => {
    await downloadImage(task, folder, index , total);
  });
  console.log('All images downloaded.');
} catch (err) {
  console.error('Error:', (err as Error).message);
  process.exit(1);
}