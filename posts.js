// ── Lab index (the "08 Lab" ball) ──
//
// Single source of truth for everything published under /lab. The modal index,
// the /lab page, feed.xml and the sitemap are all built from this list, so a new
// entry only ever gets added in one place. Run `node tools/build-lab.js` after
// editing to regenerate the generated files.
//
// Each entry:
//   slug   file at /lab/<slug>.html
//   type   'post' for a full writeup, 'note' for a short one-idea piece
//   date   ISO date, used for ordering and the feed
//   hook   one sentence; shown in the modal and the index, used as the feed summary
//   lang   BCP 47 tag. Articles are English by default; a Danish-market piece can
//          be written natively in Danish without translating the whole archive.
//
// Shape of an entry:
//
//   {
//       slug: 'some-slug',
//       type: 'note',
//       title: 'Some title',
//       date: '2026-08-17',
//       lang: 'en',
//       minutes: 4,
//       hook: 'One sentence that makes someone want to read it.',
//       tags: ['.NET', 'Testing']
//   }
//
// An empty list is fine: the index renders its own empty state rather than a
// blank panel.

const POSTS = [];

// Consumed by tools/build-lab.js under Node, and by content.js in the browser.
if (typeof module !== 'undefined' && module.exports) module.exports = POSTS;
