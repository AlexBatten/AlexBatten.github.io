#!/usr/bin/env node
//
// Regenerates everything derived from posts.js:
//
//   lab/index.html   the crawlable Lab index
//   sitemap.xml      static pages plus one entry per article
//
// Article bodies are hand-written at lab/<slug>.html; this only ever owns the
// files listed above. Run it after editing posts.js or adding an article:
//
//   node tools/build-lab.js
//
// It verifies that every slug has a file on disk and fails loudly if one is
// missing, so a typo cannot ship an index linking to a 404.
//
// Each sitemap entry carries its own lastmod:
//
//   hand-written pages   the dateModified in the page's own JSON-LD, read from
//                        the file. Bump it in the page when its content changes
//                        (content.js counts as content of / and /da/, which
//                        render it), then rerun this.
//   articles             `updated` in posts.js if set, otherwise `date`
//   the /lab index       LAB_INDEX_UPDATED or the newest article, whichever is
//                        later
//
// None of it comes from the clock or file mtimes, so rerunning the generator
// without changing anything leaves both files byte-identical. A date typed into
// sitemap.xml by hand is lost on the next run.

const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
const ORIGIN = 'https://alexbatten.dk';
const POSTS = require(path.join(ROOT, 'posts.js'));

// lab/index.html is generated here and has no hand-edited dateModified to read.
// Bump this when its template below changes.
const LAB_INDEX_UPDATED = '2026-10-21T02:45:00+02:00';

// Static pages that are not articles. Language pairs carry hreflang alternates;
// `file` is where the page's dateModified is read from.
const STATIC_PAGES = [
    { loc: '/', file: 'index.html', alts: { en: '/', da: '/da/' } },
    { loc: '/da/', file: 'da/index.html', alts: { en: '/', da: '/da/' } },
    { loc: '/cv', file: 'cv.html', alts: { en: '/cv', da: '/da/cv' } },
    { loc: '/da/cv', file: 'da/cv.html', alts: { en: '/cv', da: '/da/cv' } },
    { loc: '/lab/' },
];

const esc = s => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fail = msg => {
    console.error(msg);
    process.exit(1);
};

// ISO 8601 date-time with an explicit offset, as used in lastmod and
// dateModified.
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// posts.js holds plain dates; `updated` may also be a full timestamp. A bare
// date is stamped at 10:00 Copenhagen summer time, the time datePublished has
// always carried.
const stamp = d => (DATE.test(d) ? d + 'T10:00:00+02:00' : d);
const later = (a, b) => (Date.parse(b) > Date.parse(a) ? b : a);

// The dateModified of the JSON-LD node describing `url` in a hand-written page.
// Parsing every block also means a JSON-LD syntax error fails the build here
// instead of shipping silently.
const pageModified = (file, url) => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    let found = null;
    for (const [, json] of blocks) {
        let data;
        try {
            data = JSON.parse(json);
        } catch (e) {
            fail(file + ': JSON-LD does not parse: ' + e.message);
        }
        for (const node of data['@graph'] || [data]) {
            if (node.url === url && node.dateModified) found = node.dateModified;
        }
    }
    if (!found) fail(file + ': no JSON-LD node with url ' + url + ' and a dateModified');
    if (!TIMESTAMP.test(found)) fail(file + ': dateModified ' + found + ' needs a time and an offset');
    return found;
};

// ── Guard: dates in posts.js are dates, and `updated` is not before `date` ──
for (const p of POSTS) {
    if (!DATE.test(p.date)) fail(p.slug + ': date ' + p.date + ' is not YYYY-MM-DD');
    if (p.updated === undefined) continue;
    if (!DATE.test(p.updated) && !TIMESTAMP.test(p.updated)) {
        fail(p.slug + ': updated ' + p.updated + ' is neither YYYY-MM-DD nor a timestamp with an offset');
    }
    if (Date.parse(stamp(p.updated)) < Date.parse(stamp(p.date))) {
        fail(p.slug + ': updated ' + p.updated + ' is before date ' + p.date);
    }
}

const modified = p => stamp(p.updated || p.date);

const byNewest = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
const sorted = [...POSTS].sort(byNewest);

const longDate = iso => {
    const [y, m, d] = iso.split('-').map(Number);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December'];
    return d + ' ' + months[m - 1] + ' ' + y;
};

// ── Guard: every slug must have an article on disk ──
const missing = sorted.filter(p => !fs.existsSync(path.join(ROOT, 'lab', p.slug + '.html')));
if (missing.length) {
    console.error('Missing article files for: ' + missing.map(p => p.slug).join(', '));
    process.exit(1);
}

// ── lab/index.html ──
// The page descriptions say so while the archive is empty, and drop the sentence
// by themselves once the first article lands.
const NOTHING_YET = sorted.length ? '' : ' Nothing published yet.';
const PAGE_DESCRIPTION = 'Notes and posts from Alex Batten on .NET, AI agent safety, and enterprise integrations.' + NOTHING_YET;
const BLOG_DESCRIPTION = 'Notes and posts on .NET, AI agent safety, and enterprise integrations.' + NOTHING_YET;

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
    <meta name="description" content="${esc(PAGE_DESCRIPTION)}">
    <meta name="author" content="Alex Batten">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
    <meta name="theme-color" content="#3b82f6">
    <link rel="canonical" href="${ORIGIN}/lab/">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Alex Batten">
    <meta property="og:title" content="Lab | Alex Batten">
    <meta property="og:description" content="${esc(PAGE_DESCRIPTION)}">
    <meta property="og:url" content="${ORIGIN}/lab/">
    <meta property="og:image" content="${ORIGIN}/images/og-image.png?v=2">

    <link rel="icon" href="/images/portfolio.png" type="image/png">
    <script src="/theme.js?v=1"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/styles.css?v=25">
    <link rel="stylesheet" href="/privacypolicy.css?v=5">

    <script type="application/ld+json">
${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'Blog',
            '@id': ORIGIN + '/lab/#blog',
            url: ORIGIN + '/lab/',
            name: 'Lab | Alex Batten',
            description: BLOG_DESCRIPTION,
            inLanguage: 'en',
            isPartOf: { '@id': ORIGIN + '/#website' },
            author: { '@id': ORIGIN + '/#alex-batten' },
            blogPost: sorted.map(p => ({
                '@type': 'BlogPosting',
                '@id': ORIGIN + '/lab/' + p.slug + '#post',
                headline: p.title,
                description: p.hook,
                url: ORIGIN + '/lab/' + p.slug,
                datePublished: stamp(p.date),
                dateModified: modified(p),
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
            image: ORIGIN + '/images/og-image.png?v=2',
            jobTitle: 'AI Engineer',
            email: 'alex.batten1234@gmail.com',
            address: { '@type': 'PostalAddress', addressCountry: 'DK' },
            sameAs: [
                'https://github.com/AlexBatten',
                'https://www.linkedin.com/in/alex-batten-48b28b2a2',
                'https://www.nuget.org/profiles/alexbatten',
                'https://invarix.dk',
            ],
        },
    ],
}, null, 2).split('\n').map(l => '    ' + l).join('\n')}
    </script>
</head>
<body>

<div id="ascii-bg"></div>

<div class="top-left-nav">
    <a href="/" class="back-link">&larr; Back</a>
    <button class="theme-btn" id="theme-btn" aria-label="Dark mode" aria-pressed="false" title="Dark mode">
        <svg class="theme-glyph" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8"/>
            <path d="M12 4a8 8 0 0 1 0 16z"/>
        </svg>
    </button>
</div>

<main class="privacy-policy-content">
    <h1>Lab</h1>
${sorted.length ? sorted.map(entryHtml).join('\n') : `    <div class="lab-empty">
        <p>nothing here yet.</p>
    </div>`}
</main>

<footer>
    <p>&copy; 2026 Alex Batten</p>
</footer>

<script src="/ascii-bg.js?v=13"></script>
</body>
</html>
`;

// ── sitemap.xml ──
const lastmod = p => (p.file
    ? pageModified(p.file, ORIGIN + p.loc)
    : sorted.map(modified).reduce(later, LAB_INDEX_UPDATED));

const altLinks = alts => !alts ? '' : '\n' + Object.entries(alts)
    .map(([lang, loc]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${ORIGIN}${loc}"/>`)
    .join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${alts.en}"/>`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by tools/build-lab.js from posts.js. Do not edit by hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${STATIC_PAGES.map(p => `  <url>
    <loc>${ORIGIN}${p.loc}</loc>
    <lastmod>${lastmod(p)}</lastmod>${altLinks(p.alts)}
  </url>`).join('\n')}
${sorted.map(p => `  <url>
    <loc>${ORIGIN}/lab/${p.slug}</loc>
    <lastmod>${modified(p)}</lastmod>
  </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'lab', 'index.html'), indexHtml);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemapXml);

console.log('lab/index.html  ' + sorted.length + ' entr' + (sorted.length === 1 ? 'y' : 'ies'));
console.log('sitemap.xml     ' + (STATIC_PAGES.length + sorted.length) + ' urls');
