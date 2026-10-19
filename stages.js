// ── Stages ──
// The page never scrolls. A wheel gesture moves between stacked stages
// instead: 0 playground, 1 pinball, 2 snake, 3 chess. One gesture moves one
// stage at most, so a long trackpad flick stops at pinball rather than
// carrying on into snake, and the momentum tail of a step can't trigger a
// second one.
//
// Below pinball, each step slides the stages like a page snapping to a
// section. A stage that slides away is parked, so scrolling back resumes the
// same game.

(function () {
    'use strict';

    // ── Thresholds (px of normalised wheel travel) ──
    var ENTER_PX      = 400;  // 0 -> 1
    var EXIT_PX       = 350;  // 1 -> 0, which ends the pinball run
    var STEP_PX       = 200;  // between neighbouring game stages, which keeps both games
    var EDGE_PX       = 140;  // a push past either end only arms the lock

    // ── Wheel normalisation ──
    var LINE_PX       = 40;   // one line, for deltaMode 1 (Firefox mice)
    var MAX_EVENT_PX  = 240;  // so one accelerated notch can't cross a threshold alone
    var NOTCH_MIN_PX  = 100;  // weight of a detected mouse notch
    var SPARSE_MS     = 50;   // an event this long after the previous one is isolated
    var SPARSE_MIN_PX = 25;   // floor for isolated events from tiny-delta mice
    var SIDEWAYS      = 1.5;  // mostly-horizontal wheels (back swipes) are ignored

    // ── Gesture timing (ms) ──
    var ACC_IDLE_MS   = 800;  // a half-made push is forgotten after this much silence
    var QUIET_MS      = 260;  // silence that ends a gesture
    var TAIL_MS       = 600;  // a trackpad momentum stream can stall this long and resume
    var TAIL_RUN      = 10;   // dense events before a stall for it to count as momentum
    var DWELL_MS      = 700;  // minimum time on a stage before the same direction moves on
    var RISE_EVENTS   = 3;    // rising events in a row that mark a new flick inside momentum

    // ── Transitions (ms) ──
    var SLIDE_MS      = 560;
    var FADE_MS       = 200;  // reduced motion crossfade
    var ENTER_BUSY_MS = 450;  // 0 -> 1, while the balls are scooped in
    var EXIT_BUSY_MS  = 250;  // 1 -> 0
    var EASE          = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

    // ── Wait for both games ──
    // If the Matter CDN failed, pinball never appears and the page stays as
    // a plain playground, so give up quietly after ten seconds.
    var tries = 0;
    (function wait() {
        if (window.PINBALL && window.SNAKE) return setup();
        if (++tries < 200) setTimeout(wait, 50);
    })();

    function setup() {
        var PINBALL = window.PINBALL, SNAKE = window.SNAKE, CHESS = window.CHESS;
        var pg = document.getElementById('playground');
        var pbUi = PINBALL.ui;

        // ── Stage table ──
        // Every stage below the playground, in order. Each one parks itself
        // (leave), comes back (show), takes input (arrive) and goes off screen
        // (hide). Pinball is parked rather than ended, so its game survives a
        // visit to the stages below it. Chess is only added if its scripts
        // loaded, so a failure there can't take the other games down.
        var STAGE_LIST = [null, {
            els: [pg, pbUi],
            leave: PINBALL.suspend,
            show: function () { pg.style.visibility = ''; pbUi.style.visibility = ''; PINBALL.paint(); },
            arrive: PINBALL.resume,
            hide: function () { pg.style.visibility = 'hidden'; pbUi.style.visibility = 'hidden'; }
        }, {
            els: [SNAKE.layer], leave: SNAKE.leave, show: SNAKE.show, arrive: SNAKE.arrive, hide: SNAKE.hide
        }];
        if (CHESS) {
            STAGE_LIST.push({ els: [CHESS.layer], leave: CHESS.leave, show: CHESS.show, arrive: CHESS.arrive, hide: CHESS.hide });
        }
        var LAST = STAGE_LIST.length - 1;
        var modal = document.getElementById('modal-overlay');
        var hints = document.getElementById('hints-overlay');
        var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

        // State
        var level = 0, busy = false, busyTimer = null, stepAt = -Infinity;
        var acc = 0, accDir = 0, revAcc = 0, lastT = -Infinity, lastRaw = 0;
        var lockDir = 0;      // 0 unlocked, else the direction of the last step
        var minRaw = Infinity, rise = 0;  // smallest delta since the lock, and the rising run
        var run = 0;          // consecutive events less than SPARSE_MS apart
        var fresh = true;     // the current wheel stream began after a quiet gap
        var mute = false;     // ignore the stream until it goes quiet (overlay closed mid-gesture)
        var queued = 0;       // one step requested while a transition was running
        var goal = null;      // target level from go()
        var bumpSeq = 0;
        window.GAME_LEVEL = 0;

        // ── Pager ──
        // A dot per stage on the right edge, shown only once a game is in
        // view, so the portfolio itself never gives the secret away.
        var pager = document.createElement('div');
        pager.id = 'stage-pager';
        pager.setAttribute('aria-hidden', 'true');
        pager.style.cssText = 'position:fixed;right:16px;top:50%;transform:translateY(-50%);z-index:10;' +
            'display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;' +
            'opacity:0;transition:opacity 300ms;';
        var dots = [];
        for (var i = 0; i <= LAST; i++) {
            var d = document.createElement('div');
            d.style.cssText = 'width:6px;height:6px;border-radius:3px;background:rgba(var(--ink-rgb),0.22);' +
                'transition:height 300ms,background-color 300ms;';
            pager.appendChild(d);
            dots.push(d);
        }
        document.body.appendChild(pager);

        function setPager() {
            var rm = reduced();
            pager.style.right = (window.innerWidth && window.innerWidth <= 600) ? '8px' : '16px';
            pager.style.transition = rm ? 'none' : 'opacity 300ms';
            pager.style.opacity = level >= 1 ? '1' : '0';
            for (var i = 0; i < dots.length; i++) {
                var on = i === level;
                dots[i].style.transition = rm ? 'none' : 'height 300ms,background-color 300ms';
                dots[i].style.height = on ? '18px' : '6px';
                dots[i].style.background = on ? '#3b82f6' : 'rgba(var(--ink-rgb),0.22)';
            }
        }

        function reduced() {
            return !!(motionQuery && motionQuery.matches);
        }

        // Anything that owns the wheel for itself: the content modal, the hints
        // panel, and tawk's chat window once it is open.
        function blocked() {
            if (modal && modal.classList.contains('active')) return true;
            if (hints && hints.classList.contains('active')) return true;
            try {
                if (window.Tawk_API && typeof window.Tawk_API.isChatMaximized === 'function' &&
                    window.Tawk_API.isChatMaximized()) return true;
            } catch (e) {}
            return false;
        }

        // ── Wheel ──
        function onWheel(e) {
            // deltaY before deltaMode: Firefox reports pixels unless deltaMode
            // is read first, and either way the result is normalised below.
            var rawY = e.deltaY, rawX = e.deltaX, mode = e.deltaMode;
            var t = (e.timeStamp > 0 && e.timeStamp < 1e12) ? e.timeStamp : performance.now();
            // A trackpad pinch arrives as ctrl+wheel. Neither it nor a wheel
            // spent on an overlay may finish a push begun before it.
            if (e.ctrlKey || e.metaKey) { forget(); lastT = t; return; }
            if (blocked()) { forget(); mute = true; lastT = t; return; }
            var k = mode === 1 ? LINE_PX : mode === 2 ? (window.innerHeight || 800) : 1;
            var dy = rawY * k, dx = rawX * k;
            if (Math.abs(dx) > Math.abs(dy) * SIDEWAYS) dy = 0;
            feed(dy, t, isNotch(e, rawY, mode));
        }

        // A mouse notch, as opposed to a trackpad. Chrome and Safari report a
        // trackpad's wheelDeltaY as -3 * deltaY, so a multiple of 120 that
        // equals that is not a notch.
        function isNotch(e, rawY, mode) {
            if (mode === 1) return true;
            var w = e.wheelDeltaY;
            return typeof w === 'number' && w !== 0 && w % 120 === 0 &&
                Math.abs(Math.abs(w) - 3 * Math.abs(rawY)) > 1;
        }

        // One wheel event, already in px. Exposed so the lock can be tested
        // with fabricated timestamps.
        function feed(dy, t, notch) {
            var gap = t - lastT;
            lastT = t;
            var raw = Math.abs(dy), dir = dy > 0 ? 1 : -1;

            if (gap > QUIET_MS) {
                // A trackpad momentum stream picking up again after a stall:
                // same direction, no stronger than where it stopped, and only
                // after a long dense run, which is what momentum looks like.
                // Notches and spaced clicks of a smooth wheel never qualify.
                var tail = lockDir !== 0 && !notch && gap < TAIL_MS && raw > 0 &&
                    dir === lockDir && raw <= lastRaw && run >= TAIL_RUN;
                mute = false;
                revAcc = 0;
                fresh = !tail;
            }
            run = gap < SPARSE_MS ? run + 1 : 0;
            if (gap > ACC_IDLE_MS) { acc = 0; accDir = 0; }
            if (raw) lastRaw = raw;
            if (mute || !raw) return;

            var mag = raw;
            if (notch) mag = Math.max(mag, NOTCH_MIN_PX);
            else if (gap >= SPARSE_MS) mag = Math.max(mag, SPARSE_MIN_PX);
            mag = Math.min(mag, MAX_EVENT_PX);

            // Momentum only ever decays, so a run of deltas well above the
            // smallest one since the step is a new flick made while the old
            // momentum was still streaming, with no quiet gap between them.
            if (lockDir && dir === lockDir && !notch) {
                if (raw < minRaw) minRaw = raw;
                if (!fresh && !busy && t - stepAt >= DWELL_MS && raw > 2 * minRaw + 3) {
                    if (++rise >= RISE_EVENTS) fresh = true;
                } else {
                    rise = 0;
                }
            }

            // A new gesture, once the stage has had its dwell, may move on.
            if (lockDir && fresh && !busy && t - stepAt >= DWELL_MS) {
                lockDir = 0; acc = 0; accDir = 0;
            }

            if (lockDir) {
                // Momentum or a continued push in the direction just taken.
                // Pushing on also cancels a reversal queued during the slide.
                if (dir === lockDir) {
                    revAcc = 0;
                    if (queued === -dir) queued = 0;
                    return;
                }
                // A deliberate reversal can step back, but a single bounce
                // can't, and it never releases the forward lock on its own.
                revAcc += mag;
                if (revAcc >= need(dir)) wheelStep(dir, t);
                return;
            }

            if (dir !== accDir) { acc = 0; accDir = dir; }
            acc += mag;
            if (acc >= need(dir)) wheelStep(dir, t);
        }

        function need(dir) {
            if (level === 0) return dir > 0 ? ENTER_PX : EDGE_PX;
            if (level === 1 && dir < 0) return EXIT_PX;
            if (level === LAST && dir > 0) return EDGE_PX;
            return STEP_PX;
        }

        function wheelStep(dir, t) {
            acc = revAcc = 0;
            accDir = 0;
            fresh = false;
            goal = null;
            request(dir, t);
        }

        function forget() {
            acc = 0; accDir = 0; revAcc = 0;
        }

        function lock(dir, t) {
            lockDir = dir;
            stepAt = t;
            minRaw = Infinity;
            rise = 0;
        }

        // ── Moving between stages ──
        function request(dir, t) {
            // One slot: the latest request made during a transition wins.
            if (busy) { queued = dir; return; }
            var target = level + dir;
            if (target < 0 || target > LAST) {
                lock(dir, t);
                if (target > LAST) bump();
                return;
            }
            transition(target, t);
        }

        function transition(target, t) {
            var from = level;
            level = target;
            window.GAME_LEVEL = level;
            // Being in the games holds one history entry, so the back button
            // brings the visitor up to the playground from any of them
            // instead of leaving the site (back.js). Every step down opens
            // it (a no-op while it is already open), which also covers a
            // scroll down during the walk up that a back press started.
            // Scrolling back up to the playground takes the entry off again.
            // Chrome and Edge skip an entry added with no click or key press
            // since the page loaded or since the last back, when back comes
            // from the toolbar, so a visitor who only scrolled down leaves the
            // site from there. Page code cannot prevent that. A mouse back
            // button counts as a press, so it works.
            if (window.BACK) {
                if (target > from) window.BACK.open('games', function () { window.STAGES.go(0); });
                else if (target === 0) window.BACK.closed('games');
            }
            lock(target > from ? 1 : -1, t);
            busy = true;
            bumpSeq++;
            setPager();
            if (from === 0) { PINBALL.enter(); busyFor(ENTER_BUSY_MS); }
            else if (target === 0) { PINBALL.exit(); busyFor(EXIT_BUSY_MS); }
            else step(STAGE_LIST[from], STAGE_LIST[target], target > from);
        }

        // Completion always comes from a timer. transitionend never fires when
        // the page is hidden or the value didn't change, which would leave the
        // controller busy for good.
        function busyFor(ms, done) {
            busyTimer = setTimeout(function () {
                busyTimer = null;
                busy = false;
                if (done) done();
                var q = queued;
                queued = 0;
                if (q) request(q, performance.now());
                else if (goal !== null && goal !== level) request(goal > level ? 1 : -1, performance.now());
                else goal = null;
            }, ms);
        }

        // One stage slides out and its neighbour slides in: up the screen when
        // going down the stack, down it when going back up. The outgoing stage
        // stops taking input first; the incoming one only does once it has
        // fully arrived.
        function step(out, inn, downward) {
            var rm = reduced(), ms = rm ? FADE_MS : SLIDE_MS;
            out.leave();
            // Clicks are blocked during the slide, and each element gets its
            // own pointer-events back afterwards: #pinball-ui relies on an
            // inline none to stay click-through over the navs.
            var pe = out.els.map(function (el) { return el.style.pointerEvents; });
            out.els.forEach(function (el) { el.style.pointerEvents = 'none'; });
            inn.show();
            if (rm) {
                clear(inn.els, ['transform']);
                fade(inn.els, 0, 1, ms);
                fade(out.els, 1, 0, ms);
            } else {
                slide(out.els, '0%', downward ? '-100%' : '100%', ms);
                slide(inn.els, downward ? '100%' : '-100%', '0%', ms);
            }
            busyFor(ms + 40, function () {
                out.hide();
                // Matter's mouse maps clicks through getBoundingClientRect, so
                // the playground must be left with no transform at all.
                clear(out.els, ['transform', 'transition', 'opacity']);
                out.els.forEach(function (el, i) { el.style.pointerEvents = pe[i]; });
                clear(inn.els, ['transform', 'transition', 'opacity']);
                inn.arrive();
            });
        }

        // Set the start state, force a style flush so no animation frame is
        // needed, then set the target. The end state lands even where the
        // transition itself does not animate.
        function slide(els, from, to, ms) {
            els.forEach(function (el) {
                el.style.transition = 'none';
                el.style.transform = 'translate3d(0,' + from + ',0)';
            });
            void document.body.offsetWidth;
            els.forEach(function (el) {
                el.style.transition = 'transform ' + ms + 'ms ' + EASE;
                el.style.transform = 'translate3d(0,' + to + ',0)';
            });
        }

        function fade(els, from, to, ms) {
            els.forEach(function (el) {
                el.style.transition = 'none';
                el.style.opacity = String(from);
            });
            void document.body.offsetWidth;
            els.forEach(function (el) {
                el.style.transition = 'opacity ' + ms + 'ms linear';
                el.style.opacity = String(to);
            });
        }

        function clear(els, props) {
            els.forEach(function (el) {
                props.forEach(function (p) { el.style[p] = ''; });
            });
        }

        // A short nudge when pushing down past the last stage, so the stop
        // reads as the bottom rather than as a scroll that did nothing.
        function bump() {
            if (level !== LAST || busy || reduced()) return;
            var layer = STAGE_LIST[LAST].els[0];
            var id = ++bumpSeq;
            layer.style.transition = 'transform 120ms ease-out';
            layer.style.transform = 'translate3d(0,-12px,0)';
            setTimeout(function () {
                if (id !== bumpSeq) return;
                layer.style.transition = 'transform 220ms ease-out';
                layer.style.transform = 'translate3d(0,0,0)';
                setTimeout(function () {
                    if (id !== bumpSeq) return;
                    clear([layer], ['transform', 'transition']);
                }, 230);
            }, 120);
        }

        // ── Keys ──
        // PageDown and PageUp step between stages too. Arrows and Space never
        // do: they belong to the games.
        window.addEventListener('keydown', function (e) {
            if (e.key !== 'PageDown' && e.key !== 'PageUp') return;
            if (e.repeat || e.altKey || e.ctrlKey || e.metaKey || blocked()) return;
            var tg = e.target;
            if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' ||
                       tg.tagName === 'SELECT' || tg.isContentEditable)) return;
            e.preventDefault();
            goal = null;
            request(e.key === 'PageDown' ? 1 : -1, performance.now());
        });

        window.addEventListener('wheel', onWheel, { passive: true });

        // ── API ──
        // go() walks one stage at a time to the target, for devtools and tests.
        window.STAGES = {
            level: function () { return level; },
            go: function (n) {
                goal = Math.max(0, Math.min(LAST, n | 0));
                if (!busy && goal !== level) request(goal > level ? 1 : -1, performance.now());
            },
            feed: feed,
            state: function () {
                return { level: level, busy: busy, lockDir: lockDir, acc: acc, revAcc: revAcc,
                         queued: queued, goal: goal, fresh: fresh, mute: mute };
            }
        };
    }
})();
