// ── Snake ──
// The stage below pinball. Scroll down from the table to reach it, scroll up
// to go back. stages.js decides when it is shown; this file runs the game.
//
// Drawn in pinball's vocabulary: the board is the table's ink panel, the
// snake is the flippers' blue, food is a small portfolio ball and the bonus
// is an amber surge bumper.

(function () {
    'use strict';

    // ── Config ──
    var START_LEN      = 4;
    var QUEUE_MAX      = 2;      // turns buffered ahead of the next step
    var STEP_MIN       = 70;     // ms per cell, approached as the snake eats
    var STEP_RANGE     = 60;     // 130ms per cell at the start
    var STEP_DECAY     = 0.94;
    var FOOD_PTS       = 100;
    var BONUS_BASE     = 500;
    var BONUS_MAX      = 5;      // chain multiplier ceiling
    var BONUS_EVERY    = 5;      // a bonus appears after every fifth food
    var BONUS_MS       = 6000;   // counted in game time, so a pause doesn't run it down
    var BONUS_BLINK_MS = 1500;
    var POPUP_MS       = 950;
    var POPUP_MAX      = 12;
    var RING_MS        = 260;
    var FLASH_MS       = 150;
    var SPAWN_MS       = 180;
    var TRAIL_MS       = 700;
    var TRAIL_MAX      = 16;
    var DEATH_PANEL_MS = 450;
    var RESTART_DELAY  = 600;    // so a key mashed at the moment of death doesn't restart
    var COLS_TARGET    = 20;
    var CELL_MIN       = 16;
    var CELL_MAX       = 28;
    var ROWS_MIN       = 10;
    var DT_CAP         = 250;
    var MAX_CATCHUP    = 4;
    var TAP_PX         = 12;
    var TAP_MS         = 250;
    var BEST_KEY       = 'snake-best';
    var FONT           = '"Roboto Condensed", Arial, sans-serif';
    var ACCENT         = '#3b82f6';
    var DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
    var OPP  = { up: 'down', down: 'up', left: 'right', right: 'left' };
    var TAU  = Math.PI * 2;

    // ── Wait for playground ──
    var tries = 0;
    (function wait() {
        if (window.PLAYGROUND) return setup(window.PLAYGROUND);
        if (++tries < 200) setTimeout(wait, 50);
    })();

    function setup(PG) {
        var modal = document.getElementById('modal-overlay');
        var hints = document.getElementById('hints-overlay');
        var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        var coarseQuery = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;

        // ── DOM ──
        // Above the playground (z-index 1), below the footer, the navs, the
        // pinball HUD and the overlays.
        var layer = document.createElement('div');
        layer.id = 'snake-layer';
        layer.setAttribute('aria-hidden', 'true');
        layer.style.cssText = 'position:fixed;inset:0;z-index:2;display:none;';

        var canvas = document.createElement('canvas');
        canvas.id = 'snake-canvas';
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
        var ctx = canvas.getContext('2d');

        // Score and subline sit where pinball's score and lives do. The panel
        // is a card like the modal and hints panel, so its text keeps its
        // contrast in both themes wherever it lands on the board.
        var ui = document.createElement('div');
        ui.id = 'snake-ui';
        ui.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
        ui.innerHTML =
            '<div id="sn-score" style="position:absolute;top:28px;left:50%;transform:translateX(-50%);' +
            'font:700 2rem var(--mono);color:#3b82f6;text-shadow:0 0 20px rgba(59,130,246,0.3)"></div>' +
            '<div id="sn-sub" style="position:absolute;top:68px;left:50%;transform:translateX(-50%);' +
            'font:0.85rem var(--mono);color:rgba(var(--paper-rgb),0.5);white-space:nowrap"></div>' +
            '<div id="sn-panel" style="display:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
            'text-align:center;font-family:var(--mono);white-space:nowrap;padding:22px 32px;' +
            'background:var(--card);border:1px solid var(--card-edge);border-radius:var(--radius);' +
            'box-shadow:0 12px 32px rgba(0,0,0,0.25)">' +
            '<div id="sn-title" style="font:700 1.6rem var(--mono);color:var(--accent-on-card);letter-spacing:0.04em"></div>' +
            '<div id="sn-line" style="font:1rem var(--mono);color:rgba(var(--paper-rgb),0.7);margin-top:8px"></div>' +
            '<div id="sn-best" style="font:0.85rem var(--mono);margin-top:4px"></div>' +
            '<div id="sn-act" style="font:0.72rem var(--mono);color:rgba(var(--paper-rgb),0.5);margin-top:16px"></div>' +
            '<div style="font:0.72rem var(--mono);color:rgba(var(--paper-rgb),0.3);margin-top:4px">scroll up for pinball</div>' +
            '<div style="font:0.72rem var(--mono);color:rgba(var(--paper-rgb),0.3);margin-top:4px">scroll down for chess</div>' +
            '</div>';

        layer.appendChild(canvas);
        layer.appendChild(ui);
        document.body.appendChild(layer);

        var $score = ui.querySelector('#sn-score');
        var $sub   = ui.querySelector('#sn-sub');
        var $panel = ui.querySelector('#sn-panel');
        var $title = ui.querySelector('#sn-title');
        var $line  = ui.querySelector('#sn-line');
        var $best  = ui.querySelector('#sn-best');
        var $act   = ui.querySelector('#sn-act');

        // ── Sections ──
        // Food is the numbered portfolio balls in order, 01 to 08, with each
        // label read from the page so /da/ shows the Danish ones.
        var sections = [];
        Array.prototype.forEach.call(document.querySelectorAll('#playground .ball'), function (el) {
            var icon = el.querySelector('.ball-icon'), label = el.querySelector('.ball-label');
            var num = icon ? icon.textContent.trim() : '';
            if (!/^\d\d$/.test(num)) return;
            sections.push({
                id: el.getAttribute('data-id'),
                num: num,
                label: label ? label.textContent.trim() : '',
                cta: el.classList.contains('ball-cta')
            });
        });
        if (!sections.length) {
            for (var si = 1; si <= 8; si++) sections.push({ id: '', num: '0' + si, label: '', cta: false });
        }

        // ── Theme ──
        // Same tokens as the stylesheet, re-read only when data-theme changes.
        var root = document.documentElement;
        var themeSeen, ink, paper, card, cardEdge, accentOnCard, amberOnCard;
        function readTheme() {
            var theme = root.getAttribute('data-theme');
            if (theme === themeSeen) return;
            themeSeen = theme;
            var cs = getComputedStyle(root);
            ink          = cs.getPropertyValue('--ink-rgb').trim() || '0, 0, 0';
            paper        = cs.getPropertyValue('--paper-rgb').trim() || '255, 255, 255';
            card         = cs.getPropertyValue('--card').trim() || '#3a3a3a';
            cardEdge     = cs.getPropertyValue('--card-edge').trim() || '#4a4a4a';
            accentOnCard = cs.getPropertyValue('--accent-on-card').trim() || '#3b82f6';
            // Amber text on the card, for the same reason the stylesheet has
            // --accent-on-card: the card turns light grey in dark mode, where
            // #f59e0b would sit at 1.2:1. #92400e is 4.1:1 on #c5c5c5.
            amberOnCard = paper.replace(/\s/g, '') === '0,0,0' ? '#92400e' : '#f59e0b';
        }

        function reduced() {
            return !!(motionQuery && motionQuery.matches);
        }

        // ── State ──
        var phase = 'ready';        // ready | running | paused | dead
        var live = false;           // in view and taking input
        var shown = false;          // on screen, possibly mid-slide
        var hasRound = false;
        var body = [], prevTail = null, dir = 'right', queue = [], grow = 0;
        var food = null, ghost = null, bonus = null;
        var score = 0, eaten = 0, chain = 0, best = loadBest(), bestAtStart = 0;
        var stepMs = stepFor(0), acc = 0, last = 0, deathAt = 0, deathKind = '';
        var flashAt = -Infinity, rings = [], popups = [], trail = [];
        var rng = Math.random;
        var raf = null, dirty = false, panelKey = '';

        // ── Layout ──
        // The board takes pinball's table footprint, so the stages line up
        // when one slides in under the other. On phones it is allowed wider.
        var W = 0, H = 0, dpr = 1, R = 40;
        var panel = { L: 0, top: 0, w: 0, h: 0 };
        var cols = 0, rows = 0, cell = 0, gx = 0, gy = 0;

        function size() {
            var s = PG.getSize(), w = s.W, h = s.H;
            if (!w || !h) { w = window.innerWidth; h = window.innerHeight; }
            if (!w || !h) { w = 1280; h = 800; }
            return { W: w, H: h };
        }

        // freshGrid picks a new cols x rows. Without it the grid keeps its
        // shape and only the cell size changes, so a resize mid-round never
        // moves the walls under the snake.
        function layout(freshGrid) {
            var s = size();
            W = s.W; H = s.H;
            R = PG.pairs[0].body.circleRadius;
            var pw = Math.min(R * 14, Math.max(R * 8, W * 0.55, Math.min(W - 48, 360)));
            var top = H * 0.07, bottom = H * 0.93;
            panel = { L: (W - pw) / 2, top: top, w: pw, h: bottom - top };
            var pad = Math.max(8, Math.round(R * 0.25));
            // The score and subline sit in a header band above the grid.
            var gridTop = Math.max(top + 40, 100);
            var availW = pw - 2 * pad, availH = bottom - pad - gridTop;
            if (freshGrid || !cols) {
                cell = Math.max(CELL_MIN, Math.min(CELL_MAX, Math.floor(availW / COLS_TARGET)));
                cell = Math.max(8, Math.min(cell, Math.floor(availH / ROWS_MIN)));
                cols = Math.max(6, Math.floor(availW / cell));
                rows = Math.max(6, Math.floor(availH / cell));
            } else {
                cell = Math.max(8, Math.min(Math.floor(availW / cols), Math.floor(availH / rows)));
            }
            gx = Math.round(W / 2 - cols * cell / 2);
            gy = Math.round(bottom - pad - rows * cell);

            dpr = Math.min(2, window.devicePixelRatio || 1);
            var bw = Math.round(W * dpr), bh = Math.round(H * dpr);
            if (canvas.width !== bw) canvas.width = bw;
            if (canvas.height !== bh) canvas.height = bh;
            $panel.style.top = Math.round(gy + rows * cell / 2) + 'px';
        }

        function applyDirty() {
            dirty = false;
            // Nothing to lose before the first move, so take the new shape.
            if (phase === 'ready') newRound();
            else layout(false);
        }

        // ── Best score ──
        // Storage can throw outright (blocked cookies, some private modes);
        // the score then lasts as long as the page.
        function loadBest() {
            try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; }
        }
        function saveBest(n) {
            try { localStorage.setItem(BEST_KEY, String(n)); } catch (e) {}
        }

        function stepFor(n) {
            return Math.round(STEP_MIN + STEP_RANGE * Math.pow(STEP_DECAY, n));
        }

        // ── Rounds ──
        function newRound() {
            layout(true);
            dirty = false;
            var hx = Math.floor(cols / 2) + 1, hy = Math.floor(rows / 2);
            body = [];
            for (var i = 0; i < START_LEN; i++) body.push({ x: hx - i, y: hy });
            dir = 'right'; queue = []; grow = 0; prevTail = null;
            score = 0; eaten = 0; chain = 0; bonus = null; food = null; ghost = null;
            rings = []; popups = []; trail = [];
            stepMs = stepFor(0); acc = 0;
            phase = 'ready';
            bestAtStart = best;
            hasRound = true;
            // The ball that was in play on the pinball table is the first food.
            var first = 0;
            var lbl = window.PINBALL && window.PINBALL.activeLabel ? window.PINBALL.activeLabel() : null;
            for (var j = 0; j < sections.length; j++) if (sections[j].id === lbl) first = j;
            placeFood(first);
            hud();
        }

        // A random empty cell, preferring ones at least minDist steps from
        // the head so nothing spawns right under it.
        function freeCell(minDist) {
            var taken = {}, i;
            for (i = 0; i < body.length; i++) taken[body[i].x + ',' + body[i].y] = 1;
            if (food) taken[food.x + ',' + food.y] = 1;
            if (bonus) taken[bonus.x + ',' + bonus.y] = 1;
            var far = [], any = [], h = body[0];
            for (var y = 0; y < rows; y++) {
                for (var x = 0; x < cols; x++) {
                    if (taken[x + ',' + y]) continue;
                    any.push({ x: x, y: y });
                    if (Math.abs(x - h.x) + Math.abs(y - h.y) >= minDist) far.push({ x: x, y: y });
                }
            }
            var pool = far.length ? far : any;
            if (!pool.length) return null;
            return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
        }

        function placeFood(idx) {
            var c = freeCell(4);
            if (!c) { food = null; return false; }
            var n = sections.length;
            food = { x: c.x, y: c.y, idx: ((idx % n) + n) % n, t0: performance.now() };
            return true;
        }

        function spawnBonus(now) {
            var c = freeCell(4);
            if (c) bonus = { x: c.x, y: c.y, left: BONUS_MS, t0: now };
        }

        // ── Step ──
        // One move of the game, with no drawing, so it can be driven by hand.
        // Returns what happened.
        function step() {
            if (phase !== 'running') return 'idle';
            var now = performance.now();
            ghost = null;
            if (queue.length) dir = queue.shift();
            var h = body[0], d = DIRS[dir], nx = h.x + d.x, ny = h.y + d.y;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) { die('wall'); return 'die'; }
            // The tail cell is about to be vacated, so moving into it is legal,
            // unless the snake is growing and the tail stays put.
            var tailMoves = grow === 0;
            var n = body.length - (tailMoves ? 1 : 0);
            for (var i = 0; i < n; i++) {
                if (body[i].x === nx && body[i].y === ny) { die('self'); return 'die'; }
            }
            body.unshift({ x: nx, y: ny });
            if (tailMoves) {
                prevTail = body.pop();
                // The cell the tail leaves flickers a 0 or 1, like the page's
                // ascii background, then fades.
                if (!reduced()) {
                    trail.push({ x: prevTail.x, y: prevTail.y, ch: rng() < 0.5 ? '0' : '1', t0: now });
                    if (trail.length > TRAIL_MAX) trail.shift();
                }
            } else {
                grow--;
                prevTail = null;
            }

            var res = 'move';
            if (bonus && nx === bonus.x && ny === bonus.y) {
                chain = Math.min(chain + 1, BONUS_MAX);
                var pts = BONUS_BASE * chain;
                score += pts;
                ring(nx, ny, 'bonus', now);
                popup(nx, ny, (chain > 1 ? '×' + chain + '  ' : '') + '+' + pts, '#fbbf24', '', now);
                sound(8);
                bonus = null;
                res = 'bonus';
            } else if (bonus) {
                bonus.left -= stepMs;
                // A bonus that runs out uncaught ends the chain, like a corner
                // bumper not hit again in time.
                if (bonus.left <= 0) { bonus = null; chain = 0; }
            }

            if (food && nx === food.x && ny === food.y) {
                var sec = sections[food.idx];
                score += FOOD_PTS;
                eaten++;
                grow++;
                flashAt = now;
                ring(nx, ny, 'food', now);
                popup(nx, ny, '+' + FOOD_PTS, '#60a5fa', sec.label, now);
                sound(5);
                stepMs = stepFor(eaten);
                // The eaten ball shrinks away while the head glides onto it.
                ghost = { x: food.x, y: food.y, idx: food.idx };
                var nextIdx = food.idx + 1;
                food = null;
                if (!placeFood(nextIdx)) { die('clear'); return 'clear'; }
                if (eaten % BONUS_EVERY === 0 && !bonus) spawnBonus(now);
                res = 'eat';
            }
            hud();
            return res;
        }

        function die(kind) {
            phase = 'dead';
            deathAt = performance.now();
            deathKind = kind;
            queue = [];
            acc = 0;
            if (score > best) { best = score; saveBest(best); }
            if (kind !== 'clear') sound(11);
            hud();
        }

        function start() {
            if (phase !== 'ready') return false;
            phase = 'running';
            acc = 0;
            last = performance.now();
            // The first move is committed at once, so the head never sits a
            // whole step behind the key that started it.
            step();
            return true;
        }

        function pause() {
            if (phase !== 'running') return false;
            phase = 'paused';
            hud();
            return true;
        }

        function resume() {
            if (phase !== 'paused') return false;
            phase = 'running';
            last = performance.now();
            hud();
            return true;
        }

        function canRestart() {
            return phase === 'dead' && performance.now() - deathAt >= RESTART_DELAY;
        }

        function restart(name) {
            if (phase === 'dead' && !canRestart()) return false;
            newRound();
            if (name && DIRS[name]) turn(name);
            else start();
            return true;
        }

        // ── Input ──
        function turn(name) {
            if (!DIRS[name]) return false;
            if (phase === 'dead') return canRestart() ? restart(name) : false;
            if (phase === 'ready') {
                // Before the first move, the opposite way turns the snake round
                // instead of being refused.
                if (name === OPP[dir]) { body.reverse(); prevTail = null; }
                dir = name;
                return start();
            }
            if (phase === 'paused') resume();
            // Checked against the last queued turn, so two quick presses
            // (up then left) both land, but never a reversal into the neck.
            var ref = queue.length ? queue[queue.length - 1] : dir;
            if (name === ref || name === OPP[ref] || queue.length >= QUEUE_MAX) return false;
            queue.push(name);
            return true;
        }

        // Space, Enter, a tap or a click.
        function primary() {
            if (phase === 'ready') return start();
            if (phase === 'running') return pause();
            if (phase === 'paused') return resume();
            return canRestart() ? restart() : false;
        }

        function overlayOpen() {
            return !!((modal && modal.classList.contains('active')) ||
                      (hints && hints.classList.contains('active')));
        }

        function editable(t) {
            return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' ||
                            t.tagName === 'SELECT' || t.isContentEditable));
        }

        window.addEventListener('keydown', function (e) {
            if (!live) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (overlayOpen() || editable(e.target)) return;
            var k = e.key, tg = e.target, name = null;
            if (k === 'ArrowUp' || k === 'w' || k === 'W') name = 'up';
            else if (k === 'ArrowDown' || k === 's' || k === 'S') name = 'down';
            else if (k === 'ArrowLeft' || k === 'a' || k === 'A') name = 'left';
            else if (k === 'ArrowRight' || k === 'd' || k === 'D') name = 'right';
            if (name) {
                e.preventDefault();
                // A key still held from steering into the crash auto-repeats;
                // only a fresh press plays again.
                if (e.repeat && phase === 'dead') return;
                turn(name);
                return;
            }
            if (k === ' ' || k === 'Spacebar') {
                // A button focused by an earlier click (theme, hints) would
                // otherwise be pressed by this Space on keyup.
                if (tg && (tg.tagName === 'BUTTON' || tg.tagName === 'A') && tg.blur) tg.blur();
                e.preventDefault();
                if (!e.repeat) primary();
                return;
            }
            if (k === 'Enter') {
                // Enter on a focused link still follows it.
                if (!tg || tg === document.body || tg === root || tg === canvas) {
                    e.preventDefault();
                    if (!e.repeat) primary();
                }
                return;
            }
            if ((k === 'p' || k === 'P') && !e.repeat) {
                if (!pause()) resume();
                return;
            }
            // Pause only, never a toggle: physics.js closes the hints panel on
            // the same key, and a toggle would resume a round it had paused.
            if (k === 'Escape') pause();
        });

        // Touch: swipe to steer, tap to start, resume or play again. Each turn
        // resets the swipe origin, so an L-shaped drag gives two turns.
        var touch = null;
        canvas.addEventListener('touchstart', function (e) {
            if (!live || e.touches.length !== 1) return;
            e.preventDefault();
            var t = e.touches[0];
            touch = { x: t.clientX, y: t.clientY, ox: t.clientX, oy: t.clientY, t: performance.now(), swiped: false };
        }, { passive: false });

        canvas.addEventListener('touchmove', function (e) {
            if (!live || !touch || e.touches.length !== 1) return;
            e.preventDefault();
            var t = e.touches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < Math.max(18, Math.round(cell * 0.9))) return;
            turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
            touch.x = t.clientX;
            touch.y = t.clientY;
            touch.swiped = true;
        }, { passive: false });

        canvas.addEventListener('touchend', function (e) {
            if (!live || !touch) return;
            var t = e.changedTouches[0];
            var moved = Math.hypot(t.clientX - touch.ox, t.clientY - touch.oy);
            // A tap while running is ignored: a missed swipe shouldn't pause.
            if (!touch.swiped && moved < TAP_PX && performance.now() - touch.t < TAP_MS && phase !== 'running') {
                primary();
            }
            touch = null;
        }, { passive: true });

        canvas.addEventListener('mousedown', function (e) {
            if (live && e.button === 0 && phase !== 'running') primary();
        });

        // Auto-pause whenever the player can't be watching.
        window.addEventListener('blur', function () { if (live) pause(); });
        document.addEventListener('visibilitychange', function () {
            if (document.hidden && live) pause();
        });
        window.addEventListener('resize', function () {
            dirty = true;
            if (live) pause();
        });

        // ── Effects ──
        function ring(x, y, kind, now) {
            rings.push({ x: x, y: y, kind: kind, t0: now });
        }

        function popup(x, y, text, color, label, now) {
            popups.push({ x: x, y: y, text: text, color: color, label: label, t0: now });
            if (popups.length > POPUP_MAX) popups.shift();
        }

        // The balls' own bounce sample, quieter for food than for a crash.
        function sound(v) {
            if (live && PG.playBounce) PG.playBounce(v);
        }

        // ── Loop ──
        // Speed is time-based: a step happens every stepMs whatever the
        // display rate, and drawing interpolates between steps.
        function frame(now) {
            raf = null;
            if (!shown) return;
            if (live && phase === 'running' && overlayOpen()) pause();
            var dt = Math.max(0, Math.min(DT_CAP, now - last));
            last = now;
            if (live && phase === 'running') {
                acc += dt;
                var n = 0;
                while (acc >= stepMs && n++ < MAX_CATCHUP) {
                    acc -= stepMs;
                    step();
                    if (phase !== 'running') { acc = 0; break; }
                }
                if (acc > stepMs) acc = stepMs;
            }
            render(now);
            raf = requestAnimationFrame(frame);
        }

        // ── Render ──
        function center(c) {
            return { x: gx + (c.x + 0.5) * cell, y: gy + (c.y + 0.5) * cell };
        }

        function between(p, q, t) {
            return { x: gx + (p.x + (q.x - p.x) * t + 0.5) * cell, y: gy + (p.y + (q.y - p.y) * t + 0.5) * cell };
        }

        // The snake's centre line at fraction a of the current step. At 0 it is
        // exactly the previous state, at 1 the current one.
        function path(a) {
            var pts = [], n = body.length;
            if (!n) return pts;
            if (n === 1) { pts.push(center(body[0])); return pts; }
            pts.push(between(body[1], body[0], a));
            for (var i = 1; i < n; i++) pts.push(center(body[i]));
            if (prevTail && a < 1) pts.push(between(prevTail, body[n - 1], a));
            return pts;
        }

        function easeOutBack(t) {
            var u = t - 1;
            return 1 + 2.70158 * u * u * u + 1.70158 * u * u;
        }

        // Callable without an animation frame, for testing in a hidden tab.
        function render(now) {
            if (dirty) applyDirty();
            readTheme();
            if (!W || !H) return;
            var rm = reduced();
            var a = (phase === 'running' || phase === 'paused') ? Math.min(1, acc / stepMs) : 1;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            drawBoard();
            drawTrail(now);
            if (ghost && a < 1) drawBall(center(ghost), cell * 0.42 * (1 - a), sections[ghost.idx]);
            if (food) {
                var fs = rm ? 1 : easeOutBack(Math.min(1, (now - food.t0) / SPAWN_MS));
                drawBall(center(food), cell * 0.42 * fs, sections[food.idx]);
            }
            drawBonus(now, a, rm);
            var pts = path(a);
            drawBody(pts, now);
            drawHead(pts, now, rm);
            drawRings(now);
            drawPopups(now);
            drawScrim(now);
            syncPanel(now);
        }

        // Pinball's table: the same ink fill and paper edge, with sharp
        // corners like its walls. The playfield is a slightly deeper well
        // with a dot at every grid point, echoing the ascii background.
        function drawBoard() {
            ctx.fillStyle = 'rgba(' + ink + ',0.3)';
            ctx.fillRect(panel.L, panel.top, panel.w, panel.h);
            ctx.strokeStyle = 'rgba(' + paper + ',0.08)';
            ctx.lineWidth = 2;
            ctx.strokeRect(panel.L, panel.top, panel.w, panel.h);

            var fw = cols * cell, fh = rows * cell;
            ctx.fillStyle = 'rgba(' + ink + ',0.1)';
            ctx.fillRect(gx, gy, fw, fh);
            ctx.strokeStyle = 'rgba(' + paper + ',0.16)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(gx, gy, fw, fh);

            ctx.beginPath();
            for (var y = 1; y < rows; y++) {
                for (var x = 1; x < cols; x++) ctx.rect(gx + x * cell - 1, gy + y * cell - 1, 2, 2);
            }
            ctx.fillStyle = 'rgba(' + paper + ',0.09)';
            ctx.fill();
        }

        function drawTrail(now) {
            if (!trail.length) return;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '600 ' + Math.round(cell * 0.5) + 'px ' + FONT;
            for (var i = trail.length - 1; i >= 0; i--) {
                var tr = trail[i], age = (now - tr.t0) / TRAIL_MS;
                if (age >= 1) { trail.splice(i, 1); continue; }
                var c = center(tr);
                ctx.fillStyle = 'rgba(' + paper + ',' + (0.32 * (1 - age)).toFixed(3) + ')';
                ctx.fillText(tr.ch, c.x, c.y + 1);
            }
        }

        // A portfolio ball in miniature: card grey with the accent number, or
        // accent-filled for the Hire ball, as on the playground.
        function drawBall(c, r, sec) {
            if (r <= 0.5) return;
            ctx.beginPath();
            ctx.arc(c.x, c.y, r, 0, TAU);
            ctx.fillStyle = sec.cta ? ACCENT : card;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = sec.cta ? '#5b9bff' : cardEdge;
            ctx.stroke();
            var ink2 = sec.cta ? '#ffffff' : accentOnCard;
            if (cell >= 22 && r >= cell * 0.3) {
                ctx.fillStyle = ink2;
                ctx.font = '600 ' + Math.round(r * 0.86) + 'px ' + FONT;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(sec.num, c.x, c.y + 1);
            } else {
                ctx.beginPath();
                ctx.arc(c.x, c.y, Math.min(r * 0.4, cell * 0.12), 0, TAU);
                ctx.fillStyle = ink2;
                ctx.fill();
            }
        }

        // An amber surge bumper with a countdown ring. The ring and the blink
        // run on game time, so they freeze with a pause.
        function drawBonus(now, a, rm) {
            if (!bonus) return;
            var c = center(bonus);
            var midStep = phase === 'running' || phase === 'paused';
            var left = Math.max(0, bonus.left - (midStep ? a * stepMs : 0));
            var s = rm ? 1 : easeOutBack(Math.min(1, (now - bonus.t0) / SPAWN_MS));
            ctx.save();
            if (left <= BONUS_BLINK_MS) ctx.globalAlpha = rm ? 0.6 : (Math.floor(left / 120) % 2 ? 0.35 : 1);
            ctx.beginPath();
            ctx.arc(c.x, c.y, Math.max(0, cell * 0.44 * s), 0, TAU);
            ctx.fillStyle = 'rgba(245,158,11,0.35)';
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = (rm ? 10 : 10 + 8 * Math.sin(now / 200)) * dpr;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(245,158,11,0.9)';
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(c.x, c.y, cell * 0.62, -Math.PI / 2, -Math.PI / 2 + TAU * left / BONUS_MS);
            ctx.strokeStyle = 'rgba(251,191,36,0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();

            var next = Math.min(chain + 1, BONUS_MAX);
            if (next >= 2 && cell >= 22) {
                ctx.fillStyle = '#fde68a';
                ctx.font = '700 ' + Math.round(cell * 0.4) + 'px ' + FONT;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('×' + next, c.x, c.y + 1);
            }
            ctx.restore();
        }

        function strokePath(pts, i0, i1, color) {
            if (i1 <= i0) return;
            ctx.beginPath();
            ctx.moveTo(pts[i0].x, pts[i0].y);
            for (var i = i0 + 1; i <= i1; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.strokeStyle = color;
            ctx.stroke();
        }

        // One solid tube in the flippers' blue. After a crash it greys from
        // the neck back to the tail.
        function drawBody(pts, now) {
            if (pts.length < 2) return;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = cell * 0.62;
            var end = pts.length - 1;
            if (phase === 'dead') {
                // deathAt is stamped inside the frame, a moment after the
                // frame's own timestamp, so the first count can be negative.
                var per = Math.min(22, 400 / pts.length);
                var k = Math.max(0, Math.min(end, Math.floor((now - deathAt) / per)));
                strokePath(pts, k, end, ACCENT);
                strokePath(pts, 0, k, 'rgba(' + paper + ',0.28)');
            } else {
                strokePath(pts, 0, end, ACCENT);
            }
        }

        function drawHead(pts, now, rm) {
            if (!pts.length) return;
            var hp = pts[0], r = cell * 0.40;
            if (phase === 'ready' && !rm) r *= 1 + 0.08 * Math.sin(now / 180);
            ctx.beginPath();
            ctx.arc(hp.x, hp.y, r, 0, TAU);
            if (phase === 'dead') {
                ctx.fillStyle = ACCENT;
            } else if (now - flashAt < FLASH_MS) {
                // A bumper hit's flash.
                ctx.fillStyle = 'rgba(96,165,250,0.8)';
                ctx.shadowColor = ACCENT;
                ctx.shadowBlur = 18 * dpr;
            } else {
                // The Hire ball's glow.
                ctx.fillStyle = ACCENT;
                ctx.shadowColor = 'rgba(59,130,246,0.45)';
                ctx.shadowBlur = 14 * dpr;
            }
            ctx.fill();
            ctx.shadowBlur = 0;

            // Eyes look the way the head is heading.
            var fx = 1, fy = 0;
            if (body.length > 1) { fx = body[0].x - body[1].x; fy = body[0].y - body[1].y; }
            var px = -fy, py = fx;
            var er = Math.max(1.2, cell * 0.07);
            for (var side = -1; side <= 1; side += 2) {
                var ex = hp.x + fx * cell * 0.14 + px * cell * 0.17 * side;
                var ey = hp.y + fy * cell * 0.14 + py * cell * 0.17 * side;
                if (phase === 'dead' && deathKind !== 'clear') {
                    var q = er * 1.6;
                    ctx.beginPath();
                    ctx.moveTo(ex - q, ey - q); ctx.lineTo(ex + q, ey + q);
                    ctx.moveTo(ex + q, ey - q); ctx.lineTo(ex - q, ey + q);
                    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                    ctx.lineWidth = 1.5;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(ex, ey, er, 0, TAU);
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                }
            }
        }

        function drawRings(now) {
            for (var i = rings.length - 1; i >= 0; i--) {
                var rg = rings[i], age = (now - rg.t0) / RING_MS;
                if (age >= 1) { rings.splice(i, 1); continue; }
                var c = center(rg), al = (0.8 * (1 - age)).toFixed(3);
                ctx.beginPath();
                ctx.arc(c.x, c.y, cell * (0.4 + 0.7 * age), 0, TAU);
                ctx.lineWidth = 2;
                if (rg.kind === 'bonus') {
                    ctx.strokeStyle = 'rgba(251,191,36,' + al + ')';
                    ctx.shadowColor = '#f59e0b';
                    ctx.shadowBlur = 26 * dpr;
                } else {
                    ctx.strokeStyle = 'rgba(96,165,250,' + al + ')';
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }

        // Pinball's floating score text, with the eaten section's name above.
        function drawPopups(now) {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (var i = popups.length - 1; i >= 0; i--) {
                var pu = popups[i], age = (now - pu.t0) / POPUP_MS;
                if (age >= 1) { popups.splice(i, 1); continue; }
                var c = center(pu), y = c.y - cell * 0.6 - age * R * 1.2;
                ctx.globalAlpha = 1 - age;
                ctx.fillStyle = pu.color;
                ctx.font = '700 ' + Math.round(R * 0.45) + 'px ' + FONT;
                ctx.fillText(pu.text, c.x, y);
                if (pu.label) {
                    ctx.fillStyle = 'rgba(' + paper + ',0.8)';
                    ctx.font = '700 ' + Math.round(R * 0.28) + 'px ' + FONT;
                    ctx.fillText(pu.label.toUpperCase(), c.x, y - R * 0.5);
                }
            }
            ctx.globalAlpha = 1;
        }

        // Dims the playfield behind the pause or game-over card.
        function drawScrim(now) {
            var al = 0;
            if (phase === 'paused') al = 0.2;
            else if (phase === 'dead' && now - deathAt >= DEATH_PANEL_MS) al = 0.25;
            if (!al) return;
            ctx.fillStyle = 'rgba(' + ink + ',' + al + ')';
            ctx.fillRect(gx, gy, cols * cell, rows * cell);
        }

        // ── HUD ──
        // DOM writes only when a value actually changes.
        function put(el, prop, val) {
            if (el['_' + prop] !== val) { el['_' + prop] = val; el.style[prop] = val; }
        }
        function text(el, val) {
            if (el._text !== val) { el._text = val; el.textContent = val; }
        }
        function coarse() {
            return !!(coarseQuery && coarseQuery.matches);
        }

        function hud() {
            var sc = '', sub = '', subColor = 'rgba(var(--paper-rgb),0.5)';
            if (phase === 'ready') {
                sub = coarse() ? 'swipe to start' : 'arrow keys or WASD to start';
            } else if (phase === 'running' || phase === 'paused') {
                sc = String(score);
                sub = 'BEST ' + Math.max(best, score);
                if (score > bestAtStart && score > 0) subColor = '#fbbf24';
            }
            text($score, sc);
            text($sub, sub);
            put($sub, 'color', subColor);
        }

        // Keyed on the theme too, so a toggle while the card is up recolours it.
        function syncPanel(now) {
            var key = phase + ':' + themeSeen;
            if (phase === 'dead') key += now - deathAt >= DEATH_PANEL_MS ? ':shown' : ':wait';
            if (key === panelKey) return;
            panelKey = key;
            var tap = coarse();
            if (phase === 'paused') {
                text($title, 'PAUSED');
                put($line, 'display', 'none');
                put($best, 'display', 'none');
                text($act, tap ? 'tap to resume' : 'space to resume');
                put($panel, 'display', 'block');
            } else if (phase === 'dead' && now - deathAt >= DEATH_PANEL_MS) {
                text($title, deathKind === 'clear' ? 'BOARD CLEAR' : 'GAME OVER');
                text($line, 'Score: ' + score);
                put($line, 'display', 'block');
                var newBest = score > bestAtStart && score > 0;
                text($best, newBest ? 'NEW BEST' : 'Best: ' + best);
                put($best, 'color', newBest ? amberOnCard : 'rgba(var(--paper-rgb),0.45)');
                put($best, 'fontWeight', newBest ? '700' : '400');
                put($best, 'letterSpacing', newBest ? '0.1em' : '0');
                put($best, 'display', 'block');
                text($act, tap ? 'tap to play again' : 'space to play again');
                put($panel, 'display', 'block');
            } else {
                put($panel, 'display', 'none');
            }
        }

        // ── Lifecycle (driven by stages.js) ──
        // show(): on screen and drawing, but not yet taking input.
        function show() {
            if (shown) return;
            shown = true;
            layer.style.display = 'block';
            if (!hasRound || phase === 'dead') newRound();
            else if (dirty) applyDirty();
            else layout(false);
            panelKey = '';
            render(performance.now());
            last = performance.now();
            if (!raf) raf = requestAnimationFrame(frame);
        }

        // arrive(): fully in view, input on.
        function arrive() {
            live = true;
            window.SNAKE_ACTIVE = true;
            var f = document.activeElement;
            if (f && (f.tagName === 'BUTTON' || f.tagName === 'A') && f.blur) f.blur();
            hud();
        }

        // leave(): input off as the slide away starts. A running round is
        // paused and waits for the player to come back.
        function leave() {
            pause();
            live = false;
            window.SNAKE_ACTIVE = false;
        }

        function hide() {
            shown = false;
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            layer.style.display = 'none';
            layer.style.pointerEvents = '';
        }

        window.SNAKE = {
            layer: layer,
            show: show,
            arrive: arrive,
            leave: leave,
            hide: hide,
            isLive: function () { return live; },
            start: start,
            step: step,
            turn: turn,
            pause: pause,
            resume: resume,
            restart: restart,
            render: render,
            seed: function (fn) { rng = typeof fn === 'function' ? fn : Math.random; },
            state: function () {
                return {
                    phase: phase, live: live, shown: shown, score: score, best: best,
                    len: body.length, dir: dir, eaten: eaten, chain: chain, stepMs: stepMs,
                    head: body[0] ? { x: body[0].x, y: body[0].y } : null,
                    body: body.map(function (c) { return { x: c.x, y: c.y }; }),
                    food: food ? { x: food.x, y: food.y, idx: food.idx } : null,
                    bonus: bonus ? { x: bonus.x, y: bonus.y, left: bonus.left } : null,
                    cols: cols, rows: rows, cell: cell, queue: queue.slice()
                };
            }
        };
    }
})();
