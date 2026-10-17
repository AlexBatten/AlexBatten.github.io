// ── 02 Experience: the career as a git graph ──
// Each role in the Experience text becomes a branch on a time axis, earliest
// year at the left and HEAD, now, at the right. The earliest role is the root
// commit. Every later role branches off as a lane of its own: off a role that
// was still running when it began, or else off the last commit of the role
// that ended before it. Roles still running carry on to HEAD, roles that ended
// stop, and a role that is signed but not started waits past HEAD as a hollow,
// dashed commit. Roles that overlap read as parallel lanes.
//
// The roles, companies and dates are read from the modal's own entries when
// it opens, so the Danish page gets Danish labels and the picture follows the
// text. On open a column of the background's glyphs sweeps left to right and
// uncovers the lanes, one glyph per lane (1 running, 0 not, ~ signed); then
// nothing runs. Hovering a lane names it; clicking one scrolls the modal to
// its entry.
//
// The graph is SVG and is drawn once. The sweep is a card-coloured cover
// sliding off it on a compositor animation, so the main thread only wakes
// when one of the glyphs changes.

(function () {
    'use strict';
    if (!window.MODAL_FX) return;

    var SVGNS = 'http://www.w3.org/2000/svg';
    var FONT = '"Roboto Condensed", Arial, sans-serif';
    var SWEEP_MS = 2600;    // the write head crossing the stage
    var DELAY_MS = 240;     // lets the stage's fade-in start first
    var KEYS = 24;          // keyframes approximating the sweep's easing

    var TEXT = {
        en: {
            title: '$ git log --graph',
            hint: 'hover a branch, click to jump to its entry',
            tap: 'tap a branch to jump to its entry',
            head: 'HEAD'
        },
        da: {
            title: '$ git log --graph',
            hint: 'peg på en gren, klik for at hoppe til den',
            tap: 'tryk på en gren for at hoppe til den',
            head: 'HEAD'
        }
    };

    // ── Reading the entries ──
    function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

    // "Role at Company (Contract)" on the English page, "Role hos Company
    // (kontrakt)" on the Danish one. The last separator wins, so a role with
    // "at" in its own title still splits at the company.
    function splitTitle(h) {
        var cut = -1, len = 0;
        [' at ', ' hos '].forEach(function (sep) {
            var i = h.lastIndexOf(sep);
            if (i > cut) { cut = i; len = sep.length; }
        });
        var company = cut > 0 ? h.slice(cut + len) : h;
        var bare = company.replace(/\s*\([^)]*\)\s*$/, '');
        return {
            role: cut > 0 ? h.slice(0, cut) : h,
            company: company,
            // The branch name: "IT Operators / Simple Agency Group" is too
            // long for a lane, so a slash keeps only its first name.
            short: bare.split(' / ')[0]
        };
    }

    // "2024" ended within that year, "2025–Present" is still running,
    // "2023–2025" ended, and a year among words with no range ("Signed 2026,
    // not yet started") is signed but not begun. Any dash after a year makes
    // a range, so a hyphen, an en dash or an em dash all read the same.
    function parseDates(s) {
        var range = /(\d{4})\s*[^\w\s,.()]\s*(\d{4})?/.exec(s);
        if (range) return { start: +range[1], end: range[2] ? +range[2] : null, pending: false };
        var y = /\d{4}/.exec(s);
        if (!y) return null;
        var words = /[^\d\s.,]/.test(s);
        return { start: +y[0], end: words ? null : +y[0], pending: words };
    }

    // The entries as the modal shows them. CONTENT stands in if the modal
    // has none, and then there is nothing to scroll to.
    function readRoles() {
        var host = document.getElementById('modal-content');
        var els = host ? host.querySelectorAll('.entry') : [];
        var live = true;
        if (!els.length) {
            var C = typeof CONTENT !== 'undefined' ? CONTENT : null;
            if (!C || !C.experience) return [];
            var tmp = document.createElement('div');
            tmp.innerHTML = C.experience.html;
            els = tmp.querySelectorAll('.entry');
            live = false;
        }
        var out = [];
        for (var i = 0; i < els.length; i++) {
            var h = els[i].querySelector('h3'), d = els[i].querySelector('.entry-date');
            if (!h || !d) continue;
            var date = clean(d.textContent), dates = parseDates(date);
            if (!dates) continue;
            var t = splitTitle(clean(h.textContent));
            out.push({
                idx: i, el: live ? els[i] : null, role: t.role, company: t.company, short: t.short,
                date: date, start: dates.start, end: dates.end, pending: dates.pending
            });
        }
        return out;
    }

    // ── History ──
    // Lanes from the bottom up by start year; within a year, the text's own
    // order reversed, so the lanes read top to bottom in the order the
    // entries do. A role's parent is the latest earlier role still running
    // when it started (it branches off that lane), or failing that the role
    // that ended last before it (it carries on from that role's last commit).
    function arrange(roles) {
        var order = roles.slice().sort(function (a, b) {
            return a.start - b.start || (a.pending - b.pending) || b.idx - a.idx;
        });
        order.forEach(function (r, k) { r.lane = k; r.parent = null; r.after = false; });
        for (var k = 1; k < order.length; k++) {
            var r = order[k], running = null, ended = null;
            for (var j = 0; j < k; j++) {
                var p = order[j];
                if (p.pending || p.start >= r.start) continue;
                if (p.end === null || p.end >= r.start) {
                    if (!running || p.start >= running.start) running = p;
                } else if (!ended || p.end >= ended.end) {
                    ended = p;
                }
            }
            r.parent = running || ended || order[0];
            r.after = !running && !!ended;
        }
        return order;
    }

    // ── Colour ──
    function triplet(s) {
        var p = (s || '').split(',').map(function (v) { return parseFloat(v); });
        return p.length === 3 && !isNaN(p[0]) ? p : null;
    }

    function parseColor(s) {
        s = (s || '').trim();
        var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
        if (m) {
            var h = m[1].length === 3 ? m[1].replace(/(.)/g, '$1$1') : m[1], v = parseInt(h, 16);
            return [v >> 16 & 255, v >> 8 & 255, v & 255];
        }
        m = /rgba?\(([^)]+)\)/.exec(s);
        return m ? triplet(m[1].split(',').slice(0, 3).join(',')) : null;
    }

    // Paper ink at an alpha, flattened onto the card into a solid colour.
    // The branch lines share their stems, and solid strokes stay the same
    // shade where they overlap instead of darkening.
    function inker(c) {
        var paper = triplet(c.paper), card = parseColor(c.card);
        if (!paper || !card) return function (a) { return 'rgba(' + c.paper + ',' + a + ')'; };
        return function (a) {
            return 'rgb(' + Math.round(card[0] + (paper[0] - card[0]) * a) + ',' +
                Math.round(card[1] + (paper[1] - card[1]) * a) + ',' +
                Math.round(card[2] + (paper[2] - card[2]) * a) + ')';
        };
    }

    function bitColor(ch, ink) {
        return ink(ch === '1' ? 0.92 : ch === '~' ? 0.6 : 0.3);
    }

    // ── SVG ──
    function el(name, attrs, parent) {
        var e = document.createElementNS(SVGNS, name);
        for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }

    // Text in the site's face at 10px unless the attributes say otherwise.
    function text(attrs, parent) {
        var t = el('text', attrs, parent);
        if (!attrs['font-family']) t.setAttribute('font-family', FONT);
        if (!attrs['font-size']) t.setAttribute('font-size', 10);
        return t;
    }

    function textWidth(t) {
        var w = 0;
        try { w = t.getComputedTextLength(); } catch (e) {}
        return w || t.textContent.length * 5;
    }

    // Starts and ends gently but never stalls in between, so the glyphs stay
    // readable as they pass each year.
    function ease(p) {
        return 0.2 * p + 0.8 * (0.5 - 0.5 * Math.cos(Math.PI * p));
    }

    function unease(f) {
        if (f <= 0) return 0;
        if (f >= 1) return 1;
        var lo = 0, hi = 1;
        for (var i = 0; i < 24; i++) {
            var mid = (lo + hi) / 2;
            if (ease(mid) < f) lo = mid; else hi = mid;
        }
        return hi;
    }

    MODAL_FX.register('experience', function (stage, api) {
        var T = TEXT[api.lang()] || TEXT.en;
        var roles = arrange(readRoles());
        if (!roles.length) {
            api.fail();
            return { destroy: function () {}, theme: function () {}, visible: function () {} };
        }

        var dead = false, svg = null, parts = null, active = true;
        var reduced = api.reduced();
        var drawn = reduced, headShown = reduced, hovered = -1;
        var colors = api.colors(), lastW = 0, resizeObs = null, sweep = null;
        var touchQuery = window.matchMedia ? window.matchMedia('(hover: none)') : null;

        // ── Layout ──
        function build() {
            if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
            var W = stage.clientWidth || 520, H = stage.clientHeight || 190;
            lastW = W;
            var narrow = W < 400;
            var touch = narrow || !!(touchQuery && touchQuery.matches);

            // Horizontal: one column per year from the first start to the
            // last year named, the last one ending at HEAD; past HEAD is the
            // room for a role that has not begun.
            var R = narrow ? 3 : 3.5;                  // commit radius
            var x0 = (narrow ? 6 : 8) + R + 1;
            var xHead = W - (narrow ? 44 : 72);
            var xFuture = xHead + (W - xHead) * 0.6;
            var forkW = narrow ? 13 : 20;              // how far before its commit a branch leaves
            var bend = narrow ? 5 : 6;                 // elbow radius
            var minY = Infinity, maxY = -Infinity;
            roles.forEach(function (r) {
                minY = Math.min(minY, r.start);
                maxY = Math.max(maxY, r.start, r.end === null ? r.start : r.end);
            });
            var col = (xHead - x0) / (maxY - minY + 1);
            function xOf(y) { return x0 + (y - minY) * col; }

            // Vertical: the axis at the foot, the lanes above it, and the
            // title and the hover readout at the top left, which the graph
            // leaves empty because later roles start further right. The
            // loader shortens the stage on a short window: then the hint goes,
            // and if the lanes get too close for their names, the names go
            // too and hovering is what tells them apart.
            var axisY = H - 27, labelY = H - 9;
            var roomy = H >= 160;
            var laneBottom = axisY - 17, laneTop = roomy ? (narrow ? 36 : 40) : 26;
            var gap = roles.length > 1 ? Math.min(26, (laneBottom - laneTop) / (roles.length - 1)) : 0;
            var named = roles.length < 2 || gap >= 13.5;
            roles.forEach(function (r) { r.y = laneBottom - r.lane * gap; });

            svg = el('svg', { width: '100%', height: '100%', viewBox: '0 0 ' + W + ' ' + H });
            svg.style.cssText = 'display:block;overflow:visible;touch-action:pan-y;' +
                '-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none';
            stage.appendChild(svg);

            parts = {
                W: W, H: H, xHead: xHead, years: [], guides: [],
                // The band the sweep uncovers: the lanes, between the hint
                // above and the axis below.
                coverTop: laneTop - 8, coverBottom: axisY - 5
            };

            // ── Axis ──
            // A row of the background's dots with a colon at each new year,
            // fainter past HEAD.
            var ticks = [], past = [], future = [];
            for (var y = minY; y <= maxY; y++) ticks.push(xOf(y));
            for (var x = x0 - 2; x <= W - 3; x += 6) {
                var near = ticks.some(function (t) { return Math.abs(t - x) < 3.5; }) || Math.abs(x - xHead) < 3.5;
                if (!near) (x > xHead ? future : past).push(x);
            }
            function glyphRow(xs, ch) {
                var t = text({ x: xs.map(function (v) { return v.toFixed(1); }).join(' '), y: axisY + 2,
                    'text-anchor': 'middle' }, svg);
                t.textContent = new Array(xs.length + 1).join(ch);
                return t;
            }
            parts.dots = glyphRow(past, '.');
            parts.futureDots = glyphRow(future, '.');
            parts.ticks = glyphRow(ticks, ':');
            for (y = minY; y <= maxY; y++) {
                var yl = text({ x: xOf(y) - 1, y: labelY, 'letter-spacing': '0.04em' }, svg);
                yl.textContent = String(y);
                parts.years.push({ year: y, t: yl });
                // Faint guides up from each new year, so commits that began in
                // the same year visibly line up.
                if (y > minY) {
                    parts.guides.push(el('line', { x1: xOf(y), y1: laneTop - 6, x2: xOf(y), y2: axisY - 7,
                        'stroke-width': 1, 'stroke-dasharray': '1 3' }, svg));
                }
            }

            // ── Title and readout ──
            parts.title = text({ x: 0, y: 11, 'font-weight': 600, 'letter-spacing': '0.04em' }, svg);
            parts.title.textContent = T.title;
            parts.hint = text({ x: 0, y: narrow ? 25 : 27 }, svg);
            parts.hint.textContent = touch ? T.tap : T.hint;
            parts.roomy = roomy;
            parts.info = el('g', {}, svg);
            parts.infoBg = el('rect', { x: -3, y: 16, height: 31, width: 10 }, parts.info);
            parts.infoTop = text({ x: 0, y: 28, 'font-size': 11 }, parts.info);
            parts.infoCompany = el('tspan', { 'font-weight': 600 }, parts.infoTop);
            parts.infoDate = el('tspan', {}, parts.infoTop);
            parts.infoRole = text({ x: 0, y: 42, 'font-size': 11 }, parts.info);

            // ── Lanes ──
            var graph = parts.graph = el('g', {}, svg);
            roles.forEach(function (r) {
                r.sx = xOf(r.start);
                r.g = el('g', {}, graph);
            });

            // Branch names sit on their lanes just after the first commit.
            // They are measured first because a role that ended keeps its
            // lane at least as long as its name.
            roles.forEach(function (r) {
                var px = r.sx + R + 4;
                r.label = text({ x: px + 4, y: r.y + 3.5 }, r.g);
                r.label.textContent = r.short;
                r.pillW = named ? textWidth(r.label) + 8 : 0;
                if (!named) r.label.style.display = 'none';
                r.pillX = px;
                if (r.pending) r.ex = xFuture - R - 3;
                else if (r.end === null) r.ex = xHead;
                else {
                    var limit = Math.min(xOf(r.end + 1) - bend - 3, xHead - 6);
                    r.ex = Math.min(limit, Math.max(xOf(r.end) + col - forkW, px + r.pillW + R + 3));
                }
            });

            roles.forEach(function (r) {
                var d;
                r.stemX = r.sx;
                if (!r.parent) {
                    d = 'M' + r.sx + ' ' + r.y + 'H' + r.ex;
                } else {
                    // Up (or down) from the parent's lane on a short stem,
                    // with rounded elbows at both ends.
                    var py = r.parent.y, dir = r.y < py ? -1 : 1;
                    var e = Math.min(bend, Math.abs(py - r.y) / 2), sx;
                    if (r.after) {
                        sx = r.parent.ex;
                        d = 'M' + sx + ' ' + py;
                    } else {
                        sx = Math.max(r.sx - forkW, r.parent.sx);
                        d = sx - e >= r.parent.sx
                            ? 'M' + (sx - e) + ' ' + py + 'Q' + sx + ' ' + py + ' ' + sx + ' ' + (py + dir * e)
                            : 'M' + sx + ' ' + py;
                    }
                    d += 'V' + (r.y - dir * e) + 'Q' + sx + ' ' + r.y + ' ' + (sx + e) + ' ' + r.y + 'H' + r.ex;
                    r.stemX = sx;
                }
                r.d = d;
                r.path = el('path', { d: d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, r.g);
                if (r.pending) r.path.setAttribute('stroke-dasharray', '3 3');
                r.g.insertBefore(r.path, r.label);
                r.pill = el('rect', { x: r.pillX, y: r.y - 6.5, width: r.pillW, height: 13, rx: 6.5, 'stroke-width': 1 }, r.g);
                r.g.insertBefore(r.pill, r.label);
                if (!named) r.pill.style.display = 'none';
                r.nodes = [];
                if (!r.pending) r.nodes.push(el('circle', { cx: r.sx, cy: r.y, r: R }, r.g));
                if (!r.pending && r.end !== null) r.nodes.push(el('circle', { cx: r.ex, cy: r.y, r: R }, r.g));
                r.hollow = r.pending
                    ? el('circle', { cx: xFuture, cy: r.y, r: R + 1, 'stroke-width': 1.2, 'stroke-dasharray': '2 1.6' }, r.g)
                    : null;
            });

            // A role not yet begun draws under the others, so its dashes
            // never cut across a solid stem they share.
            parts.zOrder = roles.filter(function (r) { return r.pending; })
                .concat(roles.filter(function (r) { return !r.pending; }));
            parts.zOrder.forEach(function (r) { graph.appendChild(r.g); });

            // ── HEAD ──
            // The one accent: a line where the running lanes stop, a dot on
            // each, and its name on the axis, which the sweep shows on arrival.
            var running = roles.filter(function (r) { return !r.pending && r.end === null; });
            parts.headG = el('g', {}, graph);
            parts.headDots = [];
            if (running.length) {
                var topY = Math.min.apply(null, running.map(function (r) { return r.y; }));
                parts.headLine = el('line', { x1: xHead, y1: topY - 9, x2: xHead, y2: axisY - 6, 'stroke-width': 1.2 }, parts.headG);
                running.forEach(function (r) {
                    parts.headDots.push(el('circle', { cx: xHead, cy: r.y, r: narrow ? 2.2 : 2.5 }, parts.headG));
                });
                parts.headLabel = text({ x: xHead, y: labelY, 'text-anchor': 'middle',
                    'font-weight': 600, 'letter-spacing': '0.06em' }, svg);
                parts.headLabel.textContent = T.head;
                parts.headLabel.style.transition = reduced ? 'none' : 'opacity .3s ease';
                parts.headLabel.style.opacity = headShown ? '1' : '0';
            }

            // ── Hit areas ──
            // On top of everything, from the top lane down, so where stems
            // overlap the lane nearest the pointer wins.
            var hits = el('g', {}, svg);
            // The readout goes above the lanes and below the hit areas, so its
            // card-coloured back masks a lane that reaches the top-left corner
            // on a narrow stage.
            svg.insertBefore(parts.info, hits);
            roles.slice().sort(function (a, b) { return b.lane - a.lane; }).forEach(function (r) {
                var k = roles.indexOf(r);
                var hg = el('g', {}, hits);
                hg.style.cursor = 'pointer';
                el('path', { d: r.d, fill: 'none', stroke: 'transparent', 'stroke-width': Math.max(8, gap - 1),
                    'pointer-events': 'stroke' }, hg);
                if (named) {
                    el('rect', { x: r.pillX - 2, y: r.y - 9, width: r.pillW + 4, height: 18, fill: 'transparent',
                        'pointer-events': 'all' }, hg);
                }
                el('circle', { cx: r.pending ? xFuture : r.sx, cy: r.y, r: Math.min(9, Math.max(5, gap / 2)),
                    fill: 'transparent', 'pointer-events': 'all' }, hg);
                hg.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') setHover(k); });
                hg.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'touch' && hovered === k) setHover(-1); });
                hg.addEventListener('click', function () { jump(k); });
            });

            if (hovered >= 0) raise(hovered);
            fillInfo();
            paint();
        }

        // ── Paint ──
        // Colours for the current theme and hover. A hovered lane, its
        // commits and its name go to full ink; the rest step back.
        function paint() {
            if (!parts) return;
            var c = colors, ink = inker(c), focus = hovered >= 0, h = focus ? roles[hovered] : null;
            parts.title.setAttribute('fill', ink(0.45));
            parts.hint.setAttribute('fill', ink(0.42));
            parts.hint.style.display = focus || !parts.roomy ? 'none' : '';
            parts.info.style.display = focus ? '' : 'none';
            parts.infoBg.setAttribute('fill', c.card);
            parts.infoCompany.setAttribute('fill', ink(0.92));
            parts.infoDate.setAttribute('fill', ink(0.5));
            parts.infoRole.setAttribute('fill', ink(0.72));
            parts.dots.setAttribute('fill', ink(0.32));
            parts.futureDots.setAttribute('fill', ink(0.15));
            parts.ticks.setAttribute('fill', ink(0.55));
            parts.guides.forEach(function (g) { g.setAttribute('stroke', ink(0.13)); });
            parts.years.forEach(function (y) {
                var hot = h && (y.year === h.start || y.year === h.end);
                y.t.setAttribute('fill', ink(hot ? 0.92 : 0.45));
            });
            roles.forEach(function (r, k) {
                var on = k === hovered, dim = focus && !on;
                r.path.setAttribute('stroke', ink(on ? 0.95 : dim ? 0.2 : (r.pending ? 0.42 : 0.5)));
                r.path.setAttribute('stroke-width', on ? 1.9 : 1.3);
                r.nodes.forEach(function (n) { n.setAttribute('fill', ink(on ? 1 : dim ? 0.3 : 0.85)); });
                if (r.hollow) {
                    r.hollow.setAttribute('fill', c.card);
                    r.hollow.setAttribute('stroke', ink(on ? 0.95 : dim ? 0.25 : 0.62));
                }
                r.pill.setAttribute('fill', c.card);
                r.pill.setAttribute('stroke', ink(on ? 0.8 : dim ? 0.14 : 0.32));
                r.label.setAttribute('fill', ink(on ? 1 : dim ? 0.35 : 0.82));
            });
            if (parts.headLine) {
                parts.headLine.setAttribute('stroke', c.accent);
                parts.headLabel.setAttribute('fill', c.accent);
                parts.headDots.forEach(function (d) { d.setAttribute('fill', c.accent); });
            }
            if (sweep) {
                sweep.line.style.background = ink(0.28);
                sweep.bits.forEach(function (s, k) { if (sweep.chars[k]) s.style.color = bitColor(sweep.chars[k], ink); });
            }
        }

        // ── Hover ──
        function raise(k) {
            if (!parts) return;
            parts.zOrder.forEach(function (r) { parts.graph.insertBefore(r.g, parts.headG); });
            if (k >= 0) parts.graph.insertBefore(roles[k].g, parts.headG);
        }

        function fillInfo() {
            if (!parts || hovered < 0) return;
            var r = roles[hovered];
            parts.infoCompany.textContent = r.company;
            parts.infoDate.textContent = '  ·  ' + r.date;
            parts.infoRole.textContent = r.role;
            var w = Math.max(textWidth(parts.infoTop), textWidth(parts.infoRole));
            parts.infoBg.setAttribute('width', w + 9);
        }

        function setHover(k) {
            if (hovered === k) return;
            hovered = k;
            raise(k);
            // The readout has to be showing to be measured.
            if (parts && k >= 0) parts.info.style.display = '';
            fillInfo();
            paint();
        }

        // The modal is the scroll container. Smooth unless the visitor has
        // asked for less motion.
        function jump(k) {
            var target = roles[k].el, modal = document.getElementById('modal');
            if (!target || !modal || !modal.contains(target)) return;
            var top = target.getBoundingClientRect().top - modal.getBoundingClientRect().top + modal.scrollTop - 8;
            try {
                modal.scrollTo({ top: top, behavior: api.reduced() ? 'auto' : 'smooth' });
            } catch (e) {
                modal.scrollTop = top;
            }
        }

        // ── Draw-in ──
        // A box holding the cover and the write head's glyphs slides from
        // left to right across the stage. Its left edge is the scan line: the
        // lanes show to the left of it and each glyph reads its lane's state
        // just ahead of it. The box moves on the compositor; a timer wakes
        // this code only for the next glyph that changes. Without the Web
        // Animations API the box is moved here, frame by frame.
        function bitAt(r, x) {
            if (r.pending) return x >= r.stemX ? '~' : '0';
            return x >= r.sx - 1 && x <= r.ex + 1 ? '1' : '0';
        }

        function scanAt(p) { return sweep.from + (sweep.to - sweep.from) * ease(p); }

        function startSweep() {
            if (drawn || !parts) return;
            var box = document.createElement('div');
            box.style.cssText = 'position:absolute;left:0;top:0;width:0;height:100%;pointer-events:none';
            var cover = document.createElement('div');
            cover.style.cssText = 'position:absolute;left:0;top:' + parts.coverTop + 'px;width:' + (parts.W + 40) +
                'px;height:' + (parts.coverBottom - parts.coverTop) + 'px;background:var(--card)';
            box.appendChild(cover);
            // The scan line itself, a hairline along the cover's edge.
            var line = document.createElement('div');
            line.style.cssText = 'position:absolute;left:0;width:1px;top:' + parts.coverTop + 'px;height:' +
                (parts.coverBottom - parts.coverTop) + 'px;background:' + inker(colors)(0.28);
            box.appendChild(line);
            var bits = roles.map(function (r) {
                var s = document.createElement('span');
                s.style.cssText = 'position:absolute;left:0;width:12px;top:' + (r.y - 7) + 'px;line-height:14px;' +
                    'text-align:center;font:600 10px ' + FONT;
                box.appendChild(s);
                return s;
            });
            stage.appendChild(box);
            sweep = { box: box, line: line, bits: bits, chars: [], from: -14, to: parts.W + 4, anim: null, timer: 0, raf: 0, last: 0, t: 0 };
            if (box.animate) {
                var frames = [];
                for (var i = 0; i <= KEYS; i++) {
                    frames.push({ transform: 'translateX(' + scanAt(i / KEYS).toFixed(2) + 'px)', offset: i / KEYS });
                }
                sweep.anim = box.animate(frames, { duration: SWEEP_MS, delay: DELAY_MS, fill: 'both' });
                sweep.anim.onfinish = endSweep;
                if (!active) sweep.anim.pause();
            }
            resumeSweep();
        }

        // The sweep's clock: the animation's own, or time counted here.
        function sweepProgress() {
            var t = sweep.anim ? (sweep.anim.currentTime || 0) : sweep.t;
            return Math.min(1, Math.max(0, (t - DELAY_MS) / SWEEP_MS));
        }

        // The next scan position at which a glyph changes or HEAD is reached.
        function nextChange(x) {
            var best = null;
            function consider(v) { if (v > x + 0.01 && (best === null || v < best)) best = v; }
            roles.forEach(function (r) {
                if (r.pending) consider(r.stemX - 6);
                else {
                    consider(r.sx - 7);
                    if (r.end !== null) consider(r.ex - 5);
                }
            });
            if (!headShown) consider(parts.xHead - 14);
            return best;
        }

        function tick() {
            if (!sweep || dead || !active || !parts) return;
            clearTimeout(sweep.timer);
            sweep.timer = 0;
            var p = sweepProgress(), x = scanAt(p), ink = null;
            if (!sweep.anim) sweep.box.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
            roles.forEach(function (r, k) {
                var ch = bitAt(r, x + 6);
                if (sweep.chars[k] === ch) return;
                sweep.chars[k] = ch;
                sweep.bits[k].textContent = ch;
                sweep.bits[k].style.color = bitColor(ch, ink || (ink = inker(colors)));
            });
            if (!headShown && x >= parts.xHead - 14) {
                headShown = true;
                if (parts.headLabel) parts.headLabel.style.opacity = '1';
            }
            if (p >= 1) { endSweep(); return; }
            if (!sweep.anim) return;
            var next = nextChange(x);
            if (next === null) return;
            var due = DELAY_MS + SWEEP_MS * unease((next - sweep.from) / (sweep.to - sweep.from)) - (sweep.anim.currentTime || 0);
            sweep.timer = setTimeout(tick, Math.max(8, due + 8));
        }

        function frame(now) {
            if (!sweep) return;
            sweep.raf = 0;
            if (dead || !active) return;
            sweep.t += Math.min(50, Math.max(0, now - sweep.last));
            sweep.last = now;
            tick();
            if (sweep && !sweep.raf) sweep.raf = requestAnimationFrame(frame);
        }

        function resumeSweep() {
            if (!sweep || dead || !active) return;
            if (sweep.anim) {
                if (sweep.anim.playState === 'paused') sweep.anim.play();
                tick();
            } else if (!sweep.raf) {
                sweep.last = performance.now();
                sweep.raf = requestAnimationFrame(frame);
            }
        }

        function pauseSweep() {
            if (!sweep) return;
            clearTimeout(sweep.timer);
            sweep.timer = 0;
            if (sweep.anim && sweep.anim.playState === 'running') sweep.anim.pause();
            if (sweep.raf) { cancelAnimationFrame(sweep.raf); sweep.raf = 0; }
        }

        // Done, or cut short: the graph as it rests, with nothing left over.
        function endSweep() {
            drawn = true;
            headShown = true;
            if (parts && parts.headLabel) parts.headLabel.style.opacity = '1';
            if (!sweep) return;
            pauseSweep();
            if (sweep.anim) { sweep.anim.onfinish = null; sweep.anim.cancel(); }
            if (sweep.box.parentNode) sweep.box.parentNode.removeChild(sweep.box);
            sweep = null;
        }

        build();
        api.ready();
        startSweep();

        // A web font that arrives after the first layout changes the branch
        // names' widths, so the lanes are laid out again.
        if (document.fonts && document.fonts.status === 'loading' && document.fonts.ready) {
            document.fonts.ready.then(function () { if (!dead) build(); });
        }

        // A new width moves every lane, so a sweep still running ends at once.
        if (window.ResizeObserver) {
            resizeObs = new ResizeObserver(function () {
                var w = stage.clientWidth;
                if (dead || !w || Math.abs(w - lastW) <= 1) return;
                endSweep();
                build();
            });
            resizeObs.observe(stage);
        }

        return {
            visible: function (on) {
                active = on;
                if (on) resumeSweep(); else pauseSweep();
            },
            theme: function () {
                colors = api.colors();
                paint();
            },
            destroy: function () {
                dead = true;
                endSweep();
                if (resizeObs) resizeObs.disconnect();
                if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
                svg = null;
                parts = null;
            }
        };
    });
})();
