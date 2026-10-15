// Self-play matches between the chess stage's levels, to check how far apart
// they are. Each pairing plays both colours from the start position with a
// seeded random source, so a run is reproducible. Games still going after
// MAX_PLIES are scored on material (a lead of 3 pawns or more wins).
//
// The score s converts to an Elo gap of 400 * log10(s / (1 - s)). The labels
// in chess-engine.js are spaced to match these gaps; their absolute values
// (500 / 800 / 1000) are an estimate, since there is no rated opponent here.
//
// usage: node tools/chess-match.js [gamesPerPairing]

'use strict';

const E = require('../chess-engine.js');

const GAMES = +(process.argv[2] || 60);
const MAX_PLIES = 300;

function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const RANDOM = { id: 'random', label: 'RANDOM', depth: 0, blunder: 1 };
const BOTS = [RANDOM].concat(E.LEVELS);

function material(pos) {
    const V = [0, 100, 320, 330, 500, 900, 0];
    let s = 0;
    for (let sq = 0; sq < 120; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        const p = pos.board[sq];
        if (p) s += (p & 8 ? 1 : -1) * V[p & 7];
    }
    return s;
}

// Returns 1 if white wins, 0 if black wins, 0.5 for a draw.
function play(white, black, seed) {
    const r = rng(seed);
    const g = new E.Game();
    for (let ply = 0; ply < MAX_PLIES; ply++) {
        const st = g.status();
        if (st.over) return st.result === '1-0' ? 1 : st.result === '0-1' ? 0 : 0.5;
        const bot = g.pos.turn === E.WHITE ? white : black;
        g.play(E.chooseMove(g.pos, bot, r));
    }
    const m = material(g.pos);
    return m >= 300 ? 1 : m <= -300 ? 0 : 0.5;
}

function match(a, b) {
    let score = 0, w = 0, d = 0, l = 0;
    for (let i = 0; i < GAMES; i++) {
        const aWhite = i % 2 === 0;
        const res = aWhite ? play(a, b, 1000 + i) : 1 - play(b, a, 1000 + i);
        score += res;
        if (res === 1) w++; else if (res === 0) l++; else d++;
    }
    const s = score / GAMES;
    const clamped = Math.min(0.99, Math.max(0.01, s));
    const elo = Math.round(400 * Math.log10(clamped / (1 - clamped)));
    return { s, w, d, l, elo };
}

const pairs = [];
for (let i = 1; i < BOTS.length; i++) pairs.push([BOTS[i], BOTS[i - 1]]);
pairs.push([BOTS[3], BOTS[1]]);
for (const [a, b] of pairs) {
    const t = Date.now();
    const r = match(a, b);
    console.log(`${a.label.padEnd(6)} vs ${b.label.padEnd(6)}  +${r.w} =${r.d} -${r.l}  score ${(r.s * 100).toFixed(1)}%  gap ~${r.elo} Elo  (${((Date.now() - t) / 1000).toFixed(1)}s)`);
}
