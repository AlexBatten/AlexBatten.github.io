// ── Chess ──
// The stage below snake: a game against the computer at about 500, 800 or
// 1000 Elo. chess-engine.js has the rules and the opponent; this file draws
// the board in the style of the snake board and the pinball table, and
// handles input. stages.js decides when it is shown.

(function () {
    'use strict';

    // ── Config ──
    var THINK_MIN   = 350;    // ms the engine appears to think before moving
    var THINK_RANGE = 450;
    var ANIM_MS     = 170;
    var DRAG_PX     = 4;      // pointer travel that turns a press into a drag
    var OVER_MS     = 700;    // pause on the final position before the result card
    var BOARD_MAX   = 640;
    var BOARD_MIN   = 224;
    var SAVE_KEY    = 'chess-game';
    var PREFS_KEY   = 'chess-prefs';
    var FONT        = '"Roboto Condensed", Arial, sans-serif';
    // Filled chess glyphs for both sides, coloured by fill and outline. The
    // variation selector asks for the text form, so no platform swaps in a
    // colour emoji pawn.
    var PIECE_FONT  = '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", "DejaVu Sans", "Arial Unicode MS", serif';
    var GLYPH       = ['', '♟︎', '♞︎', '♝︎', '♜︎', '♛︎', '♚︎'];
    var ACCENT      = '#3b82f6';
    var TAU         = Math.PI * 2;

    // ── Wait for the engine ──
    var tries = 0;
    (function wait() {
        if (window.ChessEngine) return setup(window.ChessEngine);
        if (++tries < 200) setTimeout(wait, 50);
    })();

    function setup(E) {
        var LEVELS = E.LEVELS;
        var modal = document.getElementById('modal-overlay');
        var hints = document.getElementById('hints-overlay');
        var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

        // ── DOM ──
        // Same stacking as the snake layer: above the playground, below the
        // footer, navs, pinball HUD and overlays.
        var layer = document.createElement('div');
        layer.id = 'chess-layer';
        layer.setAttribute('aria-hidden', 'true');
        layer.style.cssText = 'position:fixed;inset:0;z-index:2;display:none;';

        var canvas = document.createElement('canvas');
        canvas.id = 'chess-canvas';
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;';
        var ctx = canvas.getContext('2d');

        // The buttons need :hover and :disabled, which inline styles can't
        // express, so this stage carries a few scoped rules of its own.
        var style = document.createElement('style');
        style.textContent =
            '#chess-ui .ch-btn{pointer-events:auto;font:600 0.68rem var(--mono);letter-spacing:0.08em;' +
            'text-transform:uppercase;padding:6px 11px;border-radius:14px;cursor:pointer;' +
            'border:1px solid rgba(var(--paper-rgb),0.25);background:rgba(var(--ink-rgb),0.12);' +
            'color:rgba(var(--paper-rgb),0.8);transition:border-color .15s,background-color .15s,color .15s}' +
            '#chess-ui .ch-btn:hover{border-color:#3b82f6}' +
            '#chess-ui .ch-btn.ch-on{background:#3b82f6;border-color:#3b82f6;color:#fff}' +
            '#chess-ui .ch-btn:disabled{opacity:0.4;cursor:default;border-color:rgba(var(--paper-rgb),0.25)}' +
            '#chess-ui .ch-btn:focus-visible{outline:2px solid #3b82f6;outline-offset:2px}' +
            '#chess-ui .ch-group{display:flex;gap:6px}';
        document.head.appendChild(style);

        // Headline and subline sit where pinball's score and lives do; the
        // result card is the snake stage's card.
        var ui = document.createElement('div');
        ui.id = 'chess-ui';
        ui.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
        var btn = function (id, label) { return '<button type="button" class="ch-btn" id="' + id + '">' + label + '</button>'; };
        var levelBtns = '';
        for (var li = 0; li < LEVELS.length; li++) levelBtns += btn('ch-lv' + li, LEVELS[li].label + ' ' + LEVELS[li].elo);
        ui.innerHTML =
            '<div id="ch-head" style="position:absolute;top:28px;left:50%;transform:translateX(-50%);' +
            'font:700 2rem var(--mono);color:#3b82f6;text-shadow:0 0 20px rgba(59,130,246,0.3);white-space:nowrap"></div>' +
            '<div id="ch-sub" style="position:absolute;top:68px;left:50%;transform:translateX(-50%);' +
            'font:0.85rem var(--mono);color:rgba(var(--paper-rgb),0.5);white-space:pre"></div>' +
            '<div id="ch-controls" style="position:absolute;display:flex;flex-wrap:wrap;justify-content:center;' +
            'align-items:center;gap:8px 16px;pointer-events:none">' +
            '<div class="ch-group">' + levelBtns + '</div>' +
            '<div class="ch-group">' + btn('ch-white', 'White') + btn('ch-black', 'Black') + '</div>' +
            '<div class="ch-group">' + btn('ch-undo', 'Undo') + btn('ch-new', 'New game') + '</div>' +
            '</div>' +
            '<div id="ch-panel" style="display:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
            'text-align:center;font-family:var(--mono);white-space:nowrap;padding:22px 32px;pointer-events:auto;' +
            'background:var(--card);border:1px solid var(--card-edge);border-radius:var(--radius);' +
            'box-shadow:0 12px 32px rgba(0,0,0,0.25)">' +
            '<div id="ch-title" style="font:700 1.6rem var(--mono);color:var(--accent-on-card);letter-spacing:0.04em"></div>' +
            '<div id="ch-line" style="font:1rem var(--mono);color:rgba(var(--paper-rgb),0.7);margin-top:8px"></div>' +
            '<div style="margin-top:16px">' + btn('ch-again', 'Play again') + '</div>' +
            '<div style="font:0.72rem var(--mono);color:rgba(var(--paper-rgb),0.3);margin-top:12px">scroll up for snake</div>' +
            '</div>';

        layer.appendChild(canvas);
        layer.appendChild(ui);
        document.body.appendChild(layer);

        var $head = ui.querySelector('#ch-head');
        var $sub = ui.querySelector('#ch-sub');
        var $controls = ui.querySelector('#ch-controls');
        var $panel = ui.querySelector('#ch-panel');
        var $title = ui.querySelector('#ch-title');
        var $line = ui.querySelector('#ch-line');
        var $white = ui.querySelector('#ch-white');
        var $black = ui.querySelector('#ch-black');
        var $undo = ui.querySelector('#ch-undo');
        var $levels = [];
        for (li = 0; li < LEVELS.length; li++) $levels.push(ui.querySelector('#ch-lv' + li));

        // ── Theme ──
        var root = document.documentElement;
        var themeSeen, ink, paper;
        function readTheme() {
            var theme = root.getAttribute('data-theme');
            if (theme === themeSeen) return;
            themeSeen = theme;
            var cs = getComputedStyle(root);
            ink = cs.getPropertyValue('--ink-rgb').trim() || '0, 0, 0';
            paper = cs.getPropertyValue('--paper-rgb').trim() || '255, 255, 255';
        }

        // The board is only drawn on demand, so a theme switch has to ask for
        // a frame itself. The other stages redraw every frame and need not.
        if (window.MutationObserver) {
            new MutationObserver(function () { request(); })
                .observe(root, { attributes: true, attributeFilter: ['data-theme'] });
        }

        function reduced() {
            return !!(motionQuery && motionQuery.matches);
        }

        // ── Saved state ──
        // Storage can throw outright (blocked cookies, some private modes); the
        // game then lasts as long as the page.
        function load(key) {
            try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
        }
        function save(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
        }

        var prefs = load(PREFS_KEY) || {};
        var level = prefs.level >= 0 && prefs.level < LEVELS.length ? prefs.level : 1;
        var playerColor = prefs.side === 'b' ? E.BLACK : E.WHITE;
        var game = new E.Game();

        // A saved game is replayed move by move, so anything that no longer
        // replays as legal is dropped rather than trusted.
        (function restore() {
            var saved = load(SAVE_KEY);
            if (!saved || !saved.moves) return;
            var g;
            try { g = new E.Game(saved.start || undefined); } catch (e) { return; }
            for (var i = 0; i < saved.moves.length; i++) if (!g.play(saved.moves[i])) break;
            game = g;
            playerColor = saved.side === 'b' ? E.BLACK : E.WHITE;
        })();

        function saveGame() {
            save(SAVE_KEY, {
                start: game.start === E.START ? undefined : game.start,
                side: playerColor === E.BLACK ? 'b' : 'w',
                moves: game.history.map(function (h) { return h.move; })
            });
        }

        function savePrefs() {
            save(PREFS_KEY, { level: level, side: playerColor === E.BLACK ? 'b' : 'w' });
        }

        // ── State ──
        var live = false, shown = false, raf = null, dirty = true;
        var selected = -1, targets = [];          // the picked square and its legal moves
        var drag = null;                          // { sq, x, y, x0, y0, active, wasSelected }
        var promo = null;                         // { from, to, moves } while picking a piece
        var anim = null;                          // { move, piece, t0 }
        var thinkTimer = null, thinking = false, aiPending = false;
        var overAt = 0, overTimer = null, cardDismissed = false;
        var status = game.status();
        var rng = Math.random;

        // ── Layout ──
        // The board is as large as fits (up to BOARD_MAX) between the header
        // band and the control row, on the same ink panel as the other stages.
        var W = 0, H = 0, dpr = 1, sq = 40, bx = 0, by = 0, panel = { L: 0, top: 0, w: 0, h: 0 };

        function size() {
            var w = document.documentElement.clientWidth || window.innerWidth;
            var h = document.documentElement.clientHeight || window.innerHeight;
            if (!w || !h) { w = 1280; h = 800; }
            return { W: w, H: h };
        }

        function layout() {
            dirty = false;
            var s = size();
            W = s.W; H = s.H;
            var pad = 12, gap = 12;
            var top = H * 0.07, bottom = H * 0.93;
            var gridTop = Math.max(top + 40, 100);
            // The control row takes the width it needs for one line where the
            // screen allows, and at least the board's width, so a board shrunk
            // by a short window doesn't squeeze the row into a tall stack that
            // runs off the bottom. Its height in turn decides how big the
            // board can be, so the two are settled together. A few rounds
            // always converge: a taller row only ever shrinks the board.
            var availW = W - 48 - 2 * pad, maxRow = W - 48;
            $controls.style.width = 'max-content';
            // offsetWidth rounds down, and a row a fraction too narrow wraps.
            var oneLine = ($controls.offsetWidth || 560) + 2;
            var board = Math.max(BOARD_MIN, Math.floor(Math.min(availW, BOARD_MAX) / 8) * 8);
            var ctrlW = 0, ctrlH = 40;
            for (var round = 0; round < 3; round++) {
                ctrlW = Math.min(maxRow, Math.max(board + 2 * pad, oneLine));
                $controls.style.width = ctrlW + 'px';
                ctrlH = $controls.offsetHeight || 40;
                var availH = bottom - gridTop - gap - ctrlH - pad;
                var next = Math.max(BOARD_MIN, Math.floor(Math.min(availW, availH, BOARD_MAX) / 8) * 8);
                if (next === board) break;
                board = next;
            }
            sq = board / 8;
            bx = Math.round((W - board) / 2);
            by = Math.round(gridTop);
            var pw = Math.max(board + 2 * pad, ctrlW);
            panel = { L: Math.round((W - pw) / 2), top: top, w: pw, h: by + board + gap + ctrlH + pad - top };
            $controls.style.left = Math.round((W - ctrlW) / 2) + 'px';
            $controls.style.top = (by + board + gap) + 'px';
            $panel.style.top = Math.round(by + board / 2) + 'px';

            dpr = Math.min(2, window.devicePixelRatio || 1);
            var bw = Math.round(W * dpr), bh = Math.round(H * dpr);
            if (canvas.width !== bw) canvas.width = bw;
            if (canvas.height !== bh) canvas.height = bh;
            glyphCache = {};
        }

        window.addEventListener('resize', function () {
            dirty = true;
            if (shown) request();
        });

        // Board square (0x88) <-> top-left corner on screen. The player's side
        // is always at the bottom.
        function flipped() { return playerColor === E.BLACK; }
        function squareXY(s) {
            var f = s & 7, r = s >> 4;
            var col = flipped() ? 7 - f : f, row = flipped() ? r : 7 - r;
            return { x: bx + col * sq, y: by + row * sq };
        }
        function squareAt(x, y) {
            var col = Math.floor((x - bx) / sq), row = Math.floor((y - by) / sq);
            if (col < 0 || col > 7 || row < 0 || row > 7) return -1;
            var f = flipped() ? 7 - col : col, r = flipped() ? row : 7 - row;
            return r * 16 + f;
        }

        // ── Game flow ──
        function playerTurn() { return game.pos.turn === playerColor; }

        function canMove() {
            return live && playerTurn() && !status.over && !thinking && !promo;
        }

        function select(s) {
            selected = s;
            targets = game.legal().filter(function (m) { return E.from(m) === s; });
        }

        function deselect() {
            selected = -1;
            targets = [];
        }

        function movesTo(s) {
            return targets.filter(function (m) { return E.to(m) === s; });
        }

        // A move to the last rank has four versions, one per promotion piece,
        // and waits for the player to pick.
        function tryMove(to) {
            var ms = movesTo(to);
            if (!ms.length) return false;
            if (ms.length > 1) { promo = { from: selected, to: to, moves: ms }; request(); return true; }
            commit(ms[0]);
            return true;
        }

        function commit(m) {
            var piece = game.pos.board[E.from(m)];
            var capture = !!(E.flags(m) & E.F_CAPTURE);
            if (!game.play(m)) return;
            deselect();
            promo = null;
            anim = reduced() ? null : { move: m, piece: E.promo(m) ? (piece & 24) | E.promo(m) : piece, t0: performance.now() };
            sound(capture ? 7 : 4);
            saveGame();
            refresh();
            if (!status.over && !playerTurn()) scheduleEngine();
        }

        function scheduleEngine() {
            if (thinkTimer) return;
            if (!live) { aiPending = true; return; }
            aiPending = false;
            thinking = true;
            hud();
            thinkTimer = setTimeout(function () {
                thinkTimer = null;
                thinking = false;
                if (status.over || playerTurn()) { hud(); return; }
                var m = E.chooseMove(game.pos, level, rng);
                if (m) commit(m);
                else hud();
            }, THINK_MIN + rng() * THINK_RANGE);
        }

        function cancelEngine() {
            if (thinkTimer) { clearTimeout(thinkTimer); thinkTimer = null; }
            thinking = false;
            aiPending = false;
        }

        // Takes back to the player's turn, removing at least one of the
        // player's own moves (and the engine's reply to it).
        function undo() {
            if (!canUndo()) return;
            cancelEngine();
            var undoneOwn = false;
            while (game.history.length) {
                var lastWasPlayers = game.pos.turn !== playerColor;
                game.undo();
                if (lastWasPlayers) undoneOwn = true;
                if (undoneOwn && playerTurn()) break;
            }
            deselect();
            promo = null;
            anim = null;
            saveGame();
            refresh();
            if (!status.over && !playerTurn()) scheduleEngine();
        }

        function playerMoveCount() {
            var n = game.history.length;
            return playerColor === E.WHITE ? Math.ceil(n / 2) : Math.floor(n / 2);
        }

        function canUndo() { return playerMoveCount() > 0; }

        function newGame(color) {
            // The lit side button shows the side being played; pressing it
            // again mid-game doesn't throw the game away. New game does.
            if (color && color === playerColor && game.history.length && !status.over) return;
            cancelEngine();
            if (color) playerColor = color;
            game = new E.Game();
            deselect();
            promo = null;
            anim = null;
            savePrefs();
            saveGame();
            refresh();
            if (!playerTurn()) scheduleEngine();
        }

        function setLevel(i) {
            if (i < 0 || i >= LEVELS.length) return;
            level = i;
            savePrefs();
            hud();
        }

        // Status changes only when a move is made or taken back.
        function refresh() {
            var wasOver = status.over;
            status = game.status();
            if (status.over && !wasOver) {
                overAt = performance.now();
                cardDismissed = false;
                clearTimeout(overTimer);
                overTimer = setTimeout(function () { hud(); request(); }, OVER_MS + 20);
            }
            hud();
            request();
        }

        function sound(v) {
            var PG = window.PLAYGROUND;
            if (live && PG && PG.playBounce) PG.playBounce(v);
        }

        // ── HUD ──
        function text(el, val) {
            if (el._text !== val) { el._text = val; el.textContent = val; }
        }

        function hud() {
            var L = LEVELS[level], head, last = game.history[game.history.length - 1];
            if (status.over) {
                var won = status.reason === 'checkmate' && (status.result === '1-0') === (playerColor === E.WHITE);
                head = status.reason === 'checkmate' ? (won ? 'YOU WIN' : 'CHECKMATE') : 'DRAW';
            } else if (!playerTurn()) {
                head = 'THINKING';
            } else {
                head = status.check ? 'CHECK' : 'YOUR MOVE';
            }
            text($head, head);
            var sub = 'vs ' + L.label + ' ~' + L.elo;
            if (last) sub += '   ' + (game.history.length % 2 === (playerColor === E.WHITE ? 1 : 0) ? 'you ' : 'engine ') + last.san;
            text($sub, sub);

            for (var i = 0; i < $levels.length; i++) $levels[i].classList.toggle('ch-on', i === level);
            $white.classList.toggle('ch-on', playerColor === E.WHITE);
            $black.classList.toggle('ch-on', playerColor === E.BLACK);
            $undo.disabled = !canUndo();

            var showCard = status.over && !cardDismissed && performance.now() - overAt >= OVER_MS;
            if (showCard) {
                var mate = status.reason === 'checkmate';
                var playerWon = mate && (status.result === '1-0') === (playerColor === E.WHITE);
                text($title, mate ? 'CHECKMATE' : status.reason === 'stalemate' ? 'STALEMATE' : 'DRAW');
                text($line, mate ? (playerWon ? 'You win' : 'The engine wins') :
                    status.reason === 'stalemate' ? 'No legal moves, a draw' :
                    status.reason === 'repetition' ? 'By threefold repetition' :
                    status.reason === 'fifty-move rule' ? 'By the fifty-move rule' : 'Not enough material to mate');
            }
            $panel.style.display = showCard ? 'block' : 'none';
        }

        // ── Input ──
        function point(e) {
            var r = canvas.getBoundingClientRect();
            return { x: e.clientX - r.left, y: e.clientY - r.top };
        }

        // The promotion picker: four squares down the target file from the
        // promotion square, queen first.
        var PROMO_ORDER = [E.QUEEN, E.KNIGHT, E.ROOK, E.BISHOP];
        function promoBoxes() {
            var c = squareXY(promo.to), out = [];
            for (var i = 0; i < 4; i++) out.push({ type: PROMO_ORDER[i], x: c.x, y: c.y + i * sq });
            return out;
        }

        canvas.addEventListener('pointerdown', function (e) {
            if (!live || e.button !== 0) return;
            var p = point(e);
            e.preventDefault();
            if (promo) {
                var boxes = promoBoxes(), chosen = null;
                for (var i = 0; i < boxes.length; i++) {
                    if (p.x >= boxes[i].x && p.x < boxes[i].x + sq && p.y >= boxes[i].y && p.y < boxes[i].y + sq) chosen = boxes[i].type;
                }
                var pick = chosen && promo.moves.filter(function (m) { return E.promo(m) === chosen; })[0];
                promo = null;
                if (pick) commit(pick);
                else request();
                return;
            }
            if ($panel.style.display === 'block') {
                // A click on the final position puts the card away to study it.
                cardDismissed = true;
                hud();
                return;
            }
            if (!canMove()) return;
            var s = squareAt(p.x, p.y);
            if (s < 0) { deselect(); request(); return; }
            if (selected >= 0 && s !== selected && tryMove(s)) return;
            var piece = game.pos.board[s];
            if (piece && (piece & playerColor)) {
                var wasSelected = selected === s;
                select(s);
                drag = { sq: s, x0: p.x, y0: p.y, x: p.x, y: p.y, active: false, wasSelected: wasSelected };
                try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
            } else {
                deselect();
            }
            request();
        });

        var hoverSq = -1;
        canvas.addEventListener('pointermove', function (e) {
            if (!live) return;
            var p = point(e);
            var s = squareAt(p.x, p.y);
            var cursor = 'default';
            if (canMove() && s >= 0) {
                var piece = game.pos.board[s];
                if ((piece && (piece & playerColor)) || movesTo(s).length) cursor = 'pointer';
            }
            if (drag) {
                drag.x = p.x; drag.y = p.y;
                if (!drag.active && Math.hypot(p.x - drag.x0, p.y - drag.y0) > DRAG_PX) drag.active = true;
                if (drag.active) cursor = 'grabbing';
                request();
            }
            if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
            if (s !== hoverSq) { hoverSq = s; if (selected >= 0) request(); }
        });

        function endDrag(e, cancelled) {
            if (!drag) return;
            var d = drag;
            drag = null;
            if (!cancelled && live) {
                var p = point(e), s = squareAt(p.x, p.y);
                if (d.active) {
                    // A dropped piece is already where it lands, so it doesn't
                    // slide there again from its start square.
                    if (s >= 0 && s !== d.sq && canMove() && tryMove(s)) anim = null;
                } else if (d.wasSelected) {
                    deselect();
                }
            }
            request();
        }
        canvas.addEventListener('pointerup', function (e) { endDrag(e, false); });
        canvas.addEventListener('pointercancel', function (e) { endDrag(e, true); });
        canvas.addEventListener('pointerleave', function () {
            if (hoverSq !== -1) { hoverSq = -1; request(); }
        });

        window.addEventListener('keydown', function (e) {
            if (!live || e.key !== 'Escape') return;
            if (promo) promo = null;
            else deselect();
            request();
        });

        for (li = 0; li < $levels.length; li++) {
            $levels[li].addEventListener('click', (function (i) { return function () { setLevel(i); }; })(li));
        }
        $white.addEventListener('click', function () { newGame(E.WHITE); });
        $black.addEventListener('click', function () { newGame(E.BLACK); });
        $undo.addEventListener('click', undo);
        ui.querySelector('#ch-new').addEventListener('click', function () { newGame(); });
        ui.querySelector('#ch-again').addEventListener('click', function () { newGame(); });

        // ── Render ──
        // Drawn on demand: the board is still between moves, so frames are
        // only requested while something moves (a slide-in, a drag, a move
        // animation).
        function request() {
            if (shown && !raf) raf = requestAnimationFrame(render);
        }

        var glyphCache = {};
        // Vertical offset that centres a glyph's ink on its square. Fonts put
        // chess symbols on different baselines, so it is measured, not assumed.
        function glyphDy(g, px) {
            var k = g + px;
            if (glyphCache[k] === undefined) {
                var m = ctx.measureText(g);
                var asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
                glyphCache[k] = asc || desc ? (asc - desc) / 2 : px * 0.35;
            }
            return glyphCache[k];
        }

        function drawPiece(p, cx, cy, scale) {
            var type = p & 7, white = !!(p & E.WHITE), g = GLYPH[type];
            var px = Math.round(sq * 0.84 * (scale || 1));
            ctx.font = px + 'px ' + PIECE_FONT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            var y = cy + glyphDy(g, px);
            ctx.lineJoin = 'round';
            ctx.lineWidth = Math.max(1.2, sq * 0.035);
            ctx.strokeStyle = white ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.3)';
            ctx.shadowColor = 'rgba(0,0,0,0.28)';
            ctx.shadowBlur = 4 * dpr;
            ctx.shadowOffsetY = 1 * dpr;
            ctx.strokeText(g, cx, y);
            ctx.shadowColor = 'transparent';
            ctx.fillStyle = white ? '#f5f5f5' : '#1f1f1f';
            ctx.fillText(g, cx, y);
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
        }

        function fillSquare(s, color) {
            var c = squareXY(s);
            ctx.fillStyle = color;
            ctx.fillRect(c.x, c.y, sq, sq);
        }

        function render() {
            raf = null;
            if (!shown) return;
            if (dirty) layout();
            readTheme();
            var now = performance.now();
            var b = game.pos.board, i, s, c;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // Pinball's table: ink fill, paper edge, sharp corners.
            ctx.fillStyle = 'rgba(' + ink + ',0.3)';
            ctx.fillRect(panel.L, panel.top, panel.w, panel.h);
            ctx.strokeStyle = 'rgba(' + paper + ',0.08)';
            ctx.lineWidth = 2;
            ctx.strokeRect(panel.L, panel.top, panel.w, panel.h);

            // Squares lighten and darken the panel the same way in both
            // themes, so the light squares stay the lighter ones.
            for (var r = 0; r < 8; r++) {
                for (var f = 0; f < 8; f++) {
                    fillSquare(r * 16 + f, (r + f) & 1 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.16)');
                }
            }
            ctx.strokeStyle = 'rgba(' + paper + ',0.16)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx, by, sq * 8, sq * 8);

            var last = game.history[game.history.length - 1];
            if (last) {
                fillSquare(E.from(last.move), 'rgba(251,191,36,0.28)');
                fillSquare(E.to(last.move), 'rgba(251,191,36,0.28)');
            }
            if (selected >= 0) fillSquare(selected, 'rgba(59,130,246,0.38)');
            if (drag && drag.active && hoverSq >= 0 && movesTo(hoverSq).length) fillSquare(hoverSq, 'rgba(59,130,246,0.22)');

            // The checked king glows red.
            if (status.check) {
                var kc = squareXY(game.pos.kings[game.pos.turn >> 4]);
                var gx = kc.x + sq / 2, gy = kc.y + sq / 2;
                var grad = ctx.createRadialGradient(gx, gy, sq * 0.1, gx, gy, sq * 0.62);
                grad.addColorStop(0, 'rgba(248,113,113,0.85)');
                grad.addColorStop(1, 'rgba(248,113,113,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(kc.x, kc.y, sq, sq);
            }

            // Coordinates in the corners of the edge squares, in ink so they
            // read on both square shades in either theme.
            ctx.fillStyle = 'rgba(' + ink + ',0.42)';
            ctx.font = '600 ' + Math.max(9, Math.round(sq * 0.18)) + 'px ' + FONT;
            for (i = 0; i < 8; i++) {
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                ctx.fillText('abcdefgh'.charAt(flipped() ? 7 - i : i), bx + (i + 1) * sq - sq * 0.07, by + 8 * sq - sq * 0.04);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(String(flipped() ? i + 1 : 8 - i), bx + sq * 0.07, by + i * sq + sq * 0.05);
            }

            // Pieces, leaving out the one being dragged and the one in flight.
            var animT = 1, animTo = -1;
            if (anim) {
                animT = Math.min(1, (now - anim.t0) / ANIM_MS);
                if (animT >= 1) anim = null;
                else animTo = E.to(anim.move);
            }
            for (s = 0; s < 120; s++) {
                if (s & 0x88) { s += 7; continue; }
                if (!b[s] || s === animTo || (drag && drag.active && s === drag.sq)) continue;
                c = squareXY(s);
                drawPiece(b[s], c.x + sq / 2, c.y + sq / 2);
            }

            // Legal moves: a dot on an empty square, a ring round a capture.
            for (i = 0; i < targets.length; i++) {
                var t = E.to(targets[i]);
                if (E.promo(targets[i]) && E.promo(targets[i]) !== E.QUEEN) continue;
                c = squareXY(t);
                ctx.beginPath();
                if (b[t] || (E.flags(targets[i]) & E.F_EP)) {
                    ctx.arc(c.x + sq / 2, c.y + sq / 2, sq * 0.44, 0, TAU);
                    ctx.strokeStyle = 'rgba(59,130,246,0.7)';
                    ctx.lineWidth = sq * 0.07;
                    ctx.stroke();
                } else {
                    ctx.arc(c.x + sq / 2, c.y + sq / 2, sq * 0.15, 0, TAU);
                    ctx.fillStyle = 'rgba(59,130,246,0.6)';
                    ctx.fill();
                }
            }

            if (anim) {
                var e3 = 1 - Math.pow(1 - animT, 3);
                var a0 = squareXY(E.from(anim.move)), a1 = squareXY(E.to(anim.move));
                drawPiece(anim.piece, a0.x + (a1.x - a0.x) * e3 + sq / 2, a0.y + (a1.y - a0.y) * e3 + sq / 2);
            }

            if (drag && drag.active && b[drag.sq]) drawPiece(b[drag.sq], drag.x, drag.y, 1.12);

            if (promo) {
                var boxes = promoBoxes();
                ctx.fillStyle = 'rgba(0,0,0,0.25)';
                ctx.fillRect(bx, by, sq * 8, sq * 8);
                for (i = 0; i < boxes.length; i++) {
                    ctx.fillStyle = i ? 'rgba(245,245,245,0.92)' : '#ffffff';
                    ctx.fillRect(boxes[i].x, boxes[i].y, sq, sq);
                    ctx.strokeStyle = ACCENT;
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(boxes[i].x + 0.75, boxes[i].y + 0.75, sq - 1.5, sq - 1.5);
                    drawPiece(playerColor | boxes[i].type, boxes[i].x + sq / 2, boxes[i].y + sq / 2, 0.9);
                }
            }

            if (anim || (drag && drag.active)) request();
        }

        // ── Lifecycle (driven by stages.js) ──
        function show() {
            if (shown) return;
            shown = true;
            layer.style.display = 'block';
            dirty = true;
            refresh();
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            render();
        }

        function arrive() {
            live = true;
            window.CHESS_ACTIVE = true;
            if ((aiPending || !playerTurn()) && !status.over) scheduleEngine();
        }

        // The engine finishes a move it is thinking about; a pick or drag in
        // progress is dropped.
        function leave() {
            live = false;
            window.CHESS_ACTIVE = false;
            drag = null;
            promo = null;
            canvas.style.cursor = 'default';
        }

        function hide() {
            shown = false;
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            layer.style.display = 'none';
            layer.style.pointerEvents = '';
        }

        hud();

        window.CHESS = {
            layer: layer,
            show: show,
            arrive: arrive,
            leave: leave,
            hide: hide,
            render: render,
            isLive: function () { return live; },
            newGame: newGame,
            undo: undo,
            setLevel: setLevel,
            seed: function (fn) { rng = typeof fn === 'function' ? fn : Math.random; },
            // Plays a move for the player from square names, e.g. ('e2', 'e4')
            // or ('e7', 'e8', 'q'). Returns false if it isn't legal now.
            move: function (from, to, promoChar) {
                if (!canMove()) return false;
                var f = E.sqFromName(from), t = E.sqFromName(to);
                var pt = { q: E.QUEEN, r: E.ROOK, b: E.BISHOP, n: E.KNIGHT }[promoChar || 'q'];
                var m = game.legal().filter(function (x) {
                    return E.from(x) === f && E.to(x) === t && (!E.promo(x) || E.promo(x) === pt);
                })[0];
                if (!m) return false;
                commit(m);
                return true;
            },
            // Sets up a position from FEN, for testing from devtools.
            load: function (fen) {
                var g;
                try { g = new E.Game(fen); } catch (e) { return false; }
                cancelEngine();
                game = g;
                deselect();
                promo = null;
                anim = null;
                saveGame();
                refresh();
                if (!status.over && !playerTurn()) scheduleEngine();
                return true;
            },
            // Makes the engine move now instead of after its thinking pause.
            think: function () {
                if (!thinkTimer) return false;
                clearTimeout(thinkTimer);
                thinkTimer = null;
                thinking = false;
                var m = E.chooseMove(game.pos, level, rng);
                if (m) commit(m);
                return !!m;
            },
            state: function () {
                return {
                    fen: game.pos.fen(), turn: game.pos.turn === E.WHITE ? 'w' : 'b',
                    player: playerColor === E.WHITE ? 'w' : 'b', level: level,
                    moves: game.history.map(function (h) { return h.san; }),
                    status: status, thinking: thinking, live: live, shown: shown,
                    selected: selected >= 0 ? E.sqName(selected) : null,
                    board: { x: bx, y: by, sq: sq }
                };
            }
        };
    }
})();
