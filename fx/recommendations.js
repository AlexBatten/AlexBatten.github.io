// ── 06 Recommendations: marks that write themselves ──
// The Recommendations modal has no stage of its own: its picture is the two
// glyph marks set into the entries (REC_MARKS in content.js). As the card
// opens, the quotation mark decodes out of dim, flickering digits, settling
// and brightening from the bottom up, and the check writes itself along its
// stroke, from the short arm down and then up the long one. The skill stamps
// (styles.css) press in once both have settled. It runs for about a second
// and then stops; the marks are left as text.
//
// Only 0 and 1 flicker, and only in cells that end as a digit. They share a
// width in the tabular-digit font setting, so no line shifts while it runs.

(function () {
    'use strict';
    if (!window.MODAL_FX) return;

    var FLICKER_MS = 45;        // how often an unsettled digit changes
    var QUOTE_FROM = 60, QUOTE_SPAN = 640;    // ms window the quote settles in
    var CHECK_FROM = 520, CHECK_SPAN = 520;   // ms window the check is written in

    function rng(seed) {
        var s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Rewrites a mark as one span per visible character, keeping the accent
    // on the digits that had it, and returns those cells with their grid
    // positions.
    function split(pre) {
        var chars = [];
        (function walk(node, accent) {
            for (var n = node.firstChild; n; n = n.nextSibling) {
                if (n.nodeType === 3) {
                    for (var i = 0; i < n.data.length; i++) chars.push({ ch: n.data.charAt(i), ac: accent });
                } else if (n.nodeType === 1) {
                    walk(n, accent || n.classList.contains('ac'));
                }
            }
        })(pre, false);

        var frag = document.createDocumentFragment(), cells = [], row = 0, col = 0, rows = 1;
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i];
            if (c.ch === '\n') { frag.appendChild(document.createTextNode('\n')); row++; rows++; col = 0; continue; }
            if (c.ch === ' ') { frag.appendChild(document.createTextNode(' ')); col++; continue; }
            var span = document.createElement('span');
            if (c.ac) span.className = 'ac';
            span.textContent = c.ch;
            frag.appendChild(span);
            cells.push({ el: span, ch: c.ch, digit: c.ch === '0' || c.ch === '1', row: row, col: col, at: 0, done: false });
            col++;
        }
        pre.textContent = '';
        pre.appendChild(frag);
        return { cells: cells, rows: rows };
    }

    // Where a cell sits along the check's stroke, 0 at the start of the short
    // arm and 1 at the tip of the long one: the nearest point on the two-arm
    // path through the drawn cells' bounding box.
    function strokeOrder(cells) {
        var minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
        cells.forEach(function (c) {
            minC = Math.min(minC, c.col); maxC = Math.max(maxC, c.col);
            minR = Math.min(minR, c.row); maxR = Math.max(maxR, c.row);
        });
        var w = Math.max(1, maxC - minC), h = Math.max(1, maxR - minR);
        // In a box of width 1 and height 1: start, bottom vertex, tip.
        var pts = [[0.02, 0.45], [0.38, 1], [1, 0]];
        var len1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
        var len2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
        cells.forEach(function (c) {
            var x = (c.col - minC) / w, y = (c.row - minR) / h, best = Infinity, along = 0;
            for (var s = 0; s < 2; s++) {
                var a = pts[s], b = pts[s + 1], dx = b[0] - a[0], dy = b[1] - a[1];
                var t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
                var d = Math.hypot(a[0] + dx * t - x, a[1] + dy * t - y);
                if (d < best) { best = d; along = s === 0 ? t * len1 : len1 + t * len2; }
            }
            c.order = along / (len1 + len2);
        });
    }

    MODAL_FX.register('recommendations', function (stage, api) {
        var content = document.getElementById('modal-content');
        var marks = content ? content.querySelectorAll('.rec-mark') : [];
        // Arriving after the marks have already faded in (a slow first
        // fetch), hiding them again to write them in would only flicker, and
        // the stamps' fixed delay would no longer follow the check.
        if (marks.length < 2 || api.reduced() || api.sinceOpen() > 150) return {};

        var r = rng(606);
        var quote = split(marks[0]), check = split(marks[1]);
        var all = quote.cells.concat(check.cells);

        // The quote settles from the bottom up with some scatter, so the
        // mark seems to surface out of noise.
        quote.cells.forEach(function (c) {
            var up = 1 - c.row / Math.max(1, quote.rows - 1);
            c.at = QUOTE_FROM + QUOTE_SPAN * (up * 0.55 + r() * 0.45);
            c.el.style.opacity = '0.3';
        });
        // The check is hidden until the stroke reaches each cell.
        strokeOrder(check.cells);
        check.cells.forEach(function (c) {
            c.at = CHECK_FROM + CHECK_SPAN * c.order;
            c.hidden = true;
            c.el.style.visibility = 'hidden';
        });

        var raf = 0, t0 = performance.now(), lastFlick = -Infinity, dead = false;

        function settle(c) {
            c.done = true;
            c.el.textContent = c.ch;
            c.el.style.visibility = '';
            c.el.style.opacity = '';
        }

        function finish() {
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
            all.forEach(function (c) { if (!c.done) settle(c); });
        }

        function frame(now) {
            raf = 0;
            if (dead) return;
            var t = now - t0, flick = now - lastFlick >= FLICKER_MS, left = 0;
            if (flick) lastFlick = now;
            for (var i = 0; i < all.length; i++) {
                var c = all[i];
                if (c.done) continue;
                if (t >= c.at) { settle(c); continue; }
                left++;
                // A check cell shows up a moment before it settles, as the
                // pen's leading edge.
                if (c.hidden && t >= c.at - 90) { c.hidden = false; c.el.style.visibility = ''; }
                if (flick && c.digit && !c.hidden) c.el.textContent = r() < 0.5 ? '0' : '1';
            }
            if (left) raf = requestAnimationFrame(frame);
        }

        raf = requestAnimationFrame(frame);

        return {
            // Closing mid-way shows the finished marks for the fade-out.
            visible: function (on) { if (!on) finish(); },
            theme: function () {},
            destroy: function () {
                dead = true;
                finish();
            }
        };
    });
})();
