// ── 05 Education: the Rendering elective, rendered ──
// The Education text lists electives in Computer Graphics and Rendering. This
// renders a Cornell box live with a progressive path tracer: a box lit by a
// patch of light in its ceiling, its side walls in the site's blue and the
// chat ball's green, and three spheres for the homepage's three kinds of ball
// (the card grey of most of them, the blue of Hire, the green of the chat).
// Every frame adds samples to each pixel's average, so the picture starts as
// noise and clears to soft shadows and colour bleeding, then stops at a
// sample cap. Dragging with a mouse moves the light along the ceiling and
// starts the average over; on a touch screen a tap moves it instead, so a
// swipe still scrolls the card.
//
// Raw WebGL2 with one fragment shader that runs in two modes: trace a few
// samples per pixel and fold them into a running average held in a float
// texture (ping-ponged between two, as a pass can't read what it writes), or
// show that average tone-mapped on the canvas. With reduced motion the
// samples are gathered out of sight and the finished picture appears whole.
// Without WebGL2, a float render target or a working shader, the stage shows
// a still of the finished render instead (images/cornell-box-*.jpg).

(function () {
    'use strict';
    if (!window.MODAL_FX) return;

    // Samples per pixel at which the picture is finished, and the most per
    // pass, on desktop and on a phone. A phone's render has a sixth of the
    // pixels, so each can take more samples for the same work.
    var CAP = 512, CAP_NARROW = 1024;
    var MAX_BATCH = 4, MAX_BATCH_NARROW = 8;
    // Samples per pass when the passes aren't shown.
    var QUIET_BATCH = 16, QUIET_BATCH_NARROW = 32;
    var PAD = 6;              // above and below, room for the frame's outline
    var GAP = 10;             // between the frame and the caption
    var CAPTION_H = 12;
    // The camera looks into the box's open front, which is 2 wide and sits
    // FOCAL in front of it, so the opening fills the frame. Must match the
    // shader.
    var CAM_Z = 3.6, FOCAL = 2.6;
    // How far the light's centre may go from the middle of the ceiling: its
    // half size (0.26 by 0.2, in the shader) plus a margin short of the walls.
    var LIGHT_MAX = [0.70, 0.76];

    // The still shown where the tracer can't run: the finished desktop render
    // (CAP samples, the light in the middle of the ceiling) in each theme,
    // since the grey and blue spheres follow the card and accent colours.
    var STILL = { light: '/images/cornell-box-light.jpg', dark: '/images/cornell-box-dark.jpg' };
    // Set once the tracer has failed in this page, so later opens go straight
    // to the still rather than asking for a context that won't come.
    var noTracer = false;

    var TEXT = {
        en: {
            traced: 'path traced',
            samples: function (n) { return n === 1 ? 'sample' : 'samples'; },
            drag: 'drag to move the light',
            tap: 'tap to move the light'
        },
        da: {
            traced: 'path tracing',
            samples: function (n) { return n === 1 ? 'sample' : 'samples'; },
            drag: 'træk for at flytte lyset',
            tap: 'tryk for at flytte lyset'
        }
    };

    var VERTEX = [
        '#version 300 es',
        // One triangle that covers the whole target, from the vertex index
        // alone, so no buffers are needed.
        'void main() {',
        '    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));',
        '    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);',
        '}'
    ].join('\n');

    var FRAGMENT = [
        '#version 300 es',
        'precision highp float;',
        'precision highp int;',
        'uniform int uMode;',           // 0: trace into the average, 1: show it
        'uniform sampler2D uAcc;',      // the running average so far
        'uniform uint uSeed;',
        'uniform int uSpp;',            // samples per pixel in this pass
        'uniform float uWeight;',       // this pass's share of the new average
        'uniform vec2 uLight;',         // the light's centre on the ceiling (x, z)
        'uniform vec3 uGrey;',
        'uniform vec3 uBlue;',
        'uniform vec3 uGreen;',
        'out vec4 outColor;',

        'const float PI = 3.14159265;',
        'const float CAM_Z = 3.6;',
        'const float FOCAL = 2.6;',
        'const vec2 LIGHT_HALF = vec2(0.26, 0.2);',
        'const float LIGHT_AREA = 4.0 * 0.26 * 0.2;',
        'const vec3 LIGHT = vec3(15.0, 14.2, 13.0);',
        'const vec3 WHITE = vec3(0.74);',
        'const float EXPOSURE = 2.0;',
        'const int MAX_BOUNCES = 5;',
        'const float INDIRECT_MAX = 0.75;',

        // The box is the cube from -1 to 1, open at z = 1 where the camera
        // looks in. Spheres rest on its floor: centre, radius.
        'const vec4 S_GREY = vec4(0.06, -0.6, -0.4, 0.4);',
        'const vec4 S_BLUE = vec4(0.5, -0.72, 0.3, 0.28);',
        'const vec4 S_GREEN = vec4(-0.5, -0.76, 0.36, 0.24);',
        'const int LEFT = 0, RIGHT = 1, FLOOR = 2, CEIL = 3, BACK = 4, GREY = 5, BLUE = 6, GREEN = 7, LAMP = 8;',

        // PCG hash as the random number generator, one stream per pixel and pass.
        'uint rs;',
        'uint pcg(uint v) {',
        '    uint s = v * 747796405u + 2891336453u;',
        '    uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;',
        '    return (w >> 22u) ^ w;',
        '}',
        'float rnd() { rs = pcg(rs); return float(rs >> 8u) / 16777216.0; }',

        'float sphere(vec3 ro, vec3 rd, vec4 s) {',
        '    vec3 oc = ro - s.xyz;',
        '    float b = dot(oc, rd);',
        '    float h = b * b - dot(oc, oc) + s.w * s.w;',
        '    if (h < 0.0) return -1.0;',
        '    float t = -b - sqrt(h);',
        '    return t > 1e-4 ? t : -1.0;',
        '}',

        // The nearest surface along a ray from inside the box: its distance,
        // id and normal. id is -1 when the ray leaves through the open front.
        'float hit(vec3 ro, vec3 rd, out int id, out vec3 n) {',
        '    vec3 tb = (1.0 - ro * sign(rd)) / max(abs(rd), vec3(1e-6));',
        '    float t = min(tb.x, min(tb.y, tb.z));',
        '    if (t == tb.x) { id = rd.x < 0.0 ? LEFT : RIGHT; n = vec3(-sign(rd.x), 0.0, 0.0); }',
        '    else if (t == tb.y) { id = rd.y < 0.0 ? FLOOR : CEIL; n = vec3(0.0, -sign(rd.y), 0.0); }',
        '    else if (rd.z < 0.0) { id = BACK; n = vec3(0.0, 0.0, 1.0); }',
        '    else { id = -1; n = vec3(0.0); }',
        '    float s = sphere(ro, rd, S_GREY);',
        '    if (s > 0.0 && s < t) { t = s; id = GREY; n = (ro + rd * s - S_GREY.xyz) / S_GREY.w; }',
        '    s = sphere(ro, rd, S_BLUE);',
        '    if (s > 0.0 && s < t) { t = s; id = BLUE; n = (ro + rd * s - S_BLUE.xyz) / S_BLUE.w; }',
        '    s = sphere(ro, rd, S_GREEN);',
        '    if (s > 0.0 && s < t) { t = s; id = GREEN; n = (ro + rd * s - S_GREEN.xyz) / S_GREEN.w; }',
        '    if (id == CEIL) {',
        '        vec3 p = ro + rd * t;',
        '        if (all(lessThan(abs(p.xz - uLight), LIGHT_HALF))) id = LAMP;',
        '    }',
        '    return t;',
        '}',

        // The box is convex, so between two points inside it only a sphere
        // can be in the way.
        'bool blocked(vec3 ro, vec3 rd, float d) {',
        '    float s = sphere(ro, rd, S_GREY);',
        '    if (s > 0.0 && s < d) return true;',
        '    s = sphere(ro, rd, S_BLUE);',
        '    if (s > 0.0 && s < d) return true;',
        '    s = sphere(ro, rd, S_GREEN);',
        '    return s > 0.0 && s < d;',
        '}',

        'vec3 albedo(int id) {',
        '    if (id == LEFT || id == BLUE) return uBlue;',
        '    if (id == RIGHT || id == GREEN) return uGreen;',
        '    if (id == GREY) return uGrey;',
        '    return WHITE;',
        '}',

        // A direction around n with cosine-weighted odds, which cancels the
        // cosine and the 1 / pi of a matte surface.
        'vec3 cosine(vec3 n) {',
        '    float a = 2.0 * PI * rnd(), r2 = rnd(), r = sqrt(r2);',
        '    vec3 u = normalize(cross(abs(n.x) > 0.5 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), n));',
        '    vec3 v = cross(n, u);',
        '    return normalize(u * (cos(a) * r) + v * (sin(a) * r) + n * sqrt(1.0 - r2));',
        '}',

        // One light path. At each matte surface a point on the lamp is
        // sampled directly (next event estimation), so a path that later
        // happens to hit the lamp adds nothing. The spheres are matte under a
        // clear coat: a path either bounces off the coat as a mirror or goes
        // on into the matte layer, and a lamp seen through mirrors alone
        // counts, which gives the highlights without the slow-to-clear
        // caustics.
        'vec3 radiance(vec3 ro, vec3 rd) {',
        '    vec3 L = vec3(0.0), T = vec3(1.0);',
        '    bool direct = true;',
        '    for (int b = 0; b < MAX_BOUNCES; b++) {',
        '        int id; vec3 n;',
        '        float t = hit(ro, rd, id, n);',
        '        if (id < 0) break;',
        '        vec3 p = ro + rd * t;',
        '        if (id == LAMP) { if (direct) L += T * LIGHT; break; }',
        '        vec3 a = albedo(id);',
        '        if (id >= GREY) {',
        '            float c = clamp(-dot(rd, n), 0.0, 1.0);',
        '            float f = 0.04 + 0.96 * pow(1.0 - c, 5.0);',
        // The odds of taking the coat follow its share of the light rather
        // than Fresnel alone, and each branch is weighted back: a dark sphere
        // is then mostly reflection and clears as fast as a bright one.
        '            float m = clamp(f / (f + (1.0 - f) * dot(a, vec3(0.2126, 0.7152, 0.0722))), 0.05, 0.95);',
        '            if (rnd() < m) { T *= f / m; ro = p + n * 1e-4; rd = reflect(rd, n); continue; }',
        '            T *= (1.0 - f) / (1.0 - m);',
        '        }',
        '        vec3 q = vec3(uLight.x + (rnd() * 2.0 - 1.0) * LIGHT_HALF.x, 1.0,',
        '                      uLight.y + (rnd() * 2.0 - 1.0) * LIGHT_HALF.y);',
        '        vec3 dl = q - p;',
        '        float d2 = dot(dl, dl), d = sqrt(d2);',
        '        vec3 l = dl / d;',
        '        float cs = dot(n, l);',
        '        if (cs > 0.0 && l.y > 0.0 && !blocked(p + n * 1e-4, l, d)) {',
        '            vec3 e = T * a * LIGHT * (cs * l.y * LIGHT_AREA / (PI * d2));',
        // Past the first surface the light is capped: a bounce that lands
        // right beside the lamp would otherwise leave a bright speck that
        // takes thousands of samples to average away.
        '            L += b == 0 ? e : min(e, vec3(INDIRECT_MAX));',
        '        }',
        '        direct = false;',
        '        T *= a;',
        // Russian roulette: past the second bounce a dim path ends early,
        // and one that survives is weighted up to make up for those that don't.
        '        if (b >= 2) {',
        '            float k = max(T.r, max(T.g, T.b));',
        '            if (rnd() > k) break;',
        '            T /= k;',
        '        }',
        '        ro = p + n * 1e-4;',
        '        rd = cosine(n);',
        '    }',
        '    return L;',
        '}',

        'void main() {',
        '    ivec2 px = ivec2(gl_FragCoord.xy);',
        '    if (uMode == 1) {',
        '        vec3 c = texelFetch(uAcc, px, 0).rgb * EXPOSURE;',
        // A fitted ACES curve, then gamma, then a little dither against banding.
        '        c = clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);',
        '        c = pow(c, vec3(1.0 / 2.2));',
        '        rs = pcg(uint(px.x) * 1973u + uint(px.y) * 9277u + 1u);',
        '        outColor = vec4(c + (rnd() - 0.5) / 255.0, 1.0);',
        '        return;',
        '    }',
        '    vec2 res = vec2(textureSize(uAcc, 0));',
        '    rs = pcg(uint(px.x) + pcg(uint(px.y) + pcg(uSeed)));',
        '    vec3 sum = vec3(0.0);',
        '    for (int i = 0; i < 32; i++) {',
        '        if (i >= uSpp) break;',
        // A random point in the pixel each sample, which also antialiases.
        // The 0.992 keeps the frame a hair inside the opening.
        '        vec2 uv = (vec2(px) + vec2(rnd(), rnd())) / res * 2.0 - 1.0;',
        '        vec3 rd = normalize(vec3(uv * 0.992, -FOCAL));',
        '        vec3 ro = vec3(0.0, 0.0, CAM_Z) + rd * ((CAM_Z - 1.0) / -rd.z);',
        '        sum += radiance(ro, rd);',
        '    }',
        '    vec3 s = sum / float(uSpp);',
        '    vec3 prev = texelFetch(uAcc, px, 0).rgb;',
        '    outColor = vec4(uWeight >= 1.0 ? s : mix(prev, s, uWeight), 1.0);',
        '}'
    ].join('\n');

    // ── Colour ──
    function hexRgb(h, fallback) {
        var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((h || '').trim());
        if (!m) return fallback;
        var s = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
        var v = parseInt(s, 16);
        return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
    }

    // The shader works in linear light; the site's colours are sRGB.
    function linear(rgb) {
        return rgb.map(function (c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
    }

    // ── Grade ruler ──
    // The grade ruler under the entry's text (gradeRuler() in content.js)
    // draws itself in with CSS animations that start as the card opens. On a
    // short screen it sits below the fold, where it would be finished before
    // anyone scrolled to it, so its animations are held paused on their
    // first frame (.gr-hold in styles.css) until most of it is in view.
    //
    // The factory can mount after the animations have begun, when this file
    // arrives late on a first open. Out of sight they are restarted and held;
    // partly in sight they are left running rather than jumped back to the
    // start. Returns a function that stops watching and lets a held ruler
    // play, for when the stage is torn down while the card stays open (a
    // phone turned on its side).
    var RULER_SHOWN = 0.75;     // share of the ruler in view that starts it

    function holdRuler(api) {
        var content = document.getElementById('modal-content');
        var ruler = content ? content.querySelector('.grade-ruler') : null;
        var modal = document.getElementById('modal');
        var none = function () {};
        if (!ruler || !modal || !window.IntersectionObserver || api.reduced()) return none;
        var mb = modal.getBoundingClientRect(), rb = ruler.getBoundingClientRect();
        var shown = Math.max(0, Math.min(mb.bottom, rb.bottom) - Math.max(mb.top, rb.top)) / (rb.height || 1);
        var late = api.sinceOpen() > 120;
        if (shown >= RULER_SHOWN || (late && shown > 0)) return none;
        ruler.classList.add('gr-hold');
        // Taking the ruler out of the layout for a moment drops its running
        // animations; put back, they start over, paused by the hold.
        if (late) {
            ruler.style.display = 'none';
            void ruler.offsetWidth;
            ruler.style.display = '';
        }
        var io = new IntersectionObserver(function (entries) {
            if (entries[entries.length - 1].intersectionRatio < RULER_SHOWN) return;
            release();
        }, { root: modal, threshold: RULER_SHOWN });
        function release() {
            io.disconnect();
            ruler.classList.remove('gr-hold');
        }
        io.observe(ruler);
        return release;
    }

    MODAL_FX.register('education', function (stage, api) {
        var releaseRuler = holdRuler(api);
        var T = TEXT[api.lang()] || TEXT.en;
        var reduced = api.reduced();
        var narrow = api.narrow();
        var cap = narrow ? CAP_NARROW : CAP;
        var fine = !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);
        var dead = false, active = true, raf = 0, failed = false;
        var gl = null, prog = null, par = null, u = null, fmt = null;
        var tex = [], fbo = [], cur = 0, pending = false, lost = false;
        var size = 0, res = 0;
        // count: samples in the average. restart: start it over on the next
        // pass. hidden: don't show passes until the cap. fast: big passes.
        var count = 0, seed = 1, restart = true, hidden = reduced, fast = reduced, shown = false;
        var light = [0, 0];
        var drag = null, tap = null, lastCount = -1;
        var still = null;

        // ── DOM ──
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;' +
            'align-items:center;justify-content:center';
        var canvas = document.createElement('canvas');
        canvas.style.cssText = 'display:block;flex:none;outline-offset:3px;touch-action:pan-y;' +
            (fine ? 'cursor:grab' : '');
        var caption = document.createElement('div');
        caption.style.cssText = 'flex:none;margin-top:' + GAP + 'px;height:' + CAPTION_H + 'px;' +
            'font:400 10px/' + CAPTION_H + 'px "Roboto Condensed", Arial, sans-serif;letter-spacing:0.04em;' +
            'white-space:nowrap;font-variant-numeric:tabular-nums;user-select:none';
        var counter = document.createElement('span');
        var hint = document.createElement('span');
        caption.appendChild(counter);
        caption.appendChild(hint);
        hint.textContent = '  ·  ' + (fine ? T.drag : T.tap);
        hint.style.whiteSpace = 'pre';
        wrap.appendChild(canvas);
        wrap.appendChild(caption);
        stage.appendChild(wrap);

        function paintChrome() {
            var c = api.colors();
            canvas.style.outline = '1px solid rgba(' + c.paper + ',0.3)';
            if (still) still.style.outline = canvas.style.outline;
            counter.style.color = 'rgba(' + c.paper + ',0.6)';
            hint.style.color = 'rgba(' + c.paper + ',0.4)';
        }

        function writeCount() {
            if (count === lastCount) return;
            lastCount = count;
            counter.textContent = T.traced + ', ' + count + ' ' + T.samples(count);
        }

        // A square as tall as the stage allows above the caption. On a phone
        // the render has one pixel per CSS pixel, about half the screen's own
        // resolution; elsewhere it follows the screen up to 2x.
        function layout() {
            var H = stage.clientHeight || (api.narrow() ? 180 : 220);
            var W = stage.clientWidth || 520;
            size = Math.max(64, Math.min(H - 2 * PAD - GAP - CAPTION_H, W - 2 * PAD));
            canvas.style.width = size + 'px';
            canvas.style.height = size + 'px';
            if (still) still.style.width = still.style.height = size + 'px';
            var scale = api.narrow() ? 1 : Math.min(window.devicePixelRatio || 1, 2);
            var r = Math.max(32, Math.round(size * scale));
            if (r === res) return false;
            res = r;
            canvas.width = canvas.height = r;
            return true;
        }

        // ── WebGL ──
        function compile(type, src) {
            var s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return s;
        }

        // Linking is started here and finished in the first frames, so with
        // KHR_parallel_shader_compile the driver builds it off this thread.
        function buildProgram() {
            var vs = compile(gl.VERTEX_SHADER, VERTEX), fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
            prog = gl.createProgram();
            gl.attachShader(prog, vs);
            gl.attachShader(prog, fs);
            gl.linkProgram(prog);
            // Flagged for deletion now, freed with the program.
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            pending = true;
        }

        // 1 linked, 0 still compiling, -1 failed.
        function programState() {
            if (par && !gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR)) return 0;
            return gl.getProgramParameter(prog, gl.LINK_STATUS) ? 1 : -1;
        }

        function useProgram() {
            u = {};
            ['uMode', 'uAcc', 'uSeed', 'uSpp', 'uWeight', 'uLight', 'uGrey', 'uBlue', 'uGreen'].forEach(function (n) {
                u[n] = gl.getUniformLocation(prog, n);
            });
            gl.useProgram(prog);
            gl.uniform1i(u.uAcc, 0);
            applyColors();
        }

        function applyColors() {
            if (!gl || !u) return;
            var c = api.colors();
            var chat = getComputedStyle(document.documentElement).getPropertyValue('--chat');
            gl.useProgram(prog);
            gl.uniform3fv(u.uGrey, linear(hexRgb(c.card, [0.23, 0.23, 0.23])));
            gl.uniform3fv(u.uBlue, linear(hexRgb(c.accent, [0.23, 0.51, 0.96])));
            gl.uniform3fv(u.uGreen, linear(hexRgb(chat, [0.063, 0.725, 0.506])));
        }

        // The average needs a float target: 32-bit where the GPU can render
        // to it, else 16-bit, checked on a 1x1 framebuffer.
        function pickFormat() {
            var options = [];
            if (gl.getExtension('EXT_color_buffer_float')) {
                options.push({ internal: gl.RGBA32F, type: gl.FLOAT }, { internal: gl.RGBA16F, type: gl.HALF_FLOAT });
            } else if (gl.getExtension('EXT_color_buffer_half_float')) {
                options.push({ internal: gl.RGBA16F, type: gl.HALF_FLOAT });
            }
            for (var i = 0; i < options.length; i++) {
                var t = gl.createTexture(), f = gl.createFramebuffer();
                gl.bindTexture(gl.TEXTURE_2D, t);
                gl.texImage2D(gl.TEXTURE_2D, 0, options[i].internal, 1, 1, 0, gl.RGBA, options[i].type, null);
                gl.bindFramebuffer(gl.FRAMEBUFFER, f);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
                var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.deleteFramebuffer(f);
                gl.deleteTexture(t);
                if (ok) return options[i];
            }
            return null;
        }

        function makeTargets() {
            for (var i = 0; i < 2; i++) {
                if (!tex[i]) tex[i] = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, tex[i]);
                gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, res, res, 0, gl.RGBA, fmt.type, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                if (!fbo[i]) fbo[i] = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[i]);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex[i], 0);
            }
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, res, res);
        }

        function initGL() {
            fmt = pickFormat();
            if (!fmt) return false;
            par = gl.getExtension('KHR_parallel_shader_compile');
            tex = [];
            fbo = [];
            u = null;
            makeTargets();
            buildProgram();
            return true;
        }

        function freeGL() {
            if (!gl) return;
            if (!gl.isContextLost()) {
                tex.forEach(function (t) { gl.deleteTexture(t); });
                fbo.forEach(function (f) { gl.deleteFramebuffer(f); });
                if (prog) gl.deleteProgram(prog);
            }
            tex = [];
            fbo = [];
            prog = null;
            u = null;
        }

        // ── Passes ──
        // The one program, texture unit 0 and the viewport (the canvas and the
        // textures are the same size) are set once, so a pass only binds.
        //
        // Traces spp more samples per pixel into the other texture, which then
        // holds the new average.
        function trace(spp) {
            var dst = 1 - cur;
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo[dst]);
            gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
            gl.uniform1i(u.uMode, 0);
            gl.uniform1ui(u.uSeed, seed++ >>> 0);
            gl.uniform1i(u.uSpp, spp);
            gl.uniform1f(u.uWeight, spp / (count + spp));
            gl.uniform2f(u.uLight, light[0], light[1]);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            cur = dst;
            count += spp;
        }

        function present() {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.bindTexture(gl.TEXTURE_2D, tex[cur]);
            gl.uniform1i(u.uMode, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            writeCount();
            if (!shown) {
                shown = true;
                api.ready();
            }
        }

        // One sample per pixel per frame at first, so the noise is seen to
        // clear, then more per frame as each adds less.
        function batch() {
            if (fast) return narrow ? QUIET_BATCH_NARROW : QUIET_BATCH;
            return count < 48 ? 1 : count < 160 ? 2 : narrow ? MAX_BATCH_NARROW : MAX_BATCH;
        }

        // ── Loop ──
        function wake() {
            if (dead || !gl || lost || !active || raf) return;
            if (!pending && !restart && count >= cap) return;
            raf = requestAnimationFrame(frame);
        }

        function stop() {
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
        }

        function frame() {
            raf = 0;
            if (dead || !gl || lost || !active) return;
            if (pending) {
                var st = programState();
                if (st === 0) { raf = requestAnimationFrame(frame); return; }
                if (st < 0) { fail(); return; }
                pending = false;
                useProgram();
            }
            if (restart) { count = 0; restart = false; }
            trace(Math.min(batch(), cap - count));
            var done = count >= cap;
            if (!hidden || done) present();
            if (done) {
                hidden = false;
                fast = reduced;
                return;
            }
            raf = requestAnimationFrame(frame);
        }

        function fail() {
            if (failed) return;
            failed = true;
            noTracer = true;
            stop();
            release();
            showStill();
        }

        // ── Still ──
        // The finished render as a picture, in the same frame and size as the
        // canvas, with the caption giving its sample count. Nothing can be
        // dragged, so the hint goes. If the picture won't load either, the
        // stage folds.
        function showStill() {
            still = document.createElement('img');
            still.alt = '';
            still.draggable = false;
            still.style.cssText = 'display:block;flex:none;outline-offset:3px';
            still.onload = function () { if (!dead) api.ready(); };
            still.onerror = function () { if (!dead) api.fail(); };
            canvas.style.display = 'none';
            wrap.insertBefore(still, canvas);
            hint.style.display = 'none';
            count = CAP;
            writeCount();
            layout();
            paintChrome();
            stillSource();
        }

        function stillSource() {
            var dark = api.colors().paper.replace(/\s/g, '') === '0,0,0';
            var src = dark ? STILL.dark : STILL.light;
            if (still.getAttribute('src') !== src) still.src = src;
        }

        // Hand the context back now rather than at garbage collection:
        // browsers allow a page only a handful at once.
        function release() {
            canvas.removeEventListener('webglcontextlost', onLost);
            canvas.removeEventListener('webglcontextrestored', onRestored);
            freeGL();
            if (gl) {
                var ext = gl.getExtension('WEBGL_lose_context');
                if (ext) ext.loseContext();
            }
            gl = null;
        }

        // ── Light ──
        function setLight(x, z) {
            x = Math.max(-LIGHT_MAX[0], Math.min(LIGHT_MAX[0], x));
            z = Math.max(-LIGHT_MAX[1], Math.min(LIGHT_MAX[1], z));
            if (Math.abs(x - light[0]) < 1e-4 && Math.abs(z - light[1]) < 1e-4) return;
            light[0] = x;
            light[1] = z;
            restart = true;
            hidden = false;
            fast = reduced;
            wake();
        }

        // ── Pointer ──
        // A mouse drags the light: across follows the pointer at the depth of
        // the ceiling's middle, and half the frame's height up or down takes
        // it from the front of the ceiling to the back. A touch only taps,
        // which sends the light across to where the finger was.
        function onDown(e) {
            if (e.pointerType === 'mouse') {
                if (e.button !== 0) return;
                drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: light[0], lz: light[1] };
                try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
                canvas.style.cursor = 'grabbing';
                e.preventDefault();
            } else {
                tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
            }
        }
        function onMove(e) {
            if (drag && e.pointerId === drag.id) {
                var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
                setLight(drag.lx + dx * 2 / size * CAM_Z / FOCAL, drag.lz - dy * 2 * LIGHT_MAX[1] / (size / 2));
            } else if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 10) {
                tap = null;
            }
        }
        function onUp(e) {
            if (drag && e.pointerId === drag.id) {
                drag = null;
                try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
                canvas.style.cursor = fine ? 'grab' : '';
            } else if (tap && e.pointerId === tap.id) {
                var b = canvas.getBoundingClientRect();
                if (b.width && e.timeStamp - tap.t < 600) {
                    setLight(((e.clientX - b.left) / b.width * 2 - 1) * CAM_Z / FOCAL, light[1]);
                }
                tap = null;
            }
        }
        function onCancel() {
            tap = null;
            if (drag) {
                drag = null;
                canvas.style.cursor = fine ? 'grab' : '';
            }
        }
        canvas.addEventListener('pointerdown', onDown);
        canvas.addEventListener('pointermove', onMove);
        canvas.addEventListener('pointerup', onUp);
        canvas.addEventListener('pointercancel', onCancel);

        // ── Context loss ──
        // A lost context is rebuilt when the browser hands it back, and the
        // picture traced again from the start.
        function onLost(e) {
            e.preventDefault();
            lost = true;
            stop();
            // Its objects went with it; a later freeGL() must not delete them
            // through the restored context.
            tex = [];
            fbo = [];
            prog = null;
            u = null;
        }
        function onRestored() {
            if (dead) return;
            lost = false;
            if (!initGL()) { fail(); return; }
            restart = true;
            hidden = fast = shown || reduced;
            wake();
        }
        canvas.addEventListener('webglcontextlost', onLost);
        canvas.addEventListener('webglcontextrestored', onRestored);

        // ── Start ──
        paintChrome();
        layout();
        writeCount();
        if (!noTracer) {
            try {
                gl = canvas.getContext('webgl2', {
                    alpha: false, antialias: false, depth: false, stencil: false,
                    premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power'
                });
            } catch (err) {
                gl = null;
            }
        }
        if (!gl || !initGL()) {
            fail();
        } else {
            wake();
        }

        // A new size reallocates the average and traces again. The canvas is
        // cleared by its resize, so the passes are shown rather than hidden.
        var resizeObs = null;
        if (window.ResizeObserver) {
            resizeObs = new ResizeObserver(function () {
                if (dead) return;
                if (still) { layout(); return; }
                if (failed || !gl || lost) return;
                if (!layout()) return;
                makeTargets();
                restart = true;
                hidden = false;
                fast = reduced;
                wake();
            });
            resizeObs.observe(stage);
        }

        return {
            visible: function (on) {
                active = on;
                if (on) wake(); else stop();
            },
            // The grey and blue spheres follow the theme's card and accent, so
            // the picture is traced again, out of sight, and swapped in whole.
            theme: function () {
                paintChrome();
                if (still) stillSource();
                if (!gl || failed || lost) return;
                applyColors();
                if (!pending) {
                    restart = true;
                    hidden = fast = shown || reduced;
                    wake();
                }
            },
            destroy: function () {
                dead = true;
                releaseRuler();
                stop();
                canvas.removeEventListener('pointerdown', onDown);
                canvas.removeEventListener('pointermove', onMove);
                canvas.removeEventListener('pointerup', onUp);
                canvas.removeEventListener('pointercancel', onCancel);
                if (resizeObs) resizeObs.disconnect();
                release();
                if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
            }
        };
    });
})();
