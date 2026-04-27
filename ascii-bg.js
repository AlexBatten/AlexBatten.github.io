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

    function frame(now) {
        animId = requestAnimationFrame(frame);
        if (now - lastRender < FRAME_INTERVAL) return;
        lastRender = now;

        var t = (now - startTime) * T_PER_MS;
        var hw = width / 2, hh = height / 2;
        var erosion = (Math.sin(t * 0.4) * 0.5 + 0.5) * 4 + 0.5;
        var lines = [];

        for (var y = 0; y < height; y++) {
            var row = '';
            for (var x = 0; x < width; x++) {
                if (textMask[y][x]) {
                    var d = edgeDist[y][x];
                    if (d <= erosion) {
                        var w = Math.sin(x * 0.15 + y * 0.1 + t * 0.8);
                        row += w > 0.2 ? '0' : w < -0.3 ? '~' : ':';
                    } else {
                        row += Math.sin(x * 0.3 + y * 0.2 + t * 0.3) > 0.85 ? '0' : '1';
                    }
                } else {
                    var dx = x - hw, dy = y - hh;
                    var angle = Math.atan2(dy, dx);
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    var wave = Math.sin(dist * 0.07 - t * 0.5 + angle * 1.2);
                    var flow = Math.sin(x * 0.035 + y * 0.02 + t * 0.2);
                    var c = wave + flow;
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
