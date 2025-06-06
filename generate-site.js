const fs = require('fs');
const path = require('path');

const ARTICLE_DIR = 'articles';
const OUTPUT_DIR = 'dist';
const TEMPLATE_DIR = 'templates';
const NUM_LATEST = 5;

const head = fs.readFileSync(path.join(TEMPLATE_DIR, 'head.html'), 'utf-8');
const ad = fs.readFileSync(path.join(TEMPLATE_DIR, 'ad.html'), 'utf-8');
const footer = fs.readFileSync(path.join(TEMPLATE_DIR, 'footer.html'), 'utf-8');

let searchIndex = [];
let articleList = [];

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.html')) {
      processArticle(fullPath);
    }
  });
}

function extract(tag, content) {
  const regex = new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function processArticle(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const name = extract('name', raw);
  const tags = extract('tag', raw).split(',').map(t => t.trim()).filter(Boolean);
  const abstract = extract('abstract', raw);
  const date = extract('date', raw);
  const headData = extract('head_data', raw);
  const adData = ad;
  const footerData = footer;

  const relativePath = path.relative(ARTICLE_DIR, filePath);
  const outputPath = path.join(OUTPUT_DIR, relativePath);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const finalHtml = head + '\n' + headData + '\n' + adData + '\n' + extract('ad', raw) + '\n' + footerData;
  fs.writeFileSync(outputPath, finalHtml);

  searchIndex.push({
    title: name,
    url: '/articles/' + relativePath.replace(/\\/g, '/'),
    tags,
    abstract
  });

  articleList.push({ title: name, date, url: '/articles/' + relativePath.replace(/\\/g, '/') });
}

function generateIndexPages() {
  articleList.sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = articleList.slice(0, NUM_LATEST);
  const allSorted = [...articleList].sort((a, b) => a.title.localeCompare(b.title, 'ja'));

  const latestHtml = head + '<h1>Latest Articles</h1><ul>' +
    latest.map(a => `<li><a href="${a.url}">${a.title}</a> (${a.date})</li>`).join('') +
    '</ul>' + footer;

  const allHtml = head + '<h1>All Articles</h1><ul>' +
    allSorted.map(a => `<li><a href="${a.url}">${a.title}</a> (${a.date})</li>`).join('') +
    '</ul>' + footer;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), latestHtml);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'all.html'), allHtml);
}

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
walk(ARTICLE_DIR);
generateIndexPages();
fs.writeFileSync(path.join(OUTPUT_DIR, 'search-index.json'), JSON.stringify(searchIndex, null, 2));
console.log('Site generated successfully.');
