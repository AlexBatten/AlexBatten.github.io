// ── Ball rain (easter egg) ──
// The playground's ceiling can be broken. Throw a ball into it hard and a
// hairline crack appears where it struck; three such hits within a few
// seconds and the roof gives way: a hundred to three hundred small balls
// (by screen size, a third of that with reduced motion) in the site's
// colours pour in through the cracks, pile up around the portfolio balls,
// and after a while drop out through the floor. The hints panel's riddle
// is "the sky is only a ceiling".
//
// A hit only counts when the ball was thrown: still held by the pointer, or
// let go of moments before. A ball that rises under zero gravity (G) or a
// tilted phone never cracks anything. A held ball that bounces off the
// ceiling is pulled straight back into it by the pointer, so each ball counts
// once per HIT_GAP_MS. Nothing runs between eggs except a check on each
// collision with the ceiling.
//
// The rain balls are Matter bodies in the playground's world, drawn on a
// canvas of their own under the DOM balls. They stay out of PLAYGROUND.pairs,
// so pinball, snake and the ball sounds never see them, and if pinball takes
// the playground mid-rain they are cleared at once. window.RAIN_ACTIVE is
// true while it rains, which keeps Tomas (tomas.js) away.

(function () {
    'use strict';

    var Bodies = Matter.Bodies, Body = Matter.Body, Composite = Matter.Composite, Events = Matter.Events;

    var HITS = 3;               // hard ceiling hits that break it
    var WINDOW_MS = 6000;       // ... landed within this long
    var THROWN_MS = 1200;       // a ball let go this recently still counts as thrown
    var HIT_SPEED = 13;         // upward speed at impact, px per 60Hz step
    var HIT_GAP_MS = 300;       // one ball counts at most once in this long
    var CRACK_MS = 3500;        // a crack fades over this long
    var SPAWN_MS = 2200;        // the rain pours in over this long
    var SETTLE_MS = 5500;       // then lies there this long
    var DRAIN_MS = 3200;        // and drops out of the floor within this long
    var FONT = '"Roboto Condensed", Arial, sans-serif';

    (function wait() {
        if (!window.PLAYGROUND || !window.PLAYGROUND.walls) return setTimeout(wait, 50);
        setup(window.PLAYGROUND);
    })();

    function setup(PG) {
        var engine = PG.engine, ceiling = PG.walls.ceiling, mc = PG.mouseConstraint;
        var root = document.documentElement;
        var playground = document.getElementById('playground');
        var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

        var hits = [];          // engine times of recent hard hits
        var cracks = [];        // { x, born, lines: [[x, y], ...][] }
        var released = {};      // body id -> engine time it was let go
        var lastHit = {};       // body id -> engine time it last counted
        var rain = null;        // the running egg, or null
        var view = null;        // { canvas, g, dpr, w, h } while anything is drawn
        var raf = 0;

        function now() { return engine.timing.timestamp; }

        // Per 60Hz step whatever the display rate: the runner steps at the
        // display's rate, and a body's raw velocity is per step.
        function velocity(b) { return Body.getVelocity ? Body.getVelocity(b) : b.velocity; }

        Events.on(mc, 'enddrag', function (e) {
            if (e.body) released[e.body.id] = now();
        });

        function isPortfolioBall(body) {
            for (var i = 0; i < PG.pairs.length; i++) if (PG.pairs[i].body === body) return true;
            return false;
        }

        function thrown(body) {
            if (mc.body === body) return true;
            var t = released[body.id];
            return t !== undefined && now() - t < THROWN_MS;
        }

        // ── Hits ──
        Events.on(engine, 'collisionStart', function (ev) {
            if (rain || window.PINBALL_ACTIVE) return;
            for (var i = 0; i < ev.pairs.length; i++) {
                var p = ev.pairs[i];
                var ball = p.bodyA === ceiling ? p.bodyB : p.bodyB === ceiling ? p.bodyA : null;
                if (!ball || !isPortfolioBall(ball)) continue;
                if (velocity(ball).y > -HIT_SPEED || !thrown(ball)) continue;
                if (now() - (lastHit[ball.id] || -Infinity) < HIT_GAP_MS) continue;
                lastHit[ball.id] = now();
                hit(ball.position.x);
            }
        });

        function hit(x) {
            var t = now();
            hits = hits.filter(function (h) { return t - h < WINDOW_MS; });
            hits.push(t);
            addCrack(x, hits.length);
            if (hits.length >= HITS) {
                hits = [];
                start();
            } else {
                loop();
            }
        }

        // A jagged line down from the ceiling with a branch or two; the
        // third hit's crack is the long one the rain falls through.
        function addCrack(x, n) {
            var len = n >= HITS ? 70 : 22 + n * 10;
            var lines = [];
            function grow(x0, y0, dir, length, depth) {
                var pts = [[x0, y0]], px = x0, py = y0;
                var steps = Math.max(3, Math.round(length / 7));
                for (var s = 0; s < steps; s++) {
                    px += dir * (2 + Math.random() * 5) + (Math.random() - 0.5) * 6;
                    py += length / steps;
                    pts.push([px, py]);
                    if (depth < 2 && Math.random() < 0.28) {
                        grow(px, py, Math.random() < 0.5 ? -1 : 1, length * 0.45, depth + 1);
                    }
                }
                lines.push(pts);
            }
            grow(x, 0, Math.random() < 0.5 ? -0.4 : 0.4, len, 0);
            if (n >= HITS) {
                grow(x, 0, -2.2, len * 0.8, 1);
                grow(x, 0, 2.2, len * 0.8, 1);
            }
            cracks.push({ x: x, born: now(), lines: lines });
        }

        // ── Rain ──
        function start() {
            var size = PG.getSize(), W = size.W, H = size.H;
            var narrow = W <= 600;
            var count = Math.round(Math.max(100, Math.min(300, W * H / 3200)));
            if (reduced && reduced.matches) count = Math.round(count * 0.3);
            Composite.remove(engine.world, ceiling);
            window.RAIN_ACTIVE = true;
            rain = {
                begun: now(),
                slow: 16.7,         // smoothed frame interval while pouring, ms
                lastFrame: 0,
                total: count,
                made: 0,
                bodies: [],
                drained: false,
                origins: cracks.map(function (c) { return c.x; }),
                rMin: narrow ? 6 : 8,
                rMax: narrow ? 9.5 : 13
            };
            if (!(reduced && reduced.matches)) shake();
            loop();
        }

        // Weighted towards the card grey, with the accent, the chat green and
        // pinball's amber mixed in. Grey balls of a readable size carry a 0
        // or a 1 like the background.
        var PALETTE = ['card', 'card', 'card', 'card', 'card', 'accent', 'accent', 'chat', 'amber'];

        function spawn(W) {
            // Half-pixel sizes, so each size, tone and digit is one sprite.
            var r = Math.round((rain.rMin + Math.random() * (rain.rMax - rain.rMin)) * 2) / 2;
            var o = rain.origins[Math.floor(Math.random() * rain.origins.length)];
            var x = Math.random() < 0.6 && o !== undefined
                ? o + (Math.random() + Math.random() + Math.random() - 1.5) * W * 0.22
                : Math.random() * W;
            x = Math.max(r, Math.min(W - r, x));
            var body = Bodies.circle(x, -r - Math.random() * 160, r, {
                restitution: 0.35,
                friction: 0.1,
                frictionAir: 0.01,
                density: 0.002,
                label: 'rain'
            });
            Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: 2 + Math.random() * 4 });
            var tone = PALETTE[Math.floor(Math.random() * PALETTE.length)];
            body.rain = { tone: tone, digit: tone === 'card' && r >= 9 ? (Math.random() < 0.5 ? '0' : '1') : '' };
            Composite.add(engine.world, body);
            rain.bodies.push(body);
        }

        function step() {
            var size = PG.getSize(), t = now() - rain.begun;
            // Pour in at an even rate over SPAWN_MS of simulated time, so a
            // card opened mid-rain (which stops the engine) pauses it too.
            var due = Math.min(rain.total, Math.ceil(rain.total * t / SPAWN_MS));
            while (rain.made < due) { spawn(size.W); rain.made++; }
            // A device whose frames fall under about 35 a second while it
            // pours gets no more balls than it has so far.
            if (rain.made < rain.total) {
                var wall = performance.now();
                if (rain.lastFrame) {
                    rain.slow = rain.slow * 0.9 + (wall - rain.lastFrame) * 0.1;
                    if (rain.made > 40 && rain.slow > 28) rain.total = rain.made;
                }
                rain.lastFrame = wall;
            }

            if (!rain.drained && t > SPAWN_MS + SETTLE_MS) {
                rain.drained = true;
                rain.drainAt = now();
                // Out of every collision, so the pile drops through the floor
                // (and past the portfolio balls) and can't be grabbed.
                rain.bodies.forEach(function (b) {
                    b.collisionFilter = { category: 0x0008, mask: 0, group: 0 };
                    b.rain.delay = Math.random() * 450;
                });
            }
            if (rain.drained) {
                var dt = now() - rain.drainAt;
                rain.bodies = rain.bodies.filter(function (b) {
                    if (dt > b.rain.delay) {
                        // Its own pull, so it leaves even under zero gravity.
                        var vel = velocity(b);
                        Body.setVelocity(b, { x: vel.x * 0.98, y: Math.max(vel.y, 0) + 0.55 });
                    }
                    if (b.position.y - b.circleRadius > size.H + 4 || dt > DRAIN_MS) {
                        Composite.remove(engine.world, b);
                        return false;
                    }
                    return true;
                });
                if (!rain.bodies.length) finish();
            }
        }

        function finish() {
            if (!rain) return;
            rain.bodies.forEach(function (b) { Composite.remove(engine.world, b); });
            rain = null;
            window.RAIN_ACTIVE = false;
            if (Composite.get(engine.world, ceiling.id, 'body') !== ceiling) Composite.add(engine.world, ceiling);
        }

        // physics.js moves the walls and clamps the portfolio balls on a
        // resize, and this runs after it. The pile moves up with a raised
        // floor and in from a nearer right wall, rather than being left
        // below the floor, where it would fall out of sight.
        var lastSize = PG.getSize();
        window.addEventListener('resize', function () {
            var size = PG.getSize();
            if (rain && !rain.drained) {
                var dy = Math.min(0, size.H - lastSize.H);
                rain.bodies.forEach(function (b) {
                    var r = b.circleRadius;
                    var x = Math.max(r, Math.min(size.W - r, b.position.x));
                    var y = Math.min(size.H - r, b.position.y + dy);
                    if (x !== b.position.x || y !== b.position.y) Body.setPosition(b, { x: x, y: y });
                });
            }
            lastSize = size;
        });

        function shake() {
            if (!playground.animate) return;
            playground.animate([
                { transform: 'translate(0, 0)' },
                { transform: 'translate(-3px, 2px)' },
                { transform: 'translate(3px, -1px)' },
                { transform: 'translate(-2px, 1px)' },
                { transform: 'translate(0, 0)' }
            ], { duration: 320, easing: 'ease-out' });
        }

        // ── Drawing ──
        // Each kind of rain ball (tone, digit, size) is drawn once into a
        // sprite at the screen's resolution, and a frame stamps the sprites
        // in, turned with their bodies. Once the pile is still, frames stop
        // redrawing until something moves.
        var colors = null, themeSeen = null, sprites = {}, drawnStill = false;

        function readColors() {
            var theme = root.getAttribute('data-theme');
            if (colors && theme === themeSeen) return;
            themeSeen = theme;
            sprites = {};
            drawnStill = false;
            var cs = getComputedStyle(root);
            var v = function (n, d) { return cs.getPropertyValue(n).trim() || d; };
            colors = {
                ink: v('--ink-rgb', '0, 0, 0'),
                card: v('--card', '#3a3a3a'),
                edge: v('--card-edge', '#4a4a4a'),
                accent: v('--accent', '#3b82f6'),
                accentOnCard: v('--accent-on-card', '#3b82f6'),
                chat: v('--chat', '#10b981'),
                amber: '#f59e0b'
            };
        }

        function ensureView() {
            var size = PG.getSize();
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            if (!view) {
                var c = document.createElement('canvas');
                c.setAttribute('aria-hidden', 'true');
                c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;pointer-events:none';
                // Before the first ball, so the DOM balls paint over the rain.
                playground.insertBefore(c, playground.querySelector('.ball'));
                view = { canvas: c, g: c.getContext('2d'), w: 0, h: 0, dpr: 0 };
            }
            if (view.w !== size.W || view.h !== size.H || view.dpr !== dpr) {
                view.w = size.W; view.h = size.H; view.dpr = dpr;
                drawnStill = false;
                view.canvas.width = Math.round(size.W * dpr);
                view.canvas.height = Math.round(size.H * dpr);
            }
            return view;
        }

        function sprite(tone, digit, r, dpr) {
            var key = tone + digit + r + '@' + dpr;
            var s = sprites[key];
            if (s) return s;
            var half = r + 1;
            var px = Math.ceil(half * 2 * dpr);
            var c = document.createElement('canvas');
            c.width = c.height = px;
            var g = c.getContext('2d');
            g.setTransform(dpr, 0, 0, dpr, px / 2, px / 2);
            g.beginPath();
            g.arc(0, 0, tone === 'card' ? r - 0.5 : r, 0, Math.PI * 2);
            g.fillStyle = colors[tone];
            g.fill();
            if (tone === 'card') {
                g.lineWidth = 1;
                g.strokeStyle = colors.edge;
                g.stroke();
            }
            if (digit) {
                g.fillStyle = colors.accentOnCard;
                g.font = '600 ' + Math.round(r * 1.05) + 'px ' + FONT;
                g.textAlign = 'center';
                g.textBaseline = 'middle';
                g.fillText(digit, 0, 0.5);
            }
            s = sprites[key] = { canvas: c, half: px / 2 / dpr };
            return s;
        }

        function draw() {
            var v = ensureView(), g = v.g, t = now();
            readColors();
            var moving = cracks.length > 0;
            if (rain && !moving) {
                for (var i = 0; i < rain.bodies.length && !moving; i++) {
                    var b0 = rain.bodies[i];
                    moving = b0.speed > 0.03 || b0.angularSpeed > 0.003;
                }
            }
            if (!moving && drawnStill) return;
            drawnStill = !moving;
            g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
            g.clearRect(0, 0, v.w, v.h);

            cracks = cracks.filter(function (c) { return t - c.born < CRACK_MS; });
            g.lineWidth = 1;
            g.lineJoin = 'round';
            cracks.forEach(function (c) {
                var a = 0.6 * (1 - (t - c.born) / CRACK_MS);
                g.strokeStyle = 'rgba(' + colors.ink + ',' + a.toFixed(3) + ')';
                c.lines.forEach(function (pts) {
                    g.beginPath();
                    g.moveTo(pts[0][0], pts[0][1]);
                    for (var i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
                    g.stroke();
                });
            });

            if (rain) {
                var d = v.dpr;
                rain.bodies.forEach(function (b) {
                    var r = b.circleRadius, x = b.position.x, y = b.position.y;
                    if (y + r < 0 || y - r > v.h) return;
                    var s = sprite(b.rain.tone, b.rain.digit, r, d);
                    var cos = Math.cos(b.angle) * d, sin = Math.sin(b.angle) * d;
                    g.setTransform(cos, sin, -sin, cos, x * d, y * d);
                    g.drawImage(s.canvas, -s.half, -s.half, s.half * 2, s.half * 2);
                });
            }
        }

        function loop() {
            if (!raf) raf = requestAnimationFrame(frame);
        }

        function frame() {
            raf = 0;
            // Pinball takes the whole playground: the rain goes at once.
            if (window.PINBALL_ACTIVE) {
                finish();
                cracks = [];
                hits = [];
            }
            // While a card is open the engine is stopped and nothing moves,
            // so the picture is left as it is; checking each frame means the
            // first frame after the card closes draws again.
            if (!PG.runner.enabled && (rain || cracks.length)) {
                raf = requestAnimationFrame(frame);
                return;
            }
            if (rain) step();
            if (rain || cracks.length) {
                draw();
                raf = requestAnimationFrame(frame);
            } else if (view) {
                view.canvas.remove();
                view = null;
                drawnStill = false;
            }
        }
    }
})();
