// ── Pinball Easter Egg ──
// Scroll down on the main page to scoop the portfolio balls into a pinball game.

(function () {
    'use strict';

    var B = Matter.Bodies, Body = Matter.Body, Comp = Matter.Composite,
        Con = Matter.Constraint, Ev = Matter.Events, Sleep = Matter.Sleeping;

    // ── Config ──
    var WALL_T      = 10;
    var FLIP_ANG    = 0.5;
    // Per-second rates so flipper speed stays the same across 60/120/144Hz.
    // Originals were 0.24 and 0.03 radians/tick at the old fixed 60Hz step.
    var FLIP_RATE_PER_SEC = 14.4;
    var REST_RATE_PER_SEC = 1.8;
    var BUMP_FORCE  = 0.012;
    var SCROLL_IN   = 400;
    var SCROLL_OUT  = 350;
    var MAX_SPEED   = 18;

    // Corner bumpers: worth a burst instead of a flat 100, and the burst grows
    // while the player keeps landing them inside the chain window.
    var SURGE_FORCE = 0.026;
    var SURGE_BASE  = 500;
    var SURGE_CHAIN = 3500;   // ms to land the next corner hit and keep the chain
    var SURGE_MAX   = 5;      // multiplier ceiling

    // Boost: charges from points plus a passive trickle, so it always arrives
    // eventually even for a player who isn't scoring.
    var BOOST_COST    = 1000; // charge needed for one boost
    var BOOST_TRICKLE = 25;   // charge per second, independent of score
    var BOOST_MS      = 900;  // full-power window
    var BOOST_FADE    = 700;  // speed cap eases back to normal over this
    var BOOST_SPEED   = 30;   // launch speed
    var BOOST_CAP     = 32;   // speed cap while boosting
    var POPUP_MS      = 950;
    var FONT          = '"Roboto Condensed", Arial, sans-serif';
    var CF_STATIC   = { category: 0x0002, mask: 0x0002, group: -1 };
    var CF_BALL     = { category: 0x0002, mask: 0x0002 };
    var CF_GHOST    = { category: 0x0004, mask: 0 };

    // ── Wait for playground ──
    (function wait() {
        if (!window.PLAYGROUND) return setTimeout(wait, 50);
        setup(window.PLAYGROUND);
    })();

    function setup(PG) {
        var engine = PG.engine, pairs = PG.pairs, canvas = PG.canvas, ctx = PG.ctx;

        // State
        var on = false, gameStarted = false, score = 0, lives = 0, dead = false, tableAlpha = 0;
        var activeBall = null;      // { body, el } from pairs
        var reserveBalls = [];      // remaining pairs
        var removedFromWorld = [];  // bodies removed from world
        var tableBodies = [], tableCons = [], bumps = [];
        var flipL = null, flipR = null;
        var keyL = false, keyR = false;
        var flash = {};
        var raf = null, scrollAcc = 0;
        var updateH = null, collisionH = null;
        var tableShape = null;
        var drainBlocker = null;
        var popups = [];
        var surgeMult = 0, surgeLast = 0;
        var boostCharge = 0, boostUntil = 0, boostBall = null, boostTrail = [];
        var boostPct = -1, boostWasReady = null;
        var canTouch = 'ontouchstart' in window;

        // Proportional dimensions based on ball radius
        var R, FLIP_W, FLIP_H, BUMP_R, SM_BUMP_R, SURGE_R, DRAIN_HALF, BALL_AIR;
        function calcDims() {
            R = pairs[0].body.circleRadius;
            FLIP_W    = R * 4;
            FLIP_H    = Math.max(12, R * 0.35);
            BUMP_R    = R * 0.65;
            SM_BUMP_R = R * 0.45;
            SURGE_R   = R * 0.6;
            DRAIN_HALF = R * 0.5;
            BALL_AIR  = pairs[0].body.frictionAir;
        }

        // ── UI ──
        var ui = document.createElement('div');
        ui.id = 'pinball-ui';
        ui.style.cssText = 'display:none;position:fixed;inset:0;z-index:50;pointer-events:none;';
        ui.innerHTML =
            '<div id="pb-score" style="position:absolute;top:28px;left:50%;transform:translateX(-50%);' +
            'font:700 2rem var(--mono);color:#3b82f6;text-shadow:0 0 20px rgba(59,130,246,0.3)"></div>' +
            '<div id="pb-lives" style="position:absolute;top:68px;left:50%;transform:translateX(-50%);' +
            'font:0.85rem var(--mono);color:rgba(255,255,255,0.5)"></div>' +
            '<div id="pb-boost" style="display:none;position:absolute;top:96px;left:50%;transform:translateX(-50%);' +
            'text-align:center;padding:6px 10px;pointer-events:auto;cursor:pointer;-webkit-tap-highlight-color:transparent">' +
            '<div style="width:150px;height:4px;border-radius:2px;background:rgba(255,255,255,0.12);overflow:hidden">' +
            '<div id="pb-boost-fill" style="width:0%;height:100%;background:#3b82f6"></div></div>' +
            '<div id="pb-boost-label" style="margin-top:6px;font:0.66rem var(--mono);letter-spacing:0.1em;' +
            'color:rgba(255,255,255,0.3)">BOOST</div>' +
            '</div>' +
            '<div id="pb-over" style="display:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;font-family:var(--mono)">' +
            '<div style="font:700 1.6rem var(--mono);color:#3b82f6">GAME OVER</div>' +
            '<div id="pb-final" style="font:1rem var(--mono);color:rgba(255,255,255,0.6);margin-top:8px"></div>' +
            '<div style="font:0.72rem var(--mono);color:rgba(255,255,255,0.25);margin-top:16px">scroll up to exit</div>' +
            '</div>';
        document.body.appendChild(ui);

        var $score = document.getElementById('pb-score');
        var $lives = document.getElementById('pb-lives');
        var $over  = document.getElementById('pb-over');
        var $final = document.getElementById('pb-final');
        var $boost = document.getElementById('pb-boost');
        var $boostFill  = document.getElementById('pb-boost-fill');
        var $boostLabel = document.getElementById('pb-boost-label');

        $boost.addEventListener('click', function (e) { e.preventDefault(); fireBoost(); });

        // ── Table geometry ──
        function tbl() {
            var s = PG.getSize(), W = s.W, H = s.H;
            var tw = Math.min(R * 14, Math.max(R * 8, W * 0.55));
            var th = H * 0.86;
            var cx = W / 2, top = (H - th) / 2;
            return { cx: cx, top: top, L: cx - tw / 2, R: cx + tw / 2, B: top + th, W: tw, H: th };
        }

        // Wall between two points
        function seg(x1, y1, x2, y2, opts) {
            var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            var len = Math.hypot(x2 - x1, y2 - y1);
            return B.rectangle(mx, my, len + WALL_T, WALL_T, Object.assign({}, opts, { angle: Math.atan2(y2 - y1, x2 - x1) }));
        }

        // ── Build table (sized to ball radius) ──
        function buildTable() {
            var t = tbl();
            var wo = { isStatic: true, restitution: 0.4, friction: 0.05, collisionFilter: CF_STATIC };
            var flipY = t.B - t.H * 0.14;
            var bendY = t.top + t.H * 0.72;
            var flx = t.cx - DRAIN_HALF - FLIP_W - R / 2;
            var frx = t.cx + DRAIN_HALF + FLIP_W + R / 2;

            // Walls
            tableBodies.push(seg(t.L, t.top, t.R, t.top, wo));                   // top
            tableBodies.push(seg(t.L, t.top, t.L, bendY, wo));                    // left upper
            tableBodies.push(seg(t.R, t.top, t.R, bendY, wo));                    // right upper
            tableBodies.push(seg(t.L, bendY, flx, flipY + 10, wo));               // left guide
            tableBodies.push(seg(t.R, bendY, frx, flipY + 10, wo));               // right guide
            tableBodies.push(seg(flx, flipY + 10, flx, flipY + 60, wo));          // left rail
            tableBodies.push(seg(frx, flipY + 10, frx, flipY + 60, wo));          // right rail

            // Temporary drain blocker during chaos phase
            drainBlocker = B.rectangle(t.cx, flipY + 35, DRAIN_HALF * 3, WALL_T,
                { isStatic: true, collisionFilter: CF_STATIC });
            tableBodies.push(drainBlocker);

            // Bumpers (scaled to ball size)
            var bo = { isStatic: true, restitution: 1.2, collisionFilter: CF_STATIC, label: 'bumper' };
            var sbo = Object.assign({}, bo, { label: 'sm_bumper' });
            var suo = Object.assign({}, bo, { label: 'surge', restitution: 1.35 });
            // Corner bumpers sit close enough to the walls that the gap behind
            // them is narrower than a ball — nothing can wedge into the corner.
            var inset = WALL_T / 2 + R * 0.35 + SURGE_R;
            bumps = [
                B.circle(t.L + inset, t.top + inset, SURGE_R, suo),
                B.circle(t.R - inset, t.top + inset, SURGE_R, suo),
                B.circle(t.cx, t.top + t.H * 0.25, BUMP_R, bo),
                B.circle(t.cx - t.W * 0.24, t.top + t.H * 0.33, BUMP_R, bo),
                B.circle(t.cx + t.W * 0.24, t.top + t.H * 0.38, BUMP_R, bo),
                B.circle(t.cx - t.W * 0.15, t.top + t.H * 0.52, SM_BUMP_R, sbo),
                B.circle(t.cx + t.W * 0.15, t.top + t.H * 0.63, SM_BUMP_R, sbo)
            ];
            tableBodies.push.apply(tableBodies, bumps);

            // Flippers — fully static, positioned manually each frame
            var foL = { isStatic: true, friction: 0.4, restitution: 0.05, collisionFilter: CF_STATIC,
                        chamfer: { radius: FLIP_H / 2 } };
            var foR = { isStatic: true, friction: 0.4, restitution: 0.05, collisionFilter: CF_STATIC,
                        chamfer: { radius: FLIP_H / 2 } };
            // Pivot positions: flush with the side rails
            var lpx = flx + FLIP_H / 2;             // left pivot (tight to rail)
            var rpx = frx - FLIP_H / 2;             // right pivot (tight to rail)

            flipL = B.rectangle(lpx + FLIP_W / 2, flipY, FLIP_W, FLIP_H, foL);
            flipR = B.rectangle(rpx - FLIP_W / 2, flipY, FLIP_W, FLIP_H, foR);
            tableBodies.push(flipL, flipR);

            // No constraints — flippers are static, we control angle + position directly
            tableCons = [];

            Comp.add(engine.world, tableBodies);

            tableShape = { flipY: flipY, bendY: bendY, flx: flx, frx: frx, lpx: lpx, rpx: rpx, t: t };

            // Set initial resting angles — position manually since positionFlipper isn't available yet
            (function(f, a, px, py, ox) {
                var c = Math.cos(a), s = Math.sin(a);
                Body.setAngle(f, a); Body.setPosition(f, { x: px - ox * c, y: py - ox * s });
            })(flipL, FLIP_ANG, lpx, flipY, -FLIP_W / 2);
            (function(f, a, px, py, ox) {
                var c = Math.cos(a), s = Math.sin(a);
                Body.setAngle(f, a); Body.setPosition(f, { x: px - ox * c, y: py - ox * s });
            })(flipR, -FLIP_ANG, rpx, flipY, FLIP_W / 2);
        }

        // ── Scoop all balls into the table (smooth attraction) ──
        function scoopBalls() {
            var t = tbl();
            pairs.forEach(function (p) {
                // Switch to pinball collision filter
                p.body.collisionFilter.category = CF_BALL.category;
                p.body.collisionFilter.mask = CF_BALL.mask;
                p.body.collisionFilter.group = 0;
                p.el.classList.add('visible');
                Sleep.set(p.body, false);

                // Launch balls toward the table center instead of teleporting
                var targetX = t.cx + (Math.random() - 0.5) * t.W * 0.3;
                var targetY = t.top + t.H * 0.3;
                var dx = targetX - p.body.position.x;
                var dy = targetY - p.body.position.y;
                var dist = Math.sqrt(dx * dx + dy * dy) || 1;
                var speed = 12 + Math.random() * 4;
                Body.setVelocity(p.body, {
                    x: (dx / dist) * speed,
                    y: (dy / dist) * speed
                });
            });
        }

        // ── Set up the actual game after chaos phase ──
        function startGame() {
            gameStarted = true;
            var t = tbl();

            // Remove drain blocker
            if (drainBlocker) {
                Comp.remove(engine.world, drainBlocker);
                var idx = tableBodies.indexOf(drainBlocker);
                if (idx > -1) tableBodies.splice(idx, 1);
                drainBlocker = null;
            }

            // Shuffle and pick first ball
            var shuffled = pairs.slice().sort(function () { return Math.random() - 0.5; });
            activeBall = shuffled[0];
            reserveBalls = shuffled.slice(1);

            // Stash reserves off-world
            reserveBalls.forEach(function (p) {
                p.el.classList.remove('visible');
                Comp.remove(engine.world, p.body);
                removedFromWorld.push(p.body);
            });

            // Position active ball at top of table
            activeBall.body.collisionFilter.category = CF_BALL.category;
            activeBall.body.collisionFilter.mask = CF_BALL.mask;
            activeBall.body.collisionFilter.group = 0;
            Body.setPosition(activeBall.body, { x: t.cx, y: t.top + R * 2 });
            Body.setVelocity(activeBall.body, { x: 0, y: 2 });
            activeBall.el.classList.add('visible');

            score = 0;
            lives = reserveBalls.length + 1; // active + reserves
            dead = false;
            boostCharge = 0;
            boostPct = -1; boostWasReady = null;
            $boost.style.display = 'block';
            $score.textContent = '0';
            showLives();
        }

        // ── Activate next reserve ball ──
        function activateNext() {
            if (reserveBalls.length === 0) { gameOver(); return; }
            var t = tbl();
            var next = reserveBalls.shift();

            // Add back to world
            Comp.add(engine.world, next.body);
            var idx = removedFromWorld.indexOf(next.body);
            if (idx > -1) removedFromWorld.splice(idx, 1);

            next.body.collisionFilter.category = CF_BALL.category;
            next.body.collisionFilter.mask = CF_BALL.mask;
            next.body.collisionFilter.group = 0;
            Body.setPosition(next.body, { x: t.cx, y: t.top + R * 2 });
            Body.setVelocity(next.body, { x: 0, y: 2 });
            Body.setAngle(next.body, 0);
            next.el.classList.add('visible');

            activeBall = next;
        }

        function showLives() {
            var dots = '';
            for (var i = 0; i < lives; i++) dots += (i ? ' ' : '') + '\u25cf';
            $lives.textContent = dots;
        }

        // \u2500\u2500 Floating score text on the canvas \u2500\u2500
        function popup(x, y, text, color) {
            popups.push({ x: x, y: y, text: text, color: color, t0: Date.now() });
            if (popups.length > 12) popups.shift();
        }

        // \u2500\u2500 Boost \u2500\u2500
        function addCharge(pts) {
            if (boostCharge < BOOST_COST) boostCharge = Math.min(BOOST_COST, boostCharge + pts);
        }

        function boostReady() {
            return boostCharge >= BOOST_COST && gameStarted && !dead && !!activeBall;
        }

        function fireBoost() {
            if (!on || !boostReady()) return;
            var b = activeBall.body;
            var spd = Math.hypot(b.velocity.x, b.velocity.y);
            // Always launch up-table, keeping whatever sideways drift the ball
            // had \u2014 boosting a falling ball straight down would just drain it.
            var dx = spd > 0.5 ? (b.velocity.x / spd) * 0.55 : (Math.random() - 0.5) * 0.5;
            var len = Math.hypot(dx, 1);
            Sleep.set(b, false);
            Body.setVelocity(b, { x: dx / len * BOOST_SPEED, y: -BOOST_SPEED / len });

            endBoost(true);
            boostBall = b;
            b.frictionAir = 0;          // no drag, so the boost carries further
            boostUntil = Date.now() + BOOST_MS;
            boostCharge = 0;
            popup(b.position.x, b.position.y - R, 'BOOST', '#93c5fd');
        }

        function endBoost(hard) {
            if (boostBall) { boostBall.frictionAir = BALL_AIR; boostBall = null; }
            if (hard) { boostUntil = 0; boostTrail.length = 0; }
        }

        // Cap eases back to normal after a boost so the ball decays instead of
        // hitting an invisible wall the moment the window closes.
        function speedCap() {
            var dt = Date.now() - boostUntil;
            if (dt < 0) return BOOST_CAP;
            if (dt >= BOOST_FADE) return MAX_SPEED;
            return BOOST_CAP + (MAX_SPEED - BOOST_CAP) * (dt / BOOST_FADE);
        }

        // ── ENTER ──
        function enter() {
            if (on) return;
            on = true;
            window.PINBALL_ACTIVE = true;
            canvas.style.zIndex = '0'; // draw table behind balls
            scrollAcc = 0;
            gameStarted = false;
            dead = false;
            popups = [];
            surgeMult = 0; surgeLast = 0;
            boostCharge = 0; boostUntil = 0; boostBall = null; boostTrail = [];
            $over.style.display = 'none';
            $boost.style.display = 'none';
            $score.textContent = '';
            $lives.textContent = 'GET READY \u2014 use \u2190 \u2192 arrow keys to flip';
            calcDims();

            // Hide hint
            var hint = document.getElementById('hint');
            if (hint) hint.style.display = 'none';

            // Disable mouse drag
            Comp.remove(engine.world, PG.mouseConstraint);

            // Increase gravity for pinball
            engine.world.gravity.y = 1.6;

            // Build table and scoop balls in
            tableAlpha = 0;
            buildTable();
            scoopBalls();

            ui.style.display = 'block';

            // Register flipper handler immediately (works during chaos)
            // Position a static flipper: rotate around its pivot point
            function positionFlipper(flip, angle, pivotX, pivotY, pivotOffsetX) {
                var cos = Math.cos(angle), sin = Math.sin(angle);
                var cx = pivotX - pivotOffsetX * cos;
                var cy = pivotY - pivotOffsetX * sin;
                Body.setAngle(flip, angle);
                Body.setPosition(flip, { x: cx, y: cy });
                // Angular velocity helps Matter.js resolve ball collisions properly
                Body.setAngularVelocity(flip, 0);
            }

            updateH = function () {
                if (!on) return;

                var sh = tableShape;
                // Per-tick step scales with display rate; angular velocity is
                // re-scaled to 60Hz-equivalent units (Body._baseDelta) so
                // collision response stays constant across refresh rates.
                var fps = window.DISPLAY_FPS || 60;
                var flipStep = FLIP_RATE_PER_SEC / fps;
                var restStep = REST_RATE_PER_SEC / fps;
                var velScale = fps / 60;

                // Left flipper (pivot outer-left, free end toward center-right)
                var la, ra;
                var prevLA = flipL.angle, prevRA = flipR.angle;
                if (keyL) {
                    la = Math.max(prevLA - flipStep, -FLIP_ANG);
                } else {
                    la = Math.min(prevLA + restStep, FLIP_ANG);
                }
                positionFlipper(flipL, la, sh.lpx, sh.flipY, -FLIP_W / 2);
                Body.setAngularVelocity(flipL, (la - prevLA) * velScale);

                // Right flipper (pivot outer-right, free end toward center-left)
                if (keyR) {
                    ra = Math.min(prevRA + flipStep, FLIP_ANG);
                } else {
                    ra = Math.max(prevRA - restStep, -FLIP_ANG);
                }
                positionFlipper(flipR, ra, sh.rpx, sh.flipY, FLIP_W / 2);
                Body.setAngularVelocity(flipR, (ra - prevRA) * velScale);

                // Speed cap on active ball (raised while boosting)
                if (gameStarted && activeBall) {
                    var b = activeBall.body;
                    var spd = Math.hypot(b.velocity.x, b.velocity.y);
                    var cap = speedCap();
                    if (spd > cap) {
                        var s = cap / spd;
                        Body.setVelocity(b, { x: b.velocity.x * s, y: b.velocity.y * s });
                    }
                }

                // Boost charge, trail and expiry
                if (gameStarted && !dead) {
                    if (boostCharge < BOOST_COST) {
                        boostCharge = Math.min(BOOST_COST, boostCharge + BOOST_TRICKLE / fps);
                    }
                    if (boostBall) {
                        if (Date.now() >= boostUntil) {
                            endBoost(false);
                        } else {
                            boostTrail.push({ x: boostBall.position.x, y: boostBall.position.y });
                            if (boostTrail.length > 20) boostTrail.shift();
                        }
                    } else if (boostTrail.length) {
                        boostTrail.shift();
                    }
                }

                // Drain check (only after game starts)
                if (gameStarted && !dead && activeBall && activeBall.body.position.y > tbl().B + R + 30) {
                    // Ball drained
                    endBoost(true);
                    surgeMult = 0;
                    activeBall.el.classList.remove('visible');
                    Comp.remove(engine.world, activeBall.body);
                    removedFromWorld.push(activeBall.body);
                    activeBall = null;
                    lives--;
                    showLives();
                    if (lives <= 0) {
                        gameOver();
                    } else {
                        setTimeout(function () { activateNext(); }, 600);
                    }
                }
            };
            Ev.on(engine, 'beforeUpdate', updateH);

            // Collision handler (scoring only after game starts)
            collisionH = function (ev) {
                if (!gameStarted || dead) return;
                ev.pairs.forEach(function (p) {
                    var a = p.bodyA, b = p.bodyB;
                    var bmp = null, bl = null;
                    if (isBumper(a) && activeBall && b === activeBall.body) { bmp = a; bl = b; }
                    if (isBumper(b) && activeBall && a === activeBall.body) { bmp = b; bl = a; }
                    if (!bmp || !bl) return;
                    var surge = bmp.label === 'surge';
                    var dx = bl.position.x - bmp.position.x;
                    var dy = bl.position.y - bmp.position.y;
                    var d = Math.hypot(dx, dy) || 1;
                    var f = surge ? SURGE_FORCE : BUMP_FORCE;
                    Body.applyForce(bl, bl.position, { x: dx / d * f, y: dy / d * f });

                    var pts;
                    if (surge) {
                        var t = Date.now();
                        surgeMult = (t - surgeLast < SURGE_CHAIN) ? Math.min(surgeMult + 1, SURGE_MAX) : 1;
                        surgeLast = t;
                        pts = SURGE_BASE * surgeMult;
                        popup(bmp.position.x, bmp.position.y - SURGE_R - 8,
                              (surgeMult > 1 ? '×' + surgeMult + '  ' : '') + '+' + pts, '#fbbf24');
                    } else {
                        pts = bmp.label === 'bumper' ? 100 : 50;
                    }
                    score += pts;
                    addCharge(pts);
                    $score.textContent = score;
                    flash[bmp.id] = Date.now();
                });
            };
            Ev.on(engine, 'collisionStart', collisionH);

            // Start render
            draw();

            // After chaos, start the real game
            setTimeout(function () {
                if (on) startGame();
            }, 1200);
        }

        function isBumper(body) {
            return body.label === 'bumper' || body.label === 'sm_bumper' || body.label === 'surge';
        }

        // ── Game Over ──
        function gameOver() {
            dead = true;
            endBoost(true);
            $boost.style.display = 'none';
            $over.style.display = 'block';
            $final.textContent = 'Score: ' + score;
            $score.textContent = '';
            $lives.textContent = '';
        }

        // ── EXIT ──
        function exit() {
            if (!on) return;
            on = false;
            window.PINBALL_ACTIVE = false;
            canvas.style.zIndex = ''; // restore default
            scrollAcc = 0;
            gameStarted = false;

            Ev.off(engine, 'beforeUpdate', updateH);
            Ev.off(engine, 'collisionStart', collisionH);

            endBoost(true);
            popups = [];
            surgeMult = 0; surgeLast = 0; boostCharge = 0;

            // Remove table
            tableCons.forEach(function (c) { Comp.remove(engine.world, c); });
            tableBodies.forEach(function (b) { Comp.remove(engine.world, b); });
            tableBodies = []; tableCons = []; bumps = []; flash = {};
            flipL = flipR = null; drainBlocker = null; tableShape = null;

            // Restore ALL balls to world with default collision
            pairs.forEach(function (p) {
                // Re-add if removed
                if (removedFromWorld.indexOf(p.body) > -1) {
                    Comp.add(engine.world, p.body);
                }
                p.body.collisionFilter.category = 0x0001;
                p.body.collisionFilter.mask = 0xFFFFFFFF;
                p.body.collisionFilter.group = 0;
                Body.setStatic(p.body, false);
                Sleep.set(p.body, false);
                p.el.classList.add('visible');
            });
            removedFromWorld = [];
            activeBall = null;
            reserveBalls = [];

            // Restore
            var hint = document.getElementById('hint');
            if (hint) hint.style.display = '';
            Comp.add(engine.world, PG.mouseConstraint);
            engine.world.gravity.y = 1.2;

            ui.style.display = 'none';
            $over.style.display = 'none';
            $boost.style.display = 'none';
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (raf) { cancelAnimationFrame(raf); raf = null; }
        }

        // ── Render (table, bumpers, flippers — balls are DOM elements) ──
        function draw() {
            if (!on) return;
            if (!tableShape) { raf = requestAnimationFrame(draw); return; }
            var sh = tableShape;
            var t = sh.t;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Fade in the table
            if (tableAlpha < 1) tableAlpha = Math.min(1, tableAlpha + 0.02);

            ctx.save();
            ctx.globalAlpha = tableAlpha;

            // Table background
            ctx.beginPath();
            ctx.moveTo(t.L, t.top);
            ctx.lineTo(t.R, t.top);
            ctx.lineTo(t.R, sh.bendY);
            ctx.lineTo(sh.frx, sh.flipY + 10);
            ctx.lineTo(sh.frx, sh.flipY + 60);
            ctx.lineTo(sh.flx, sh.flipY + 60);
            ctx.lineTo(sh.flx, sh.flipY + 10);
            ctx.lineTo(t.L, sh.bendY);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Bumpers
            var now = Date.now();
            var chained = surgeMult > 1 && now - surgeLast < SURGE_CHAIN;
            for (var i = 0; i < bumps.length; i++) {
                var bm = bumps[i];
                var hit = flash[bm.id] && now - flash[bm.id] < 150;
                var surge = bm.label === 'surge';
                var r = bm.circleRadius;

                // Ring around a corner bumper while its chain is still alive
                if (surge && chained) {
                    var pulse = 1 + 0.12 * Math.sin(now / 130);
                    ctx.beginPath();
                    ctx.arc(bm.position.x, bm.position.y, r * 1.35 * pulse, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(251,191,36,0.35)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                ctx.beginPath();
                ctx.arc(bm.position.x, bm.position.y, r, 0, Math.PI * 2);
                if (hit) {
                    ctx.fillStyle = surge ? 'rgba(251,191,36,0.85)' : 'rgba(96,165,250,0.8)';
                    ctx.shadowColor = surge ? '#f59e0b' : '#3b82f6';
                    ctx.shadowBlur = surge ? 26 : 18;
                } else {
                    ctx.fillStyle = surge ? 'rgba(245,158,11,0.22)' : 'rgba(59,130,246,0.2)';
                }
                ctx.fill();
                ctx.shadowBlur = 0;
                if (surge) ctx.strokeStyle = hit ? '#fde68a' : 'rgba(245,158,11,0.6)';
                else       ctx.strokeStyle = hit ? '#93c5fd' : 'rgba(59,130,246,0.5)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                if (surge && chained) {
                    ctx.fillStyle = '#fde68a';
                    ctx.font = '700 ' + Math.round(r * 0.85) + 'px ' + FONT;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('×' + surgeMult, bm.position.x, bm.position.y + 1);
                }

                if (flash[bm.id] && now - flash[bm.id] > 150) delete flash[bm.id];
            }

            // Flippers
            var flippers = [flipL, flipR];
            for (var fi = 0; fi < flippers.length; fi++) {
                var f = flippers[fi];
                if (!f) continue;
                var v = f.vertices;
                ctx.beginPath();
                ctx.moveTo(v[0].x, v[0].y);
                for (var j = 1; j < v.length; j++) ctx.lineTo(v[j].x, v[j].y);
                ctx.closePath();
                ctx.fillStyle = '#3b82f6';
                ctx.fill();
            }

            // Boost trail (canvas sits behind the ball elements)
            for (var ti = 0; ti < boostTrail.length; ti++) {
                var pt = boostTrail[ti];
                var k = (ti + 1) / boostTrail.length;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, R * 0.75 * k, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(147,197,253,' + (0.28 * k * k).toFixed(3) + ')';
                ctx.fill();
            }

            // Floating score text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (var pi = popups.length - 1; pi >= 0; pi--) {
                var pu = popups[pi];
                var age = (now - pu.t0) / POPUP_MS;
                if (age >= 1) { popups.splice(pi, 1); continue; }
                ctx.globalAlpha = tableAlpha * (1 - age);
                ctx.fillStyle = pu.color;
                ctx.font = '700 ' + Math.round(R * 0.45) + 'px ' + FONT;
                ctx.fillText(pu.text, pu.x, pu.y - age * R * 1.2);
            }

            ctx.restore();
            drawBoostMeter(now);
            raf = requestAnimationFrame(draw);
        }

        // ── Boost meter (DOM, only written when it actually changes) ──
        function drawBoostMeter(now) {
            if (!gameStarted || dead) return;
            var pct = Math.round(boostCharge / BOOST_COST * 100);
            if (pct !== boostPct) {
                boostPct = pct;
                $boostFill.style.width = pct + '%';
            }
            var ready = boostCharge >= BOOST_COST;
            if (ready !== boostWasReady) {
                boostWasReady = ready;
                $boostFill.style.background = ready ? '#fbbf24' : '#3b82f6';
                $boostLabel.style.color = ready ? '#fbbf24' : 'rgba(255,255,255,0.3)';
                $boostLabel.textContent = ready
                    ? (canTouch ? 'BOOST READY — TAP' : 'BOOST READY — SPACE')
                    : 'BOOST';
                if (!ready) $boostLabel.style.opacity = '1';
            }
            if (ready) $boostLabel.style.opacity = (0.55 + 0.45 * Math.sin(now / 220)).toFixed(2);
        }

        // ── Scroll ──
        window.addEventListener('wheel', function (e) {
            if (document.getElementById('modal-overlay').classList.contains('active')) return;
            if (on) {
                if (e.deltaY < 0) {
                    scrollAcc -= Math.abs(e.deltaY);
                    if (scrollAcc < -SCROLL_OUT) exit();
                } else {
                    scrollAcc = 0;
                }
            } else {
                if (e.deltaY > 0) {
                    scrollAcc += e.deltaY;
                    if (scrollAcc > SCROLL_IN) enter();
                } else {
                    scrollAcc = Math.max(0, scrollAcc + e.deltaY);
                }
            }
        }, { passive: true });

        // ── Keyboard ──
        window.addEventListener('keydown', function (e) {
            if (!on) return;
            if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') { keyL = true; e.preventDefault(); }
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keyR = true; e.preventDefault(); }
            if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                if (!e.repeat) fireBoost();
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', function (e) {
            if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') keyL = false;
            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyR = false;
        });

        // ── Touch controls for mobile ──
        canvas.addEventListener('touchstart', function (e) {
            if (!on) return;
            for (var i = 0; i < e.touches.length; i++) {
                if (e.touches[i].clientX < canvas.width / 2) keyL = true;
                else keyR = true;
            }
            e.preventDefault();
        }, { passive: false });

        canvas.addEventListener('touchend', function (e) {
            if (!on) return;
            keyL = false; keyR = false;
            for (var i = 0; i < e.touches.length; i++) {
                if (e.touches[i].clientX < canvas.width / 2) keyL = true;
                else keyR = true;
            }
        }, { passive: false });
    }
})();
