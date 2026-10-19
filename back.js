// ── Back button ──
// The site is one page: a card, the secrets panel, the chat window and the
// games below the playground are all layers over it, not pages. So that the
// browser's back button (Android's above all) closes the top layer instead
// of leaving the site, each layer adds a history entry while it is open:
//
//   BACK.open(name, close)  when a layer opens; close() shuts it.
//   BACK.closed(name)       when it closes any other way (its X, Escape, a
//                           click outside); its entry is taken back off.
//
// Back closes the layers above the entry it lands on, calling each one's
// close(). The URL never changes.

(function () {
    'use strict';

    var stack = [];        // open layers, oldest first: { name, close }
    var ownPops = 0;       // history moves we started ourselves, not yet arrived
    var waiting = [];      // opens that came while one of ours was still moving
    var closing = false;   // inside a close() that back itself called

    function push(entry) {
        stack.push(entry);
        history.pushState({ back: entry.name, depth: stack.length }, '');
    }

    function flush() {
        var w = waiting;
        waiting = [];
        w.forEach(push);
    }

    // Step history back n entries ourselves. The popstate that follows is
    // ours, not a back press. Should it never come (the browser had nothing
    // to go back to), the wait ends after a second rather than holding up
    // every layer opened after it.
    function goBack(n) {
        ownPops++;
        history.go(-n);
        setTimeout(function () {
            if (ownPops > 0) { ownPops = 0; flush(); }
        }, 1000);
    }

    window.addEventListener('popstate', function (e) {
        // A move we made to take entries off arrives here too: only now is
        // it safe to add the entries that were waiting for it.
        if (ownPops > 0) {
            ownPops--;
            if (!ownPops) flush();
            return;
        }
        // Each entry records how many layers were open on it, so the stack
        // is brought to that depth: one back closes one layer, a jump from
        // the back button's history menu closes several. Forward onto the
        // entry of a layer that has since closed steps straight back off it,
        // because the layer is not reopened.
        var s = e.state, depth = s && s.back ? (s.depth || 1) : 0;
        if (depth > stack.length) { goBack(depth - stack.length); return; }
        while (stack.length > depth) {
            var top = stack.pop();
            closing = true;
            try { top.close(); } finally { closing = false; }
        }
    });

    // A reload, or a page brought back without its state, can land on one
    // of our entries with nothing open: step back to the page's own entry
    // so the next back leaves rather than doing nothing.
    if (history.state && history.state.back) goBack(history.state.depth || 1);

    window.BACK = {
        open: function (name, close) {
            for (var i = 0; i < stack.length; i++) if (stack[i].name === name) return;
            for (var j = 0; j < waiting.length; j++) if (waiting[j].name === name) return;
            var entry = { name: name, close: close };
            if (ownPops > 0) waiting.push(entry);
            else push(entry);
        },
        closed: function (name) {
            if (closing) return;
            for (var w = 0; w < waiting.length; w++) {
                if (waiting[w].name === name) { waiting.splice(w, 1); return; }
            }
            for (var i = stack.length - 1; i >= 0; i--) {
                if (stack[i].name !== name) continue;
                // History steps back past its entry and every entry above
                // it. The layers above are still open (the chat window is
                // independent of the others), so their entries are pushed
                // again once that move lands.
                var n = stack.length - i;
                var above = stack.slice(i + 1);
                stack.length = i;
                waiting = above.concat(waiting);
                goBack(n);
                return;
            }
        }
    };
})();
