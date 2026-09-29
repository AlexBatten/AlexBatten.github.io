// ── Light / dark theme ──
//
// Loaded synchronously in <head>, ahead of the stylesheets, so data-theme is
// already on <html> when the page first paints. Deferring it would show a
// dark-mode visitor one frame of the light page on every load.
//
// Dark mode is the light palette with every black and grey inverted; the
// tokens live in styles.css under :root[data-theme="dark"]. The accent and
// chat colours stay as they are.
//
// A choice made with the toggle is remembered. Until the visitor makes one,
// the page follows the OS setting, including when it changes while open.

(function () {
    var KEY = 'theme';
    var root = document.documentElement;
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function stored() {
        try {
            var t = localStorage.getItem(KEY);
            return t === 'dark' || t === 'light' ? t : null;
        } catch (e) {
            // Storage can throw outright (blocked cookies, some private modes).
            return null;
        }
    }

    function system() {
        return media && media.matches ? 'dark' : 'light';
    }

    function apply(theme) {
        root.setAttribute('data-theme', theme);
        var btn = document.getElementById('theme-btn');
        if (btn) btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }

    apply(stored() || system());

    if (media) {
        var follow = function () {
            if (!stored()) apply(system());
        };
        // Safari before 14 only has the deprecated addListener.
        if (media.addEventListener) media.addEventListener('change', follow);
        else if (media.addListener) media.addListener(follow);
    }

    // Keeps other open tabs in step when the toggle is used in one of them.
    window.addEventListener('storage', function (e) {
        if (e.key === KEY || e.key === null) apply(stored() || system());
    });

    // A page restored from the back/forward cache missed any storage event
    // fired while it was frozen (Safari drops them), so re-read on the way back.
    // Toggling on /da/ and pressing Back to / is the common case.
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) apply(stored() || system());
    });

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('theme-btn');
        if (!btn) return;
        // The first apply() ran before the button was parsed.
        apply(root.getAttribute('data-theme'));
        btn.addEventListener('click', function () {
            var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            apply(next);
            try { localStorage.setItem(KEY, next); } catch (e) {}
        });
    });
})();
