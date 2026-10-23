// ── 07 Hire: a blueprint drawn from the brief ──
// The Hire modal is a project-request form. Above it sits a drafting sheet: a
// dot grid, a thin border and a title block in the corner. As the form is
// filled in, the sheet draws the project. Each type of work picked gets its
// own small schematic (a small neural net driving a gear for AI and
// automation, a clipboard of checks with one failed for AI safety and
// testing, two services trading calls for connecting systems, a browser
// window for a web app, a box in hidden-line view for anything else), the
// budget fills a scale bar and the timeline lays a bar along an axis. The
// title block names the client from the first word of the name field. When
// the form is swapped for its success message, the sheet is stamped SENT.
//
// Drawn as SVG in the card's paper ink, with the accent kept for the stamp.
// Nothing runs between edits: each change is a short CSS transition, started
// by the form's input and change events and by a MutationObserver that sees
// a pill toggle (freelance.js owns the pills' click handler) or the form
// being replaced on success. Labels are read from the form, so the Danish
// page draws Danish ones. The client's name is only drawn: nothing here
// stores or sends it.

(function () {
    'use strict';
    if (!window.MODAL_FX) return;

    var SVGNS = 'http://www.w3.org/2000/svg';
    var FONT = '"Roboto Condensed", Arial, sans-serif';
    var DRAW_MS = 320;     // one stroke drawing itself in
    var STEP_MS = 45;      // between the steps of one schematic
    var MOVE_MS = 320;     // schematics sliding over to make room
    var FADE_MS = 220;
    var STAMP_MS = 200;
    var AUTHOR = 'A. Batten';

    var TEXT = {
        en: { client: 'Client', drawnBy: 'Drawn by', sent: 'Sent',
              hint: 'pick a type of work below to start the drawing' },
        da: { client: 'Kunde', drawnBy: 'Tegnet af', sent: 'Sendt',
              hint: 'vælg en opgavetype herunder for at starte tegningen' }
    };

    // Which schematic a pill draws, by its data-value in either language.
    // Anything not listed here draws the generic box.
    var KIND = {
        'Web app': 0, 'Webapplikation': 0,
        'Connecting systems': 1, 'Systemer der taler sammen': 1,
        'AI & automation': 2, 'AI og automatisering': 2,
        'AI safety & testing': 3, 'AI-sikkerhed og test': 3,
        'Something else': 4, 'Noget andet': 4
    };

    // A shorter name for the sheet, by data-value, used in place of a pill's
    // own text when that does not fit its lane. That happens on a phone with
    // several types picked; a pill not listed here is cut short instead.
    var SHORT = {
        'Webapplikation': 'Webapp',
        'Connecting systems': 'Integration', 'Systemer der taler sammen': 'Integrationer',
        'AI & automation': 'Automation', 'AI og automatisering': 'Automatisering',
        'AI safety & testing': 'AI safety', 'AI-sikkerhed og test': 'AI-sikkerhed',
        'Something else': 'Other', 'Noget andet': 'Andet'
    };

    // ── Schematics ──
    // Each is drawn in a 64 x 44 box as a list of steps, one after another.
    // A step is a stroke, [kind, alpha, ...geometry], or a list of strokes
    // drawn together. An alpha of 'h' marks a hidden edge, drawn dashed.
    var WEB = [
        ['rect', 0.8, 0, 0, 64, 44, 3],
        ['line', 0.6, 0, 9, 64, 9],
        [['circle', 0.6, 4.5, 4.5, 1.4], ['circle', 0.6, 9, 4.5, 1.4], ['circle', 0.6, 13.5, 4.5, 1.4]],
        ['rect', 0.45, 19, 2.5, 41, 4, 2],
        ['rect', 0.45, 4, 13, 12, 27, 1],
        ['line', 0.55, 20, 15, 60, 15],
        [['line', 0.4, 20, 20, 52, 20], ['line', 0.4, 20, 24, 57, 24]],
        [['rect', 0.45, 20, 29, 18, 11, 1], ['rect', 0.45, 42, 29, 18, 11, 1]]
    ];

    var API = [
        [['rect', 0.8, 0, 9, 20, 26, 2], ['rect', 0.8, 44, 9, 20, 26, 2]],
        [['line', 0.4, 4, 15, 16, 15], ['line', 0.4, 48, 15, 60, 15]],
        [['line', 0.4, 4, 20, 13, 20], ['line', 0.4, 48, 20, 57, 20]],
        [['line', 0.4, 4, 25, 16, 25], ['line', 0.4, 48, 25, 60, 25]],
        [['line', 0.4, 4, 30, 11, 30], ['line', 0.4, 48, 30, 55, 30]],
        ['line', 0.65, 24, 18, 40, 18],
        ['poly', 0.65, [37, 15, 40, 18, 37, 21]],
        ['line', 0.65, 40, 26, 24, 26],
        ['poly', 0.65, [27, 23, 24, 26, 27, 29]]
    ];

    // A clipboard of three checks, the middle one failed. The board is open
    // at the top where the clip sits over it, and the ticks overshoot their
    // boxes like pen strokes.
    var CHECKS = [
        ['poly', 0.8, [25, 4, 16, 4, 14, 6, 14, 42, 16, 44, 48, 44, 50, 42, 50, 6, 48, 4, 39, 4]],
        ['rect', 0.65, 25, 1, 14, 6, 1.5],
        [['rect', 0.6, 19, 12, 6, 6, 0.5], ['line', 0.45, 29, 15, 45, 15]],
        [['rect', 0.6, 19, 22, 6, 6, 0.5], ['line', 0.45, 29, 25, 42, 25]],
        [['rect', 0.6, 19, 32, 6, 6, 0.5], ['line', 0.45, 29, 35, 44, 35]],
        ['poly', 0.8, [20.2, 15, 22, 17, 25.8, 11.5]],
        [['line', 0.8, 20, 23, 24, 27], ['line', 0.8, 24, 23, 20, 27]],
        ['poly', 0.8, [20.2, 35, 22, 37, 25.8, 31.5]]
    ];

    // A box in oblique projection: the front face, the top and the right
    // side, then the three edges hidden behind it, then a centre mark.
    var BOX = [
        ['rect', 0.8, 13, 14, 28, 28, 0],
        ['poly', 0.8, [13, 14, 23, 4, 51, 4, 41, 14]],
        ['poly', 0.8, [51, 4, 51, 32, 41, 42]],
        [['poly', 'h', [23, 4, 23, 32, 51, 32]], ['line', 'h', 13, 42, 23, 32]],
        [['line', 0.35, 23, 28, 31, 28], ['line', 0.35, 27, 24, 27, 32]]
    ];

    var NODE_R = 3;

    // A wire between two circles. It stops at both rims so the circles stay
    // open without needing a fill.
    function wire(ax, ay, ra, bx, by, rb) {
        var dx = bx - ax, dy = by - ay, d = Math.sqrt(dx * dx + dy * dy);
        return ['line', 0.3, ax + dx / d * ra, ay + dy / d * ra, bx - dx / d * rb, by - dy / d * rb];
    }

    // Layers of nodes, each given as [x, [y, ...]], wired layer to layer.
    function network(layers) {
        var out = [], i, j, k;
        function nodes(l) {
            var step = [];
            for (var n = 0; n < l[1].length; n++) step.push(['circle', 0.75, l[0], l[1][n], NODE_R]);
            return step;
        }
        for (i = 0; i < layers.length; i++) {
            out.push(nodes(layers[i]));
            if (i === layers.length - 1) break;
            var a = layers[i], b = layers[i + 1], wires = [];
            for (j = 0; j < a[1].length; j++) {
                for (k = 0; k < b[1].length; k++) wires.push(wire(a[0], a[1][j], NODE_R, b[0], b[1][k], NODE_R));
            }
            out.push(wires);
        }
        return out;
    }

    // A gear outline with n teeth, tip radius ro and root radius ri, as one
    // closed polyline. Tooth 0 points straight right; each tooth narrows from
    // half the pitch wide at the root to 0.3 of it at the tip.
    function gear(cx, cy, n, ro, ri) {
        var pts = [], pitch = 2 * Math.PI / n;
        function at(r, a) { pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
        for (var i = 0; i < n; i++) {
            var a = i * pitch;
            at(ri, a - pitch / 4);
            at(ro, a - pitch * 0.15);
            at(ro, a + pitch * 0.15);
            at(ri, a + pitch / 4);
        }
        pts.push(pts[0], pts[1]);
        return pts;
    }

    // The first two layers of a net, its last layer wired into a gear: a
    // model driving a machine. The gear's tooth 0 points right at mid height,
    // where the connector to the next schematic meets it.
    function automation() {
        var hidden = [27, [5, 16.3, 27.7, 39]], gx = 51, gy = 22, ro = 12;
        var out = network([[6, [8, 22, 36]], hidden]);
        out.push(hidden[1].map(function (y) { return wire(hidden[0], y, NODE_R, gx, gy, ro + 1); }));
        out.push(['poly', 0.8, gear(gx, gy, 8, ro, 9)]);
        out.push(['circle', 0.6, gx, gy, 3.5]);
        return out;
    }

    var SCHEMATICS = [WEB, API, automation(), CHECKS, BOX];

    function strokesOf(step) {
        return typeof step[0] === 'string' ? [step] : step;
    }

    // The horizontal reach of each schematic, for its dimension line and
    // for where the connectors between neighbours start and stop.
    var EXTENTS = SCHEMATICS.map(function (spec) {
        var lo = Infinity, hi = -Infinity;
        function take(x) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
        spec.forEach(function (step) {
            strokesOf(step).forEach(function (p) {
                if (p[0] === 'rect') { take(p[2]); take(p[2] + p[4]); }
                else if (p[0] === 'line') { take(p[2]); take(p[4]); }
                else if (p[0] === 'circle') { take(p[2] - p[4]); take(p[2] + p[4]); }
                else for (var i = 0; i < p[2].length; i += 2) take(p[2][i]);
            });
        });
        return [lo, hi];
    });

    // ── Drawing helpers ──
    function el(name, attrs, parent) {
        var e = document.createElementNS(SVGNS, name);
        for (var k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }

    // Colours come from custom properties set on the <svg>, so a theme
    // switch is one write rather than a walk over every element.
    function ink(a) { return 'rgba(var(--hire-paper), ' + a + ')'; }

    function stroke(n, a) {
        n.style.fill = 'none';
        n.style.stroke = ink(a);
        return n;
    }

    function dist(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }

    function line(parent, x1, y1, x2, y2, a) {
        return stroke(el('line', { x1: x1, y1: y1, x2: x2, y2: y2 }, parent), a);
    }

    function text(parent, x, y, str, o) {
        var t = el('text', { x: x, y: y, 'font-size': o.size || 10, 'text-anchor': o.anchor || 'start' }, parent);
        t.style.fontFamily = FONT;
        t.style.fill = ink(o.a);
        if (o.weight) t.setAttribute('font-weight', o.weight);
        if (o.spacing) t.setAttribute('letter-spacing', o.spacing);
        t.textContent = str;
        return t;
    }

    function width(t) {
        try { return t.getComputedTextLength(); } catch (e) { return t.textContent.length * 5; }
    }

    // Sets the text, cut short with an ellipsis if it is wider than maxW.
    function fit(t, str, maxW) {
        t.textContent = str;
        if (width(t) <= maxW) return;
        var s = str;
        while (s.length > 1) {
            s = s.slice(0, -1);
            t.textContent = s.replace(/\s+$/, '') + '…';
            if (width(t) <= maxW) return;
        }
    }

    // One stroke of a schematic at scale s, with its length for drawing in.
    function shape(parent, p, s) {
        var kind = p[0], hidden = p[1] === 'h', n, len;
        if (kind === 'rect') {
            n = el('rect', { x: p[2] * s, y: p[3] * s, width: p[4] * s, height: p[5] * s, rx: (p[6] || 0) * s }, parent);
            len = 2 * (p[4] + p[5]) * s;
        } else if (kind === 'line') {
            n = el('line', { x1: p[2] * s, y1: p[3] * s, x2: p[4] * s, y2: p[5] * s }, parent);
            len = dist(p[2], p[3], p[4], p[5]) * s;
        } else if (kind === 'circle') {
            n = el('circle', { cx: p[2] * s, cy: p[3] * s, r: p[4] * s }, parent);
            len = 2 * Math.PI * p[4] * s;
        } else {
            var pts = p[2], out = [], l = 0;
            for (var i = 0; i < pts.length; i += 2) {
                out.push((pts[i] * s).toFixed(2) + ',' + (pts[i + 1] * s).toFixed(2));
                if (i) l += dist(pts[i - 2], pts[i - 1], pts[i], pts[i + 1]);
            }
            n = el('polyline', { points: out.join(' ') }, parent);
            len = l * s;
        }
        stroke(n, hidden ? 0.4 : p[1]);
        n.style.strokeLinejoin = 'round';
        if (hidden) n.style.strokeDasharray = '2 2';
        return { n: n, len: Math.ceil(len) + 1, hidden: hidden };
    }

    // ── Reading the form ──
    function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

    // A label's own text, without the "(optional)" note in its <em>.
    function fieldLabel(control) {
        var field = control && control.closest ? control.closest('.brief-field') : null;
        var span = field ? field.querySelector('.brief-label') : null, s = '';
        for (var n = span ? span.firstChild : null; n; n = n.nextSibling) if (n.nodeType === 3) s += n.nodeValue;
        return clean(s);
    }

    function optionTexts(select) {
        var out = [];
        if (select) for (var i = 0; i < select.options.length; i++) out.push(clean(select.options[i].textContent));
        return out;
    }

    function readLabels(form) {
        var out = { pills: [], kinds: [], short: [], budget: '', timeline: '', budgetOpts: [], timelineOpts: [] };
        if (!form) return out;
        var pills = form.querySelectorAll('.brief-pill'), has = Object.prototype.hasOwnProperty;
        for (var i = 0; i < pills.length; i++) {
            var v = pills[i].getAttribute('data-value') || '';
            out.pills.push(clean(pills[i].textContent));
            out.kinds.push(has.call(KIND, v) ? KIND[v] : 4);
            out.short.push(has.call(SHORT, v) ? SHORT[v] : '');
        }
        var b = form.querySelector('select[name="budget"]'), t = form.querySelector('select[name="timeline"]');
        out.budget = fieldLabel(b);
        out.timeline = fieldLabel(t);
        out.budgetOpts = optionTexts(b);
        out.timelineOpts = optionTexts(t);
        return out;
    }

    // Option 0 of both selects is "no preference". The budget's options 1-4
    // are rising tiers and 5 is "not sure yet"; the timeline's 1-4 run from
    // ASAP to the longest span and 5 is "flexible".
    var TIMELINE_SPAN = [0, 0.1, 1 / 3, 2 / 3, 1];

    MODAL_FX.register('hire', function (stage, api) {
        var T = TEXT[api.lang()] || TEXT.en;
        var reduced = api.reduced();
        var content = document.getElementById('modal-content');
        var form = content ? content.querySelector('#brief-form') : null;
        var labels = readLabels(form);
        var uid = 'hire-' + Math.random().toString(36).slice(2, 8);
        var dead = false, active = true, dirty = false, anim = false;
        var svg = null, L = null, P = null, items = {}, shown = null, pending = [], timers = [];
        var last = { types: [], client: '', budget: 0, timeline: 0 };
        var resizeObs = null, mo = null, lastW = 0, stampedAt = 0;
        // Set once the stamp has been put down. A rebuild redraws it in
        // place, where the first stamp waits for the sheet to be in view.
        var landed = false;

        function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
        function clearTimers() { timers.forEach(clearTimeout); timers = []; }

        function remove(n) { if (n && n.parentNode) n.parentNode.removeChild(n); }

        // ── Transitions ──
        // New elements get their start state now and their end state in
        // flush(), after one forced style pass, so each change costs a few
        // CSS transitions and nothing once they end.
        function drawStroke(n, len, delay, ms) {
            if (!anim) return;
            n.style.strokeDasharray = len + ' ' + len;
            n.style.strokeDashoffset = len;
            pending.push(function () {
                n.style.transition = 'stroke-dashoffset ' + (ms || DRAW_MS) + 'ms ease-out ' + delay + 'ms';
                n.style.strokeDashoffset = 0;
            });
        }

        function fadeIn(n, delay, ms) {
            if (!anim) return;
            n.style.opacity = 0;
            pending.push(function () {
                n.style.transition = 'opacity ' + (ms || FADE_MS) + 'ms ease ' + delay + 'ms';
                n.style.opacity = 1;
            });
        }

        function fadeTo(n, o) {
            n.style.transition = anim ? 'opacity ' + FADE_MS + 'ms ease' : 'none';
            n.style.opacity = o;
        }

        function fadeOut(n) {
            if (!anim) { remove(n); return; }
            fadeTo(n, 0);
            later(function () { remove(n); }, FADE_MS + 40);
        }

        function flush() {
            if (!pending.length || !svg) { pending = []; return; }
            svg.getBoundingClientRect();
            var p = pending;
            pending = [];
            for (var i = 0; i < p.length; i++) p[i]();
        }

        function applyColors() {
            if (!svg) return;
            var c = api.colors();
            svg.style.setProperty('--hire-paper', c.paper);
            svg.style.setProperty('--hire-accent', c.accent);
            svg.style.setProperty('--hire-card', c.card);
        }

        // ── Layout ──
        // The drawing area takes the sheet above the bottom strip; the strip
        // holds the budget and timeline rows on the left and the title block
        // on the right, their rows lined up.
        function measure() {
            var W = Math.max(240, Math.round(stage.clientWidth) || 520);
            var H = Math.max(100, Math.round(stage.clientHeight) || 160);
            var nar = H < 140 || W < 400;
            var rowH = nar ? 14 : 15, s = nar ? 0.78 : 1.2;
            var o = {
                W: W, H: H, nar: nar, rowH: rowH, s: s,
                pad: nar ? 9 : 14,
                dw: 64 * s, dh: 44 * s,
                labStep: nar ? 11 : 12,
                maxSlot: nar ? 84 : 118
            };
            o.tbY = H - 0.5 - 2 * rowH;
            o.x0 = o.pad;
            o.x1 = W - o.pad;
            o.areaTop = o.pad;
            o.areaBot = o.tbY - (nar ? 5 : 8);
            o.dimY = o.dh + (nar ? 5 : 7);
            o.labY = o.dimY + o.labStep;
            o.top = o.areaTop + (o.areaBot - o.areaTop - o.labY) / 2;
            return o;
        }

        function rowY(r) { return L.tbY + L.rowH * (r + 0.5); }

        function build() {
            remove(svg);
            clearTimers();
            pending = [];
            items = {};
            shown = { types: null, rows: [0, 0], client: null, hint: true, stamp: false };
            L = measure();
            lastW = stage.clientWidth;
            var W = L.W, H = L.H;
            svg = el('svg', { width: '100%', height: '100%', viewBox: '0 0 ' + W + ' ' + H });
            svg.style.cssText = 'display:block;pointer-events:none';
            applyColors();
            stage.appendChild(svg);
            P = {};

            var defs = el('defs', {}, svg);
            var dots = el('pattern', { id: uid + '-dots', width: 10, height: 10, patternUnits: 'userSpaceOnUse' }, defs);
            el('circle', { cx: 5, cy: 5, r: 0.75 }, dots).style.fill = ink(0.22);
            var hatch = el('pattern', { id: uid + '-hatch', width: 3, height: 3, patternUnits: 'userSpaceOnUse',
                patternTransform: 'rotate(45)' }, defs);
            line(hatch, 0.5, 0, 0.5, 3, 0.6);

            P.grid = el('rect', { x: 1, y: 1, width: W - 2, height: H - 2, fill: 'url(#' + uid + '-dots)' }, svg);
            P.border = stroke(el('rect', { x: 0.5, y: 0.5, width: W - 1, height: H - 1 }, svg), 0.3);
            P.conn = el('g', {}, svg);
            P.items = el('g', {}, svg);
            P.bars = el('g', {}, svg);
            buildTitleBlock();
            buildRows();
            buildHint();
        }

        // On the empty sheet the hint sits in a gap in a dash-dot centre
        // line, where the schematics will stand.
        function buildHint() {
            var g = el('g', {}, svg), cx = (L.x0 + L.x1) / 2, y = L.top + L.dh / 2;
            var t = text(g, cx, y + 3.5, T.hint, { a: 0.45, anchor: 'middle', size: L.nar ? 10 : 11 });
            var half = width(t) / 2 + 10;
            P.hint = g;
            if (cx - half - L.x0 < 12) return;
            // Each half starts at the text, so the dash pattern is the same
            // on both sides of it.
            [[cx - half, L.x0], [cx + half, L.x1]].forEach(function (s) {
                line(g, s[0], y, s[1], y, 0.22).style.strokeDasharray = '12 3 2 3';
            });
        }

        // ── Title block ──
        function buildTitleBlock() {
            var g = el('g', {}, svg), rowH = L.rowH, y0 = L.tbY, W = L.W, H = L.H;
            var la = text(g, 0, 0, T.client.toUpperCase(), { a: 0.45, spacing: '0.06em' });
            var lb = text(g, 0, 0, T.drawnBy.toUpperCase(), { a: 0.45, spacing: '0.06em' });
            var vb = text(g, 0, 0, AUTHOR, { a: 0.8, weight: 600 });
            var labW = Math.ceil(Math.max(width(la), width(lb))) + 12;
            var valW = Math.max(L.nar ? 62 : 96, Math.ceil(width(vb)) + 14);
            var x0 = Math.round(W - labW - valW) - 0.5;
            L.tbX = x0;
            L.valW = valW;
            la.setAttribute('x', x0 + 6); la.setAttribute('y', y0 + rowH * 0.5 + 3.5);
            lb.setAttribute('x', x0 + 6); lb.setAttribute('y', y0 + rowH * 1.5 + 3.5);
            vb.setAttribute('x', x0 + labW + 6); vb.setAttribute('y', y0 + rowH * 1.5 + 3.5);
            // The block is solid, so the dot grid stops at its edge.
            var bg = el('rect', { x: x0, y: y0, width: W - 0.5 - x0, height: H - 0.5 - y0 });
            bg.style.fill = 'var(--hire-card)';
            g.insertBefore(bg, g.firstChild);
            P.client = text(g, x0 + labW + 6, y0 + rowH * 0.5 + 3.5, '', { a: 0.9, weight: 600 });
            P.tbLines = [
                line(g, x0, y0, W - 0.5, y0, 0.4),
                line(g, x0, y0, x0, H - 0.5, 0.4),
                line(g, x0, y0 + rowH, W - 0.5, y0 + rowH, 0.25),
                line(g, x0 + labW, y0, x0 + labW, H - 0.5, 0.25)
            ];
            P.tbText = [la, lb, vb, P.client];
        }

        // ── Budget and timeline ──
        // Row labels and the widest option text fix where the bars start
        // and how long they are. On a phone the labels are left out: the
        // option text says which row is which.
        function buildRows() {
            var x = L.x0, end = L.tbX - 10, labW = 0, r;
            P.rowLab = [null, null];
            P.rows = [null, null];
            if (!L.nar) {
                var names = [labels.budget, labels.timeline];
                for (r = 0; r < 2; r++) {
                    if (!names[r]) continue;
                    P.rowLab[r] = text(P.bars, x, rowY(r) + 3.5, names[r].toUpperCase(), { a: 0.45, spacing: '0.06em' });
                    P.rowLab[r].style.opacity = 0;
                    labW = Math.max(labW, width(P.rowLab[r]));
                }
            }
            var probe = text(svg, 0, 0, '', { a: 0 }), valMax = 0;
            labels.budgetOpts.concat(labels.timelineOpts).forEach(function (s) {
                probe.textContent = s;
                valMax = Math.max(valMax, width(probe));
            });
            remove(probe);
            L.barX = x + (labW ? Math.ceil(labW) + 10 : 0);
            L.gw = Math.max(36, Math.min(L.nar ? 64 : 130, end - L.barX - valMax - 10));
            L.valX = L.barX + L.gw + 8;
            L.valMaxW = Math.max(30, end - L.valX);
        }

        // Four cells, one per tier, hatched up to the chosen one. "Not sure
        // yet" leaves them all empty.
        function gauge(g, y, idx) {
            var cells = 4, gap = 2, cw = (L.gw - gap * (cells - 1)) / cells, h = 6, top = y - h / 2;
            var filled = idx <= cells ? idx : 0;
            for (var c = 0; c < cells; c++) {
                var x = L.barX + c * (cw + gap);
                if (c < filled) {
                    var f = el('rect', { x: x, y: top, width: cw, height: h, fill: 'url(#' + uid + '-hatch)' }, g);
                    fadeIn(f, 140 + c * 70);
                }
                var o = stroke(el('rect', { x: x, y: top, width: cw, height: h }, g), c < filled ? 0.75 : 0.35);
                drawStroke(o, Math.ceil(2 * (cw + h)) + 1, c * 70, 260);
            }
        }

        // A hatched bar standing on an axis with a tick at each third, as
        // long as the chosen span. "Flexible" is an open, dashed bar the
        // whole length.
        function timeline(g, y, idx) {
            var x = L.barX, w = L.gw, h = 6, top = y - h / 2, base = top + h;
            var open = idx >= TIMELINE_SPAN.length, bw = open ? w : Math.max(4, w * TIMELINE_SPAN[idx]);
            drawStroke(line(g, x, base, x + w, base, 0.35), Math.ceil(w) + 1, 0, 260);
            for (var k = 0; k <= 3; k++) {
                fadeIn(line(g, x + w * k / 3, base, x + w * k / 3, base + 2.5, 0.35), 120 + k * 50);
            }
            var o = stroke(el('rect', { x: x, y: top, width: bw, height: h }, g), open ? 0.5 : 0.75);
            if (open) {
                o.style.strokeDasharray = '3 2';
                fadeIn(o, 150);
                return;
            }
            var fill = el('rect', { x: x, y: top, width: bw, height: h, fill: 'url(#' + uid + '-hatch)' }, g);
            g.insertBefore(fill, o);
            drawStroke(o, Math.ceil(2 * (bw + h)) + 1, 120, 300);
            fadeIn(fill, 300);
        }

        function syncRow(r, idx) {
            idx = idx > 0 ? idx : 0;
            if (shown.rows[r] === idx) return;
            shown.rows[r] = idx;
            if (P.rows[r]) fadeOut(P.rows[r]);
            P.rows[r] = null;
            if (P.rowLab[r]) fadeTo(P.rowLab[r], idx ? 1 : 0);
            if (!idx) return;
            var g = el('g', {}, P.bars), y = rowY(r);
            var opts = r === 0 ? labels.budgetOpts : labels.timelineOpts;
            if (r === 0) gauge(g, y, idx); else timeline(g, y, idx);
            var v = text(g, L.valX, y + 3.5, '', { a: 0.85 });
            fit(v, opts[idx] || '', L.valMaxW);
            fadeIn(v, 160);
            P.rows[r] = g;
        }

        // ── Schematics on the sheet ──
        function makeItem(idx) {
            var kind = labels.kinds[idx], spec = SCHEMATICS[kind], ext = EXTENTS[kind], s = L.s;
            var g = el('g', {}, P.items);
            var draw = el('g', {}, g), steps = [];
            spec.forEach(function (step) {
                steps.push(strokesOf(step).map(function (p) { return shape(draw, p, s); }));
            });
            // A dimension line under the drawing, as wide as the drawing.
            var dim = el('g', {}, g), a = ext[0] * s, b = ext[1] * s, y = L.dimY;
            line(dim, a, y, b, y, 0.4);
            line(dim, a, y - 3, a, y + 3, 0.4);
            line(dim, b, y - 3, b, y + 3, 0.4);
            // A label on the second row hangs from the line on a leader.
            var leader = line(g, L.dw / 2, y + 2, L.dw / 2, y + 2 * L.labStep - 9, 0.3);
            leader.style.opacity = 0;
            var lab = el('g', {}, g);
            var full = (labels.pills[idx] || '').toUpperCase();
            var label = text(lab, L.dw / 2, L.labY, full, { a: 0.6, anchor: 'middle', spacing: '0.06em' });
            return { g: g, steps: steps, ext: ext, dim: dim, lab: lab, label: label, leader: leader,
                full: full, short: (labels.short[idx] || '').toUpperCase(), natural: width(label),
                x: null, row: 0, fresh: true };
        }

        function drawItem(it, delay) {
            for (var i = 0; i < it.steps.length; i++) {
                for (var j = 0; j < it.steps[i].length; j++) {
                    var sh = it.steps[i][j];
                    if (sh.hidden) fadeIn(sh.n, delay + i * STEP_MS + DRAW_MS * 0.5);
                    else drawStroke(sh.n, sh.len, delay + i * STEP_MS);
                }
            }
            var end = delay + it.steps.length * STEP_MS;
            fadeIn(it.dim, end);
            fadeIn(it.lab, end + 80);
            if (it.row) fadeIn(it.leader, end + 80);
        }

        function place(it, x) {
            var smooth = anim && it.x !== null;
            it.g.style.transition = smooth ? 'transform ' + MOVE_MS + 'ms ease' : 'none';
            it.g.style.transform = 'translate(' + x + 'px,' + L.top + 'px)';
            it.x = x;
        }

        // Fits the label to its lane, maxW wide around cx, and keeps it
        // inside the sheet; row 1 drops it one line and shows the leader. A
        // label the sheet edge pushes inwards loses as much room as it
        // moves, so it stays in its own lane and clear of its neighbour's. A
        // label too long for its lane is swapped for its short name, if it
        // has one, before anything is cut.
        function setLabel(it, cx, maxW, row) {
            var room = Math.min(maxW, cx - 4 + maxW / 2, L.W - 4 - cx + maxW / 2);
            fit(it.label, it.short && it.natural > room ? it.short : it.full, room);
            var w = width(it.label);
            var c = Math.max(4 + w / 2, Math.min(L.W - 4 - w / 2, cx));
            it.label.setAttribute('x', (c - it.x).toFixed(1));
            var drop = 'translate(0px,' + (row ? L.labStep : 0) + 'px)';
            if (it.fresh) {
                // A new item's label and leader fade in with it, in drawItem().
                it.lab.style.transform = drop;
                it.leader.style.opacity = row ? 1 : 0;
            } else if (it.row !== row) {
                it.lab.style.transition = anim ? 'transform ' + FADE_MS + 'ms ease, opacity ' + FADE_MS + 'ms ease' : 'none';
                it.lab.style.transform = drop;
                fadeTo(it.leader, row ? 1 : 0);
            }
            it.row = row;
        }

        function syncItems(types) {
            var key = types.join(',');
            if (key === shown.types) return;
            shown.types = key;
            var keep = {}, j, k, it;
            for (j = 0; j < types.length; j++) keep[types[j]] = true;
            for (k in items) {
                if (Object.prototype.hasOwnProperty.call(items, k) && !keep[k]) {
                    fadeOut(items[k].g);
                    delete items[k];
                }
            }
            var n = types.length, span = L.x1 - L.x0;
            var slot = n ? Math.min(L.maxSlot, span / n) : 0;
            var start = L.x0 + (span - slot * n) / 2;
            var fresh = [], moving = false, stagger = false, xs = [];
            for (j = 0; j < n; j++) {
                if (!items[types[j]]) {
                    items[types[j]] = makeItem(types[j]);
                    fresh.push(items[types[j]]);
                }
                // Labels wider than their slot alternate between two rows.
                if (items[types[j]].natural > slot - 6) stagger = true;
            }
            for (j = 0; j < n; j++) {
                it = items[types[j]];
                var cx = start + slot * (j + 0.5), x = cx - L.dw / 2;
                if (it.x !== null && Math.abs(it.x - x) > 0.5) moving = true;
                xs.push(x);
                place(it, x);
                setLabel(it, cx, stagger ? slot * 2 - 8 : slot - 6, stagger && j % 2 === 1 ? 1 : 0);
            }
            var delay = moving ? MOVE_MS * 0.5 : 0;
            fresh.forEach(function (f) { drawItem(f, delay); f.fresh = false; });
            syncConnectors(types, xs, moving);
            var hint = n === 0 && !shown.stamp;
            if (hint !== shown.hint) { shown.hint = hint; fadeTo(P.hint, hint ? 1 : 0); }
        }

        // Dashed links between neighbouring schematics, at mid height, so
        // several picked types read as parts of one system.
        function syncConnectors(types, xs, moving) {
            if (P.connG) fadeOut(P.connG);
            P.connG = null;
            if (types.length < 2) return;
            var g = el('g', {}, P.conn), y = L.top + L.dh / 2;
            for (var j = 0; j < types.length - 1; j++) {
                var A = items[types[j]], B = items[types[j + 1]];
                var a = xs[j] + A.ext[1] * L.s + 5, b = xs[j + 1] + B.ext[0] * L.s - 5;
                if (b - a < 10) continue;
                line(g, a + 2, y, b - 2, y, 0.35).style.strokeDasharray = '2 3';
                stroke(el('circle', { cx: a, cy: y, r: 1.6 }, g), 0.5);
                stroke(el('circle', { cx: b, cy: y, r: 1.6 }, g), 0.5);
            }
            fadeIn(g, moving ? MOVE_MS : DRAW_MS);
            P.connG = g;
        }

        // ── Title block and stamp ──
        function syncClient(name) {
            if (name === shown.client) return;
            shown.client = name;
            if (name) {
                fit(P.client, name, L.valW - 12);
                P.client.style.fill = ink(0.9);
            } else {
                P.client.textContent = '. . . . .';
                P.client.style.fill = ink(0.35);
            }
        }

        // The stamp lands on the middle of the drawing: a double-ruled box in
        // the accent, turned a few degrees, with a part-opaque card-coloured
        // back so the word reads over the lines under it.
        function stamp() {
            if (shown.stamp) return;
            shown.stamp = true;
            landed = true;
            if (shown.hint) { shown.hint = false; fadeTo(P.hint, 0); }
            var size = L.nar ? 15 : 19, g = el('g', {}, svg);
            var t = text(g, size * 0.09, size * 0.35, T.sent.toUpperCase(), { a: 1, size: size, weight: 700, anchor: 'middle', spacing: '0.18em' });
            t.style.fill = 'var(--hire-accent)';
            var w = width(t) + size * 1.3, h = size * 1.75;
            var back = el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 3 });
            back.style.cssText = 'fill:var(--hire-card);fill-opacity:.72;stroke:var(--hire-accent);stroke-width:2';
            var inner = el('rect', { x: -w / 2 + 3.5, y: -h / 2 + 3.5, width: w - 7, height: h - 7, rx: 1.5 });
            inner.style.cssText = 'fill:none;stroke:var(--hire-accent);stroke-width:.8';
            g.insertBefore(inner, t);
            g.insertBefore(back, inner);
            var cx = (L.x0 + L.x1) / 2, cy = L.top + L.dh / 2;
            var at = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px) rotate(-7deg)';
            if (anim) {
                stampedAt = Date.now();
                g.style.transform = at + ' scale(1.6)';
                g.style.opacity = 0;
                pending.push(function () {
                    g.style.transition = 'transform ' + STAMP_MS + 'ms cubic-bezier(.55,0,.85,.45), opacity ' + (STAMP_MS * 0.6) + 'ms ease';
                    g.style.transform = at + ' scale(1)';
                    g.style.opacity = 1;
                });
            } else {
                g.style.transform = at;
            }
        }

        // ── Sync ──
        // Reads the whole form and brings the sheet in line with it; each
        // part redraws only when its own value changed.
        function readForm() {
            if (!form || !form.isConnected) return null;
            if (form.querySelector('.brief-success')) return { done: true };
            var pills = form.querySelectorAll('.brief-pill'), types = [];
            for (var i = 0; i < pills.length; i++) if (pills[i].classList.contains('active')) types.push(i);
            var name = form.querySelector('[name="name"]');
            var b = form.querySelector('select[name="budget"]'), t = form.querySelector('select[name="timeline"]');
            return {
                done: false,
                types: types,
                client: name ? clean(name.value).split(' ')[0] : '',
                budget: b ? b.selectedIndex : 0,
                timeline: t ? t.selectedIndex : 0
            };
        }

        function sync(animate, animateStamp) {
            if (dead || !svg) return;
            var s = readForm();
            if (s && !s.done) last = s;
            anim = !!animate && !reduced;
            syncItems(last.types);
            syncRow(0, last.budget);
            syncRow(1, last.timeline);
            syncClient(last.client);
            if (animateStamp) anim = !reduced;
            // Sent from the bottom of the form, the sheet is scrolled out of
            // view: the stamp waits, so it lands in front of the visitor when
            // the card scrolls back up rather than appearing already down.
            if (s && s.done) {
                if (active || landed) stamp();
                else dirty = true;
            }
            flush();
            anim = false;
        }

        // While the stage is out of view, edits wait and draw in when it
        // comes back.
        function update() {
            if (dead) return;
            if (!active) { dirty = true; return; }
            dirty = false;
            sync(true);
        }

        function intro() {
            anim = !reduced;
            fadeIn(P.grid, 0, 450);
            drawStroke(P.border, Math.ceil(2 * (L.W + L.H)) + 2, 0, 550);
            P.tbLines.forEach(function (l, i) {
                drawStroke(l, Math.ceil(Math.max(L.H - L.tbY, L.W - L.tbX)) + 2, 280 + i * 60, 240);
            });
            P.tbText.forEach(function (t) { fadeIn(t, 420); });
            fadeIn(P.hint, 480, 320);
        }

        build();
        intro();
        sync(!reduced);
        api.ready();

        if (form) {
            form.addEventListener('input', update);
            form.addEventListener('change', update);
            if (window.MutationObserver) {
                mo = new MutationObserver(update);
                mo.observe(form, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
            }
        }

        // Redraws at the new size in the finished state. The success message
        // is shorter than the form, so the card can lose its scrollbar and
        // widen just as the stamp lands; a stamp that recent lands again.
        function rebuild() {
            if (dead || !svg) return;
            var replay = stampedAt && Date.now() - stampedAt < 600;
            build();
            sync(false, replay);
        }

        if (window.ResizeObserver) {
            resizeObs = new ResizeObserver(function () {
                var w = stage.clientWidth;
                if (w && Math.abs(w - lastW) > 1) rebuild();
            });
            resizeObs.observe(stage);
        }

        // Text widths fix the layout, so a font that arrives late redoes it.
        if (document.fonts && document.fonts.status !== 'loaded') {
            document.fonts.ready.then(rebuild, function () {});
        }

        return {
            visible: function (on) {
                active = on;
                if (on && dirty) update();
            },
            theme: function () { applyColors(); },
            destroy: function () {
                dead = true;
                clearTimers();
                if (mo) mo.disconnect();
                if (form) {
                    form.removeEventListener('input', update);
                    form.removeEventListener('change', update);
                }
                if (resizeObs) resizeObs.disconnect();
                remove(svg);
                svg = P = L = form = null;
                items = {};
                last = { types: [], client: '', budget: 0, timeline: 0 };
            }
        };
    });
})();
