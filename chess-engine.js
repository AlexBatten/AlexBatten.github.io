// ── Chess engine ──
// Rules and a deliberately weak computer opponent for the chess stage. No DOM:
// chess.js draws the board and calls into window.ChessEngine, and the same
// file loads in Node for the rules tests (perft) and the strength matches.
//
// The board is 0x88: square = rank * 16 + file, a1 = 0, h8 = 119. A square
// is on the board when (square & 0x88) === 0, which also rejects every
// negative index, so ray walks need no separate bounds check.

(function (root) {
    'use strict';

    var WHITE = 8, BLACK = 16;
    var PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
    var WK = 1, WQ = 2, BK = 4, BQ = 8;
    var F_CAPTURE = 1, F_DOUBLE = 2, F_EP = 4, F_CASTLE = 8;

    var KNIGHT_D = [33, 31, 18, 14, -33, -31, -18, -14];
    var KING_D = [1, -1, 16, -16, 15, 17, -15, -17];
    var BISHOP_D = [15, 17, -15, -17];
    var ROOK_D = [1, -1, 16, -16];
    var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    var PIECE_CHARS = ' pnbrqk';

    // Castling rights kept when a move touches a square. A king or rook
    // leaving its start square, or a rook captured on it, drops the right.
    var CASTLE_MASK = new Int8Array(128);
    for (var ci = 0; ci < 128; ci++) CASTLE_MASK[ci] = 15;
    CASTLE_MASK[0] = 15 & ~WQ;
    CASTLE_MASK[7] = 15 & ~WK;
    CASTLE_MASK[4] = 15 & ~(WK | WQ);
    CASTLE_MASK[112] = 15 & ~BQ;
    CASTLE_MASK[119] = 15 & ~BK;
    CASTLE_MASK[116] = 15 & ~(BK | BQ);

    // ── Moves ──
    // A move is one integer: from (7 bits), to (7), promotion piece type (3),
    // flags (4).
    function encode(from, to, flags, promo) { return from | (to << 7) | (promo << 14) | (flags << 17); }
    function mFrom(m) { return m & 127; }
    function mTo(m) { return (m >> 7) & 127; }
    function mPromo(m) { return (m >> 14) & 7; }
    function mFlags(m) { return m >> 17; }

    function sqName(sq) { return 'abcdefgh'.charAt(sq & 7) + ((sq >> 4) + 1); }
    function sqFromName(s) { return (s.charCodeAt(1) - 49) * 16 + (s.charCodeAt(0) - 97); }

    // ── Position ──
    function Position(fen) {
        this.board = new Int8Array(128);
        this.turn = WHITE;
        this.castle = 0;
        this.ep = -1;          // the square a pawn passed over on a double push
        this.half = 0;         // half-moves since a capture or pawn move
        this.full = 1;
        this.kings = [0, 0];   // indexed by colour >> 4: white 0, black 1
        this.stack = [];       // five numbers per move made, for unmake()
        this.load(fen || START);
    }

    Position.prototype.load = function (fen) {
        var parts = String(fen).trim().split(/\s+/);
        var rows = parts[0].split('/');
        if (rows.length !== 8) throw new Error('bad FEN: ' + fen);
        var b = this.board;
        for (var i = 0; i < 128; i++) b[i] = 0;
        for (var r = 0; r < 8; r++) {
            var rank = 7 - r, file = 0;
            for (var k = 0; k < rows[r].length; k++) {
                var ch = rows[r].charAt(k);
                if (ch >= '1' && ch <= '8') { file += +ch; continue; }
                var type = PIECE_CHARS.indexOf(ch.toLowerCase());
                if (type < 1 || file > 7) throw new Error('bad FEN: ' + fen);
                var color = ch === ch.toUpperCase() ? WHITE : BLACK;
                var sq = rank * 16 + file;
                b[sq] = color | type;
                if (type === KING) this.kings[color >> 4] = sq;
                file++;
            }
        }
        this.turn = parts[1] === 'b' ? BLACK : WHITE;
        var c = parts[2] || '-';
        this.castle = (c.indexOf('K') >= 0 ? WK : 0) | (c.indexOf('Q') >= 0 ? WQ : 0) |
                      (c.indexOf('k') >= 0 ? BK : 0) | (c.indexOf('q') >= 0 ? BQ : 0);
        this.ep = parts[3] && parts[3] !== '-' ? sqFromName(parts[3]) : -1;
        this.half = parseInt(parts[4], 10) || 0;
        this.full = parseInt(parts[5], 10) || 1;
        this.stack = [];
    };

    Position.prototype.fen = function () {
        var b = this.board, rows = [];
        for (var rank = 7; rank >= 0; rank--) {
            var row = '', empty = 0;
            for (var file = 0; file < 8; file++) {
                var p = b[rank * 16 + file];
                if (!p) { empty++; continue; }
                if (empty) { row += empty; empty = 0; }
                var ch = PIECE_CHARS.charAt(p & 7);
                row += p & WHITE ? ch.toUpperCase() : ch;
            }
            if (empty) row += empty;
            rows.push(row);
        }
        var c = (this.castle & WK ? 'K' : '') + (this.castle & WQ ? 'Q' : '') +
                (this.castle & BK ? 'k' : '') + (this.castle & BQ ? 'q' : '');
        return rows.join('/') + ' ' + (this.turn === WHITE ? 'w' : 'b') + ' ' + (c || '-') + ' ' +
            (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.half + ' ' + this.full;
    };

    // Is sq attacked by any piece of colour `by`?
    Position.prototype.attacked = function (sq, by) {
        var b = this.board, s, i, d, p;
        if (by === WHITE) {
            s = sq - 15; if (!(s & 0x88) && b[s] === (WHITE | PAWN)) return true;
            s = sq - 17; if (!(s & 0x88) && b[s] === (WHITE | PAWN)) return true;
        } else {
            s = sq + 15; if (!(s & 0x88) && b[s] === (BLACK | PAWN)) return true;
            s = sq + 17; if (!(s & 0x88) && b[s] === (BLACK | PAWN)) return true;
        }
        for (i = 0; i < 8; i++) {
            s = sq + KNIGHT_D[i];
            if (!(s & 0x88) && b[s] === (by | KNIGHT)) return true;
            s = sq + KING_D[i];
            if (!(s & 0x88) && b[s] === (by | KING)) return true;
        }
        for (i = 0; i < 4; i++) {
            d = BISHOP_D[i];
            for (s = sq + d; !(s & 0x88); s += d) {
                p = b[s];
                if (p) { if (p === (by | BISHOP) || p === (by | QUEEN)) return true; break; }
            }
            d = ROOK_D[i];
            for (s = sq + d; !(s & 0x88); s += d) {
                p = b[s];
                if (p) { if (p === (by | ROOK) || p === (by | QUEEN)) return true; break; }
            }
        }
        return false;
    };

    Position.prototype.inCheck = function (color) {
        return this.attacked(this.kings[color >> 4], color ^ 24);
    };

    function pushPromos(list, from, to, flags) {
        list.push(encode(from, to, flags, QUEEN), encode(from, to, flags, ROOK),
                  encode(from, to, flags, BISHOP), encode(from, to, flags, KNIGHT));
    }

    // Moves that obey piece movement but may leave the mover's king in check.
    // capturesOnly (for the quiescence search) keeps captures and promotions.
    Position.prototype.pseudo = function (list, capturesOnly) {
        var b = this.board, us = this.turn, them = us ^ 24;
        var fwd = us === WHITE ? 16 : -16;
        var startRank = us === WHITE ? 1 : 6, lastRank = us === WHITE ? 6 : 1;
        var capL = us === WHITE ? 15 : -17, capR = us === WHITE ? 17 : -15;
        for (var sq = 0; sq < 120; sq++) {
            if (sq & 0x88) { sq += 7; continue; }
            var p = b[sq];
            if (!p || !(p & us)) continue;
            var type = p & 7, to, q, i, d;
            if (type === PAWN) {
                var rank = sq >> 4;
                to = sq + fwd;
                if (!b[to] && (!capturesOnly || rank === lastRank)) {
                    if (rank === lastRank) pushPromos(list, sq, to, 0);
                    else {
                        list.push(encode(sq, to, 0, 0));
                        if (rank === startRank && !b[to + fwd]) list.push(encode(sq, to + fwd, F_DOUBLE, 0));
                    }
                }
                for (i = 0; i < 2; i++) {
                    to = sq + (i ? capR : capL);
                    if (to & 0x88) continue;
                    q = b[to];
                    if (q && (q & them)) {
                        if (rank === lastRank) pushPromos(list, sq, to, F_CAPTURE);
                        else list.push(encode(sq, to, F_CAPTURE, 0));
                    } else if (to === this.ep) {
                        list.push(encode(sq, to, F_CAPTURE | F_EP, 0));
                    }
                }
            } else if (type === KNIGHT || type === KING) {
                var steps = type === KNIGHT ? KNIGHT_D : KING_D;
                for (i = 0; i < 8; i++) {
                    to = sq + steps[i];
                    if (to & 0x88) continue;
                    q = b[to];
                    if (!q) { if (!capturesOnly) list.push(encode(sq, to, 0, 0)); }
                    else if (q & them) list.push(encode(sq, to, F_CAPTURE, 0));
                }
            } else {
                var dirs = type === BISHOP ? BISHOP_D : type === ROOK ? ROOK_D : KING_D;
                for (i = 0; i < dirs.length; i++) {
                    d = dirs[i];
                    for (to = sq + d; !(to & 0x88); to += d) {
                        q = b[to];
                        if (!q) { if (!capturesOnly) list.push(encode(sq, to, 0, 0)); continue; }
                        if (q & them) list.push(encode(sq, to, F_CAPTURE, 0));
                        break;
                    }
                }
            }
        }
        if (capturesOnly) return;
        // Castling: the rights guarantee king and rook are on their start
        // squares; the king may not start, cross or land on an attacked square.
        if (us === WHITE) {
            if ((this.castle & WK) && !b[5] && !b[6] &&
                !this.attacked(4, BLACK) && !this.attacked(5, BLACK) && !this.attacked(6, BLACK)) {
                list.push(encode(4, 6, F_CASTLE, 0));
            }
            if ((this.castle & WQ) && !b[3] && !b[2] && !b[1] &&
                !this.attacked(4, BLACK) && !this.attacked(3, BLACK) && !this.attacked(2, BLACK)) {
                list.push(encode(4, 2, F_CASTLE, 0));
            }
        } else {
            if ((this.castle & BK) && !b[117] && !b[118] &&
                !this.attacked(116, WHITE) && !this.attacked(117, WHITE) && !this.attacked(118, WHITE)) {
                list.push(encode(116, 118, F_CASTLE, 0));
            }
            if ((this.castle & BQ) && !b[115] && !b[114] && !b[113] &&
                !this.attacked(116, WHITE) && !this.attacked(115, WHITE) && !this.attacked(114, WHITE)) {
                list.push(encode(116, 114, F_CASTLE, 0));
            }
        }
    };

    Position.prototype.make = function (m) {
        var b = this.board, from = m & 127, to = (m >> 7) & 127, flags = m >> 17, promo = (m >> 14) & 7;
        var us = this.turn, p = b[from], captured = b[to];
        if (flags & F_EP) {
            var capSq = us === WHITE ? to - 16 : to + 16;
            captured = b[capSq];
            b[capSq] = 0;
        }
        this.stack.push(m, captured, this.castle, this.ep, this.half);
        b[to] = promo ? (us | promo) : p;
        b[from] = 0;
        if ((p & 7) === KING) {
            this.kings[us >> 4] = to;
            if (flags & F_CASTLE) {
                if (to > from) { b[from + 1] = b[from + 3]; b[from + 3] = 0; }
                else { b[from - 1] = b[from - 4]; b[from - 4] = 0; }
            }
        }
        this.castle &= CASTLE_MASK[from] & CASTLE_MASK[to];
        this.ep = (flags & F_DOUBLE) ? (from + to) >> 1 : -1;
        this.half = ((p & 7) === PAWN || captured) ? 0 : this.half + 1;
        if (us === BLACK) this.full++;
        this.turn = us ^ 24;
    };

    Position.prototype.unmake = function () {
        var s = this.stack;
        var half = s.pop(), ep = s.pop(), castle = s.pop(), captured = s.pop(), m = s.pop();
        var b = this.board, from = m & 127, to = (m >> 7) & 127, flags = m >> 17, promo = (m >> 14) & 7;
        var us = this.turn ^ 24;
        this.turn = us;
        this.castle = castle;
        this.ep = ep;
        this.half = half;
        if (us === BLACK) this.full--;
        var p = promo ? (us | PAWN) : b[to];
        b[from] = p;
        if (flags & F_EP) {
            b[to] = 0;
            b[us === WHITE ? to - 16 : to + 16] = captured;
        } else {
            b[to] = captured;
        }
        if ((p & 7) === KING) {
            this.kings[us >> 4] = from;
            if (flags & F_CASTLE) {
                if (to > from) { b[from + 3] = b[from + 1]; b[from + 1] = 0; }
                else { b[from - 4] = b[from - 1]; b[from - 1] = 0; }
            }
        }
    };

    Position.prototype.moves = function (capturesOnly) {
        var list = [], out = [], us = this.turn;
        this.pseudo(list, capturesOnly);
        for (var i = 0; i < list.length; i++) {
            this.make(list[i]);
            if (!this.attacked(this.kings[us >> 4], us ^ 24)) out.push(list[i]);
            this.unmake();
        }
        return out;
    };

    Position.prototype.perft = function (depth) {
        if (depth === 0) return 1;
        var moves = this.moves();
        if (depth === 1) return moves.length;
        var n = 0;
        for (var i = 0; i < moves.length; i++) {
            this.make(moves[i]);
            n += this.perft(depth - 1);
            this.unmake();
        }
        return n;
    };

    // Standard algebraic notation. `legal` is this position's legal moves,
    // needed to disambiguate (Nbd2, R1e1).
    Position.prototype.san = function (m, legal) {
        var b = this.board, from = mFrom(m), to = mTo(m), flags = mFlags(m), promo = mPromo(m);
        var p = b[from], type = p & 7, s;
        if (flags & F_CASTLE) {
            s = to > from ? 'O-O' : 'O-O-O';
        } else if (type === PAWN) {
            s = (flags & F_CAPTURE ? sqName(from).charAt(0) + 'x' : '') + sqName(to) +
                (promo ? '=' + 'NBRQ'.charAt(promo - 2) : '');
        } else {
            s = 'NBRQK'.charAt(type - 2);
            var clash = false, sameFile = false, sameRank = false;
            for (var i = 0; i < legal.length; i++) {
                var o = legal[i], of = mFrom(o);
                if (o === m || mTo(o) !== to || b[of] !== p) continue;
                clash = true;
                if ((of & 7) === (from & 7)) sameFile = true;
                if ((of >> 4) === (from >> 4)) sameRank = true;
            }
            if (clash) s += !sameFile ? sqName(from).charAt(0) : !sameRank ? sqName(from).charAt(1) : sqName(from);
            s += (flags & F_CAPTURE ? 'x' : '') + sqName(to);
        }
        this.make(m);
        if (this.inCheck(this.turn)) s += this.moves().length ? '+' : '#';
        this.unmake();
        return s;
    };

    // Identifies a position for the repetition rule: placement, side to move,
    // castling rights, and the en passant square only when a pawn can take.
    Position.prototype.key = function () {
        var f = this.fen().split(' ');
        var ep = '-';
        if (this.ep >= 0) {
            var moves = this.moves(true);
            for (var i = 0; i < moves.length; i++) if (mFlags(moves[i]) & F_EP) { ep = f[3]; break; }
        }
        return f[0] + ' ' + f[1] + ' ' + f[2] + ' ' + ep;
    };

    // Neither side can mate: bare kings, or a lone minor piece, or bishops
    // that all stand on one colour of square.
    Position.prototype.insufficient = function () {
        var b = this.board, minors = 0, bishopColors = 0, knights = 0;
        for (var sq = 0; sq < 120; sq++) {
            if (sq & 0x88) { sq += 7; continue; }
            var t = b[sq] & 7;
            if (!t || t === KING) continue;
            if (t === PAWN || t === ROOK || t === QUEEN) return false;
            minors++;
            if (t === KNIGHT) knights++;
            else bishopColors |= 1 << (((sq >> 4) + (sq & 7)) & 1);
        }
        if (minors <= 1) return true;
        return knights === 0 && bishopColors !== 3;
    };

    // ── Evaluation ──
    // Material plus piece-square tables, from Tomasz Michniewski's
    // "Simplified Evaluation Function". Tables are written from White's side,
    // rank 8 first, as they are usually printed.
    var VALUE = [0, 100, 320, 330, 500, 900, 0];
    var PST_SRC = {};
    PST_SRC[PAWN] = [
         0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0];
    PST_SRC[KNIGHT] = [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50];
    PST_SRC[BISHOP] = [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20];
    PST_SRC[ROOK] = [
          0,  0,  0,  0,  0,  0,  0,  0,
          5, 10, 10, 10, 10, 10, 10,  5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
         -5,  0,  0,  0,  0,  0,  0, -5,
          0,  0,  0,  5,  5,  0,  0,  0];
    PST_SRC[QUEEN] = [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20];
    var KING_MG = [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20];
    var KING_EG = [
        -50,-40,-30,-20,-20,-30,-40,-50,
        -30,-20,-10,  0,  0,-10,-20,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-30,  0,  0,  0,  0,-30,-30,
        -50,-30,-30,-30,-30,-30,-30,-50];

    // Expanded to 0x88 for each colour: PST[colour >> 4][type][square].
    var PST = [[], []], KMG = [[], []], KEG = [[], []];
    (function () {
        for (var c = 0; c < 2; c++) {
            for (var t = PAWN; t <= QUEEN; t++) PST[c][t] = new Int16Array(128);
            KMG[c] = new Int16Array(128);
            KEG[c] = new Int16Array(128);
            for (var sq = 0; sq < 128; sq++) {
                if (sq & 0x88) continue;
                var rank = sq >> 4, file = sq & 7;
                var idx = c === 0 ? (7 - rank) * 8 + file : rank * 8 + file;
                for (t = PAWN; t <= QUEEN; t++) PST[c][t][sq] = PST_SRC[t][idx];
                KMG[c][sq] = KING_MG[idx];
                KEG[c][sq] = KING_EG[idx];
            }
        }
    })();

    // Score in centipawns from the side to move's point of view.
    function evaluate(pos) {
        var b = pos.board, score = 0, phase = 0;
        for (var sq = 0; sq < 120; sq++) {
            if (sq & 0x88) { sq += 7; continue; }
            var p = b[sq];
            if (!p) continue;
            var t = p & 7, c = p >> 4, sign = c === 0 ? 1 : -1;
            if (t === KING) continue;
            score += sign * (VALUE[t] + PST[c][t][sq]);
            if (t === KNIGHT || t === BISHOP) phase += 1;
            else if (t === ROOK) phase += 2;
            else if (t === QUEEN) phase += 4;
        }
        // The king table slides from shelter to centralisation as the
        // pieces come off (24 is the starting non-pawn material).
        var mg = Math.min(phase, 24) / 24;
        var wk = pos.kings[0], bk = pos.kings[1];
        score += mg * (KMG[0][wk] - KMG[1][bk]) + (1 - mg) * (KEG[0][wk] - KEG[1][bk]);
        return pos.turn === WHITE ? score : -score;
    }

    // ── Search ──
    var MATE = 100000, INF = 1e9;

    // Captures first, most valuable victim by least valuable attacker, with
    // promotions ahead of quiet moves.
    function order(pos, moves) {
        var b = pos.board, keyed = [];
        for (var i = 0; i < moves.length; i++) {
            var m = moves[i], k = 0;
            if (mFlags(m) & F_CAPTURE) {
                var victim = mFlags(m) & F_EP ? PAWN : b[mTo(m)] & 7;
                k = 1000 + VALUE[victim] * 10 - VALUE[b[mFrom(m)] & 7];
            }
            if (mPromo(m)) k += VALUE[mPromo(m)];
            keyed.push([k, m]);
        }
        keyed.sort(function (a, c) { return c[0] - a[0]; });
        for (i = 0; i < moves.length; i++) moves[i] = keyed[i][1];
        return moves;
    }

    function Search(pos, opts) {
        this.pos = pos;
        this.quiesceOn = !!opts.quiesce;
        this.qmax = opts.qmax || 6;
        this.budget = opts.budget || 200000;
        this.nodes = 0;
        this.aborted = false;
    }

    Search.prototype.negamax = function (depth, alpha, beta, ply) {
        var pos = this.pos;
        if (++this.nodes > this.budget) { this.aborted = true; return 0; }
        if (depth <= 0) return this.quiesceOn ? this.quiesce(alpha, beta, 0) : evaluate(pos);
        var moves = pos.moves();
        if (!moves.length) return pos.inCheck(pos.turn) ? -MATE + ply : 0;
        order(pos, moves);
        for (var i = 0; i < moves.length; i++) {
            pos.make(moves[i]);
            var s = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
            pos.unmake();
            if (this.aborted) return 0;
            if (s >= beta) return beta;
            if (s > alpha) alpha = s;
        }
        return alpha;
    };

    // Captures only, until the position is quiet, so a search that stops
    // mid-exchange doesn't count a piece it is about to lose.
    Search.prototype.quiesce = function (alpha, beta, qd) {
        var pos = this.pos;
        if (++this.nodes > this.budget) { this.aborted = true; return 0; }
        var stand = evaluate(pos);
        if (stand >= beta) return beta;
        if (stand > alpha) alpha = stand;
        if (qd >= this.qmax) return alpha;
        var moves = order(pos, pos.moves(true));
        for (var i = 0; i < moves.length; i++) {
            pos.make(moves[i]);
            var s = -this.quiesce(-beta, -alpha, qd + 1);
            pos.unmake();
            if (this.aborted) return 0;
            if (s >= beta) return beta;
            if (s > alpha) alpha = s;
        }
        return alpha;
    };

    // Every root move with its own exact score (a full window for each), so
    // the level's noise can be added to real values before choosing.
    Search.prototype.rootScores = function (depth) {
        var pos = this.pos, moves = order(pos, pos.moves()), out = [];
        for (var i = 0; i < moves.length; i++) {
            pos.make(moves[i]);
            var s;
            if (depth <= 1) {
                // One ply: the position after the move, plus mate and
                // stalemate, which a bare evaluation can't see.
                var replies = pos.moves();
                if (!replies.length) s = pos.inCheck(pos.turn) ? MATE - 1 : 0;
                else s = -(this.quiesceOn ? this.quiesce(-INF, INF, 0) : evaluate(pos));
            } else {
                s = -this.negamax(depth - 1, -INF, INF, 1);
            }
            pos.unmake();
            if (this.aborted) break;
            out.push({ move: moves[i], score: s });
        }
        return out;
    };

    // ── Levels ──
    // Every level looks one move ahead and then follows the captures that
    // move allows, so it sees what it can win or lose in an exchange but not
    // a fork or a quiet mating threat. A deeper search plays well above 1000.
    // The levels differ in how far they follow an exchange (qmax), the noise
    // added to each candidate's score (so they misjudge close choices and
    // sometimes clear ones), and how often they play a random move instead.
    //
    // tools/chess-match.js puts easy about 300 Elo below medium and medium
    // about 200 below hard. The absolute labels are an estimate.
    var LEVELS = [
        { id: 'easy',   label: 'EASY',   elo: 500,  depth: 1, quiesce: true, qmax: 2, noise: 110, blunder: 0.10 },
        { id: 'medium', label: 'MEDIUM', elo: 800,  depth: 1, quiesce: true, qmax: 6, noise: 85,  blunder: 0.07 },
        { id: 'hard',   label: 'HARD',   elo: 1000, depth: 1, quiesce: true, qmax: 6, noise: 40,  blunder: 0.03 }
    ];

    // rng is injectable so tests and matches are reproducible.
    function chooseMove(pos, level, rng) {
        rng = rng || Math.random;
        var L = typeof level === 'object' ? level : LEVELS[level] || LEVELS[1];
        var legal = pos.moves();
        if (!legal.length) return 0;
        if (legal.length === 1) return legal[0];
        if (rng() < L.blunder) return legal[Math.floor(rng() * legal.length)];
        var search = new Search(pos, { quiesce: L.quiesce, qmax: L.qmax, budget: L.budget || 250000 });
        var scored = search.rootScores(L.depth);
        if (!scored.length) return legal[Math.floor(rng() * legal.length)];
        var best = null, bestKey = -INF;
        for (var i = 0; i < scored.length; i++) {
            var key = scored[i].score + (rng() * 2 - 1) * L.noise;
            if (key > bestKey) { bestKey = key; best = scored[i].move; }
        }
        return best;
    }

    // ── Game ──
    // A position plus what the rules need from its history: the moves played
    // (for undo and the move list) and the position keys (for repetition).
    function Game(fen) {
        this.pos = new Position(fen);
        this.start = this.pos.fen();
        this.history = [];     // { move, san }
        this.keys = [this.pos.key()];
    }

    Game.prototype.legal = function () { return this.pos.moves(); };

    Game.prototype.play = function (m) {
        var legal = this.pos.moves();
        if (legal.indexOf(m) < 0) return false;
        var san = this.pos.san(m, legal);
        this.pos.make(m);
        this.history.push({ move: m, san: san });
        this.keys.push(this.pos.key());
        return true;
    };

    Game.prototype.undo = function () {
        if (!this.history.length) return false;
        this.pos.unmake();
        this.history.pop();
        this.keys.pop();
        return true;
    };

    // { over, result: '1-0' | '0-1' | '1/2-1/2' | null, reason }
    Game.prototype.status = function () {
        var pos = this.pos, moves = pos.moves();
        var check = pos.inCheck(pos.turn);
        if (!moves.length) {
            if (check) return { over: true, result: pos.turn === WHITE ? '0-1' : '1-0', reason: 'checkmate', check: true };
            return { over: true, result: '1/2-1/2', reason: 'stalemate', check: false };
        }
        if (pos.half >= 100) return { over: true, result: '1/2-1/2', reason: 'fifty-move rule', check: check };
        if (pos.insufficient()) return { over: true, result: '1/2-1/2', reason: 'insufficient material', check: check };
        var key = this.keys[this.keys.length - 1], seen = 0;
        for (var i = 0; i < this.keys.length; i++) if (this.keys[i] === key) seen++;
        if (seen >= 3) return { over: true, result: '1/2-1/2', reason: 'repetition', check: check };
        return { over: false, result: null, reason: '', check: check };
    };

    var api = {
        WHITE: WHITE, BLACK: BLACK,
        PAWN: PAWN, KNIGHT: KNIGHT, BISHOP: BISHOP, ROOK: ROOK, QUEEN: QUEEN, KING: KING,
        F_CAPTURE: F_CAPTURE, F_EP: F_EP, F_CASTLE: F_CASTLE,
        START: START, LEVELS: LEVELS,
        Position: Position, Game: Game, Search: Search,
        evaluate: evaluate, chooseMove: chooseMove,
        encode: encode, from: mFrom, to: mTo, promo: mPromo, flags: mFlags,
        sqName: sqName, sqFromName: sqFromName
    };
    root.ChessEngine = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
