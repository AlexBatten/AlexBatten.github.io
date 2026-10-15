// Rules check for chess-engine.js: counts the legal move trees of the six
// standard perft positions and compares them with the published totals
// (chessprogramming.org/Perft_Results). Any move generation bug, in castling,
// en passant, promotion or check, changes these numbers.
//
// usage: node tools/chess-perft.js [maxDepth]

'use strict';

const E = require('../chess-engine.js');

const CASES = [
    ['start', E.START, [20, 400, 8902, 197281, 4865609]],
    ['kiwipete', 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862, 4085603]],
    ['position 3', '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238, 674624]],
    ['position 4', 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467, 422333]],
    ['position 5', 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379, 2103487]],
    ['position 6', 'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10', [46, 2079, 89890, 3894594]],
];

const maxDepth = +(process.argv[2] || 4);
let failed = 0;
for (const [name, fen, expected] of CASES) {
    const pos = new E.Position(fen);
    for (let d = 1; d <= Math.min(maxDepth, expected.length); d++) {
        const t = Date.now();
        const n = pos.perft(d);
        const ok = n === expected[d - 1];
        if (!ok) failed++;
        console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(10)} depth ${d}: ${n}${ok ? '' : ' expected ' + expected[d - 1]} (${Date.now() - t}ms)`);
        if (pos.fen() !== new E.Position(fen).fen()) { failed++; console.log('FAIL make/unmake left the position changed'); }
    }
}
console.log(failed ? `${failed} failure(s)` : 'all perft counts match');
process.exit(failed ? 1 : 0);
