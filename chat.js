// ── Live chat (tawk.to) — the "Chat" ball ──
//
// tawk.to ships its own floating launcher bubble. That bubble is suppressed
// here so the playground stays the only entry point: the chat window opens
// when the Chat ball is clicked and hides itself again when the visitor
// closes it. Nothing pops up on its own.
//
// Messages land in the tawk.to mobile app, which pushes a notification.

var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();

(function () {
    var PROPERTY = '6a70ffca4bf7201d4aa60c02';
    var WIDGET   = '1jv4mebsp';

    var loaded = false;
    var pending = false;   // ball was clicked before the widget finished loading

    function open() {
        Tawk_API.showWidget();
        Tawk_API.maximize();
    }

    Tawk_API.onLoad = function () {
        loaded = true;
        Tawk_API.hideWidget();
        if (pending) {
            pending = false;
            open();
        }
    };

    // Closing the chat window drops tawk back to its bubble, which would then
    // sit on top of the playground. Hide it again so the ball stays the only
    // way in.
    Tawk_API.onChatMinimized = function () {
        Tawk_API.hideWidget();
    };

    window.openLiveChat = function () {
        if (!loaded) { pending = true; return; }
        open();
    };

    var s1 = document.createElement('script');
    var s0 = document.getElementsByTagName('script')[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/' + PROPERTY + '/' + WIDGET;
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);
})();
