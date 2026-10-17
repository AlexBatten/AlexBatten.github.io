// ── 04 Skills: where the skills met ──
// The skill names from this modal sit on a sphere, and a thin line joins two
// of them wherever both are named in the same entry under Experience or
// Projects, so the knots in the net are the jobs and projects where those
// skills were used together. Skills that never share an entry float on their
// own, dimmer. The glyphs of the page's ascii background (0 1 ~ : .) rise out
// of a flat field to form the sphere, which turns once and stops. Dragging
// with a mouse turns it; pointing at a skill (tapping, on a touch screen)
// lights its neighbours and names the entries where they met.
//
// Labels are read from the Skills modal and the entries from CONTENT, both in
// the page's language, so the Danish page draws Danish names. Drawn on a 2D
// canvas with its own rotation and perspective, which keeps thirty-odd labels
// crisp. The autonomous motion is drawn at 30 frames a second, like the ascii
// background, and once the turn has finished nothing runs until the pointer
// does something.

(function () {
    'use strict';
    if (!window.MODAL_FX) return;

    var GLYPHS = ['0', '1', '~', ':', '.'];
    var GLYPH_ODDS = [0.32, 0.32, 0.14, 0.12, 0.10];
    var CELL_W = 8.5, CELL_H = 14;   // the ascii background's character cell
    var INTRO = 1.8;       // seconds for the glyphs to rise into the sphere
    var DRAW_IN = 1.1;     // seconds for the lines to draw in, from late in the rise
    var LINES_AT = INTRO * 0.7;
    var INTRO_END = Math.max(INTRO, LINES_AT + DRAW_IN);
    var TURN = 20;         // seconds for the one revolution
    var PITCH = 0.34;      // the sphere is seen a little from above
    var CAMERA = 4;        // camera distance, in sphere radii
    var STEP = 0.16;       // radians of arc per line segment, at most
    var STEPS = 12;        // segments in the longest line
    var LIFT = 0.06;       // how far a long line bows out from the surface
    var FIELD_ALPHA = 0.13;
    var DRAG = 0.011;      // radians per pixel of mouse drag
    var FRAME_MS = 30;     // the 30 fps cap, a few ms under 33 so 60 Hz rAF doesn't alternate

    var TEXT = {
        en: {
            title: 'where the skills met',
            hint: function (e, p, touch) {
                return 'a line joins two skills named in the same entry under ' + e + ' or ' + p +
                    (touch ? ' · tap one to see where' : ' · point at one to see where');
            },
            alone: function (e, p) { return 'not named with another skill under ' + e + ' or ' + p; }
        },
        da: {
            title: 'hvor kompetencerne mødtes',
            hint: function (e, p, touch) {
                return 'en linje forbinder to kompetencer, der nævnes under samme punkt i ' + e + ' eller ' + p +
                    (touch ? ' · tryk på en for at se hvor' : ' · peg på en for at se hvor');
            },
            alone: function (e, p) { return 'nævnes ikke sammen med en anden kompetence i ' + e + ' eller ' + p; }
        }
    };

    // Other spellings of a skill in the entries, keyed by the skill as the
    // Skills modal writes it, lower case, in either language. A longer match
    // wins over a shorter one inside it, so ".NET Aspire" is not also ".NET".
    var ALIASES = {
        'rest apis': ['rest api'],
        "rest-api'er": ['rest-api'],
        'entity framework': ['ef core'],
        'jwt auth': ['jwt'],
        'jwt-autentificering': ['jwt'],
        'multi-tenant saas': ['multi-tenant'],
        'erp systems': ['erp'],
        'erp-systemer': ['erp'],
        'sql': ['mssql', 'mysql'],
        'docker': ['dockerfile'],
        'audio engineering': ['audio / dsp'],
        'lydteknik': ['lyd / dsp']
    };
    var WORD = /[a-z0-9À-ɏ]/i;

    // ── Content ──
    function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

    function parse(html) {
        return new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html').body;
    }

    function readSkills(C) {
        var root = document.getElementById('modal-content');
        var tags = root ? root.querySelectorAll('.tag') : [];
        if (!tags.length && C && C.skills) tags = parse(C.skills.html).querySelectorAll('.tag');
        var names = [], seen = {};
        for (var i = 0; i < tags.length; i++) {
            var n = clean(tags[i].textContent), k = n.toLowerCase();
            if (n && !seen[k]) { seen[k] = true; names.push(n); }
        }
        return names;
    }

    // A short name for the caption: the employer of a job ("... at Acconta
    // (Startup)" gives "Acconta"), and the client of a project titled
    // "Something, Client". Anything else keeps its whole title.
    function entryName(title, job) {
        var t = clean(title), m;
        if (job) {
            m = /.*\s(?:at|hos)\s(.+)$/.exec(t);
            if (m) t = m[1].replace(/\s*\([^)]*\)$/, '') || t;
        } else if (t.indexOf(', ') > 0) {
            t = t.slice(t.lastIndexOf(', ') + 2) || t;
        }
        return t;
    }

    function readEntries(C) {
        var out = [];
        ['experience', 'projects'].forEach(function (id) {
            if (!C || !C[id]) return;
            var list = parse(C[id].html).querySelectorAll('.entry');
            for (var i = 0; i < list.length; i++) {
                var h = list[i].querySelector('h3');
                out.push({
                    name: entryName(h ? h.textContent : '', id === 'experience'),
                    text: clean(list[i].textContent).toLowerCase()
                });
            }
        });
        return out;
    }

    function patterns(names) {
        var out = [];
        names.forEach(function (n, i) {
            var k = n.toLowerCase();
            [k].concat(ALIASES[k] || []).forEach(function (p) { out.push({ p: p, i: i }); });
        });
        return out.sort(function (a, b) { return b.p.length - a.p.length; });
    }

    // The skills an entry names, each matched as a whole word, and no stretch
    // of text counted for two skills.
    function match(text, pats) {
        var taken = new Uint8Array(text.length), found = {}, out = [];
        pats.forEach(function (pt) {
            var at = 0, p = pt.p;
            while ((at = text.indexOf(p, at)) >= 0) {
                var end = at + p.length, ok = !(at > 0 && WORD.test(text[at - 1])) && !(end < text.length && WORD.test(text[end]));
                for (var k = at; ok && k < end; k++) if (taken[k]) ok = false;
                if (ok) {
                    for (k = at; k < end; k++) taken[k] = 1;
                    if (!found[pt.i]) { found[pt.i] = true; out.push(pt.i); }
                }
                at++;
            }
        });
        return out.sort(function (a, b) { return a - b; });
    }

    // Nodes are skills; an edge's weight is the number of entries naming both.
    // A skill's `met` lists the entries where it was named with another.
    function graph(names, entries) {
        var pats = patterns(names);
        var nodes = names.map(function (n) { return { name: n, met: [], nbr: [] }; });
        var edges = [], byKey = {};
        entries.forEach(function (en, ei) {
            var f = match(en.text, pats);
            if (f.length < 2) return;
            f.forEach(function (i) { nodes[i].met.push(ei); });
            for (var a = 0; a < f.length; a++) {
                for (var b = a + 1; b < f.length; b++) {
                    var key = f[a] + ':' + f[b];
                    if (!byKey[key]) {
                        byKey[key] = { a: f[a], b: f[b], w: 0 };
                        edges.push(byKey[key]);
                        nodes[f[a]].nbr.push(f[b]);
                        nodes[f[b]].nbr.push(f[a]);
                    }
                    byKey[key].w++;
                }
            }
        });
        return { nodes: nodes, edges: edges, entries: entries };
    }

    // ── Layout ──
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

    function pickGlyph(r) {
        var x = r(), acc = 0;
        for (var i = 0; i < GLYPH_ODDS.length; i++) { acc += GLYPH_ODDS[i]; if (x < acc) return i; }
        return 0;
    }

    function fibonacci(n, turn) {
        var out = [], ga = Math.PI * (3 - Math.sqrt(5));
        for (var i = 0; i < n; i++) {
            var y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * ga + turn;
            out.push([r * Math.cos(a), y, r * Math.sin(a)]);
        }
        return out;
    }

    function dot(p, q) { return p[0] * q[0] + p[1] * q[1] + p[2] * q[2]; }

    // Skills onto the points of a Fibonacci sphere, swapped pairwise until the
    // lines are short: skills that met end up near each other, and the ones
    // that never did take what is left. Seeded, so it lands the same way on
    // every open.
    function arrange(g, r) {
        var n = g.nodes.length, slots = fibonacci(n, 0.4), adj = [], i, t;
        for (i = 0; i < n; i++) adj.push([]);
        g.edges.forEach(function (e) { adj[e.a].push(e); adj[e.b].push(e); });
        function local(k, at) {
            var s = 0;
            for (var j = 0; j < adj[k].length; j++) {
                var e = adj[k][j];
                s += e.w * (1 - dot(slots[at[e.a]], slots[at[e.b]]));
            }
            return s;
        }
        var best = null, bestCost = Infinity;
        for (var round = 0; round < 6; round++) {
            var at = [];
            for (i = 0; i < n; i++) at.push(i);
            for (i = n - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); t = at[i]; at[i] = at[j]; at[j] = t; }
            var cost = 0;
            g.edges.forEach(function (e) { cost += e.w * (1 - dot(slots[at[e.a]], slots[at[e.b]])); });
            for (var it = 0; it < 3000 && n > 1; it++) {
                var a = Math.floor(r() * n), b = Math.floor(r() * n);
                if (a === b) continue;
                var before = local(a, at) + local(b, at);
                t = at[a]; at[a] = at[b]; at[b] = t;
                var after = local(a, at) + local(b, at);
                if (after <= before) cost += after - before;
                else { t = at[a]; at[a] = at[b]; at[b] = t; }
            }
            if (cost < bestCost) { bestCost = cost; best = at.slice(); }
        }
        for (i = 0; i < n; i++) g.nodes[i].p = slots[best[i]].slice();
    }

    // Turns the layout so the net's centre, each skill weighted by how many
    // others it met, faces the viewer at rest: the sphere starts and ends its
    // turn showing the densest part.
    function orient(g) {
        var c = [0, 0, 0];
        g.nodes.forEach(function (nd) {
            var w = nd.nbr.length;
            c[0] += nd.p[0] * w; c[1] += nd.p[1] * w; c[2] += nd.p[2] * w;
        });
        if (Math.abs(c[0]) + Math.abs(c[1]) + Math.abs(c[2]) < 1e-6) return;
        var yaw = Math.atan2(-c[0], c[2]), cy = Math.cos(yaw), sy = Math.sin(yaw);
        var cz = -c[0] * sy + c[2] * cy;
        var tilt = Math.atan2(c[1], cz) - PITCH, ct = Math.cos(tilt), st = Math.sin(tilt);
        g.nodes.forEach(function (nd) {
            var x = nd.p[0], y = nd.p[1], z = nd.p[2];
            var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
            nd.p = [x1, y * ct - z1 * st, y * st + z1 * ct];
        });
    }

    // A line follows the great circle between its two skills and bows out
    // from the surface a little, more for a longer one. A short line needs
    // fewer segments to look round.
    function arc(p, q) {
        var d = Math.max(-1, Math.min(1, dot(p, q))), om = Math.acos(d), so = Math.sin(om);
        var n = Math.max(2, Math.min(STEPS, Math.ceil(om / STEP)));
        var out = new Float32Array((n + 1) * 3);
        for (var k = 0; k <= n; k++) {
            var t = k / n, s0 = 1 - t, s1 = t;
            if (so > 1e-4) { s0 = Math.sin((1 - t) * om) / so; s1 = Math.sin(t * om) / so; }
            var x = p[0] * s0 + q[0] * s1, y = p[1] * s0 + q[1] * s1, z = p[2] * s0 + q[2] * s1;
            var len = Math.sqrt(x * x + y * y + z * z) || 1;
            var lift = (1 + LIFT * Math.sin(Math.PI * t) * Math.min(1, om / 1.4)) / len;
            out[k * 3] = x * lift; out[k * 3 + 1] = y * lift; out[k * 3 + 2] = z * lift;
        }
        return out;
    }

    function ease(t) { return (1 - Math.cos(Math.PI * t)) / 2; }

    function smooth(a, b, t) {
        t = Math.min(1, Math.max(0, (t - a) / (b - a)));
        return t * t * (3 - 2 * t);
    }

    MODAL_FX.register('skills', function (stage, api) {
        var T = TEXT[api.lang()] || TEXT.en;
        var C = typeof CONTENT !== 'undefined' ? CONTENT : null;
        var noop = { destroy: function () {}, theme: function () {}, visible: function () {} };
        var names = readSkills(C);
        if (!names.length || !window.DOMParser) { api.fail(); return noop; }

        var canvas = document.createElement('canvas');
        var g = canvas.getContext && canvas.getContext('2d');
        if (!g || !window.Path2D) { api.fail(); return noop; }

        var G = graph(names, readEntries(C));
        var r = rng(20260404);
        arrange(G, r);
        orient(G);
        var nodes = G.nodes, N = nodes.length, i;
        G.edges.forEach(function (e) { e.arc = arc(nodes[e.a].p, nodes[e.b].p); e.seed = r(); });

        var reduced = api.reduced(), narrow = api.narrow();
        var touch = narrow || !!(window.matchMedia && window.matchMedia('(hover: none)').matches);
        var sections = {
            e: C && C.experience ? C.experience.title : 'Experience',
            p: C && C.projects ? C.projects.title : 'Projects'
        };

        // Background glyphs that dust the sphere's surface, and where every
        // point, skill or dust, starts in the flat field.
        var DUST = narrow ? 60 : 90;
        var dust = fibonacci(DUST, 1.3), dGlyph = [], dSeed = [], dField = [];
        for (i = 0; i < DUST; i++) {
            dGlyph.push(pickGlyph(r));
            dSeed.push(r());
            dField.push([r(), r()]);
        }
        var nSeed = [], nField = [], nGlyph = [];
        for (i = 0; i < N; i++) {
            nSeed.push(0.25 + r() * 0.5);
            nField.push([r(), r()]);
            nGlyph.push(r() < 0.5 ? 0 : 1);
        }

        // Where each skill and its label were last drawn, for pointing at it.
        var nx = new Float32Array(N), ny = new Float32Array(N), nz = new Float32Array(N);
        var lx = new Float32Array(N), ly = new Float32Array(N), lw = new Float32Array(N);
        var widths = null, order = [];
        for (i = 0; i < N; i++) order.push(i);

        // ── DOM ──
        // The title and caption are text in the stage, so they follow the
        // theme through the CSS tokens. On a wide card they stack in a column
        // to the left of the sphere; on a phone they sit above and below it.
        var font = '"Roboto Condensed", Arial, sans-serif';
        canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;' +
            'touch-action:pan-y;cursor:grab;-webkit-user-select:none;user-select:none';
        stage.appendChild(canvas);

        var title = document.createElement('div');
        title.textContent = T.title;
        stage.appendChild(title);
        var caption = document.createElement('div');
        stage.appendChild(caption);

        // ── State ──
        var dead = false, active = true, raf = 0, last = 0, drawn = false;
        var W = 0, H = 0, dpr = 1, cx = 0, cy = 0, R = 80, fontPx = 11, wide = false, col = 0;
        var colors = api.colors(), sprites = [], spriteCss = 12;
        var introT = reduced ? INTRO_END : 0, introDone = reduced;
        var turnP = reduced ? 1 : 0, turnDone = reduced, speed = 1;
        var yaw = 0, pitch = PITCH, vel = 0;
        var hover = -1, selected = -1, shown = -2;
        var mouse = null, drag = null, tap = null;

        function measure() {
            var w = stage.clientWidth || 520, h = stage.clientHeight || 250;
            var d = Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2);
            if (w === W && h === H && d === dpr && canvas.width) return false;
            W = w; H = h; dpr = d;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            wide = W >= 420;
            fontPx = wide ? 11 : 10;
            var base = 'position:absolute;left:0;pointer-events:none;font-family:' + font + ';';
            col = 0;
            if (wide) {
                col = Math.round(Math.min(160, W * 0.3));
                cx = col + (W - col) / 2;
                cy = H / 2;
                R = Math.max(40, Math.min(H / 2 - 20, (W - col) / 2 - 64));
                title.style.cssText = base + 'top:0;width:' + col + 'px;font-size:10px;line-height:13px;font-weight:600;' +
                    'letter-spacing:.06em;text-transform:uppercase;color:rgba(var(--paper-rgb),.42)';
                caption.style.cssText = base + 'bottom:0;width:' + col + 'px;max-height:' + (H - 44) + 'px;overflow:hidden;' +
                    'font-size:10px;line-height:13px;color:rgba(var(--paper-rgb),.5)';
            } else {
                // The title stops short of the close button, which sits over
                // the stage's top right corner, and gives way on a stage cut
                // short by a low window.
                var roomy = H >= 170, top = roomy ? 18 : 4, bottom = H - 30;
                cx = W / 2;
                cy = (top + bottom) / 2;
                R = Math.max(36, Math.min((bottom - top) / 2 - 11, W / 2 - 62));
                title.style.cssText = base + 'top:0;right:32px;font-size:10px;line-height:12px;font-weight:600;' +
                    'letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;' +
                    'color:rgba(var(--paper-rgb),.42);display:' + (roomy ? 'block' : 'none');
                caption.style.cssText = base + 'right:0;bottom:0;overflow:hidden;font-size:10px;line-height:13px;' +
                    'color:rgba(var(--paper-rgb),.5);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2';
            }
            widths = null;
            shown = -2;
            showCaption();
            makeSprites();
            return true;
        }

        // Each glyph drawn once in the paper ink, then stamped with an alpha.
        function makeSprites() {
            var px = Math.ceil(spriteCss * dpr);
            sprites = GLYPHS.map(function (ch) {
                var c = document.createElement('canvas');
                c.width = c.height = px;
                var s = c.getContext('2d');
                s.font = '500 ' + (10 * dpr) + 'px ' + font;
                s.textAlign = 'center';
                s.textBaseline = 'middle';
                s.fillStyle = 'rgb(' + colors.paper + ')';
                s.fillText(ch, px / 2, px / 2 + 0.5 * dpr);
                return c;
            });
        }

        function measureLabels() {
            widths = [];
            g.font = '400 ' + fontPx + 'px ' + font;
            for (var i = 0; i < N; i++) widths.push(g.measureText(nodes[i].name).width);
        }

        // ── Caption ──
        function focus() { return hover >= 0 ? hover : selected; }

        function line(text, css, parent) {
            var el = document.createElement(wide ? 'div' : 'span');
            el.style.cssText = css;
            el.textContent = text;
            parent.appendChild(el);
        }

        // The hint, or the skill in focus followed by the entries where it
        // met the lit skills: one per line in the column, run together on a
        // phone.
        function showCaption() {
            var f = focus();
            if (f === shown) return;
            shown = f;
            caption.textContent = '';
            if (f < 0) {
                caption.textContent = T.hint(sections.e, sections.p, touch);
                return;
            }
            var nd = nodes[f];
            line(nd.name + (wide ? '' : ': '), 'font-weight:600;color:rgba(var(--paper-rgb),.88)', caption);
            var lines = nd.met.length
                ? nd.met.map(function (ei) { return G.entries[ei].name; })
                : [T.alone(sections.e, sections.p)];
            var css = 'color:rgba(var(--paper-rgb),.62)';
            if (wide) lines.forEach(function (t) { line(t, css, caption); });
            else line(lines.join(' · '), css, caption);
        }

        // ── Draw ──
        // A point on the unit sphere to the stage: turned by the yaw about
        // the vertical axis, tipped towards the viewer by the pitch, then
        // put in perspective. The result lands in px, py and its depth in
        // pz, from -1 at the back to 1 at the front, so the hot loops make
        // no garbage.
        var px = 0, py = 0, pz = 0, cyw = 1, syw = 0, cpt = 1, spt = 0;
        function project(x, y, z) {
            var x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
            var y2 = y * cpt - z1 * spt, z2 = y * spt + z1 * cpt;
            var s = CAMERA / (CAMERA - z2) * R;
            px = cx + x1 * s; py = cy - y2 * s; pz = z2;
        }

        function rise(seed) {
            if (introDone) return 1;
            var t = Math.min(1, Math.max(0, introT / INTRO * 1.35 - seed * 0.35));
            return 1 - Math.pow(1 - t, 3);
        }

        // A cell of the flat field, which covers the sphere's side of the
        // stage and leaves the text column clear.
        function fieldX(u) {
            var cols = Math.max(1, Math.floor((W - col) / CELL_W));
            return col + (Math.floor(u * cols) + 0.5) * (W - col) / cols;
        }
        function fieldY(v) {
            var rows = Math.max(1, Math.floor(H / CELL_H));
            return (Math.floor(v * rows) + 0.5) * H / rows;
        }

        // A label sits above its skill near the middle of the sphere and
        // slides out beside it towards the edges, away from the lines, but
        // never past the edge of the stage.
        var tx = 0, ty = 0;
        function place(x, y, w) {
            var ux = Math.max(-1, Math.min(1, (x - cx) / (R * 1.04)));
            tx = Math.max(w / 2 + 1, Math.min(W - w / 2 - 1, x + ux * (w / 2 + 6)));
            ty = y - (1 - Math.abs(ux)) * (fontPx * 0.5 + 4.5);
        }

        // Labels fade out over the back half, the lone skills' sooner.
        function labelAlpha(alone, d) { return (alone ? 0.5 : 0.95) * smooth(0.3, 0.82, d); }

        // ── Rest pose ──
        // The turn starts and ends at the same angle. Of the angles near the
        // one that faces the net's centre, this takes the one where the
        // labels on show overlap each other, cover other skills' dots and
        // run out of the picture least.
        function settle() {
            if (!widths) measureLabels();
            var best = 0, bestCost = Infinity, h = fontPx + 2, boxes = [], i, j;
            cpt = Math.cos(pitch); spt = Math.sin(pitch);
            for (var s = -20; s <= 20; s++) {
                var at = s * 0.04, cost = Math.abs(at) * 100;
                cyw = Math.cos(at); syw = Math.sin(at);
                for (i = 0; i < N; i++) {
                    project(nodes[i].p[0], nodes[i].p[1], nodes[i].p[2]);
                    nx[i] = px; ny[i] = py;
                    place(px, py, widths[i]);
                    boxes[i] = [tx - widths[i] / 2, ty - h / 2, tx + widths[i] / 2, ty + h / 2,
                        labelAlpha(!nodes[i].nbr.length, (pz + 1) / 2)];
                }
                for (i = 0; i < N; i++) {
                    var A = boxes[i];
                    if (A[4] < 0.1) continue;
                    cost += (Math.max(0, col - A[0]) + Math.max(0, A[2] - W)) * h * A[4];
                    for (j = 0; j < N; j++) {
                        if (j === i) continue;
                        var B = boxes[j];
                        if (j > i && B[4] >= 0.1) {
                            var ow = Math.min(A[2], B[2]) - Math.max(A[0], B[0]);
                            var oh = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
                            if (ow > 0 && oh > 0) cost += ow * oh * Math.min(A[4], B[4]);
                        }
                        if (nx[j] > A[0] - 2 && nx[j] < A[2] + 2 && ny[j] > A[1] - 2 && ny[j] < A[3] + 2) cost += 30 * A[4];
                    }
                }
                if (cost < bestCost) { bestCost = cost; best = at; }
            }
            return best;
        }

        function draw() {
            if (!widths) measureLabels();
            var c = colors, paper = 'rgb(' + c.paper + ')', f = focus();
            var hs = spriteCss / 2, k, e, a, x, y, s;
            cyw = Math.cos(yaw); syw = Math.sin(yaw); cpt = Math.cos(pitch); spt = Math.sin(pitch);
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.clearRect(0, 0, W, H);

            // Dust, faint enough to stay behind the labels.
            for (k = 0; k < DUST; k++) {
                project(dust[k][0], dust[k][1], dust[k][2]);
                a = 0.02 + 0.12 * (pz + 1) / 2;
                x = px; y = py;
                if (!introDone) {
                    e = rise(dSeed[k]);
                    var fx = fieldX(dField[k][0]), fy = fieldY(dField[k][1]);
                    x = fx + (x - fx) * e; y = fy + (y - fy) * e;
                    a = FIELD_ALPHA + (a - FIELD_ALPHA) * e;
                }
                g.globalAlpha = f >= 0 ? a * 0.5 : a;
                g.drawImage(sprites[dGlyph[k]], x - hs, y - hs, spriteCss, spriteCss);
            }

            // Lines, sorted into four depth bands, each split into lines from
            // one shared entry and from more, so a frame is a few strokes.
            // Lines from the skill in focus go in bands of their own.
            // A segment that starts where the last one in its band ended
            // continues that path, so a line is one polyline per band.
            var base = [], lit = [], baseEnd = [], litEnd = [];
            var lineT = introDone ? 1 : Math.min(1, Math.max(0, (introT - LINES_AT) / DRAW_IN));
            for (var j = 0; j < G.edges.length; j++) {
                var ed = G.edges[j], frac = 1;
                if (lineT < 1) frac = ease(Math.min(1, Math.max(0, lineT * 1.4 - ed.seed * 0.4)));
                if (frac <= 0) continue;
                var on = f >= 0 && (ed.a === f || ed.b === f), bands = on ? lit : base, ends = on ? litEnd : baseEnd;
                var P = ed.arc, n = P.length / 3 - 1, heavy = ed.w > 1 ? 1 : 0, segs = frac * n;
                var ox = 0, oy = 0, oz = 0;
                for (k = 0; k <= Math.ceil(segs); k++) {
                    var kk = Math.min(k, segs), k0 = Math.floor(kk), k1 = Math.min(n, k0 + 1), u = kk - k0;
                    project(P[k0 * 3] + (P[k1 * 3] - P[k0 * 3]) * u,
                        P[k0 * 3 + 1] + (P[k1 * 3 + 1] - P[k0 * 3 + 1]) * u,
                        P[k0 * 3 + 2] + (P[k1 * 3 + 2] - P[k0 * 3 + 2]) * u);
                    if (k > 0) {
                        var depth = Math.min(3, Math.max(0, Math.floor(((oz + pz) / 2 + 1) / 2 * 4)));
                        var slot = depth * 2 + heavy;
                        var path = bands[slot] || (bands[slot] = new Path2D());
                        if (ends[slot * 2] !== ox || ends[slot * 2 + 1] !== oy) path.moveTo(ox, oy);
                        path.lineTo(px, py);
                        ends[slot * 2] = px; ends[slot * 2 + 1] = py;
                    }
                    ox = px; oy = py; oz = pz;
                }
            }
            g.strokeStyle = paper;
            g.lineCap = 'round';
            g.lineJoin = 'round';
            for (s = 0; s < 8; s++) {
                var band = (Math.floor(s / 2) + 0.5) / 4;
                if (base[s]) {
                    g.globalAlpha = (0.05 + 0.25 * Math.pow(band, 1.5)) * (s % 2 ? 1.5 : 1) * (f >= 0 ? 0.3 : 1);
                    g.lineWidth = s % 2 ? 1.3 : 1;
                    g.stroke(base[s]);
                }
                if (lit[s]) {
                    g.globalAlpha = 0.35 + 0.5 * band;
                    g.lineWidth = s % 2 ? 1.6 : 1.2;
                    g.stroke(lit[s]);
                }
            }

            // Skills, back to front, so a near label's halo in the card colour
            // covers what is behind it.
            for (i = 0; i < N; i++) {
                project(nodes[i].p[0], nodes[i].p[1], nodes[i].p[2]);
                nx[i] = px; ny[i] = py; nz[i] = pz;
            }
            order.sort(function (p, q) { return nz[p] - nz[q]; });
            var nbr = f >= 0 ? nodes[f].nbr : null;
            var normal = '400 ' + fontPx + 'px ' + font, strong = '600 ' + fontPx + 'px ' + font, cur = '';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            for (var o = 0; o < N; o++) {
                i = order[o];
                var nd = nodes[i], d = (nz[i] + 1) / 2, alone = !nd.nbr.length, mine = i === f;
                var da = alone ? 0.08 + 0.4 * Math.pow(d, 1.6) : 0.14 + 0.86 * Math.pow(d, 1.6);
                var la = labelAlpha(alone, d);
                if (f >= 0) {
                    if (mine) { da = 1; la = 1; }
                    else if (nbr.indexOf(i) >= 0) { da = Math.max(da, 0.75); la = Math.max(la, 0.45 + 0.45 * d); }
                    else { da *= 0.35; la *= 0.3; }
                }
                x = nx[i]; y = ny[i];
                if (!introDone) {
                    e = rise(nSeed[i]);
                    var gx = fieldX(nField[i][0]), gy = fieldY(nField[i][1]);
                    x = gx + (x - gx) * e; y = gy + (y - gy) * e;
                    var shape = smooth(0.6, 1, e);
                    if (shape < 1) {
                        g.globalAlpha = (FIELD_ALPHA + (da - FIELD_ALPHA) * e) * (1 - shape);
                        g.drawImage(sprites[nGlyph[i]], x - hs, y - hs, spriteCss, spriteCss);
                    }
                    da *= shape;
                    la *= smooth(0.8, 1, e);
                }
                g.globalAlpha = da;
                g.beginPath();
                if (alone) {
                    g.arc(x, y, 2.2, 0, Math.PI * 2);
                    g.lineWidth = 1;
                    g.strokeStyle = paper;
                    g.stroke();
                } else {
                    g.arc(x, y, 1.5 + d * 1.1 + (mine ? 0.8 : 0), 0, Math.PI * 2);
                    g.fillStyle = mine ? c.accent : paper;
                    g.fill();
                }

                var want = mine ? strong : normal;
                if (want !== cur) { g.font = want; cur = want; }
                var w = mine ? g.measureText(nd.name).width : widths[i];
                place(x, y, w);
                lx[i] = tx; ly[i] = ty; lw[i] = la > 0.2 ? w : 0;
                if (la < 0.02) continue;
                g.globalAlpha = la;
                if (la > 0.2) {
                    g.lineWidth = 3;
                    g.strokeStyle = c.card;
                    g.strokeText(nd.name, tx, ty);
                }
                g.fillStyle = mine ? c.accent : paper;
                g.fillText(nd.name, tx, ty);
            }
            g.globalAlpha = 1;

            if (!drawn) { drawn = true; api.ready(); }
        }

        // ── Loop ──
        function wake() {
            if (dead || !active || raf) return;
            raf = requestAnimationFrame(frame);
        }

        function stop() {
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
        }

        // Nothing left to move: the rise is over, the turn is done or held
        // for a skill in focus, and a flung sphere has coasted to a stop.
        function still() {
            return introDone && vel === 0 && (turnDone || (focus() >= 0 && speed === 0));
        }

        function frame(now) {
            raf = 0;
            if (dead || !active) return;
            if (!last) last = now;
            // Motion of its own runs at 30 fps; a drag or a fling at full rate.
            if (!drag && !vel && now - last < FRAME_MS) { raf = requestAnimationFrame(frame); return; }
            var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;

            if (!introDone) {
                introT += dt;
                if (introT >= INTRO_END) introDone = true;
            }
            // The turn eases to a halt while a skill is in focus, so it holds
            // still to be read, and picks up again after.
            speed += ((focus() >= 0 ? 0 : 1) - speed) * Math.min(1, dt * (focus() >= 0 ? 10 : 3));
            if (speed < 0.01 && focus() >= 0) speed = 0;
            if (!turnDone) {
                var p = Math.min(1, turnP + dt / TURN * speed);
                yaw += (ease(p) - ease(turnP)) * Math.PI * 2;
                turnP = p;
                if (p >= 1) turnDone = true;
            }
            if (vel && !drag) {
                yaw += vel * dt;
                vel *= Math.exp(-dt * 3.5);
                if (Math.abs(vel) < 0.03) vel = 0;
            }

            draw();
            // The sphere moves under a resting pointer, so what it points at
            // can change between moves.
            if (mouse && !drag) setHover(pick(mouse.x, mouse.y, 12));
            // A change of focus just now may already have asked for the next
            // frame; never ask twice, or two loops would run.
            if (raf) return;
            if (still()) last = 0;
            else raf = requestAnimationFrame(frame);
        }

        // ── Pointer ──
        function local(e) {
            var b = canvas.getBoundingClientRect();
            return { x: e.clientX - b.left, y: e.clientY - b.top };
        }

        // The nearest skill on the front of the sphere whose dot or label is
        // under the point.
        function pick(x, y, slack) {
            var best = -1, bz = -Infinity;
            for (var i = 0; i < N; i++) {
                if (nz[i] < -0.3) continue;
                var dx = x - nx[i], dy = y - ny[i];
                var hit = dx * dx + dy * dy <= slack * slack ||
                    (lw[i] > 0 && Math.abs(x - lx[i]) <= lw[i] / 2 + 3 && Math.abs(y - ly[i]) <= fontPx * 0.6 + 2);
                if (hit && nz[i] > bz) { bz = nz[i]; best = i; }
            }
            return best;
        }

        function setHover(h) {
            if (h === hover) return;
            hover = h;
            refresh();
        }

        function refresh() {
            canvas.style.cursor = drag && drag.moved ? 'grabbing' : (hover >= 0 ? 'pointer' : 'grab');
            showCaption();
            if (raf) return;
            // A change of focus with the loop asleep is one redraw, not a wake.
            if (still()) draw();
            else wake();
        }

        function onDown(e) {
            var p = local(e);
            if (e.pointerType === 'mouse') {
                if (e.button !== 0) return;
                drag = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, t: performance.now() };
                vel = 0;
                try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
            } else {
                tap = { x: p.x, y: p.y, t: performance.now() };
            }
        }

        function onMove(e) {
            var p = local(e);
            if (e.pointerType !== 'mouse') {
                if (tap && Math.abs(p.x - tap.x) + Math.abs(p.y - tap.y) > 10) tap = null;
                return;
            }
            mouse = p;
            if (!drag) { setHover(pick(p.x, p.y, 12)); return; }
            var dx = p.x - drag.x, dy = p.y - drag.y, now = performance.now();
            if (!drag.moved && Math.abs(p.x - drag.sx) + Math.abs(p.y - drag.sy) > 4) {
                // Taking hold of the sphere ends its own turn for good.
                drag.moved = true;
                turnDone = true;
                hover = -1;
                refresh();
            }
            if (!drag.moved) return;
            yaw += dx * DRAG;
            pitch = Math.max(-1.1, Math.min(1.2, pitch + dy * DRAG));
            var step = Math.max(0.008, (now - drag.t) / 1000);
            vel = reduced ? 0 : vel * 0.5 + (dx * DRAG / step) * 0.5;
            drag.x = p.x; drag.y = p.y; drag.t = now;
            if (raf) return;
            draw();
        }

        function onUp(e) {
            var p = local(e);
            if (drag && e.pointerType === 'mouse') {
                var d = drag;
                drag = null;
                try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
                if (!d.moved) {
                    var h = pick(p.x, p.y, 12);
                    selected = h === selected ? -1 : h;
                } else if (performance.now() - d.t > 90) {
                    // Let go after coming to rest: no fling.
                    vel = 0;
                }
                vel = Math.max(-6, Math.min(6, vel));
                hover = pick(p.x, p.y, 12);
                refresh();
                if (vel) wake();
            } else if (tap) {
                var hit = performance.now() - tap.t < 600 ? pick(p.x, p.y, 22) : -2;
                tap = null;
                if (hit > -2) {
                    selected = hit === selected ? -1 : hit;
                    refresh();
                }
            }
        }

        function onCancel() {
            if (drag) { drag = null; vel = 0; refresh(); }
            tap = null;
        }

        function onLeave(e) {
            if (e.pointerType !== 'mouse' || drag) return;
            mouse = null;
            setHover(-1);
        }

        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onCancel);
        canvas.addEventListener('pointerleave', onLeave);

        var resizeObs = null;
        if (window.ResizeObserver) {
            resizeObs = new ResizeObserver(function () {
                if (!dead && measure() && !raf) draw();
            });
            resizeObs.observe(stage);
        }

        // Labels are measured in the site's font; if it is still loading,
        // measure and draw again once it has arrived.
        if (document.fonts && document.fonts.load) {
            var spec = '400 ' + (narrow ? 10 : 11) + 'px "Roboto Condensed"';
            if (!document.fonts.check || !document.fonts.check(spec)) {
                document.fonts.load(spec).then(function () {
                    if (dead) return;
                    widths = null;
                    makeSprites();
                    if (!raf) draw();
                }, function () {});
            }
        }

        measure();
        yaw = settle();
        draw();
        if (!still()) wake();

        return {
            visible: function (on) {
                active = on;
                if (on) wake(); else { stop(); last = 0; }
            },
            theme: function () {
                if (dead) return;
                colors = api.colors();
                makeSprites();
                if (!raf) draw();
            },
            destroy: function () {
                dead = true;
                stop();
                canvas.removeEventListener('pointerdown', onDown);
                canvas.removeEventListener('pointermove', onMove);
                canvas.removeEventListener('pointerup', onUp);
                canvas.removeEventListener('pointercancel', onCancel);
                canvas.removeEventListener('pointerleave', onLeave);
                if (resizeObs) resizeObs.disconnect();
                [canvas, title, caption].forEach(function (el) {
                    if (el.parentNode) el.parentNode.removeChild(el);
                });
                canvas.width = canvas.height = 0;
            }
        };
    });
})();
