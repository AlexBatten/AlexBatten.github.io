// ── Live chat (tawk.to) — the "Chat" ball ──
//
// tawk.to is loaded lazily, on the first click of the Chat ball, rather than
// with the page. Loading it eagerly and calling hideWidget() in onLoad still
// paints the launcher bubble for the frame or two before onLoad fires, so the
// bubble visibly flashes in the corner on every page load. Not requesting the
// widget at all until it is wanted removes the flash at the source, and has
// the side effect that a visitor who never opens the chat never loads tawk's
// script and never gets its cookies.
//
// The cost is a short delay on the very first click while the widget loads;
// the click is queued and the window opens as soon as it is ready.
//
// Messages land in the tawk.to mobile app, which pushes a notification.

var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();

(function () {
    var PROPERTY = '6a70ffca4bf7201d4aa60c02';
    var WIDGET   = '1jv4mebsp';

    var injected = false;
    var loaded = false;
    var pending = false;   // ball was clicked while the widget was still loading

    function open() {
        Tawk_API.showWidget();
        Tawk_API.maximize();
    }

    Tawk_API.onLoad = function () {
        loaded = true;
        if (pending) {
            pending = false;
            open();
        } else {
            Tawk_API.hideWidget();
        }
    };

    // Closing the chat window drops tawk back to its bubble, which would then
    // sit on top of the playground. Hide it again so the ball stays the only
    // way in.
    Tawk_API.onChatMinimized = function () {
        Tawk_API.hideWidget();
    };

    function inject() {
        injected = true;
        var s1 = document.createElement('script');
        var s0 = document.getElementsByTagName('script')[0];
        s1.async = true;
        s1.src = 'https://embed.tawk.to/' + PROPERTY + '/' + WIDGET;
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        s0.parentNode.insertBefore(s1, s0);
    }

    window.openLiveChat = function () {
        if (loaded) { open(); return; }
        pending = true;
        if (!injected) inject();
    };
})();
