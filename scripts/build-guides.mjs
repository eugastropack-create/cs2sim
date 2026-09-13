import fs from 'node:fs/promises';
const source = await fs.readFile(new URL('../src/content/guide.js', import.meta.url), 'utf8');
const { GUIDE, GUIDE_SECTIONS } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const escape = text => String(text).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
const urls = ['https://skinsimulator.com/'];
for (const lang of ['en', 'tr']) {
  const copy = GUIDE[lang];
  await fs.mkdir(`public/guides/${lang}`, { recursive: true });
  for (const { id } of GUIDE_SECTIONS) {
    const section = copy[id];
    const url = `https://skinsimulator.com/guides/${lang}/${id}.html`;
    urls.push(url);
    const content = section.blocks.map(block => block.type === 'ul' ? `<ul>${block.items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>` : `<${block.type === 'h3' ? 'h2' : 'p'}>${escape(block.text)}</${block.type === 'h3' ? 'h2' : 'p'}>`).join('\n');
    await fs.writeFile(`public/guides/${lang}/${id}.html`, `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(section.title)} | SkinSimulator</title><meta name="description" content="${escape(section.blocks.find(block => block.type === 'p')?.text.slice(0, 160) || section.title)}"><link rel="canonical" href="${url}"><link rel="alternate" hreflang="en" href="https://skinsimulator.com/guides/en/${id}.html"><link rel="alternate" hreflang="tr" href="https://skinsimulator.com/guides/tr/${id}.html"><style>html{color-scheme:light dark}body{font:17px/1.75 system-ui,sans-serif;margin:auto;padding:24px;max-width:1000px;background:Canvas;color:CanvasText}header,nav{display:flex;flex-wrap:wrap;gap:16px;align-items:center}nav{padding-block:20px;border-block:1px solid GrayText;font-size:14px}a{color:LinkText;text-underline-offset:4px}main{max-width:760px;margin:40px auto}h1{font-size:clamp(28px,5vw,42px);line-height:1.2}h2{font-size:23px;margin-top:36px}footer{border-top:1px solid GrayText;padding-top:20px;font-size:13px}p,li{overflow-wrap:anywhere}</style></head><body><header><a href="/">SkinSimulator · ${lang === 'tr' ? 'Simülatörü aç' : 'Open simulator'}</a><a href="/guides/${lang === 'tr' ? 'en' : 'tr'}/${id}.html">${lang === 'tr' ? 'English' : 'Türkçe'}</a></header><nav aria-label="${lang === 'tr' ? 'Rehberler' : 'Guides'}">${GUIDE_SECTIONS.map(section => `<a href="/guides/${lang}/${section.id}.html"${section.id === id ? ' aria-current="page"' : ''}>${escape(copy[section.id].title)}</a>`).join('')}</nav><main><article><h1>${escape(section.title)}</h1>${content}</article></main><footer>${lang === 'tr' ? 'Bağımsız eğlence ve öğrenme aracı. Valve ile bağlantılı değildir. Sanal eşyalar gerçek oyuna aktarılamaz.' : 'An independent entertainment and learning tool. Not affiliated with Valve. Virtual items cannot be transferred to the game.'}</footer></body></html>`);
  }
}
await fs.writeFile('public/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`);
await fs.writeFile('public/robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://skinsimulator.com/sitemap.xml\n');
await fs.mkdir('public/prices', { recursive: true });
// Dağıtımda bootstrap dosyası varsa yerinde kalır; otomatik yenileme prices-data dalındadır.
await fs.writeFile('public/ads.txt', 'google.com, pub-5440958179084157, DIRECT, f08c47fec0942fa0\n');
console.log('12 rehber sayfası, sitemap.xml, robots.txt ve ads.txt üretildi.');
