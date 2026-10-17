// ── 08 Lab: something is growing ──
// The Lab is empty, and its modal says so in one line. That line is written
// into a petri dish, left to right, as the first generation of Conway's Game
// of Life: one cell for each pixel of the text, every live cell drawn as a 0
// or a 1 from the page's ascii background. Then it grows, about twelve
// generations a second, until the colony settles into still lifes and
// blinkers (a state comes round again within a couple of dozen generations)
// or a few hundred generations have passed. A cell that dies leaves a : and
// then a . that fade, and every cell the colony has reached keeps a faint
// dot, so the settled dish shows how far it spread.
//
// Clicking inside the dish drops a methuselah (a handful of cells known to
// keep changing for a long time) and the colony grows again. The dropped
// cells are drawn in the accent, and so are the cells they give birth to: a
// newborn takes the colour of most of its three parents, as in the
// Immigration variant of Life.
//
// The line is read from the modal and rasterised in the site's font, so the
// Danish page grows from the Danish line, and once the Lab has entries it
// grows from their titles instead. Canvas 2D, redrawn only while the line is
// written in and when a generation changes, and nothing runs once the colony
// has settled. Under reduced motion the dish shows the line at once and each
// click advances it one generation.

(function () {
    'use strict';
    if (!window.MODAL_FX) return;

    var GEN_MS = 1000 / 12;    // about twelve generations a second
    var REVEAL_MS = 700;       // the line is written into the dish over this long
    var HOLD_MS = 1500;        // then holds still this long, to be read, before it grows
    var MAX_GEN = 300;         // stop here even if the colony never settles
    var WINDOW = 24;           // a state seen again this soon means the colony has settled
    var TRAIL = 6;             // generations a dead cell's mark takes to fade
    var LIVE_ALPHA = 0.85;
    var FOOT_ALPHA = 0.13;
    var FONT = '"Roboto Condensed", Arial, sans-serif';
    var SEED_FONT = '400 10px ' + FONT;
    var SEED_PITCH = 12;       // rows from one line of seed text to the next
    var SEED_GAP = 0.6;        // px added between letters, so neighbours don't merge
    var SEED_ALPHA = 102;      // coverage (of 255) at which a pixel becomes a live cell
    var SEED_CHARS = 80;       // a seed this long already overflows the dish; the rest is cut
    var CELL_RATIO = 0.8;      // cell width over height, near a digit's proportions
    var DEPTH = 10;            // px of dish wall below the rim

    // Patterns that keep changing for a long time from a few cells: the
    // R-pentomino, the B-heptomino and the pi-heptomino, as [x, y] cells.
    var DROPS = [
        [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]],
        [[0, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
        [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]]
    ];


    // ── Seed text ──
    function clean(s) {
        return (s || '').replace(/\s+/g, ' ').trim();
    }

    // What to grow, read from the modal: the empty-state line, or the
    // entries' titles once there are some, or failing both the section title.
    function seedTexts() {
        var root = document.getElementById('modal-content');
        if (!root) return [];
        var empty = root.querySelector('.lab-empty');
        if (empty && clean(empty.textContent)) return [clean(empty.textContent)];
        var titles = [], hs = root.querySelectorAll('.entry h3');
        for (var i = 0; i < hs.length; i++) {
            if (clean(hs[i].textContent)) titles.push(clean(hs[i].textContent));
        }
        if (titles.length) return titles;
        var h2 = root.querySelector('h2'), num = h2 && h2.querySelector('.modal-number');
        var title = h2 ? clean(h2.textContent.replace(num ? num.textContent : '', '')) : '';
        return title ? [title] : [];
    }

    // Letters are set one at a time with a little air between them: at ten
    // pixels a line the strokes of neighbouring letters would otherwise touch.
    function advance(g, s) {
        var w = 0;
        for (var i = 0; i < s.length; i++) w += g.measureText(s.charAt(i)).width + SEED_GAP;
        return w;
    }

    // The text on one, two and three lines, each the split whose longest
    // line is the shortest.
    function wraps(g, text) {
        var words = text.split(' '), out = [[text]];
        function longest(lines) {
            var m = 0;
            for (var i = 0; i < lines.length; i++) m = Math.max(m, advance(g, lines[i]));
            return m;
        }
        function line(a, b) { return words.slice(a, b).join(' '); }
        var best = null, bestW = Infinity, w, i, j;
        for (i = 1; i < words.length; i++) {
            w = longest([line(0, i), line(i)]);
            if (w < bestW) { bestW = w; best = [line(0, i), line(i)]; }
        }
        if (best) out.push(best);
        best = null; bestW = Infinity;
        for (i = 1; i < words.length; i++) {
            for (j = i + 1; j < words.length; j++) {
                w = longest([line(0, i), line(i, j), line(j)]);
                if (w < bestW) { bestW = w; best = [line(0, i), line(i, j), line(j)]; }
            }
        }
        if (best) out.push(best);
        return out;
    }

    // Sets the lines one canvas pixel per cell, centred, and returns the
    // pixels that came out solid as cell offsets [x, y, x, y, ...] from the
    // block's top left, with the block's size in cells. Cells are narrower
    // than they are tall, like a character grid, so the text is drawn
    // stretched sideways by sx to look right once each pixel becomes a cell.
    function rasterise(lines, sx) {
        var c = document.createElement('canvas'), g = c.getContext('2d');
        if (!g) return null;
        g.font = SEED_FONT;
        var widths = lines.map(function (l) { return advance(g, l); });
        var full = Math.max.apply(null, widths);
        var w = Math.ceil(full * sx) + 4, h = lines.length * SEED_PITCH + 4;
        c.width = w; c.height = h;
        g.font = SEED_FONT;
        g.fillStyle = '#000';
        g.setTransform(sx, 0, 0, 1, 2, 0);
        for (var k = 0; k < lines.length; k++) {
            var x = Math.round((full - widths[k]) / 2), y = 10 + k * SEED_PITCH;
            for (var i = 0; i < lines[k].length; i++) {
                var ch = lines[k].charAt(i);
                g.fillText(ch, x, y);
                x += g.measureText(ch).width + SEED_GAP;
            }
        }
        var d = g.getImageData(0, 0, w, h).data, pts = [];
        var minX = w, minY = h, maxX = -1, maxY = -1;
        for (var py = 0; py < h; py++) {
            for (var px = 0; px < w; px++) {
                if (d[(py * w + px) * 4 + 3] <= SEED_ALPHA) continue;
                pts.push(px, py);
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
            }
        }
        if (!pts.length) return null;
        for (var p = 0; p < pts.length; p += 2) { pts[p] -= minX; pts[p + 1] -= minY; }
        return { pts: pts, w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    // Every way of setting the seed, best first: all the texts on one line,
    // then two, then three; then the same again with the last text left out,
    // down to the first text alone and then fewer and fewer of its words.
    function candidates(texts) {
        var c = document.createElement('canvas').getContext('2d'), groups = [];
        if (!c) return groups;
        c.font = SEED_FONT;
        for (var n = texts.length; n >= 1; n--) {
            var text = texts.slice(0, n).join('  ·  ');
            if (text.length > SEED_CHARS && n > 1) continue;
            groups.push(wraps(c, text.slice(0, SEED_CHARS)));
        }
        var words = texts[0].slice(0, SEED_CHARS).split(' ');
        for (var m = words.length - 1; m >= 1; m--) groups.push(wraps(c, words.slice(0, m).join(' ')));
        return groups;
    }

    // A 0 or a 1 for each cell, fixed by its position, so the colony reads as
    // binary without glyphs flickering as it moves.
    function bit(x, y) {
        var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return (h ^ (h >>> 16)) & 1;
    }

    MODAL_FX.register('lab', function (stage, api) {
        var reduced = api.reduced(), narrow = api.narrow();
        var colors = api.colors();
        var dead = false, active = true, shown = false, timer = 0, fontTimer = 0, resizeObs = null;

        var texts = seedTexts();
        if (!texts.length) { api.fail(); return { destroy: function () {} }; }

        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;touch-action:pan-y';
        var under = document.createElement('canvas'), over = document.createElement('canvas');
        under.style.cssText = over.style.cssText =
            'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:pan-y';
        wrap.appendChild(under);
        wrap.appendChild(over);
        stage.appendChild(wrap);

        var gu = under.getContext('2d'), go = over.getContext('2d');
        if (!gu || !go) { api.fail(); return { destroy: function () {} }; }

        // ── Geometry ──
        // W, H: the stage in css px. The grid is padded by one empty cell all
        // round (row stride S), so a neighbour lookup never leaves the arrays.
        var W = 0, H = 0, dpr = 1, dish = null, gm = null, S = 0, tile = 0;
        var live, next, lin, linNext, trail, ever, bits, inside, cellsIn, tx, ty;
        var atlas = null, groups = null;
        var gen = 0, running = false, trails = 0, fresh = [];
        var reveal = 1, revealRaf = 0, revealT0 = 0, seedX0 = 0, seedX1 = 0;
        var ring = new Int32Array(WINDOW * 3), ringN = 0, ringAt = 0;

        // The dish: a rim ellipse seen at a slant with a wall DEPTH px tall
        // below it, as large as the stage allows.
        function layout() {
            W = stage.clientWidth || 520;
            H = stage.clientHeight || 200;
            dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
            var cx = W / 2, rx = W / 2 - 6, top = 4;
            var ry = (H - 2 - top - DEPTH) / 2;
            dish = { cx: cx, cy: top + ry, rx: rx, ry: ry, irx: rx - 10, iry: ry - 8 };
        }

        // A grid of cells cw by ch px filling the inside of the rim, its
        // corner on a device pixel so every glyph lands sharp. dh is the cell
        // height in device pixels; the width is four fifths of it, close to
        // the proportions of a digit, so the glyphs fill their cells evenly.
        function grid(dh) {
            var dw = Math.max(3, Math.round(dh * CELL_RATIO)), cw = dw / dpr, ch = dh / dpr;
            var cols = Math.floor(2 * dish.irx / cw), rows = Math.floor(2 * dish.iry / ch);
            return {
                cw: cw, ch: ch, sx: dh / dw, cols: cols, rows: rows,
                x0: Math.round((dish.cx - cols * cw / 2) * dpr) / dpr,
                y0: Math.round((dish.cy - rows * ch / 2) * dpr) / dpr
            };
        }

        function within(g, x, y, mx, my) {
            var dx = (g.x0 + (x + 0.5) * g.cw - dish.cx) / (dish.irx - mx);
            var dy = (g.y0 + (y + 0.5) * g.ch - dish.cy) / (dish.iry - my);
            return dx * dx + dy * dy <= 1;
        }

        function offset(g, r) {
            return { x: Math.floor((g.cols - r.w) / 2), y: Math.floor((g.rows - r.h) / 2) };
        }

        // The seed fits when every cell of it lies a cell inside the rim.
        function fits(g, r) {
            if (r.w > g.cols || r.h > g.rows) return false;
            var o = offset(g, r);
            for (var i = 0; i < r.pts.length; i += 2) {
                if (!within(g, r.pts[i] + o.x, r.pts[i + 1] + o.y, g.cw, g.ch)) return false;
            }
            return true;
        }

        // Rasters depend on the stretch, which differs a little between cell
        // sizes once they are rounded to device pixels, so they are cached by it.
        var rasters = {};
        function raster(n, k, sx) {
            var key = n + ':' + k + ':' + sx.toFixed(4);
            if (!(key in rasters)) rasters[key] = rasterise(groups[n][k], sx);
            return rasters[key];
        }

        // The tallest cells at which the seed fits, on as few lines as
        // possible.
        function plan() {
            var sizes = narrow ? [5, 4.5, 4] : [6, 5.5, 5], devs = [], r;
            sizes.forEach(function (s) {
                var d = Math.max(4, Math.round(s * dpr));
                if (devs.indexOf(d) < 0) devs.push(d);
            });
            for (var n = 0; n < groups.length; n++) {
                for (var s = 0; s < devs.length; s++) {
                    var g = grid(devs[s]);
                    for (var k = 0; k < groups[n].length; k++) {
                        r = raster(n, k, g.sx);
                        if (r && fits(g, r)) return { g: g, seed: r };
                    }
                }
            }
            // Not even one word fits: the smallest cells, and whatever falls
            // outside the dish is left out.
            var last = groups.length - 1, gs = grid(devs[devs.length - 1]);
            return { g: gs, seed: raster(last, groups[last].length - 1, gs.sx) };
        }

        // ── Build ──
        function build() {
            layout();
            var p = plan();
            gm = p.g;
            S = gm.cols + 2;
            var n = S * (gm.rows + 2), list = [];
            live = new Uint8Array(n); next = new Uint8Array(n);
            lin = new Uint8Array(n); linNext = new Uint8Array(n);
            trail = new Uint8Array(n); ever = new Uint8Array(n);
            bits = new Uint8Array(n); inside = new Uint8Array(n);
            tx = new Int32Array(n); ty = new Int32Array(n);
            tile = Math.ceil(gm.ch * dpr * 1.7);
            for (var y = 0; y < gm.rows; y++) {
                for (var x = 0; x < gm.cols; x++) {
                    if (!within(gm, x, y, 0, 0)) continue;
                    var i = (y + 1) * S + x + 1;
                    list.push(i);
                    inside[i] = 1;
                    bits[i] = bit(x, y);
                    tx[i] = Math.round((gm.x0 + (x + 0.5) * gm.cw) * dpr - tile / 2);
                    ty[i] = Math.round((gm.y0 + (y + 0.5) * gm.ch) * dpr - tile / 2);
                }
            }
            cellsIn = new Int32Array(list);

            // The seed is live but not yet part of the footprint: it joins
            // that once it has been written in (markLive).
            if (p.seed) {
                var o = offset(gm, p.seed), pts = p.seed.pts;
                seedX0 = o.x;
                seedX1 = o.x + p.seed.w;
                for (var k = 0; k < pts.length; k += 2) {
                    var sx = pts[k] + o.x, sy = pts[k + 1] + o.y;
                    if (sx < 0 || sy < 0 || sx >= gm.cols || sy >= gm.rows) continue;
                    var j = (sy + 1) * S + sx + 1;
                    if (inside[j]) live[j] = 1;
                }
            }
            gen = 0; ringN = 0; ringAt = 0; trails = 0; fresh.length = 0;

            under.width = over.width = Math.round(W * dpr);
            under.height = over.height = Math.round(H * dpr);
            makeAtlas();
            drawDish();
            drawCells();
        }

        // ── Drawing ──
        // The glyphs pre-drawn once per size and theme: 0 1 : . in paper ink
        // on the first row, 0 1 in the accent on the second. A cell is then
        // one drawImage at full device resolution.
        function makeAtlas() {
            atlas = atlas || document.createElement('canvas');
            atlas.width = tile * 4;
            atlas.height = tile * 2;
            var g = atlas.getContext('2d'), fs = gm.ch * 1.3 * dpr;
            g.clearRect(0, 0, atlas.width, atlas.height);
            g.font = '600 ' + fs.toFixed(2) + 'px ' + FONT;
            g.textAlign = 'center';
            g.textBaseline = 'alphabetic';
            // One baseline for all four, with the digits centred in the cell.
            // The dots of : and . then sit where a digit's foot would cover
            // them, so a footprint dot never shows through a live 0.
            var base = tile / 2 + fs * 0.355, glyphs = ['0', '1', ':', '.'];
            for (var r = 0; r < 2; r++) {
                g.fillStyle = r ? colors.accent : 'rgb(' + colors.paper + ')';
                for (var k = 0; k < (r ? 2 : 4); k++) g.fillText(glyphs[k], k * tile + tile / 2, r * tile + base);
            }
        }

        function blit(g, row, glyph, i) {
            g.drawImage(atlas, glyph * tile, row * tile, tile, tile, tx[i], ty[i], tile, tile);
        }

        // The dish and the footprint of everywhere the colony has been. This
        // layer only ever gains dots between full redraws.
        function drawDish() {
            var g = gu, d = dish, ink = 'rgba(' + colors.paper + ',';
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.clearRect(0, 0, W, H);
            g.lineWidth = 1;
            g.beginPath();
            g.ellipse(d.cx, d.cy, d.rx, d.ry, 0, 0, Math.PI * 2);
            g.fillStyle = ink + '0.035)';
            g.fill();
            g.strokeStyle = ink + '0.42)';
            g.stroke();
            // The wall: both sides and the near half of the base.
            g.beginPath();
            g.moveTo(d.cx - d.rx, d.cy);
            g.lineTo(d.cx - d.rx, d.cy + DEPTH);
            g.moveTo(d.cx + d.rx, d.cy);
            g.lineTo(d.cx + d.rx, d.cy + DEPTH);
            g.ellipse(d.cx, d.cy + DEPTH, d.rx, d.ry, 0, 0, Math.PI);
            g.strokeStyle = ink + '0.3)';
            g.stroke();
            // The inner edge of the rim, for the thickness of the glass.
            g.beginPath();
            g.ellipse(d.cx, d.cy + 1, d.rx - 4, d.ry - 3, 0, 0, Math.PI * 2);
            g.strokeStyle = ink + '0.14)';
            g.stroke();
            g.setTransform(1, 0, 0, 1, 0, 0);
            g.globalAlpha = FOOT_ALPHA;
            for (var k = 0; k < cellsIn.length; k++) {
                if (ever[cellsIn[k]]) blit(g, 0, 3, cellsIn[k]);
            }
            g.globalAlpha = 1;
            fresh.length = 0;
        }

        // Live cells that are not yet in the footprint join it.
        function markLive() {
            for (var k = 0; k < cellsIn.length; k++) {
                var i = cellsIn[k];
                if (live[i] && !ever[i]) { ever[i] = 1; fresh.push(i); }
            }
            drawFresh();
        }

        function drawFresh() {
            if (!fresh.length) return;
            gu.globalAlpha = FOOT_ALPHA;
            for (var k = 0; k < fresh.length; k++) blit(gu, 0, 3, fresh[k]);
            gu.globalAlpha = 1;
            fresh.length = 0;
        }

        function drawCells() {
            var g = go, limit = reveal < 1 ? seedX0 + reveal * (seedX1 - seedX0) : Infinity;
            g.clearRect(0, 0, over.width, over.height);
            for (var k = 0; k < cellsIn.length; k++) {
                var i = cellsIn[k];
                if (live[i]) {
                    if (i % S - 1 >= limit) continue;
                    g.globalAlpha = lin[i] ? 1 : LIVE_ALPHA;
                    blit(g, lin[i], bits[i], i);
                } else if (trail[i]) {
                    g.globalAlpha = 0.12 + 0.4 * trail[i] / TRAIL;
                    blit(g, 0, trail[i] > TRAIL / 2 ? 2 : 3, i);
                }
            }
            g.globalAlpha = 1;
        }

        // ── Life ──
        // A state is remembered by two hashes of its live cells and their
        // count. Seen again within WINDOW generations, the colony is either
        // still or cycling through a short loop, and has settled.
        function seenBefore(h1, h2, pop) {
            for (var k = 0; k < ringN; k++) {
                if (ring[k * 3] === h1 && ring[k * 3 + 1] === h2 && ring[k * 3 + 2] === pop) return true;
            }
            ring[ringAt * 3] = h1;
            ring[ringAt * 3 + 1] = h2;
            ring[ringAt * 3 + 2] = pop;
            ringAt = (ringAt + 1) % WINDOW;
            if (ringN < WINDOW) ringN++;
            return false;
        }

        // One generation under the usual rules: born with three neighbours,
        // surviving with two or three. Cells outside the dish stay empty, so
        // the rim is a wall the colony can't cross. Returns true once settled.
        function step() {
            var a = live, b = next, la = lin, lb = linNext;
            var h1 = 0x811c9dc5 | 0, h2 = 0, pop = 0;
            trails = 0;
            for (var k = 0; k < cellsIn.length; k++) {
                var i = cellsIn[k];
                var n = a[i - S - 1] + a[i - S] + a[i - S + 1] + a[i - 1] + a[i + 1] +
                    a[i + S - 1] + a[i + S] + a[i + S + 1];
                if (n === 3 || (n === 2 && a[i])) {
                    b[i] = 1;
                    if (a[i]) {
                        lb[i] = la[i];
                    } else {
                        // A dead cell's lineage is 0, so this counts the
                        // accent parents among the three.
                        lb[i] = (la[i - S - 1] + la[i - S] + la[i - S + 1] + la[i - 1] + la[i + 1] +
                            la[i + S - 1] + la[i + S] + la[i + S + 1]) >= 2 ? 1 : 0;
                        trail[i] = 0;
                        if (!ever[i]) { ever[i] = 1; fresh.push(i); }
                    }
                    h1 = Math.imul(h1 ^ i, 16777619);
                    h2 = (h2 + Math.imul(i, 0x9e3779b1)) | 0;
                    pop++;
                } else {
                    b[i] = 0;
                    lb[i] = 0;
                    if (a[i]) trail[i] = TRAIL;
                    else if (trail[i]) trail[i]--;
                    if (trail[i]) trails++;
                }
            }
            live = b; next = a; lin = lb; linNext = la;
            return seenBefore(h1, h2, pop);
        }

        // After the last generation the marks of the dead fade out on the
        // same beat, then nothing more is drawn.
        function fade() {
            trails = 0;
            for (var k = 0; k < cellsIn.length; k++) {
                var i = cellsIn[k];
                if (trail[i] && --trail[i]) trails++;
            }
        }

        // ── Loop ──
        // A timer on the generation beat rather than every animation frame:
        // the picture only changes twelve times a second.
        function schedule(ms) {
            if (dead || !active || timer || !cellsIn || !(running || trails)) return;
            timer = setTimeout(tick, ms);
        }

        function stop() {
            if (timer) { clearTimeout(timer); timer = 0; }
        }

        function tick() {
            timer = 0;
            if (dead || !active || document.hidden) return;
            if (running) {
                var settled = step();
                gen++;
                if (settled || gen >= MAX_GEN) running = false;
                drawFresh();
            } else {
                fade();
            }
            drawCells();
            schedule(GEN_MS);
        }

        function onTab() {
            if (!document.hidden) schedule(GEN_MS);
        }

        // The line is written into the dish from left to right, like a
        // streak across a plate, then holds still to be read before it grows.
        function revealFrame(now) {
            revealRaf = 0;
            if (dead) return;
            reveal = Math.min(1, (now - revealT0) / REVEAL_MS);
            drawCells();
            if (reveal < 1) revealRaf = requestAnimationFrame(revealFrame);
            else endReveal();
        }

        // Also cuts the writing short when the stage is hidden or clicked.
        function endReveal() {
            if (revealRaf) { cancelAnimationFrame(revealRaf); revealRaf = 0; }
            reveal = 1;
            drawCells();
            markLive();
            if (!reduced) {
                running = true;
                schedule(HOLD_MS);
            }
        }

        function start() {
            if (dead) return;
            stop();
            if (revealRaf) { cancelAnimationFrame(revealRaf); revealRaf = 0; }
            running = false;
            reveal = reduced || !active ? 1 : 0;
            build();
            if (!shown) { shown = true; api.ready(); }
            if (reveal === 1) {
                endReveal();
            } else {
                revealT0 = performance.now();
                revealRaf = requestAnimationFrame(revealFrame);
            }
        }

        // ── Pointer ──
        function local(e) {
            var b = over.getBoundingClientRect();
            return { x: e.clientX - b.left, y: e.clientY - b.top };
        }

        function inDish(p) {
            var dx = (p.x - dish.cx) / dish.rx, dy = (p.y - dish.cy) / dish.ry;
            return dx * dx + dy * dy <= 1;
        }

        // Drops a methuselah, turned one of eight ways, centred on the click
        // but pulled in from the rim so none of it lands outside the dish.
        function drop(p) {
            var ax = dish.irx - 3 * gm.cw, ay = dish.iry - 3 * gm.ch;
            var dx = (p.x - dish.cx) / ax, dy = (p.y - dish.cy) / ay, r = Math.sqrt(dx * dx + dy * dy);
            if (r > 1) { dx /= r; dy /= r; }
            var gx = Math.floor((dish.cx + dx * ax - gm.x0) / gm.cw), gy = Math.floor((dish.cy + dy * ay - gm.y0) / gm.ch);
            var pat = DROPS[Math.floor(Math.random() * DROPS.length)], turn = Math.floor(Math.random() * 8);
            for (var k = 0; k < pat.length; k++) {
                var u = pat[k][0] - 1, v = pat[k][1] - 1, t;
                if (turn & 1) u = -u;
                if (turn & 2) v = -v;
                if (turn & 4) { t = u; u = v; v = t; }
                var x = gx + u, y = gy + v;
                if (x < 0 || y < 0 || x >= gm.cols || y >= gm.rows) continue;
                var i = (y + 1) * S + x + 1;
                if (!inside[i]) continue;
                live[i] = 1;
                lin[i] = 1;
                trail[i] = 0;
                if (!ever[i]) { ever[i] = 1; fresh.push(i); }
            }
            gen = 0; ringN = 0; ringAt = 0;
            running = true;
            drawFresh();
            drawCells();
            stop();
            schedule(GEN_MS * 2);
        }

        function onClick(e) {
            if (!cellsIn) return;
            var p = local(e);
            if (!inDish(p)) return;
            if (reveal < 1) endReveal();
            if (reduced) {
                step();
                drawFresh();
                drawCells();
            } else {
                drop(p);
            }
        }

        function onMove(e) {
            if (e.pointerType !== 'mouse' || !dish) return;
            over.style.cursor = inDish(local(e)) ? 'pointer' : '';
        }

        function applyColors() {
            colors = api.colors();
        }

        applyColors();
        over.addEventListener('click', onClick);
        over.addEventListener('pointermove', onMove);
        document.addEventListener('visibilitychange', onTab);

        if (window.ResizeObserver) {
            resizeObs = new ResizeObserver(function () {
                var w = stage.clientWidth;
                if (!dead && cellsIn && w && Math.abs(w - W) > 1) start();
            });
            resizeObs.observe(stage);
        }

        // The seed is rasterised in the site's font, so wait for it, briefly:
        // past that the fallback font still makes a readable seed.
        var begun = false;
        function begin() {
            clearTimeout(fontTimer);
            if (dead || begun) return;
            begun = true;
            groups = candidates(texts);
            if (!groups.length) { api.fail(); return; }
            start();
        }
        if (document.fonts && document.fonts.load) {
            fontTimer = setTimeout(begin, 800);
            Promise.all([document.fonts.load(SEED_FONT), document.fonts.load('600 10px ' + FONT)]).then(begin, begin);
        } else {
            begin();
        }

        return {
            visible: function (on) {
                active = on;
                if (on) {
                    schedule(GEN_MS);
                } else {
                    stop();
                    if (revealRaf) endReveal();
                }
            },
            theme: function () {
                applyColors();
                if (!cellsIn) return;
                makeAtlas();
                drawDish();
                drawCells();
            },
            destroy: function () {
                dead = true;
                stop();
                if (revealRaf) cancelAnimationFrame(revealRaf);
                clearTimeout(fontTimer);
                over.removeEventListener('click', onClick);
                over.removeEventListener('pointermove', onMove);
                document.removeEventListener('visibilitychange', onTab);
                if (resizeObs) resizeObs.disconnect();
                if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
                // Zero-sized canvases hand their backing memory back now.
                under.width = under.height = over.width = over.height = 0;
                if (atlas) atlas.width = atlas.height = 0;
                atlas = null;
            }
        };
    });
})();
