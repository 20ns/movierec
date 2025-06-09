const fs = require('fs');
const path = require('path');

const YOUR_WEBSITE_URL = 'https://www.movierec.net';
const BLOG_DIR = path.join(__dirname, 'public', 'blog');
const SITEMAP_PATH = path.join(__dirname, 'public', 'sitemap.xml');

// Generate enhanced sitemap with better metadata
function generateSitemap() {
  try {
    console.log('🔄 Generating sitemap...');
    
    const files = fs.readdirSync(BLOG_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));
    
    console.log(`📝 Found ${mdFiles.length} blog posts`);

    const urls = mdFiles.map(file => {
      const slug = file.replace(/\.md$/, '');
      const filePath = path.join(BLOG_DIR, file);
      const stats = fs.statSync(filePath);
      const lastmod = stats.mtime.toISOString().split('T')[0];
      
      return `  <url>
    <loc>${YOUR_WEBSITE_URL}/blog/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    // Add static pages with priorities
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/blog', priority: '0.9', changefreq: 'weekly' },
      { url: '/auth', priority: '0.5', changefreq: 'monthly' },
      { url: '/signup', priority: '0.5', changefreq: 'monthly' },
      { url: '/signin', priority: '0.5', changefreq: 'monthly' }
    ];

    staticPages.forEach(page => {
      urls.unshift(`  <url>
    <loc>${YOUR_WEBSITE_URL}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
    });

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urls.join('\n')}
</urlset>`;

    fs.writeFileSync(SITEMAP_PATH, sitemap);
    console.log(`✅ Sitemap generated successfully at ${SITEMAP_PATH}`);
    console.log(`📊 Total URLs: ${urls.length}`);
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

generateSitemap();