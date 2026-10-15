// ── ASCII Binary Flow Background ──
// Renders "ALEX BATTEN" as flowing/eroding binary text at times.

(function () {
    var container = document.getElementById('ascii-bg');
    if (!container) return;

    var CHAR_W = 8.5;
    var CHAR_H = 14;
    // 30Hz cap — text animation is subtle, no point burning the frame budget on
    // it at 60/120Hz. Original 60Hz speed was time++ * 0.003 = 0.18 t-units/sec.
    // Threshold sits a few ms below 1000/30 so float jitter at 60Hz native rAF
    // doesn't push us into a 20Hz/30Hz alternating pattern.
    var FRAME_INTERVAL = 30;
    var T_PER_MS = 0.18 / 1000;
    var width, height, textMask, edgeDist, animId, startTime, lastRender;

    // ── Build boolean mask via offscreen canvas ──
    function buildTextMask() {
        var mask = [];
        for (var y = 0; y < height; y++) mask.push(new Uint8Array(width));

        var cw = Math.ceil(width * CHAR_W);
        var ch = Math.ceil(height * CHAR_H);
        var c = document.createElement('canvas');
        c.width = cw; c.height = ch;
        var ctx = c.getContext('2d');

        var fs = Math.floor(cw * 0.13);
        ctx.font = '700 ' + fs + 'px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';

        var gap = fs * 0.2;
        var y1 = (ch - fs * 2 - gap) / 2 + fs * 0.5;
        var y2 = y1 + fs + gap;
        ctx.fillText('ALEX', cw / 2, y1);
        ctx.fillText('BATTEN', cw / 2, y2);

        var px = ctx.getImageData(0, 0, cw, ch).data;
        for (var gy = 0; gy < height; gy++) {
            for (var gx = 0; gx < width; gx++) {
                var pi = Math.floor(gx * CHAR_W + CHAR_W / 2);
                var pj = Math.floor(gy * CHAR_H + CHAR_H / 2);
                if (pi < cw && pj < ch) {
                    var idx = (pj * cw + pi) * 4;
                    if (px[idx + 3] > 80) mask[gy][gx] = 1;
                }
            }
        }
        return mask;
    }

    // ── BFS edge distance ──
    function buildEdgeDist() {
        var dist = [];
        for (var y = 0; y < height; y++) dist.push(new Uint8Array(width));

        var queue = [];
        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                if (!textMask[y][x]) continue;
                var edge = false;
                for (var dy = -1; dy <= 1 && !edge; dy++) {
                    for (var dx = -1; dx <= 1 && !edge; dx++) {
                        if (!dx && !dy) continue;
                        var ny = y + dy, nx = x + dx;
                        if (ny < 0 || ny >= height || nx < 0 || nx >= width || !textMask[ny][nx]) edge = true;
                    }
                }
                if (edge) { dist[y][x] = 1; queue.push([y, x]); }
            }
        }
        for (var qi = 0; qi < queue.length; qi++) {
            var cy = queue[qi][0], cx = queue[qi][1], d = dist[cy][cx];
            for (var dy = -1; dy <= 1; dy++) {
                for (var dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue;
                    var ny = cy + dy, nx = cx + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width && textMask[ny][nx] && !dist[ny][nx]) {
                        dist[ny][nx] = d + 1;
                        queue.push([ny, nx]);
                    }
                }
            }
        }
        return dist;
    }

    // ── Per-cell terms ──
    // Away from the cursor every cell samples its own grid position, so the
    // position half of each sine argument is fixed until the grid is rebuilt
    // and is worked out once here. Four doubles per cell, at terms[i * 4]:
    //
    // Text cells keep the two pattern terms themselves, [edge, fill, -, -].
    // The frame adds the clock and takes the sine in the same operation order
    // as the warp path, so a cell gets the same double from either path.
    //
    // Background cells, most of the grid, would cost two sines a frame. They
    // keep [sin, cos] of the wave term and of the flow term instead, and the
    // frame turns both by the clock with the angle-sum identity. That value
    // differs from the direct one by rounding alone (see SLACK), so a cell
    // clear of every threshold by more than the bound gets the same character
    // either way. The few that land inside the bound are evaluated directly.
    var cellText, cellEdge, terms, out;

    function buildCells() {
        var n = width * height, hw = width / 2, hh = height / 2;
        cellText = new Uint8Array(n);
        cellEdge = new Uint8Array(n);
        terms = new Float64Array(n * 4);
        for (var y = 0, i = 0, q = 0; y < height; y++) {
            for (var x = 0; x < width; x++, i++, q += 4) {
                if (textMask[y][x]) {
                    cellText[i] = 1;
                    cellEdge[i] = edgeDist[y][x];
                    terms[q] = x * 0.15 + y * 0.1;
                    terms[q + 1] = x * 0.3 + y * 0.2;
                } else {
                    var dx = x - hw, dy = y - hh;
                    var wave = Math.sqrt(dx * dx + dy * dy) * 0.07 + Math.atan2(dy, dx) * 1.2;
                    var flow = x * 0.035 + y * 0.02;
                    terms[q] = Math.sin(wave);
                    terms[q + 1] = Math.cos(wave);
                    terms[q + 2] = Math.sin(flow);
                    terms[q + 3] = Math.cos(flow);
                }
            }
        }
        // The frame is written as character codes, one row of width cells and a
        // newline after each, then decoded to a string in one go.
        out = new Uint8Array((width + 1) * height);
    }

    // ── Background field ──
    // The pattern outside the letters: a radial wave twisted into a spiral,
    // plus a diagonal flow, at a sampled position. boost is the cursor ripple.
    function backgroundChar(sx, sy, boost, hw, hh, t5, t2) {
        var dx = sx - hw, dy = sy - hh;
        var angle = Math.atan2(dy, dx);
        var dist = Math.sqrt(dx * dx + dy * dy);
        var wave = Math.sin(dist * 0.07 - t5 + angle * 1.2);
        var flow = Math.sin(sx * 0.035 + sy * 0.02 + t2);
        var c = wave + flow + boost;
        return c > 0.9 ? 48 : c > 0.4 ? 46 : c < -0.7 ? 126 : 32;
    }

    // Bound on how far the angle-sum value can sit from the direct one. The
    // direct arguments carry the clock, so their rounding grows with it, by
    // about 2^-52 (2.2e-16) per unit of t for the two terms together; every
    // other step (the cached sums, the library sines, the products) adds a few
    // units in the last place of numbers no bigger than a few hundred, under
    // 1e-13 in all. The constant and the per-t rate sit well above both.
    var SLACK = 1e-9, SLACK_PER_T = 1e-15;

    // ── Output ──
    // Every code written is ASCII, which decodes the same under any encoding
    // TextDecoder supports. Without it, String.fromCharCode takes the codes in
    // slices because apply() has an argument limit.
    var decoder = typeof TextDecoder === 'function' ? new TextDecoder() : null;

    function decode(codes) {
        if (decoder) return decoder.decode(codes);
        var s = '';
        for (var k = 0; k < codes.length; k += 4096) {
            s += String.fromCharCode.apply(null, codes.subarray(k, k + 4096));
        }
        return s;
    }

    // ── Pointer warp ──
    // The cursor bends the sampled coordinates outward (a lens) and adds an
    // expanding ripple to the field value. Both fade to zero at REACH, so the
    // per-frame cost is bounded by the box around the cursor, not the viewport.
    var LENS = 7;          // peak radial displacement, in grid cells
    var REACH = 240;       // effect radius, CSS px
    var RIPPLE_HZ = 0.95;

    var tgtX = -1e5, tgtY = -1e5, ptrX = -1e5, ptrY = -1e5;
    var active = 0, lastMove = -1e9;
    var originX = 0, originY = 0, cellW = CHAR_W, cellH = CHAR_H, measured = false;

    window.addEventListener('pointermove', function (e) {
        // Touch has no hover, and on mobile this competes with dragging the balls.
        if (e.pointerType === 'touch') return;
        tgtX = e.clientX; tgtY = e.clientY; lastMove = performance.now();
        // Fade in where the cursor already is rather than swooping in from offscreen.
        if (active < 0.01) { ptrX = tgtX; ptrY = tgtY; }
    }, { passive: true });

    document.documentElement.addEventListener('pointerleave', function () {
        lastMove = -1e9;
    }, { passive: true });

    // CHAR_W/CHAR_H are mask-sampling constants, not rendered metrics: letter-spacing
    // widens the advance and the container centres the block, so screen-to-cell
    // mapping has to come from the laid-out text. Falls back to the constants where
    // layout reports nothing.
    function measure() {
        if (!container.firstChild) return;
        var range = document.createRange();
        range.selectNodeContents(container);
        var r = range.getBoundingClientRect();
        if (r.width && r.height) {
            originX = r.left; originY = r.top;
            cellW = r.width / width; cellH = r.height / height;
        }
    }

    // The advance changes when the webfont swaps in (measurably: ~8.4px with the
    // fallback, ~8.8px with Roboto Condensed), which is enough drift to throw the
    // cursor off by half a dozen columns at the edge of a wide screen.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { measured = false; });
    }

    function frame(now) {
        animId = requestAnimationFrame(frame);
        if (now - lastRender < FRAME_INTERVAL) return;
        lastRender = now;

        var t = (now - startTime) * T_PER_MS;
        // The ambient clock advances 0.18 units/sec, far too slow to drive a ripple
        // that has to keep up with a moving cursor.
        var tSec = (now - startTime) / 1000;
        var hw = width / 2, hh = height / 2;
        var erosion = (Math.sin(t * 0.4) * 0.5 + 0.5) * 4 + 0.5;
        // Clock terms of the field, shared by every cell.
        var t8 = t * 0.8, t3 = t * 0.3, t5 = t * 0.5, t2 = t * 0.2;
        var ripple = tSec * RIPPLE_HZ * 6.283;
        var sinT5 = Math.sin(t5), cosT5 = Math.cos(t5), sinT2 = Math.sin(t2), cosT2 = Math.cos(t2);
        var slack = SLACK + Math.abs(t) * SLACK_PER_T;
        var above09 = 0.9 + slack, below09 = 0.9 - slack;
        var above04 = 0.4 + slack, below04 = 0.4 - slack;
        var above07 = -0.7 + slack, below07 = -0.7 - slack;

        ptrX += (tgtX - ptrX) * 0.18;                                 // centre trails the cursor
        ptrY += (tgtY - ptrY) * 0.18;
        active += ((now - lastMove < 400 ? 1 : 0) - active) * 0.09;   // ease in, decay out

        var warp = active > 0.01, mcx, mcy, R2, ASPECT, rowSpan;
        if (warp) {
            // Cells are taller than they are wide, so distances are worked in
            // column-units to keep the falloff circular on screen rather than a
            // flattened ellipse.
            ASPECT = cellH / cellW;
            mcx = (ptrX - originX) / cellW;
            mcy = (ptrY - originY) / cellH;
            var reachCols = REACH / cellW;
            R2 = reachCols * reachCols;
            rowSpan = reachCols / ASPECT;
        }

        // Character codes: 48 '0', 49 '1', 58 ':', 126 '~', 46 '.', 32 ' ', 10 '\n'.
        var i = 0, o = 0;
        for (var y = 0; y < height; y++) {
            var rowWarp = warp && Math.abs(y - mcy) < rowSpan;
            var mdy = rowWarp ? (y - mcy) * ASPECT : 0, mdy2 = mdy * mdy;
            for (var x = 0; x < width; x++, i++) {
                var mdx, r2, w, c;
                if (rowWarp && (mdx = x - mcx, r2 = mdx * mdx + mdy2) < R2) {
                    // Sampled position, displaced away from the cursor; boost rides
                    // on top of the field value. Both fall to identity at the rim.
                    var f = 1 - r2 / R2;
                    f = f * f * active;                  // smooth to zero at the rim
                    var r = Math.sqrt(r2);
                    var m = LENS * f / (r + 0.5);        // +0.5 softens the singular core
                    var sx = x + mdx * m;
                    var sy = y + (mdy * m) / ASPECT;
                    var boost = Math.sin(r * 0.42 - ripple) * f * 1.2;

                    if (cellText[i]) {
                        if (cellEdge[i] <= erosion + boost * 2.5) {
                            w = Math.sin(sx * 0.15 + sy * 0.1 + t8);
                            out[o++] = w > 0.2 ? 48 : w < -0.3 ? 126 : 58;
                        } else {
                            out[o++] = Math.sin(sx * 0.3 + sy * 0.2 + t3) > 0.85 ? 48 : 49;
                        }
                    } else {
                        out[o++] = backgroundChar(sx, sy, boost, hw, hh, t5, t2);
                    }
                } else if (cellText[i]) {
                    if (cellEdge[i] <= erosion) {
                        w = Math.sin(terms[i * 4] + t8);
                        out[o++] = w > 0.2 ? 48 : w < -0.3 ? 126 : 58;
                    } else {
                        out[o++] = Math.sin(terms[i * 4 + 1] + t3) > 0.85 ? 48 : 49;
                    }
                } else {
                    // sin(wave - t5) + sin(flow + t2), by the angle-sum identity
                    var q = i * 4;
                    c = terms[q] * cosT5 - terms[q + 1] * sinT5 + (terms[q + 2] * cosT2 + terms[q + 3] * sinT2);
                    if (c > above09) out[o++] = 48;
                    else if (c < below07) out[o++] = 126;
                    else if (c > above04 && c < below09) out[o++] = 46;
                    else if (c > above07 && c < below04) out[o++] = 32;
                    else out[o++] = backgroundChar(x, y, 0, hw, hh, t5, t2);
                }
            }
            out[o++] = 10;
        }

        // Cracks through text
        for (var k = 0; k < 3; k++) {
            var seed = Math.sin(k * 123.456 + t * 0.2) * 0.5 + 0.5;
            var cx = Math.floor(seed * width);
            var cy = Math.floor((Math.sin(k * 789.012 + t * 0.15) * 0.5 + 0.5) * height);
            var len = 10 + Math.floor(Math.sin(t + k) * 5);
            for (var j = 0; j < len; j++) {
                if (cx >= 0 && cx < width && cy >= 0 && cy < height && cellText[cy * width + cx]) {
                    out[cy * (width + 1) + cx] = j % 2 === 0 ? 48 : 126;
                }
                cx += Math.floor(Math.sin(j * 0.5 + t) * 2);
                cy += Math.floor(Math.cos(j * 0.3 + t * 0.7) * 1.5);
            }
        }

        container.textContent = decode(out);

        if (!measured) { measure(); measured = true; }
    }

    function getSize() {
        // Use multiple fallbacks — innerWidth can be 0 in some environments
        var w = window.innerWidth || document.documentElement.clientWidth || document.body.offsetWidth || 1280;
        var h = window.innerHeight || document.documentElement.clientHeight || document.body.offsetHeight || 800;
        return { w: w, h: h };
    }

    function init() {
        var size = getSize();
        width = Math.max(20, Math.floor(size.w / CHAR_W));
        height = Math.max(10, Math.floor(size.h / CHAR_H));
        textMask = buildTextMask();
        edgeDist = buildEdgeDist();
        buildCells();
        startTime = performance.now();
        lastRender = 0;
        measured = false;
    }

    function start() {
        try {
            init();
            animId = requestAnimationFrame(frame);
        } catch (e) {
            // Retry after a short delay if sizing failed at load
            setTimeout(function () {
                init();
                animId = requestAnimationFrame(frame);
            }, 500);
        }
    }

    start();

    var resizeTimer;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            if (animId) cancelAnimationFrame(animId);
            start();
        }, 250);
    });
})();
