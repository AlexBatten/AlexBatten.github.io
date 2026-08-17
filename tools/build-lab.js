#!/usr/bin/env node
//
// Regenerates everything derived from posts.js:
//
//   lab/index.html   the crawlable Lab index
//   feed.xml         RSS, which is how developers follow developers
//   sitemap.xml      static pages plus one entry per article
//
// Article bodies are hand-written at lab/<slug>.html; this only ever owns the
// files listed above. Run it after editing posts.js or adding an article:
//
//   node tools/build-lab.js
//
// It verifies that every slug has a file on disk and fails loudly if one is
// missing, so a typo cannot ship an index linking to a 404.

const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const ORIGIN = 'https://alexbatten.dk';
const POSTS = require(path.join(ROOT, 'posts.js'));

// Sitemap lastmod for the pages that are not articles. Bump when those change;
// articles carry their own date. Not derived from the clock, so rerunning the
// generator without changing anything leaves the file byte-identical.
const SITE_UPDATED = '2026-08-17';

// Static pages that are not articles. Language pairs carry hreflang alternates.
const STATIC_PAGES = [
    { loc: '/', alts: { en: '/', da: '/da/' } },
    { loc: '/da/', alts: { en: '/', da: '/da/' } },
    { loc: '/cv', alts: { en: '/cv', da: '/da/cv' } },
    { loc: '/da/cv', alts: { en: '/cv', da: '/da/cv' } },
    { loc: '/lab/' },
];

const esc = s => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const byNewest = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
const sorted = [...POSTS].sort(byNewest);

const longDate = iso => {
    const [y, m, d] = iso.split('-').map(Number);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
    return d + ' ' + months[m - 1] + ' ' + y;
};

// RFC 822, required by RSS. Fixed 10:00 +02:00 so reruns don't churn the feed.
const rfc822 = iso => {
    const d = new Date(iso + 'T10:00:00+02:00');
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const p = n => String(n).padStart(2, '0');
    return days[d.getUTCDay()] + ', ' + p(d.getUTCDate()) + ' ' + months[d.getUTCMonth()] + ' ' +
        d.getUTCFullYear() + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()) + ':' +
        p(d.getUTCSeconds()) + ' GMT';
};

// ── Guard: every slug must have an article on disk ──
const missing = sorted.filter(p => !fs.existsSync(path.join(ROOT, 'lab', p.slug + '.html')));
if (missing.length) {
    console.error('Missing article files for: ' + missing.map(p => p.slug).join(', '));
    process.exit(1);
}

// ── lab/index.html ──
const entryHtml = p => `
    <article class="lab-entry">
        <p class="article-meta"><span class="article-type">${p.type === 'note' ? 'Note' : 'Post'}</span> &middot; ${longDate(p.date)} &middot; ${p.minutes} min read</p>
        <h2><a href="/lab/${p.slug}">${esc(p.title)}</a></h2>
        <p>${esc(p.hook)}</p>
        <p>${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</p>
    </article>`;

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Lab | Alex Batten</title>
    <meta name="description" content="Notes and writeups from Alex Batten on .NET, AI agent safety, enterprise integrations, and ideas worth someone else picking up.">
    <meta name="author" content="Alex Batten">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
    <meta name="theme-color" content="#3b82f6">
    <link rel="canonical" href="${ORIGIN}/lab/">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Alex Batten">
    <meta property="og:title" content="Lab | Alex Batten">
    <meta property="og:description" content="Notes and writeups from Alex Batten on .NET, AI agent safety, enterprise integrations, and ideas worth someone else picking up.">
    <meta property="og:url" content="${ORIGIN}/lab/">
    <meta property="og:image" content="${ORIGIN}/images/og-image.png">

    <link rel="icon" href="/images/portfolio.png" type="image/png">
    <link rel="alternate" type="application/rss+xml" title="Alex Batten — Lab" href="${ORIGIN}/feed.xml">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/styles.css?v=18">
    <link rel="stylesheet" href="/privacypolicy.css?v=4">

    <script type="application/ld+json">
${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Blog',
            '@id': ORIGIN + '/lab/#blog',
            url: ORIGIN + '/lab/',
            name: 'Lab — Alex Batten',
            description: 'Notes and writeups on .NET, AI agent safety, enterprise integrations, and ideas worth someone else picking up.',
            inLanguage: 'en',
            isPartOf: { '@id': ORIGIN + '/#website' },
            author: { '@id': ORIGIN + '/#alex-batten' },
            blogPost: sorted.map(p => ({
                '@type': 'BlogPosting',
                '@id': ORIGIN + '/lab/' + p.slug + '#post',
                headline: p.title,
                description: p.hook,
                url: ORIGIN + '/lab/' + p.slug,
                datePublished: p.date + 'T10:00:00+02:00',
                inLanguage: p.lang,
                author: { '@id': ORIGIN + '/#alex-batten' },
            })),
        },
        {
            '@type': 'WebSite',
            '@id': ORIGIN + '/#website',
            url: ORIGIN + '/',
            name: 'Alex Batten',
            alternateName: 'alexbatten.dk',
            publisher: { '@id': ORIGIN + '/#alex-batten' },
        },
        {
            '@type': 'Person',
            '@id': ORIGIN + '/#alex-batten',
            name: 'Alex Batten',
            url: ORIGIN + '/',
            image: ORIGIN + '/images/og-image.png',
            jobTitle: 'Software Engineer',
            email: 'alex.batten1234@gmail.com',
            address: { '@type': 'PostalAddress', addressCountry: 'DK' },
            sameAs: ['https://github.com/AlexBatten', 'https://www.linkedin.com/in/alex-batten-48b28b2a2/'],
        },
    ],
}, null, 2).split('\n').map(l => '    ' + l).join('\n')}
    </script>
</head>
<body>

<div id="ascii-bg"></div>

<a href="/" class="back-link">&larr; Back</a>

<main class="privacy-policy-content">
    <h1>Lab</h1>
    <p>Findings, unfinished ideas, and things I wish someone had written down before I
    needed them. Notes are short and about one thing. Posts are longer. Some of it is
    meant for you to take and build.</p>
    <p><a href="/feed.xml">RSS</a> &middot; <a href="mailto:alex.batten1234@gmail.com">Tell me I'm wrong</a></p>
${sorted.length ? sorted.map(entryHtml).join('\n') : `    <div class="lab-empty">
        <p>nothing here yet. turns out the ideas were the easy part.</p>
        <p class="lab-empty-sub">the <a href="/feed.xml">feed</a> already works, if you'd like the first one to find you.</p>
    </div>`}
</main>

<footer>
    <p>&copy; 2026 Alex Batten</p>
</footer>

<script src="/ascii-bg.js?v=10"></script>
</body>
</html>
`;

// ── feed.xml ──
const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Alex Batten — Lab</title>
    <link>${ORIGIN}/lab/</link>
    <description>Notes and writeups on .NET, AI agent safety, enterprise integrations, and ideas worth someone else picking up.</description>
    <language>en</language>
    <atom:link href="${ORIGIN}/feed.xml" rel="self" type="application/rss+xml"/>${sorted.length ? '\n' : ''}${sorted.map(p => `    <item>
      <title>${esc(p.title)}</title>
      <link>${ORIGIN}/lab/${p.slug}</link>
      <guid isPermaLink="true">${ORIGIN}/lab/${p.slug}</guid>
      <pubDate>${rfc822(p.date)}</pubDate>
      <description>${esc(p.hook)}</description>
${p.tags.map(t => `      <category>${esc(t)}</category>`).join('\n')}
    </item>`).join('\n')}
  </channel>
</rss>
`;

// ── sitemap.xml ──
const today = SITE_UPDATED;
const altLinks = alts => !alts ? '' : '\n' + Object.entries(alts)
    .map(([lang, loc]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${ORIGIN}${loc}"/>`)
    .join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${alts.en}"/>`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by tools/build-lab.js from posts.js. Do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${STATIC_PAGES.map(p => `  <url>
    <loc>${ORIGIN}${p.loc}</loc>
    <lastmod>${today}</lastmod>${altLinks(p.alts)}
  </url>`).join('\n')}
${sorted.map(p => `  <url>
    <loc>${ORIGIN}/lab/${p.slug}</loc>
    <lastmod>${p.date}</lastmod>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'lab', 'index.html'), indexHtml);
fs.writeFileSync(path.join(ROOT, 'feed.xml'), feedXml);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemapXml);

console.log('lab/index.html  ' + sorted.length + ' entr' + (sorted.length === 1 ? 'y' : 'ies'));
console.log('feed.xml        ' + sorted.length + ' item' + (sorted.length === 1 ? '' : 's'));
console.log('sitemap.xml     ' + (STATIC_PAGES.length + sorted.length) + ' urls');
