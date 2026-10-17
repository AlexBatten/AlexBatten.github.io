// ── 03 Projects: systems talking ──
// Most of the professional work in the Projects text moves data from one
// named system to another. This draws those projects as a wiring diagram:
// where the data comes from on the left, where it lands on the right, a curved
// wire for each link, and small packets of 0/1 glyphs from the page's ascii
// background travelling along the wires. A destination pulses softly as a
// packet lands. Traffic runs for a few seconds after the card opens, then the
// picture rests and costs nothing until the pointer comes back.
//
// Every endpoint is a phrase taken from the text, looked up in the modal's own
// entries when it opens, so the Danish page shows the Danish words and an
// endpoint whose words are not in its entry is never drawn. Hovering a wire or
// an endpoint lights that project's links, names it with its own heading and
// sends a few packets along it; clicking scrolls the card to the entry.
//
// Two stacked canvases: the wires and labels are drawn once (and again when
// the hover changes), and the packets on a second canvas where each frame
// clears only what the last one drew. The opening wipe is a compositor
// animation, so it adds nothing to a frame.

(function () {
    'use strict';
    if (!window.MODAL_FX) return;

    var FONT = '"Roboto Condensed", Arial, sans-serif';
    var TRAIL = [0.95, 0.6, 0.3];   // alpha of a packet's three glyphs, head first
    var SPACING = 7;                // px between those glyphs along the wire
    var SPEED = 150;                // px per second, three quarters of it on a phone
    var PER_LINK = 3;               // packets each wire carries after open
    var FLOW_START = 0.55;          // seconds before the first packets leave
    var WIPE_MS = 900;
    var PULSE = 0.8;                // seconds a landing pulse lasts
    var GAP = 9;                    // px between an endpoint's dot and its label
    var DOT = 2.4;
    var ROWS_TOP = 34, ROWS_BOTTOM = 10, MIN_ROW = 21, MAX_ROW = 30;
    var WIRE_MAX = 330;

    // The projects that move data between named systems, with the phrases
    // their text uses for each end. A project is drawn only when every one of
    // its phrases appears in a single entry of the modal; that entry's heading
    // is the name shown on hover. Each source is wired to each destination.
    // When a phone is too short for all of them, the last ones here go first.
    // `alert` marks the alarms, whose packets are amber; `wave` carries audio
    // as ~ instead of bits.
    var PROJECTS = [
        { id: 'accelo',
          en: { from: ['Accelo'], to: ['Business Central'] },
          da: { from: ['Accelo'], to: ['Business Central'] } },
        { id: 'istobal',
          en: { from: ['ISTOBAL'], to: ['Uno X'] },
          da: { from: ['ISTOBAL'], to: ['Uno X'] } },
        { id: 'eye4u', alert: true,
          en: { from: ['sensor network'], to: ['SMS', 'email'] },
          da: { from: ['sensornetværk'], to: ['SMS', 'e-mail'] } },
        { id: 'dashboards',
          en: { from: ['time registrations', 'cron job health'], to: ['office TV screens'] },
          da: { from: ['tidsregistreringer', 'cron-jobs'], to: ['kontorets TV-skærme'] } },
        { id: 'audio', wave: true,
          en: { from: ['DAW'], to: ['distortion plugin'] },
          da: { from: ['DAW'], to: ['distortion-plugin'] } },
        { id: 'timevat',
          en: { from: ['EU VIES API', 'Danish National Bank API'], to: ['VAT compliance platform'] },
          da: { from: ['VIES-API', 'Nationalbankens API'], to: ['momscompliance-platform'] } }
    ];

    // Sources run down the left in this order and destinations down the
    // right in another, so the alerts climb across the two wires above them
    // and the VAT lookups climb across the dashboards: the bundle reads as a
    // weave rather than a table of parallel lines.
    var LEFT_ORDER = ['accelo', 'istobal', 'eye4u', 'dashboards', 'timevat', 'audio'];
    var RIGHT_ORDER = ['eye4u:0', 'eye4u:1', 'accelo:0', 'timevat:0', 'istobal:0', 'dashboards:0', 'audio:0'];

    // How to use the picture, longest first: the caption takes the first
    // that fits the card.
    var TEXT = {
        en: {
            hint: ['hover a wire to see its project, click to jump to it', 'hover or click a wire'],
            tap: ['tap a wire to jump to its project', 'tap a wire']
        },
        da: {
            hint: ['hold musen over en forbindelse for at se projektet, klik for at gå til det',
                'hold musen over eller klik på en forbindelse'],
            tap: ['tryk på en forbindelse for at gå til projektet', 'tryk på en forbindelse']
        }
    };

    // Seeded, so the traffic after open runs the same way every time.
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

    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    // ── Grounding ──
    // Finds each project's entry in the open modal by the phrases it needs.
    // Whitespace is collapsed first because the source HTML wraps lines in
    // the middle of names like "Danish National Bank API".
    function match(lang) {
        var root = document.getElementById('modal-content');
        if (!root) return [];
        var entries = Array.prototype.slice.call(root.querySelectorAll('.entry'));
        var texts = entries.map(function (e) { return (e.textContent || '').replace(/\s+/g, ' '); });
        var out = [];
        PROJECTS.forEach(function (spec) {
            var words = spec[lang] || spec.en;
            var all = words.from.concat(words.to);
            for (var i = 0; i < entries.length; i++) {
                var hit = all.every(function (w) { return texts[i].indexOf(w) >= 0; });
                if (!hit) continue;
                var h = entries[i].querySelector('h3');
                out.push({
                    spec: spec,
                    words: words,
                    entry: entries[i],
                    name: h ? h.textContent.replace(/\s+/g, ' ').trim() : ''
                });
                return;
            }
        });
        return out;
    }

    // ── Wires ──
    // A cubic that leaves the source and enters the destination level, the
    // usual shape of a patch cable, sampled into a polyline with running
    // lengths so packets can travel it at an even speed.
    var SAMPLES = 40;

    function wire(x0, y0, x1, y1) {
        var k = (x1 - x0) * 0.5, pts = [], cum = [0], len = 0;
        for (var i = 0; i <= SAMPLES; i++) {
            var t = i / SAMPLES, u = 1 - t;
            var x = u * u * u * x0 + 3 * u * u * t * (x0 + k) + 3 * u * t * t * (x1 - k) + t * t * t * x1;
            var y = u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1;
            if (i) {
                len += Math.sqrt((x - pts[i - 1][0]) * (x - pts[i - 1][0]) + (y - pts[i - 1][1]) * (y - pts[i - 1][1]));
                cum.push(len);
            }
            pts.push([x, y]);
        }
        return { pts: pts, cum: cum, len: len };
    }

    function pointAt(w, s) {
        if (s <= 0) return w.pts[0];
        if (s >= w.len) return w.pts[SAMPLES];
        var i = 1;
        while (i < SAMPLES && w.cum[i] < s) i++;
        var a = w.pts[i - 1], b = w.pts[i], f = (s - w.cum[i - 1]) / ((w.cum[i] - w.cum[i - 1]) || 1);
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }

    function trace(g, w) {
        g.beginPath();
        g.moveTo(w.pts[0][0], w.pts[0][1]);
        for (var i = 1; i <= SAMPLES; i++) g.lineTo(w.pts[i][0], w.pts[i][1]);
    }

    function distToWire(w, x, y) {
        var best = Infinity;
        for (var i = 1; i <= SAMPLES; i++) {
            var a = w.pts[i - 1], b = w.pts[i];
            var dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
            var t = l2 ? clamp01(((x - a[0]) * dx + (y - a[1]) * dy) / l2) : 0;
            var px = a[0] + dx * t - x, py = a[1] + dy * t - y;
            var d = px * px + py * py;
            if (d < best) best = d;
        }
        return Math.sqrt(best);
    }

    MODAL_FX.register('projects', function (stage, api) {
        var lang = TEXT[api.lang()] ? api.lang() : 'en';
        var T = TEXT[lang];
        var found = match(lang);
        if (!found.length) {
            api.fail();
            return { destroy: function () {} };
        }

        var reduced = api.reduced();
        var hoverable = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : true;
        var dead = false, active = true, started = false, raf = 0, last = 0, sim = 0;
        var colors = api.colors();
        var W = 0, H = 0, dpr = 1, narrow = false, labelPx = 11, speed = SPEED;
        var projects = [], nodes = [], links = [];
        var queue = [], packets = [], pulses = [], drawn = [], still = [];
        var lit = null, sprites = {}, fontTimer = 0, resizeObs = null, cover = null, wipeAnim = null;
        var bits = rng(20261017);

        var base = document.createElement('canvas');
        var live = document.createElement('canvas');
        base.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none';
        // pan-y keeps a vertical swipe scrolling the card on a touch screen.
        live.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:pan-y';
        stage.appendChild(base);
        stage.appendChild(live);
        var bg = base.getContext('2d'), lg = live.getContext('2d');

        // ── Layout ──
        function labelFont(bold) {
            return (bold ? '600 ' : '400 ') + labelPx + 'px ' + FONT;
        }

        function widths(list) {
            var l = 0, r = 0;
            bg.font = labelFont(true);
            list.forEach(function (f) {
                f.words.from.forEach(function (w) { l = Math.max(l, bg.measureText(w).width); });
                f.words.to.forEach(function (w) { r = Math.max(r, bg.measureText(w).width); });
            });
            return { l: l, r: r };
        }

        function rowsNeeded(list) {
            var l = 0, r = 0;
            list.forEach(function (f) { l += f.words.from.length; r += f.words.to.length; });
            return Math.max(l, r);
        }

        // Drops projects until the labels leave room for the wires and the
        // rows fit the strip's height. When it is too narrow, the project
        // whose labels cost the most width goes; when it is too short, the
        // last in PROJECTS goes.
        function fit() {
            var keep = found.slice();
            var wireMin = Math.max(64, W * 0.3);
            var rowsMax = Math.floor((H - ROWS_TOP - ROWS_BOTTOM) / MIN_ROW) + 1;
            while (keep.length > 1) {
                var w = widths(keep);
                if (w.l + w.r + 2 * GAP + wireMin > W) {
                    var bestI = keep.length - 1, bestW = Infinity;
                    for (var i = keep.length - 1; i >= 0; i--) {
                        var rw = widths(keep.slice(0, i).concat(keep.slice(i + 1)));
                        if (rw.l + rw.r < bestW - 0.5) { bestW = rw.l + rw.r; bestI = i; }
                    }
                    keep.splice(bestI, 1);
                    continue;
                }
                if (rowsNeeded(keep) > rowsMax) { keep.pop(); continue; }
                break;
            }
            return keep;
        }

        function rowY(i, n) {
            var top = ROWS_TOP, bottom = H - ROWS_BOTTOM;
            if (n < 2) return (top + bottom) / 2;
            var sp = Math.min(MAX_ROW, (bottom - top) / (n - 1));
            return (top + bottom) / 2 - sp * (n - 1) / 2 + sp * i;
        }

        function layout() {
            W = stage.clientWidth || 520;
            H = stage.clientHeight || 210;
            narrow = api.narrow();
            dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
            labelPx = narrow ? 10.5 : 11;
            speed = narrow ? SPEED * 0.75 : SPEED;
            base.width = live.width = Math.round(W * dpr);
            base.height = live.height = Math.round(H * dpr);
            sprites = {};
            drawn = [];

            var keep = fit(), byId = {};
            projects = keep.map(function (f) {
                var p = { spec: f.spec, words: f.words, entry: f.entry, name: f.name, from: [], to: [], links: [] };
                byId[f.spec.id] = p;
                return p;
            });

            var left = [], right = [];
            LEFT_ORDER.forEach(function (id) {
                var p = byId[id];
                if (!p) return;
                p.words.from.forEach(function (w) {
                    var n = { side: 'L', label: w, project: p };
                    p.from.push(n);
                    left.push(n);
                });
            });
            RIGHT_ORDER.forEach(function (key) {
                var parts = key.split(':'), p = byId[parts[0]];
                var w = p && p.words.to[+parts[1]];
                if (!w) return;
                var n = { side: 'R', label: w, project: p };
                p.to.push(n);
                right.push(n);
            });

            // Centred: the widest label on each side, the gap to its dot,
            // and the wires between, capped so a wide card is not all wire.
            var w = widths(keep);
            var span = Math.min(WIRE_MAX, W - w.l - w.r - 2 * GAP);
            var x0 = (W - (w.l + w.r + 2 * GAP + span)) / 2;
            var xL = x0 + w.l + GAP, xR = xL + span;
            bg.font = labelFont(true);
            left.forEach(function (n, i) { n.x = xL; n.y = rowY(i, left.length); n.w = bg.measureText(n.label).width; });
            right.forEach(function (n, i) { n.x = xR; n.y = rowY(i, right.length); n.w = bg.measureText(n.label).width; });
            nodes = left.concat(right);

            links = [];
            projects.forEach(function (p) {
                p.from.forEach(function (a) {
                    p.to.forEach(function (b) {
                        var l = wire(a.x, a.y, b.x, b.y);
                        l.from = a; l.to = b; l.project = p;
                        p.links.push(l);
                        links.push(l);
                    });
                });
            });
            lit = null;
            if (reduced) placeStill();
        }

        // ── Traffic ──
        function schedule() {
            var r = rng(20260415);
            links.forEach(function (l) {
                var t = FLOW_START + r() * 0.9;
                for (var j = 0; j < PER_LINK; j++) {
                    queue.push({ at: t, link: l });
                    t += 0.85 + r() * 0.55;
                }
            });
            queue.sort(function (a, b) { return a.at - b.at; });
        }

        function bit() { return bits() < 0.5 ? '0' : '1'; }

        function launch(item) {
            var l = item.link;
            var g = l.project.spec.wave ? ['~', '~', '~'] : [bit(), bit(), bit()];
            packets.push({ link: l, s: 0, glyphs: g, landed: false });
        }

        // A hovered project sends two packets down each of its wires, unless
        // a wire already has a few on the way.
        function send(p) {
            p.links.forEach(function (l, i) {
                var busy = 0;
                packets.forEach(function (k) { if (k.link === l && !k.landed) busy++; });
                queue.forEach(function (k) { if (k.link === l) busy++; });
                if (busy >= 3) return;
                for (var j = 0; j < 2; j++) queue.push({ at: sim + 0.04 + i * 0.12 + j * 0.3, link: l });
            });
            queue.sort(function (a, b) { return a.at - b.at; });
            wake();
        }

        // ── Drawing ──
        function ink(a) { return 'rgba(' + colors.paper + ',' + a + ')'; }

        function packetColor(l) {
            if (lit === l.project) return colors.accent;
            if (l.project.spec.alert) return colors.amber;
            return 'rgb(' + colors.paper + ')';
        }

        // One glyph of a packet at one place in its trail, pre-rendered so a
        // frame is a handful of image copies rather than text layout. Behind
        // the glyph is a patch of card colour, so the wire reads as passing
        // under it; the patch is fainter for the faint tail glyphs.
        function sprite(ch, color, k) {
            var key = ch + '|' + color + '|' + k;
            if (sprites[key]) return sprites[key];
            var c = document.createElement('canvas');
            c.width = c.height = Math.ceil(14 * dpr);
            var g = c.getContext('2d');
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.globalAlpha = Math.min(1, TRAIL[k] * 1.6);
            g.fillStyle = colors.card;
            g.fillRect(3.5, 1.5, 7, 11);
            g.globalAlpha = TRAIL[k];
            g.font = '600 10px ' + FONT;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillStyle = color;
            g.fillText(ch, 7, 7.5);
            sprites[key] = c;
            return c;
        }

        function fitText(g, text, max) {
            if (g.measureText(text).width <= max) return text;
            while (text.length > 1 && g.measureText(text + '…').width > max) text = text.slice(0, -1);
            return text.replace(/[\s,]+$/, '') + '…';
        }

        // The line above the wires: the hovered project's heading, or how to
        // use the picture. It stops short of the card's close button.
        function caption(g) {
            var max = W - 34;
            g.textAlign = 'left';
            g.textBaseline = 'middle';
            if (lit) {
                g.font = '600 ' + (narrow ? 11 : 12) + 'px ' + FONT;
                g.fillStyle = colors.accent;
                g.fillText(fitText(g, lit.name, max), 0, 9);
            } else {
                g.font = '400 10px ' + FONT;
                g.fillStyle = ink(0.45);
                var hints = hoverable ? T.hint : T.tap, text = hints[hints.length - 1];
                for (var i = 0; i < hints.length; i++) {
                    if (g.measureText(hints[i]).width <= max) { text = hints[i]; break; }
                }
                g.fillText(fitText(g, text, max), 0, 9);
            }
        }

        function drawBase() {
            var g = bg;
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.clearRect(0, 0, W, H);
            caption(g);

            // The lit project's wires go last, so they run over the others.
            g.lineCap = 'round';
            links.forEach(function (l) { if (lit !== l.project) strokeWire(g, l); });
            links.forEach(function (l) { if (lit === l.project) strokeWire(g, l); });

            g.textBaseline = 'middle';
            nodes.forEach(function (n) {
                var on = lit === n.project, dim = lit && !on;
                g.fillStyle = on ? colors.accent : ink(dim ? 0.25 : 0.6);
                g.beginPath();
                g.arc(n.x, n.y, on ? DOT + 0.6 : DOT, 0, Math.PI * 2);
                g.fill();
                g.font = labelFont(on);
                g.fillStyle = ink(on ? 0.95 : dim ? 0.3 : 0.68);
                g.textAlign = n.side === 'L' ? 'right' : 'left';
                g.fillText(n.label, n.side === 'L' ? n.x - GAP : n.x + GAP, n.y + 0.5);
            });
        }

        function strokeWire(g, l) {
            var on = lit === l.project;
            g.strokeStyle = on ? colors.accent : ink(lit ? 0.08 : 0.24);
            g.lineWidth = on ? 1.5 : 1;
            trace(g, l);
            g.stroke();
        }

        function drawPacket(g, l, s, glyphs) {
            var color = packetColor(l);
            for (var k = TRAIL.length - 1; k >= 0; k--) {
                var at = s - k * SPACING;
                // Glyphs fade in as they leave the source dot and out as they
                // reach the destination's, so neither dot is ever drawn over.
                var a = Math.min(clamp01((at - 4) / 10), clamp01((l.len - 4 - at) / 10));
                if (a <= 0.02) continue;
                var p = pointAt(l, at);
                g.globalAlpha = a;
                g.drawImage(sprite(glyphs[k], color, k), p[0] - 7, p[1] - 7, 14, 14);
                drawn.push(p[0] - 8, p[1] - 8, 16, 16);
            }
        }

        // `full` clears the whole canvas; a frame of the loop clears only the
        // boxes the previous frame drew into.
        function drawLive(full) {
            var g = lg, i;
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (full || drawn.length > 400) {
                g.clearRect(0, 0, W, H);
            } else {
                for (i = 0; i < drawn.length; i += 4) g.clearRect(drawn[i], drawn[i + 1], drawn[i + 2], drawn[i + 3]);
            }
            drawn = [];

            pulses.forEach(function (pu) {
                var t = clamp01((sim - pu.t0) / PULSE), n = pu.node, on = lit === n.project, dim = lit && !on;
                g.globalAlpha = (dim ? 0.25 : 0.6) * (1 - t);
                g.strokeStyle = on ? colors.accent : n.project.spec.alert ? colors.amber : ink(1);
                g.lineWidth = 1;
                g.beginPath();
                // Small enough to stay clear of the label beside it.
                g.arc(n.x, n.y, DOT + 1 + (GAP - DOT - 3) * easeOut(t), 0, Math.PI * 2);
                g.stroke();
                // The label brightens for a moment, drawn over its resting
                // self, unless another project is lit and this one is dimmed.
                if (!dim) {
                    g.globalAlpha = 0.5 * Math.pow(1 - t, 1.5);
                    g.font = labelFont(on);
                    g.fillStyle = ink(1);
                    g.textAlign = 'left';
                    g.textBaseline = 'middle';
                    g.fillText(n.label, n.x + GAP, n.y + 0.5);
                }
                drawn.push(n.x - GAP, n.y - GAP, n.w + 2 * GAP + 4, 2 * GAP);
            });

            packets.forEach(function (pk) { drawPacket(g, pk.link, pk.s, pk.glyphs); });

            if (reduced) {
                still.forEach(function (st) { drawPacket(g, st.link, st.s, st.glyphs); });
            }
            g.globalAlpha = 1;
        }

        // Without motion, each wire holds one packet part way along it, so
        // the still picture shows what travels where. Each goes at the first
        // of a few places along its wire where it clears the packets already
        // placed, since wires of about the same length would otherwise line
        // them all up in one column.
        function placeStill() {
            var spots = [0.5, 0.36, 0.64, 0.28, 0.72, 0.44, 0.56], taken = [];
            still = links.map(function (l, j) {
                var best = spots[0], bestGap = -1;
                for (var i = 0; i < spots.length; i++) {
                    // The packet's nearest approach to any glyph already
                    // placed, measured as the larger of the x and y gaps.
                    var gap = Infinity;
                    for (var k = 0; k < TRAIL.length; k++) {
                        var p = pointAt(l, l.len * spots[i] - k * SPACING);
                        for (var q = 0; q < taken.length; q++) {
                            gap = Math.min(gap, Math.max(Math.abs(p[0] - taken[q][0]), Math.abs(p[1] - taken[q][1])));
                        }
                    }
                    if (gap > bestGap) { best = spots[i]; bestGap = gap; }
                    if (gap >= 16) break;
                }
                for (var m = 0; m < TRAIL.length; m++) taken.push(pointAt(l, l.len * best - m * SPACING));
                var glyphs = l.project.spec.wave ? ['~', '~', '~'] : [j % 2 ? '1' : '0', '1', j % 3 ? '0' : '1'];
                return { link: l, s: l.len * best, glyphs: glyphs };
            });
        }

        // ── Intro ──
        // The picture wipes in from the left, the way the data runs: a strip
        // of card colour, soft on its leading edge, slides off over it. It is
        // a transform animation, so the compositor runs it.
        function wipe() {
            if (reduced || !stage.animate) return;
            var soft = 60;
            cover = document.createElement('div');
            cover.style.cssText = 'position:absolute;left:0;top:0;bottom:0;width:' + (W + soft) + 'px;pointer-events:none;' +
                'background:linear-gradient(90deg,transparent,var(--card) ' + soft + 'px)';
            stage.insertBefore(cover, live);
            wipeAnim = cover.animate([
                { transform: 'translateX(' + (-soft) + 'px)' },
                { transform: 'translateX(' + W + 'px)' }
            ], { duration: WIPE_MS, easing: 'cubic-bezier(.35,0,.25,1)', fill: 'forwards' });
            wipeAnim.onfinish = unwipe;
        }

        function unwipe() {
            if (wipeAnim) { wipeAnim.onfinish = null; wipeAnim.cancel(); wipeAnim = null; }
            if (cover && cover.parentNode) cover.parentNode.removeChild(cover);
            cover = null;
        }

        // ── Loop ──
        function pending() {
            return queue.length > 0 || packets.length > 0 || pulses.length > 0;
        }

        function wake() {
            if (dead || reduced || !active || raf || !pending()) return;
            last = performance.now();
            raf = requestAnimationFrame(frame);
        }

        function stop() {
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
        }

        function frame(now) {
            raf = 0;
            if (dead || !active) return;
            var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;
            sim += dt;

            while (queue.length && queue[0].at <= sim) launch(queue.shift());
            for (var i = packets.length - 1; i >= 0; i--) {
                var pk = packets[i];
                pk.s += speed * dt;
                if (!pk.landed && pk.s >= pk.link.len) {
                    pk.landed = true;
                    pulses.push({ node: pk.link.to, t0: sim });
                }
                if (pk.s - (TRAIL.length - 1) * SPACING > pk.link.len) packets.splice(i, 1);
            }
            for (i = pulses.length - 1; i >= 0; i--) {
                if (sim - pulses[i].t0 >= PULSE) pulses.splice(i, 1);
            }

            drawLive(false);
            if (pending()) raf = requestAnimationFrame(frame);
        }

        // ── Pointer ──
        // An endpoint's dot and label, then the nearest wire within reach.
        function hitAt(x, y, reach) {
            for (var i = 0; i < nodes.length; i++) {
                var n = nodes[i];
                var x0 = n.side === 'L' ? n.x - GAP - n.w - 4 : n.x - 6;
                var x1 = n.side === 'L' ? n.x + 6 : n.x + GAP + n.w + 4;
                if (x >= x0 && x <= x1 && Math.abs(y - n.y) <= 9) return n.project;
            }
            var best = null, bestD = reach;
            links.forEach(function (l) {
                var d = distToWire(l, x, y);
                if (d < bestD) { bestD = d; best = l.project; }
            });
            return best;
        }

        function local(e) {
            var b = live.getBoundingClientRect();
            return { x: e.clientX - b.left, y: e.clientY - b.top };
        }

        function setLit(p) {
            if (lit === p || !started) return;
            lit = p;
            live.style.cursor = p ? 'pointer' : '';
            drawBase();
            if (p && !reduced) send(p);
            if (!raf) drawLive(true);
        }

        function onMove(e) {
            if (e.pointerType === 'touch') return;
            var q = local(e);
            setLit(hitAt(q.x, q.y, 7));
        }

        function onLeave(e) {
            if (e.pointerType === 'touch') return;
            setLit(null);
        }

        // Scrolls the card so the project's entry sits near its top.
        function jump(p) {
            var modal = document.getElementById('modal');
            if (!modal || !p.entry || !modal.contains(p.entry)) return;
            var top = modal.scrollTop + p.entry.getBoundingClientRect().top - modal.getBoundingClientRect().top - 24;
            try {
                modal.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
            } catch (err) {
                modal.scrollTop = top;
            }
        }

        function onClick(e) {
            var q = local(e);
            var fine = !e.pointerType || e.pointerType === 'mouse';
            var p = hitAt(q.x, q.y, fine ? 7 : 14);
            // A tap on empty space puts out a link a previous tap lit.
            setLit(p);
            if (p) jump(p);
        }

        live.addEventListener('pointermove', onMove);
        live.addEventListener('pointerleave', onLeave);
        live.addEventListener('click', onClick);

        // ── Start ──
        // Labels are measured, so the site's font has to be in before the
        // layout. It almost always is by the time a ball is clicked.
        function start() {
            if (dead || started) return;
            started = true;
            clearTimeout(fontTimer);
            fontTimer = 0;
            layout();
            if (!reduced) schedule();
            drawBase();
            drawLive(true);
            wipe();
            api.ready();
            wake();

            if (window.ResizeObserver) {
                resizeObs = new ResizeObserver(function () {
                    if (dead) return;
                    var w = stage.clientWidth;
                    if (!w || Math.abs(w - W) <= 1) return;
                    stop();
                    unwipe();
                    queue = []; packets = []; pulses = [];
                    layout();
                    drawBase();
                    drawLive(true);
                });
                resizeObs.observe(stage);
            }
        }

        if (document.fonts && document.fonts.load) {
            fontTimer = setTimeout(start, 700);
            Promise.all([
                document.fonts.load('400 11px "Roboto Condensed"'),
                document.fonts.load('600 11px "Roboto Condensed"')
            ]).then(start, start);
        } else {
            start();
        }

        return {
            visible: function (on) {
                active = on;
                if (on) wake(); else stop();
            },
            theme: function () {
                colors = api.colors();
                sprites = {};
                if (!started || dead) return;
                drawBase();
                drawLive(true);
            },
            destroy: function () {
                dead = true;
                stop();
                clearTimeout(fontTimer);
                unwipe();
                live.removeEventListener('pointermove', onMove);
                live.removeEventListener('pointerleave', onLeave);
                live.removeEventListener('click', onClick);
                if (resizeObs) resizeObs.disconnect();
                if (base.parentNode) base.parentNode.removeChild(base);
                if (live.parentNode) live.parentNode.removeChild(live);
                sprites = {};
                queue = []; packets = []; pulses = []; drawn = [];
            }
        };
    });
})();
