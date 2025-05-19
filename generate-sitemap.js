const fs = require('fs');
const path = require('path');

const YOUR_WEBSITE_URL = 'https://www.movierec.net';
const BLOG_DIR = path.join(__dirname, 'public', 'blog');
const SITEMAP_PATH = path.join(__dirname, 'public', 'sitemap.xml');

try {
  const files = fs.readdirSync(BLOG_DIR);
  const mdFiles = files.filter(file => file.endsWith('.md'));

  const urls = mdFiles.map(file => {
    const slug = file.replace(/\.md$/, '');
    return `
  <url>
    <loc>${YOUR_WEBSITE_URL}/blog/${slug}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod> {/* Or get actual lastmod from file system */}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  // Add homepage URL
  urls.unshift(`
  <url>
    <loc>${YOUR_WEBSITE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  // Add main blog index page URL
  urls.unshift(`
  <url>
    <loc>${YOUR_WEBSITE_URL}/blog</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);


  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`;

  fs.writeFileSync(SITEMAP_PATH, sitemapContent);
  console.log(`Sitemap generated successfully at ${SITEMAP_PATH}`);

} catch (error) {
  console.error('Error generating sitemap:', error);
}