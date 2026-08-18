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
        var lines = [];

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

        for (var y = 0; y < height; y++) {
            var rowWarp = warp && Math.abs(y - mcy) < rowSpan;
            var mdy = rowWarp ? (y - mcy) * ASPECT : 0, mdy2 = mdy * mdy;
            var row = '';
            for (var x = 0; x < width; x++) {
                // Sampled position, displaced away from the cursor; boost rides on top
                // of the field value. Both are identity outside the cursor's reach.
                var sx = x, sy = y, boost = 0;

                if (rowWarp) {
                    var mdx = x - mcx, r2 = mdx * mdx + mdy2;
                    if (r2 < R2) {
                        var f = 1 - r2 / R2;
                        f = f * f * active;                  // smooth to zero at the rim
                        var r = Math.sqrt(r2);
                        var m = LENS * f / (r + 0.5);        // +0.5 softens the singular core
                        sx = x + mdx * m;
                        sy = y + (mdy * m) / ASPECT;
                        boost = Math.sin(r * 0.42 - tSec * RIPPLE_HZ * 6.283) * f * 1.2;
                    }
                }

                if (textMask[y][x]) {
                    var d = edgeDist[y][x];
                    if (d <= erosion + boost * 2.5) {
                        var w = Math.sin(sx * 0.15 + sy * 0.1 + t * 0.8);
                        row += w > 0.2 ? '0' : w < -0.3 ? '~' : ':';
                    } else {
                        row += Math.sin(sx * 0.3 + sy * 0.2 + t * 0.3) > 0.85 ? '0' : '1';
                    }
                } else {
                    var dx = sx - hw, dy = sy - hh;
                    var angle = Math.atan2(dy, dx);
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var wave = Math.sin(dist * 0.07 - t * 0.5 + angle * 1.2);
                    var flow = Math.sin(sx * 0.035 + sy * 0.02 + t * 0.2);
                    var c = wave + flow + boost;
                    row += c > 0.9 ? '0' : c > 0.4 ? '.' : c < -0.7 ? '~' : ' ';
                }
            }
            lines.push(row);
        }

        // Cracks through text
        var grid = [];
        for (var i = 0; i < lines.length; i++) grid.push(lines[i].split(''));

        for (var i = 0; i < 3; i++) {
            var seed = Math.sin(i * 123.456 + t * 0.2) * 0.5 + 0.5;
            var cx = Math.floor(seed * width);
            var cy = Math.floor((Math.sin(i * 789.012 + t * 0.15) * 0.5 + 0.5) * height);
            var len = 10 + Math.floor(Math.sin(t + i) * 5);
            for (var j = 0; j < len; j++) {
                if (cx >= 0 && cx < width && cy >= 0 && cy < height && textMask[cy] && textMask[cy][cx]) {
                    grid[cy][cx] = j % 2 === 0 ? '0' : '~';
                }
                cx += Math.floor(Math.sin(j * 0.5 + t) * 2);
                cy += Math.floor(Math.cos(j * 0.3 + t * 0.7) * 1.5);
            }
        }

        var output = '';
        for (var i = 0; i < grid.length; i++) output += grid[i].join('') + '\n';
        container.textContent = output;

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
