// ── Tomas (easter egg) ──
// Alex's cat. Hold a ball low, on or just above the floor or the balls piled
// there, roughly in one place, and within a second Tomas's ears and eyes
// peek up at the nearer edge of the screen. Keep it there a moment longer
// and he comes in, sits, watches it, wiggles and swats it, and the second swat
// knocks it out of your hand. Then he grooms, flops over and rolls on his
// back for a moment, and walks off. Let go before that and he pats the ball
// where it lies; lift it out of his reach and he leaps, misses and leaves. The hints panel's riddle is "dangle something
// just above the floor and wait".
//
// He is pixel art made of the background's glyphs, in his own brown tabby
// colours, on a canvas of his own
// over the balls (the physics canvas above still takes the pointer). He
// walks on whatever is under him, the floor or the tops of the balls piled
// there, so he always has the plain background around him. He is not a
// Matter body: he touches a ball only when he swats or pats it. His clock is
// the engine's, so he freezes with it while a card is open. While he is away
// nothing runs except a check on each physics step of a drag.

(function () {
    'use strict';

    var Body = Matter.Body, Events = Matter.Events;

    // ── Frames ──
    // Each frame is rows of cell classes, facing right, feet on the last row:
    // ' ' empty, 'o' outline, 'd' dark stripe, 'b' brown base coat, 'l' light
    // brown, 'w' white fur, 'e' eye, 'n' nose and inner ear. meta gives cell
    // positions used to place him: the tip of the paw in swat, leap and pat,
    // and the middle of his face in sit.
    var F = {
        cols: 40,
        rows: 18,
        frames: {
            walk1: [
                '      dd                                ',
                '     ddd                                ',
                '    bl                                  ',
                '    dd                                  ',
                '    bl                        d     d   ',
                '    ddb                      bnb   bnb  ',
                '     bbbd                    bldldlldb  ',
                '       dbbbbdbbdbbdbbdbbdbbdbldeelleedb ',
                '          bbbbbblldlldlldlldbldlbwnwwlb ',
                '         bdblllllldlldllbbbblbdlwwwwwww ',
                '         bdblllldlldlldlblllwwbblwwwww  ',
                '          bbblllbllllllllbllww          ',
                '            bllbbbbbbbbbbbll            ',
                '           dddbdd     ddd ddd           ',
                '          blbddd      dd  bll           ',
                '         ddd dd      blb   bww          ',
                '        bll   dd     bl     ww          ',
                '        bll   ddd    bl     bww         '
            ],
            walk2: [
                '      dd                                ',
                '     ddd                                ',
                '    bl                                  ',
                '    dd                                  ',
                '    bl                        d     d   ',
                '    ddb                      bnb   bnb  ',
                '     bbbd                    bldldlldb  ',
                '       dbbbbdbbdbbdbbdbbdbbdbldeelleedb ',
                '          bbbbbblldlldlldlldbldlbwnwwlb ',
                '         bdbllllbldlldllbbbblbdlwwwwwww ',
                '         bdbllllllldlldlblllwwbblwwwww  ',
                '          bbbblllbllllllbllbww          ',
                '             bbdddbbbbbbbllw            ',
                '            ddlb        ddd             ',
                '           dddd        blbl             ',
                '           ddbl        bbww             ',
                '            dbbb         www            ',
                '            ddd          bww            '
            ],
            walk3: [
                '      dd                                ',
                '     ddd                                ',
                '    bl                                  ',
                '    dd                                  ',
                '    bl                        d     d   ',
                '    ddb                      bnb   bnb  ',
                '     bbbd                    bldldlldb  ',
                '       dbbbbdbbdbbdbbdbbdbbdbldeelleedb ',
                '          bbbbbblldlldlldlldbldlbwnwwlb ',
                '         bdbllllbldlldllbbbblbdlwwwwwww ',
                '         bdblllllbldlldlbllbwwbblwwwww  ',
                '          bbbbblllblllllbllwww          ',
                '            dbbbllbbbbbbllbw            ',
                '          dddd ddd     ddddd            ',
                '         ddd  blb      bl dd            ',
                '        dd    dd      www dl            ',
                '       ddd    blb     ww   bb           ',
                '       ddd     blb    ww    bb          '
            ],
            walk4: [
                '      dd                                ',
                '     ddd                                ',
                '    bl                                  ',
                '    dd                                  ',
                '    bl                        d     d   ',
                '    ddb                      bnb   bnb  ',
                '     bbbd                    bldldlldb  ',
                '       dbbbbdbbdbbdbbdbbdbbdbldeelleedb ',
                '          bbbbbblldlldlldlldbldlbwnwwlb ',
                '         bdbllllbldlldllbbbblbdlwwwwwww ',
                '         bdbllllllldlldlblllwwbblwwwww  ',
                '          bbbblllbllllllblllww          ',
                '             bblbbbbbbbblddd            ',
                '            dddd        bll             ',
                '           dblb         www             ',
                '            dd          www             ',
                '            blb         blw             ',
                '             blb         bl             '
            ],
            sit: [
                '                                        ',
                '                                        ',
                '                                        ',
                '                 d     d                ',
                '                bnb   bnb               ',
                '                bldldlldb               ',
                '               bldeelleedb              ',
                '               bldlbwnwwlb              ',
                '              blbdlwwwwwww              ',
                '             bdllbblwwwww               ',
                '            bldlldlwww                  ',
                '       bbbbbbddlldlwbl                  ',
                '      blldllllbddlwwbll                 ',
                '     blddlldlllllbwwbll                 ',
                ' d   bldldllddlllbwwbdd                 ',
                ' dd  bdlldldlllllbdwbll                 ',
                ' bldbddbldldlllll dlwww                 ',
                '  dlldllbdlllllllbwlwwww                '
            ],
            lookup: [
                '                                        ',
                '                                        ',
                '                       d                ',
                '                  d   bnb               ',
                '                 bnbldlldb              ',
                '                bldlddleedb             ',
                '               bldeellbwnww             ',
                '               dbdlbwwwwwwww            ',
                '              bdlbblwwwwww              ',
                '             bdllldwwww                 ',
                '            bldlldlwwww                 ',
                '       bbbbbbddlldlwbl                  ',
                '      blldllllbddlwwbll                 ',
                '     blddlldlllllbwwbll                 ',
                ' d   bldldllddlllbwwbdd                 ',
                ' dd  bdlldldlllllbdwbll                 ',
                ' bldbddbldldlllll dlwww                 ',
                '  dlldllbdlllllllbwlwwww                '
            ],
            crouch1: [
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '           bb          d     d          ',
                '         bbbbdbb      bnb   bnb         ',
                '       bbllllddddbb   bldldlldb         ',
                '      bllldlllllblldbbldeelleedb        ',
                ' d dbblldlllldlllddllbldlbwnwwlb        ',
                'dbdbdblldlldlllllbdlbbbdlwwwwwww        ',
                '      bdllllllllblllbllbblwwwww         ',
                '       bblldllll blwblldw               ',
                '         bllllllbbw dbdwwwwww           '
            ],
            crouch2: [
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '         bdbbdb        d     d          ',
                '       bbbbbbbbbd     bnb   bnb         ',
                '      blllldlllbbbb   bldldlldb         ',
                '  dbdbllldlllldddbdbbbldeelleedb        ',
                ' bbdbblldlldlllllbdllbldlbwnwwlb        ',
                'bl   bldllllllllldllbbbdlwwwwwww        ',
                'dd    bdllldlllbbblwbllbblwwwww         ',
                '        dbbbdll   wwblldw               ',
                '            bllbbbw dbdwwwwww           '
            ],
            swat: [
                '                                 l l    ',
                '                    d           bwwwb   ',
                '               d   bnb         bwwwb    ',
                '              bnbldlldb       bll       ',
                '             bldlddleedb    bddl        ',
                '            bldeellbwnww   blll         ',
                '             bdlbwwwwwwwwblll           ',
                '              bblwwwwww bddl            ',
                '              bdldlwwwllll              ',
                '              bldllwwwwwl               ',
                '             bdldllwwwwdl               ',
                '             bldldlwwwwb                ',
                '            bdldllwwww                  ',
                '           bbldllllwwl                  ',
                '           bdldlllddll                  ',
                ' d         bldddlldlb                   ',
                ' dl       bdlldlddb                     ',
                '  bldlldlddbdlllllw                     '
            ],
            groom1: [
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                  d     d               ',
                '                 bnb   bnb              ',
                '                bbldldlldb              ',
                '               bblddellldeb             ',
                '              bdbldlbwnwwlbbwwb         ',
                '             bdllbdlwwwwwwnwwwb         ',
                '       bbbbbbddlldbblwwwww bll          ',
                '      blldllllbddlwwwl     bdl          ',
                '     blddlldlllllbwwblll   bll          ',
                ' d   bldldllddlllbwdbllllllb            ',
                ' dd  bdlldldlllllbbd                    ',
                ' bldbddbldldlllll dl                    ',
                '  dlldllbdlllllllbwll                   '
            ],
            groom2: [
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                  d     d               ',
                '                 bnb   bnb              ',
                '                bbldldlldb              ',
                '               bblddellldeb             ',
                '              bdbldlbwnwwlb             ',
                '             bdllbdlwwwwwwnbwwb         ',
                '       bbbbbbddlldbblwwwwwnwwwb         ',
                '      blldllllbddlwwwl     bll          ',
                '     blddlldlllllbwwblll   bdl          ',
                ' d   bldldllddlllbwdbllllllb            ',
                ' dd  bdlldldlllllbbd                    ',
                ' bldbddbldldlllll dl                    ',
                '  dlldllbdlllllllbwll                   '
            ],
            leap: [
                '                                 lll    ',
                '                          d     blll    ',
                '                     d   bnb   ddl bwww ',
                '                    bnbldlldb dd  bwww  ',
                '                   bldlddleedbdd bll    ',
                '                  bldeellbwnwwd bdl     ',
                '                   bdlbwwwwwwwwbll      ',
                '               bbddlbblwwwwwwbdl        ',
                '             bbdlllddlwwwblll           ',
                '           bdlllddllldlwwwb             ',
                '   bdbddbddllldllldllbb                 ',
                ' ddbdbddblbbbbbldllbb                   ',
                'ddb     bdblllllbbb                     ',
                'd        bbllllb                        ',
                '       dddblllb                         ',
                '     dddbbddbb                          ',
                '    dddbdd                              ',
                '    ddbl                                '
            ],
            pat: [
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                   d     d              ',
                '                  bnb   bnb             ',
                '                  bldldlldb             ',
                '                 bldeelleedb            ',
                '                bbldlbwnwwlb            ',
                '              dbllbdlwwwwwww            ',
                '             bdlldlbblwwwww             ',
                '       bbbbbbddlldllwwww                ',
                '      blldllllbddllwbbbb                ',
                '     blddlldlllllbwwbbllb               ',
                ' d   bldldllddlllbwwwwbbld              ',
                ' dd  bdlldldlllllbwww   ddbb            ',
                ' bldbddbldldlllll  bl     www           ',
                '  dlldllbdlllllllbwllb     wwww         '
            ],
            lie: [
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                            d     d     ',
                '       bbbbbbddbbdbbdbbb   bnb   bnb    ',
                '      blldllllbddlldlldlb  bldldlldb    ',
                '     blddlldlllllbdlldllbbbldeelleedb   ',
                ' d   bldldllddlllbwwwwwwwwbldlbwnwwlb   ',
                ' dd  bdlldldllllbwwwwwwwwwwbdlwwwwwww   ',
                ' bldbddbldldlllbllbww bdllllbblwwwwwll  ',
                '  dlldllbdllllllllbww  blldllllllwwww   '
            ],
            roll: [
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '            bww      bwwb               ',
                '            bllb ll bllwwb              ',
                '            bdl  dd bdl                 ',
                '           bllb  dd bll                 ',
                '       bbbbbdllldddbdl                  ',
                '      blldllllbddlwwwwwww  bwwwwwww     ',
                '     blddlldlllllbwwwwwwwwbdlwwwwwww    ',
                ' d   bldldllddlllbwwwwwwwbldlbwnwwlb    ',
                ' dd  bdlldldllllldllldlllbldeelleedb    ',
                ' bldbddbldldlllldlldlldbdnbldldlldbnd   ',
                '  dlldllbdllllllllbwww    bbldlldbb     '
            ],
            back1: [
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '    ll   bww                            ',
                '    dd   bllb          bwwb             ',
                '     dd   bdl      ll bllwwb            ',
                '     dd    bll     ddbdl                ',
                '      dd  bdllb    ddbll                ',
                '       dbllldb     ddbdl                ',
                '       bldllllwwwwwwwbll                ',
                '      bdlldllwwwwwwwwwwwww bwwwwwww     ',
                '     bldlllbwwwwwwwwwwwwwwbdlwwwwwww    ',
                '     bdlldllwwwwwwwwwwwwwbldlbwnwwlb    ',
                ' dd  bdlldllldllldllldllwbldeelleedb    ',
                'dd   bdlldllldllldllldlldnbldldlldbnd   ',
                'dbldlbddbdddbdddbdddbdb   bbldlldbb     '
            ],
            back2: [
                '                                        ',
                '                                        ',
                '                                        ',
                '                                        ',
                '           bww        bwwb              ',
                '      ll   bll    ll bwwlb              ',
                '      dd   bdl    dd bdl                ',
                '      dd   bll    dd bll                ',
                '       dd bdllb    ddbdl                ',
                '       d blllb     ddbll                ',
                '        bllldb     ddbdl                ',
                '       bldllllwwwwwwwbll                ',
                '      bdlldllwwwwwwwwwwwww bwwwwwww     ',
                '     bldlllbwwwwwwwwwwwwwwbdlwwwwwww    ',
                'd    bdlldllwwwwwwwwwwwwwbldlbwnwwlb    ',
                'dd   bdlldllldllldllldllwbldeelleedb    ',
                ' dl  bdlldllldllldllldlldnbldldlldbnd   ',
                '  bdlbddbdddbdddbdddbdb   bbldlldbb     '
            ]
        },
        meta: { swatPaw: [35,0], leapPaw: [38,2], patPaw: [30,17], face: [20,6] }
    };

    var FRAME_MS = 125;         // walk cycle, 8 frames a second
    var SINK_MS = 2000;         // a peek with nothing dangling sinks after this
    var COOLDOWN_MS = 12000;    // after a visit, before he can come again
    var PEEK_COOLDOWN_MS = 1500;  // after a peek that came to nothing
    var SWATS_MAX = 4;          // tries at the ball before he gives up
    // What counts as dangling: a held ball kept low and roughly in one
    // place. peek: ms of it that brings his ears up; come: ms that brings him
    // in; lost: ms out of the band that starts the count over; min and max:
    // the gap under the ball, in ball radii, from pressed into the floor or
    // the pile (below 0) to about two ball heights above it; sway: px per
    // 60Hz step, faster than which isn't dangling. The band is kept wide on
    // purpose, so anyone holding a ball low for a moment meets him. A
    // finger hides the ball it holds and is never quite still, so on a touch
    // screen it is wider still and he comes a little sooner.
    var MOUSE = { peek: 900, come: 1700, lost: 500, min: -0.6, max: 4, sway: 9 };
    var TOUCH = { peek: 900, come: 1600, lost: 600, min: -0.8, max: 4.5, sway: 11 };

    (function wait() {
        if (!window.PLAYGROUND) return setTimeout(wait, 50);
        setup(window.PLAYGROUND);
    })();

    function setup(PG) {
        var engine = PG.engine, mc = PG.mouseConstraint, mouse = mc.mouse;
        var root = document.documentElement;
        var playground = document.getElementById('playground');
        var overlay = document.getElementById('modal-overlay');
        var reducedQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        var coarseQuery = window.matchMedia && window.matchMedia('(pointer: coarse)');

        var held = null;            // the ball being dragged
        var dangle = 0, lost = 0;   // ms in the band, ms out of it
        var anchorX = 0;            // where the ball was when the count began
        var lastStep = 0;
        var quietUntil = -Infinity; // engine time he may come again
        var cat = null;             // the visit in progress
        var view = null;            // { canvas, g, ... } while he is on screen
        var raf = 0;

        function now() { return engine.timing.timestamp; }
        function velocity(b) { return Body.getVelocity ? Body.getVelocity(b) : b.velocity; }
        function reduced() { return !!(reducedQuery && reducedQuery.matches); }
        function tuning() { return coarseQuery && coarseQuery.matches ? TOUCH : MOUSE; }

        function isPortfolioBall(body) {
            for (var i = 0; i < PG.pairs.length; i++) if (PG.pairs[i].body === body) return true;
            return false;
        }

        // He stays away while the playground is someone else's: pinball and
        // the games below it, the ball rain, or zero gravity; and while a
        // tilted phone's gravity doesn't pull toward the floor (lying flat,
        // tipped past level), when the balls he would stand on aren't down
        // there. A phone tilted sideways is fine.
        function blocked() {
            return !!(window.PINBALL_ACTIVE || window.RAIN_ACTIVE || window.ZERO_GRAVITY ||
                engine.world.gravity.y < 0.3);
        }

        // ── Sizes ──
        // Cells of 6 x 10 px (5 x 8 on a phone), so he is a little over two
        // balls long.
        function cell() {
            return PG.getSize().W <= 600 ? { w: 5, h: 8, font: 8 } : { w: 6, h: 10, font: 10 };
        }

        // ── Watching a drag ──
        Events.on(mc, 'startdrag', function (e) {
            held = isPortfolioBall(e.body) ? e.body : null;
            dangle = 0;
            lost = 0;
            if (cat && e.body === cat.ball && !cat.knocked) cat.letGo = false;
        });

        Events.on(mc, 'enddrag', function (e) {
            if (cat && cat.ball === e.body && !cat.knocked) cat.letGo = true;
            held = null;
            dangle = 0;
        });

        // The gap between the held ball and what is under it: the floor, or
        // the top of a ball below it.
        function gapUnder(b) {
            var r = b.circleRadius, x = b.position.x, y = b.position.y;
            var ground = PG.getSize().H;
            for (var i = 0; i < PG.pairs.length; i++) {
                var o = PG.pairs[i].body;
                if (o === b || o.position.y <= y) continue;
                var or = o.circleRadius;
                if (Math.abs(o.position.x - x) < (r + or) * 0.85) ground = Math.min(ground, o.position.y - or);
            }
            return (ground - (y + r)) / r;
        }

        // The ground under a sprite placed at x: the floor, or the top of the
        // highest ball resting under the middle of him. His own ball and
        // balls in motion (thrown, falling, rolling) don't count, so he never
        // rides one.
        function groundAt(x) {
            var c = cell(), w = F.cols * c.w, ground = PG.getSize().H;
            var a = x + w * 0.2, b = x + w * 0.8;
            for (var i = 0; i < PG.pairs.length; i++) {
                var o = PG.pairs[i].body;
                if (o === held || (cat && o === cat.ball)) continue;
                var v = velocity(o);
                if (Math.hypot(v.x, v.y) > 1) continue;
                var r = o.circleRadius;
                if (o.position.x + r * 0.7 > a && o.position.x - r * 0.7 < b) ground = Math.min(ground, o.position.y - r);
            }
            return ground;
        }

        // Counted while nobody is visiting, and through the peek, which
        // turns into a visit once the dangling has gone on long enough.
        // Anything that pauses the count also clears it.
        Events.on(engine, 'afterUpdate', function () {
            var t = now(), dt = Math.min(100, t - lastStep);
            lastStep = t;
            if (!held) return;
            if (t < quietUntil || (cat && cat.step && cat.step.kind !== 'peek') || blocked()) {
                dangle = 0;
                lost = 0;
                return;
            }
            var T = tuning(), gap = gapUnder(held), v = velocity(held);
            var inBand = gap >= T.min && gap <= T.max && Math.hypot(v.x, v.y) < T.sway;
            // Dangling stays near one spot: a ball carried more than two and
            // a half ball widths from where the count began is being moved
            // about, not dangled, and the count starts over from there.
            if (dangle === 0 || Math.abs(held.position.x - anchorX) > held.circleRadius * 5) {
                dangle = 0;
                anchorX = held.position.x;
            }
            if (inBand) {
                dangle += dt;
                lost = 0;
            } else {
                lost += dt;
                if (lost > T.lost) dangle = 0;
            }
            if (!cat && dangle >= T.peek) arrive(held);
        });

        // ── A visit ──
        // The visit is a list of steps, each a pose held for a time or a walk
        // to a target, run on engine time from the animation loop.
        function arrive(ball) {
            var size = PG.getSize(), c = cell(), w = F.cols * c.w;
            // From the nearer edge, unless sitting on that side of the ball
            // would leave him mostly off the screen.
            var fromLeft = ball.position.x < size.W / 2;
            var x = standX(ball, fromLeft ? 1 : -1, 'swat');
            if (x < -w * 0.15 || x + w > size.W + w * 0.15) fromLeft = !fromLeft;
            cat = {
                ball: ball,
                face: fromLeft ? 1 : -1,     // 1 faces right
                x: 0,                        // left edge of the sprite, px
                hop: 0,                      // px above the ground
                frame: 'sit',
                step: null,
                queue: [],
                swats: 0,
                tries: 0,
                visited: false,
                knocked: false,
                letGo: false,
                stepStart: now(),
                alpha: 1
            };
            // Only his ears and eyes, over the floor at that edge.
            var faceX = (cat.face > 0 ? F.meta.face[0] : F.cols - 1 - F.meta.face[0]) * c.w;
            cat.x = fromLeft ? 26 - faceX : size.W - 26 - faceX;
            cat.ground = groundAt(cat.x);
            cat.peekDrop = (F.rows - F.meta.face[1] - 1.5) * c.h;
            cat.sink = cat.peekDrop + 4;     // start out of sight
            go([{ kind: 'peek' }]);
            loop();
        }

        function go(steps) {
            cat.queue = steps.slice();
            next();
        }

        function next() {
            cat.step = cat.queue.shift() || null;
            cat.stepStart = now();
            if (!cat.step) leave();
        }

        // Where to stand so a paw lands on the ball: for a swat, the raised
        // paw's tip a little short of the ball's middle; for a pat, the paw
        // on the ground just short of the ball's near side.
        function standX(ball, face, pose) {
            var c = cell(), r = ball.circleRadius;
            var m = pose === 'pat' ? F.meta.patPaw : F.meta.swatPaw;
            var col = face > 0 ? m[0] : F.cols - 1 - m[0];
            var reach = pose === 'pat' ? r * 0.9 : r * 0.25;
            return ball.position.x - face * reach - (col + 0.5) * c.w;
        }

        function sitX(ball) { return standX(ball, cat.face, 'swat'); }

        function comeIn() {
            var c = cell(), size = PG.getSize();
            cat.sink = 0;
            cat.visited = true;
            cat.letGo = false;
            // His body starts off the screen at his edge, his head about
            // where the peek showed it, and he walks to the ball.
            cat.x = cat.face > 0 ? -F.cols * c.w * 0.75 : size.W - F.cols * c.w * 0.25;
            if (reduced()) {
                cat.x = sitX(cat.ball);
                cat.ground = groundAt(cat.x);
                cat.alpha = 0;
                go([{ kind: 'fadein' }, { kind: 'pose', frame: 'lookup', ms: 700 }, { kind: 'swat' }]);
            } else {
                go([{ kind: 'walk', to: function () { return sitX(cat.ball); } },
                    { kind: 'pose', frame: 'sit', ms: 300 },
                    { kind: 'pose', frame: 'lookup', ms: 650 },
                    { kind: 'wiggle', ms: 880 },
                    { kind: 'swat' }]);
            }
        }

        function afterSwat() {
            if (cat.knocked) {
                go([{ kind: 'pose', frame: 'sit', ms: 700 },
                    { kind: 'groom', ms: reduced() ? 600 : 1800 }].concat(rollOver(), [
                    { kind: 'pose', frame: 'sit', ms: 400 }]));
            } else if (cat.letGo) {
                patBall();
            } else if (cat.tries >= SWATS_MAX) {
                leave();
            } else {
                // Shuffle back under the ball if it has swung away.
                go([{ kind: 'walk', to: function () { return sitX(cat.ball); } },
                    { kind: 'pose', frame: 'lookup', ms: 300 },
                    { kind: 'wiggle', ms: reduced() ? 0 : 440 },
                    { kind: 'swat' }]);
            }
        }

        // Pleased with himself, he flops onto his side, rolls onto his back
        // and wriggles with his paws in the air, then rolls back and sits up.
        function rollOver() {
            if (reduced()) {
                return [{ kind: 'pose', frame: 'lie', ms: 500 },
                    { kind: 'pose', frame: 'back1', ms: 1200 },
                    { kind: 'pose', frame: 'lie', ms: 400 }];
            }
            return [{ kind: 'pose', frame: 'lie', ms: 550 },
                { kind: 'pose', frame: 'roll', ms: 200 },
                { kind: 'wriggle', ms: 1700 },
                { kind: 'pose', frame: 'roll', ms: 200 },
                { kind: 'pose', frame: 'lie', ms: 450 }];
        }

        function patBall() {
            go([{ kind: 'walk', to: function () { return standX(cat.ball, cat.face, 'pat'); } },
                { kind: 'pat' },
                { kind: 'pose', frame: 'sit', ms: 600 }]);
        }

        function leave() {
            var size = PG.getSize(), c = cell(), w = F.cols * c.w;
            var mid = cat.x + w / 2;
            cat.face = mid < size.W / 2 ? -1 : 1;
            cat.step = reduced()
                ? { kind: 'fadeout' }
                : { kind: 'walk', to: function () { return cat.face > 0 ? size.W + 8 : -w - 8; }, exit: true };
            cat.queue = [];
            cat.stepStart = now();
        }

        function gone() {
            quietUntil = now() + (cat && cat.visited ? COOLDOWN_MS : PEEK_COOLDOWN_MS);
            cat = null;
            if (view) { view.canvas.remove(); view = null; }
            for (var k in cache) cache[k].width = cache[k].height = 0;
            cache = {};
            cacheKey = '';
        }

        // ── Touching the ball ──
        // The paw tip, in page px, for a pose.
        function pawAt(name) {
            var c = cell(), size = PG.getSize();
            var m = name === 'leap' ? F.meta.leapPaw : name === 'pat' ? F.meta.patPaw : F.meta.swatPaw;
            var col = cat.face > 0 ? m[0] : F.cols - 1 - m[0];
            return {
                x: cat.x + (col + 0.5) * c.w,
                y: cat.ground - cat.hop - (F.rows - m[1] - 0.5) * c.h
            };
        }

        // A swat that lands while the ball is held jerks it on its string;
        // the second knocks it free. The ball is let go here, with the
        // enddrag Matter would fire: Matter itself only drops a held body on
        // its next update if mouse.button is still not 0 then, and on touch
        // any move in between sets the button back to 0. A finger still on
        // the glass would also grab the ball again on its next move, so the
        // constraint grabs nothing until that pointer is lifted.
        function knockFree(b) {
            cat.knocked = true;
            mouse.button = -1;
            if (mc.body === b) {
                mc.constraint.bodyB = mc.body = null;
                mc.constraint.pointB = null;
                Events.trigger(mc, 'enddrag', { mouse: mouse, body: b });
            }
            var filter = mc.collisionFilter, mask = filter.mask;
            filter.mask = 0;
            var restore = function (e) {
                // Another finger lifting leaves the knocked-out one down.
                if (e && ((e.touches && e.touches.length) || (e.pointerType === 'touch' && e.isPrimary === false))) return;
                filter.mask = mask;
                ['mouseup', 'touchend', 'touchcancel', 'pointerup'].forEach(function (n) {
                    window.removeEventListener(n, restore, true);
                });
                clearTimeout(timer);
            };
            var timer = setTimeout(restore, 10000);
            ['mouseup', 'touchend', 'touchcancel', 'pointerup'].forEach(function (n) {
                window.addEventListener(n, restore, true);
            });
            Body.setVelocity(b, { x: cat.face * 9, y: -5 });
            Body.setAngularVelocity(b, cat.face * 0.25);
        }

        // ── Running a step ──
        function run(t) {
            var s = cat.step, el = t - cat.stepStart, c = cell(), size = PG.getSize();
            if (!s) return;
            var speed = (size.W <= 600 ? 150 : 210) / 1000;   // px per ms, a trot
            switch (s.kind) {
                case 'peek': {
                    // Up from the floor over a third of a second, then wait
                    // for the dangling to go on or stop.
                    cat.frame = 'sit';
                    cat.sink = cat.peekDrop * (1 + Math.max(0, 1 - el / 350) * 0.6);
                    if (cat.sink < cat.peekDrop) cat.sink = cat.peekDrop;
                    var stillDangling = held === cat.ball && dangle > 0;
                    if (stillDangling) cat.missing = 0;
                    else cat.missing = (cat.missing || 0) + (t - (cat.lastT || t));
                    if (held === cat.ball && dangle >= tuning().come) { comeIn(); break; }
                    if (cat.missing > SINK_MS) {
                        cat.step = { kind: 'sinkaway' };
                        cat.stepStart = t;
                    }
                    break;
                }
                case 'sinkaway': {
                    cat.sink = cat.peekDrop + Math.min(1, el / 350) * (F.rows * c.h - cat.peekDrop);
                    if (el > 360) gone();
                    break;
                }
                case 'fadein':
                    cat.frame = 'sit';
                    cat.alpha = Math.min(1, el / 400);
                    if (el > 400) next();
                    break;
                case 'fadeout':
                    cat.alpha = Math.max(0, 1 - el / 400);
                    if (el > 400) gone();
                    break;
                case 'walk': {
                    // Walking to the ball he faces it, even when that means
                    // a short shuffle backwards: which way he faces decides
                    // where he sits, so turning with every small step would
                    // never settle. A side of the ball that would leave him
                    // mostly off the screen is swapped for the other one.
                    if (!s.exit) {
                        var w = F.cols * c.w;
                        var off = function (x) { return x < -w * 0.15 || x + w > size.W + w * 0.15; };
                        cat.face = cat.ball.position.x >= cat.x + w / 2 ? 1 : -1;
                        if (off(s.to())) {
                            cat.face = -cat.face;
                            if (off(s.to())) cat.face = -cat.face;
                        }
                    }
                    var target = s.to();
                    var dx = target - cat.x;
                    cat.frame = 'walk' + (1 + Math.floor(el / FRAME_MS) % 4);
                    var stepPx = speed * (t - (cat.lastT || t));
                    // Time enough to get there from where he started, so the
                    // cap only cuts short a target that keeps moving away.
                    if (s.limit === undefined) s.limit = Math.abs(dx) / speed + (s.exit ? 3000 : 2000);
                    if (Math.abs(dx) <= Math.max(stepPx, 1) || el > s.limit) {
                        if (s.exit) { gone(); return; }
                        cat.x = target;
                        next();
                    } else {
                        cat.x += dx > 0 ? stepPx : -stepPx;
                    }
                    break;
                }
                case 'pose':
                    cat.frame = s.frame;
                    if (el >= s.ms) next();
                    break;
                case 'wiggle':
                    cat.frame = Math.floor(el / 110) % 2 ? 'crouch2' : 'crouch1';
                    if (el >= s.ms) next();
                    break;
                case 'groom':
                    cat.frame = Math.floor(el / 300) % 2 ? 'groom2' : 'groom1';
                    if (el >= s.ms) next();
                    break;
                case 'wriggle':
                    cat.frame = Math.floor(el / 180) % 2 ? 'back2' : 'back1';
                    if (el >= s.ms) next();
                    break;
                case 'swat': swatStep(t, el, c, size); break;
                case 'pat': {
                    cat.frame = el < 160 ? 'crouch1' : 'pat';
                    if (el >= 160 && !s.done) {
                        s.done = true;
                        var p = pawAt('pat'), b = cat.ball;
                        if (held !== b && Math.abs(p.x - b.position.x) < b.circleRadius + 16) {
                            Body.setVelocity(b, { x: cat.face * 2.5, y: -1.5 });
                        }
                    }
                    if (el >= 520) next();
                    break;
                }
            }
        }

        // A ball hanging lower than his chest gets a low swipe of the paw
        // he pats with. Otherwise he rears up (or jumps, if the ball hangs
        // higher than a raised paw) and swats at the apex; a ball too high
        // even for a jump gets a leap that misses.
        function swatStep(t, el, c, size) {
            var s = cat.step, b = cat.ball, r = b.circleRadius;
            if (!s.plan) {
                if (cat.letGo || cat.knocked) { cat.hop = 0; afterSwat(); return; }
                if (b.position.y - r > cat.ground - F.rows * c.h * 0.3) {
                    s.plan = 'low';
                    s.height = 0;
                } else {
                    var reach = pawAt('swat');
                    var need = Math.max(0, reach.y - (b.position.y + r * 0.6));
                    var maxHop = F.rows * c.h * 1.1;
                    s.plan = need > maxHop ? 'miss' : 'swat';
                    s.height = Math.min(need, maxHop);
                }
                s.ms = s.height > 4 ? 520 : 300;
            }
            var k = Math.min(1, el / s.ms);
            cat.hop = reduced() ? 0 : s.height * 4 * k * (1 - k);
            cat.frame = s.plan === 'miss' ? 'leap' : s.plan === 'low' ? 'pat' : 'swat';
            if (!s.hit && k >= 0.5) {
                s.hit = true;
                cat.tries++;
                if (s.plan !== 'miss' && held === b && !cat.letGo) {
                    // The raised paw sweeps from its tip all the way down to
                    // his feet; the low paw reaches a ball's height below the
                    // ground he stands on.
                    var p = pawAt(s.plan === 'low' ? 'pat' : 'swat');
                    var across = Math.abs(p.x - b.position.x) < r + 24;
                    var along = s.plan === 'low'
                        ? b.position.y - r < p.y + r && b.position.y + r > p.y - F.rows * c.h * 0.5
                        : b.position.y + r > p.y - 10 && b.position.y - r < cat.ground - cat.hop;
                    if (across && along) {
                        cat.swats++;
                        if (cat.swats >= 2) knockFree(b);
                        else Body.setVelocity(b, { x: cat.face * 7, y: -4 });
                    }
                }
            }
            if (k >= 1) {
                cat.hop = 0;
                if (s.plan === 'miss') {
                    go([{ kind: 'pose', frame: 'lookup', ms: 900 }, { kind: 'pose', frame: 'sit', ms: 300 }]);
                } else {
                    afterSwat();
                }
            }
        }

        // ── Drawing ──
        // He is drawn in his own colours, a brown tabby with white, one set
        // per theme: on the light page his white fur is a warm light grey so
        // it still shows, and on the dark page his stripes are lifted a
        // little so they don't sink into the background. The eyes take the
        // site's green.
        var PALETTE = {
            light: { o: '#2e2219', d: '#4a3727', b: '#8a6b4e', l: '#b2946f', w: '#c9bfb2', n: '#e59aa6' },
            dark: { o: '#3f3024', d: '#5e4634', b: '#9d7a58', l: '#c6a47c', w: '#efe8de', n: '#f0a7b4' }
        };
        // The dark and mid coat are dense glyphs, the light coat lighter
        // ones, with a little texture from the cell's place in the grid.
        var GLYPHS = { o: '0', d: '0', b: '01', l: '1:', w: '0', e: '0', n: '0' };
        var cache = {}, cacheKey = '';

        function glyphFor(k, r, c) {
            var set = GLYPHS[k];
            return set.length === 1 ? set : set.charAt((r * 7 + c * 3) % 5 === 0 ? 1 : 0);
        }

        // A frame drawn once, per facing, cell size, theme and screen
        // resolution. Every cell of him is backed with the page's own
        // background colour, so the balls behind him don't show through and
        // he reads as one figure in front of them.
        function sprite(name, face, c, dpr) {
            var theme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
            var key = theme + c.w + dpr;
            if (key !== cacheKey) { cache = {}; cacheKey = key; }
            var id = name + face;
            if (cache[id]) return cache[id];
            var cs = getComputedStyle(root);
            var P = PALETTE[theme];
            var eye = cs.getPropertyValue('--chat').trim() || '#10b981';
            var bg = cs.getPropertyValue('--bg').trim() || (theme === 'dark' ? '#0f0f0f' : '#f0f0f0');
            var rows = F.frames[name], cols = F.cols;
            var cv = document.createElement('canvas');
            cv.width = Math.ceil(cols * c.w * dpr);
            cv.height = Math.ceil(F.rows * c.h * dpr);
            var g = cv.getContext('2d');
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            // The backing is a union of overlapping ovals, one per cell, so
            // his edge is soft rather than stepped like the grid.
            g.fillStyle = bg;
            g.globalAlpha = 0.9;
            g.beginPath();
            for (var pr = 0; pr < rows.length; pr++) {
                for (var pc = 0; pc < cols; pc++) {
                    if (rows[pr].charAt(face > 0 ? pc : cols - 1 - pc) !== ' ') {
                        var cx = pc * c.w + c.w / 2, cy = pr * c.h + c.h / 2;
                        g.moveTo(cx + c.w * 0.95, cy);
                        g.ellipse(cx, cy, c.w * 0.95, c.h * 0.7, 0, 0, Math.PI * 2);
                    }
                }
            }
            g.fill('nonzero');
            g.globalAlpha = 1;
            g.font = '700 ' + c.font + 'px "Roboto Condensed", Arial, sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            for (var r = 0; r < rows.length; r++) {
                for (var col = 0; col < cols; col++) {
                    var src = face > 0 ? col : cols - 1 - col;
                    var k = rows[r].charAt(src);
                    var style = k === 'e' ? eye : P[k];
                    if (!style) continue;
                    g.fillStyle = style;
                    g.fillText(glyphFor(k, r, src), col * c.w + c.w / 2, r * c.h + c.h / 2 + 0.5);
                }
            }
            return (cache[id] = cv);
        }

        function ensureView(c) {
            if (view && view.cw === c.w) return view;
            if (view) view.canvas.remove();
            var cv = document.createElement('canvas');
            cv.setAttribute('aria-hidden', 'true');
            // Above the balls and the physics canvas (which only draws during
            // pinball, when he is never here), so a ball added later doesn't
            // paint over him.
            cv.style.cssText = 'position:absolute;left:0;top:0;z-index:2;pointer-events:none;will-change:transform';
            cv.style.width = F.cols * c.w + 'px';
            cv.style.height = F.rows * c.h + 'px';
            playground.appendChild(cv);
            view = { canvas: cv, g: cv.getContext('2d'), cw: c.w, drawn: '', transform: '', opacity: '', clip: '' };
            return view;
        }

        function draw() {
            var c = cell(), size = PG.getSize();
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var v = ensureView(c);
            var sp = sprite(cat.frame, cat.face, c, dpr);
            var id = cat.frame + cat.face + cacheKey;
            if (v.drawn !== id) {
                if (v.canvas.width !== sp.width || v.canvas.height !== sp.height) {
                    v.canvas.width = sp.width;
                    v.canvas.height = sp.height;
                }
                v.g.clearRect(0, 0, sp.width, sp.height);
                v.g.drawImage(sp, 0, 0);
                v.drawn = id;
            }
            var y = cat.ground - F.rows * c.h - cat.hop + (cat.sink || 0);
            var tr = 'translate(' + Math.round(cat.x) + 'px,' + Math.round(y) + 'px)';
            if (v.transform !== tr) { v.canvas.style.transform = tr; v.transform = tr; }
            // While he is sunk below his ground (the peek), only what is above
            // it is drawn, so his head never covers a ball at the edge.
            var clip = cat.sink > 0 ? 'inset(0 0 ' + Math.round(cat.sink) + 'px 0)' : '';
            if (v.clip !== clip) { v.canvas.style.clipPath = clip; v.clip = clip; }
            var op = String(cat.alpha === undefined ? 1 : Math.round(cat.alpha * 100) / 100);
            if (v.opacity !== op) { v.canvas.style.opacity = op; v.opacity = op; }
        }

        // ── Loop ──
        function loop() { if (!raf) raf = requestAnimationFrame(frame); }

        function frame() {
            raf = 0;
            if (!cat) return;
            // Anything that takes the playground sends him off at once.
            if (blocked()) { gone(); return; }
            var t = now();
            // A card is open: the engine is stopped, and so is he.
            if (overlay && overlay.classList.contains('active') || !PG.runner.enabled) {
                cat.lastT = t;
                raf = requestAnimationFrame(frame);
                return;
            }
            run(t);
            if (!cat) return;
            // Settle onto what is under him, quickly but not in a jump, and
            // not while a swat or a leap has him in the air.
            if (!cat.hop) cat.ground += (groundAt(cat.x) - cat.ground) * 0.22;
            cat.lastT = t;
            draw();
            raf = requestAnimationFrame(frame);
        }
    }
})();
