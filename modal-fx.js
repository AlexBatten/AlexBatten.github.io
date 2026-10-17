// ── Modal visuals ──
// A numbered ball's modal can open onto a picture of its own content, drawn in
// a stage right under the title, so every card still starts with its number
// and name. Each picture lives in /fx/<id>.js, is fetched the first time that
// ball is opened, and registers itself here. The modal text is untouched: the
// stage is aria-hidden, as it only illustrates what the text already says, and
// is placed again on every open because physics.js rewrites #modal-content.
//
// A ball marked decorate gets no stage. Its script works on the modal's own
// text instead (the Recommendations marks are part of their entries).
//
// A visual is a factory, factory(stage, api), returning { destroy, theme,
// visible }. destroy() must stop every loop and free what it made (a WebGL
// context above all, as browsers cap how many a page may hold). theme() is
// called when light and dark switch while it is showing. visible(on) is
// called with false when the modal starts closing or the stage scrolls out of
// the card, and with true when it scrolls back; a visual stops drawing while
// it is not visible.

(function () {
    'use strict';

    // Stage height in px: desktop, and screens 600px wide or less.
    var FX = {
        about:           { src: '/fx/about.js?v=1',           h: 230, hNarrow: 180 },
        experience:      { src: '/fx/experience.js?v=1',      h: 190, hNarrow: 170 },
        projects:        { src: '/fx/projects.js?v=2',        h: 210, hNarrow: 190 },
        skills:          { src: '/fx/skills.js?v=1',          h: 250, hNarrow: 210 },
        education:       { src: '/fx/education.js?v=3',       h: 220, hNarrow: 180 },
        recommendations: { src: '/fx/recommendations.js?v=4', decorate: true },
        hire:            { src: '/fx/hire.js?v=1',            h: 160, hNarrow: 120 },
        lab:             { src: '/fx/lab.js?v=2',             h: 240, hNarrow: 190 }
    };
    var FADE_MS = 300;    // the overlay's fade-out in styles.css

    var modal = document.getElementById('modal');
    if (!modal) return;

    var root = document.documentElement;
    var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var registry = {}, requested = {}, failed = {};
    var current = null;     // { id, cfg, instance, token, opened }
    var token = 0, closeTimer = null, onScreen = true;

    var stage = document.createElement('div');
    stage.className = 'modal-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.style.cssText = 'display:none;position:relative;margin:0 0 16px;overflow:hidden;' +
        'opacity:0;transition:opacity .35s ease;user-select:none;-webkit-user-select:none';
    modal.insertBefore(stage, modal.firstChild);

    // A stage scrolled out of the modal stops drawing. A decorate ball has no
    // stage, so a report about the stage (the last ball's, just detached by
    // the new text) is not about it.
    var io = null;
    if (window.IntersectionObserver) {
        io = new IntersectionObserver(function (entries) {
            onScreen = entries[entries.length - 1].isIntersecting;
            if (current && !current.cfg.decorate && current.instance && current.instance.visible) {
                current.instance.visible(onScreen);
            }
        }, { root: modal });
        io.observe(stage);
    }

    if (window.MutationObserver) {
        new MutationObserver(function () {
            if (current && current.instance && current.instance.theme) {
                try { current.instance.theme(); } catch (e) {}
            }
        }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    }

    function narrow() {
        return (root.clientWidth || window.innerWidth || 1280) <= 600;
    }

    // The tokens a visual draws with, read fresh each time so a theme switch
    // is picked up. Amber on the card follows snake.js: the plain amber
    // vanishes on the light grey card of the dark theme.
    function colors() {
        var cs = getComputedStyle(root);
        var paper = cs.getPropertyValue('--paper-rgb').trim() || '255, 255, 255';
        var dark = paper.replace(/\s/g, '') === '0,0,0';
        return {
            paper: paper,
            ink: cs.getPropertyValue('--ink-rgb').trim() || '0, 0, 0',
            card: cs.getPropertyValue('--card').trim() || '#3a3a3a',
            accent: cs.getPropertyValue('--accent-on-card').trim() || '#3b82f6',
            amber: dark ? '#92400e' : '#f59e0b'
        };
    }

    var api = {
        narrow: narrow,
        colors: colors,
        reduced: function () { return !!(motionQuery && motionQuery.matches); },
        lang: function () { return (root.getAttribute('lang') || 'en').slice(0, 2); },
        onScreen: function () { return onScreen && !document.hidden; },
        // How long ago the ball was opened, in ms. A visual whose script
        // arrived late can use it to skip an entrance that has already been
        // missed.
        sinceOpen: function () { return current ? performance.now() - current.opened : Infinity; },
        // The visual is drawn and can be faded in.
        ready: function () { stage.style.opacity = '1'; },
        // The visual can't run here (no WebGL, a failed fetch): the stage
        // folds away rather than leaving an empty box, and later opens of the
        // ball skip it.
        fail: function () {
            if (current) failed[current.id] = true;
            hideStage();
        }
    };

    function hideStage() {
        stage.style.display = 'none';
        stage.innerHTML = '';
        stage.style.opacity = '0';
    }

    function destroyCurrent() {
        if (current && current.instance && current.instance.destroy) {
            try { current.instance.destroy(); } catch (e) {}
        }
        current = null;
        hideStage();
        if (io) io.unobserve(stage);
    }

    function mount() {
        var f = registry[current.id];
        try {
            current.instance = f(stage, api) || {};
        } catch (e) {
            destroyCurrent();
        }
    }

    function load(id) {
        if (requested[id]) return;
        requested[id] = true;
        var s = document.createElement('script');
        s.src = FX[id].src;
        s.async = true;
        // onload also fires for a file that failed to parse, which never
        // registers. That won't change on a later open, so the ball is marked
        // and its stage stays folded from then on.
        s.onload = function () {
            if (registry[id]) return;
            failed[id] = true;
            if (current && current.id === id) destroyCurrent();
        };
        s.onerror = function () { requested[id] = false; if (current && current.id === id) destroyCurrent(); };
        document.head.appendChild(s);
    }

    // The stage takes at most 30% of the window's height, so on a short
    // screen (a landscape phone, a zoomed-in laptop) the text still starts
    // within the card's first view. Where even a small stage won't fit, the
    // ball opens without its picture. Returns 0 then.
    function stageHeight(cfg) {
        var want = narrow() ? cfg.hNarrow : cfg.h;
        var h = Math.min(want, Math.round((window.innerHeight || root.clientHeight || 800) * 0.3));
        return h < Math.min(120, want) ? 0 : h;
    }

    // The same rule applies when the window changes under an open modal (a
    // phone turned on its side). Only a real change is written, so the
    // address bar sliding in and out on a phone doesn't restart a visual.
    window.addEventListener('resize', function () {
        if (!current || current.cfg.decorate) return;
        var h = stageHeight(current.cfg);
        if (!h) { destroyCurrent(); return; }
        if (stage.style.height !== h + 'px') stage.style.height = h + 'px';
    });

    // Right after the title. physics.js has already put the new text in
    // #modal-content (which detaches the stage from the last open) before this
    // runs. A card without a title gets the stage at its top instead.
    function place() {
        var content = document.getElementById('modal-content');
        var h2 = content ? content.querySelector('h2') : null;
        if (h2) h2.parentNode.insertBefore(stage, h2.nextSibling);
        else modal.insertBefore(stage, modal.firstChild);
    }

    function open(id) {
        clearTimeout(closeTimer);
        destroyCurrent();
        var cfg = FX[id];
        if (!cfg || failed[id]) return;
        if (!cfg.decorate) {
            var h = stageHeight(cfg);
            if (!h) return;
            place();
            stage.style.display = 'block';
            stage.style.opacity = '0';
            stage.style.height = h + 'px';
            // Observing again queues a fresh entry, so the new visual learns
            // its real visibility even when the observer last saw a hidden
            // stage.
            if (io) { io.unobserve(stage); io.observe(stage); }
            onScreen = true;
        }
        current = { id: id, cfg: cfg, instance: null, token: ++token, opened: performance.now() };
        if (registry[id]) mount();
        else load(id);
    }

    // The overlay fades out over FADE_MS, so the visual stays in place until
    // the card has gone, then is destroyed. Reopening first cancels that.
    function close() {
        if (!current) return;
        if (current.instance && current.instance.visible) current.instance.visible(false);
        var t = current.token;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(function () {
            if (current && current.token === t) destroyCurrent();
        }, FADE_MS + 20);
    }

    // A decorate script animates text that is on screen from the moment the
    // ball opens, so it can't wait for a fetch the way a stage can. These are
    // a few KB each and are fetched once the page is idle.
    function prefetch() {
        Object.keys(FX).forEach(function (id) { if (FX[id].decorate) load(id); });
    }
    function schedulePrefetch() {
        if (window.requestIdleCallback) requestIdleCallback(prefetch, { timeout: 4000 });
        else setTimeout(prefetch, 2000);
    }
    if (document.readyState === 'complete') schedulePrefetch();
    else window.addEventListener('load', schedulePrefetch);

    window.MODAL_FX = {
        open: open,
        close: close,
        register: function (id, factory) {
            registry[id] = factory;
            if (current && current.id === id && !current.instance) mount();
        }
    };
})();
