// ── 01 About: the background steps forward ──
// About 1,200 glyphs from the page's ascii background (0 1 ~ : .) rise out of
// a flat field into depth and take the shapes of what the About text says, in
// its order: Denmark, a { } for C# and .NET, and a waveform for the music. The
// pointer turns the cloud a few degrees and scatters the glyphs near it.
//
// three.js is fetched the first time this ball opens (no other ball uses it)
// and the whole cloud is one Points object whose morphing runs in the vertex
// shader, so a frame costs the CPU almost nothing. After two rounds through
// the shapes it settles on Denmark and stops drawing until the pointer moves.
// Without WebGL it draws Denmark once on a 2D canvas instead.

(function () {
    'use strict';
    if (!window.MODAL_FX) return;

    var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
    var GLYPHS = ['0', '1', '~', ':', '.'];
    var GLYPH_ODDS = [0.32, 0.32, 0.14, 0.12, 0.10];
    var ACCENT_ODDS = 0.05;
    var HOLD = 4.2;        // seconds per shape, its morph included
    var CYCLES = 2;        // rounds through the three shapes before settling
    var INTRO = 1.8;       // seconds to rise out of the field
    var CAMERA_Z = 4.2;
    var IDLE_STOP_MS = 1400;

    // Denmark as lon/lat outlines: Jutland, Funen, Zealand, Lolland-Falster.
    // Traced by hand; only the silhouette has to read at this size.
    var DENMARK = [
        [[8.66, 54.91], [8.60, 55.05], [8.68, 55.18], [8.56, 55.28], [8.45, 55.45], [8.30, 55.48], [8.08, 55.56],
         [8.15, 55.70], [8.20, 55.90], [8.13, 56.05], [8.12, 56.30], [8.15, 56.55], [8.22, 56.70], [8.45, 56.95],
         [8.60, 57.10], [8.90, 57.12], [9.25, 57.15], [9.55, 57.30], [9.80, 57.45], [9.96, 57.59], [10.30, 57.62],
         [10.60, 57.74], [10.52, 57.55], [10.45, 57.40], [10.55, 57.25], [10.50, 57.05], [10.30, 56.98],
         [10.25, 56.80], [10.30, 56.60], [10.55, 56.52], [10.80, 56.52], [10.95, 56.42], [10.85, 56.25],
         [10.65, 56.20], [10.55, 56.10], [10.25, 56.00], [10.20, 55.85], [10.00, 55.78], [9.95, 55.65],
         [9.75, 55.55], [9.70, 55.40], [9.60, 55.20], [9.70, 55.05], [9.80, 54.90], [9.45, 54.83], [9.10, 54.88]],
        [[9.75, 55.30], [9.85, 55.50], [10.10, 55.60], [10.40, 55.62], [10.60, 55.55], [10.80, 55.40], [10.78, 55.15],
         [10.60, 55.05], [10.35, 55.00], [10.10, 55.05], [9.90, 55.15]],
        [[11.05, 55.40], [11.15, 55.55], [11.10, 55.70], [11.30, 55.80], [11.55, 55.95], [11.80, 55.98], [12.05, 56.05],
         [12.35, 56.10], [12.60, 56.05], [12.60, 55.85], [12.62, 55.68], [12.45, 55.55], [12.40, 55.35], [12.25, 55.25],
         [12.05, 55.15], [11.75, 55.15], [11.50, 55.20], [11.25, 55.25]],
        [[10.95, 54.82], [11.30, 54.85], [11.60, 54.90], [11.85, 54.95], [12.10, 54.95], [12.15, 54.78], [11.95, 54.58],
         [11.70, 54.68], [11.40, 54.65], [11.10, 54.70]]
    ];

    // The module is shared by every opening of the ball, so it downloads once.
    var threeP = null;
    function loadThree() {
        if (!threeP) {
            threeP = import(THREE_URL).catch(function (e) { threeP = null; throw e; });
        }
        return threeP;
    }

    // ── Shapes ──
    // Seeded, so the cloud lands the same way every time.
    function rng(seed) {
        var s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function inside(poly, x, y) {
        var hit = false;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
        }
        return hit;
    }

    // Projected with longitude squeezed by cos(56 deg), then scaled to a
    // height of 2 around the origin.
    function denmark(n, r) {
        var polys = DENMARK.map(function (poly) {
            return poly.map(function (p) { return [(p[0] - 10.35) * 0.559, p[1] - 56.15]; });
        });
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        polys.forEach(function (poly) {
            poly.forEach(function (p) {
                minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
                minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
            });
        });
        var s = 2 / (maxY - minY), cy = (minY + maxY) / 2, cx = (minX + maxX) / 2, out = [];
        while (out.length < n) {
            var x = minX + r() * (maxX - minX), y = minY + r() * (maxY - minY);
            for (var i = 0; i < polys.length; i++) {
                if (inside(polys[i], x, y)) { out.push([(x - cx) * s, (y - cy) * s]); break; }
            }
        }
        return out;
    }

    // The filled pixels of "{ }" set in the site's font.
    function braces(n, r) {
        var c = document.createElement('canvas');
        c.width = 420; c.height = 220;
        var g = c.getContext('2d');
        g.font = '700 190px "Roboto Condensed", Arial, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#000';
        g.fillText('{ }', 210, 118);
        var data = g.getImageData(0, 0, c.width, c.height).data, filled = [];
        for (var y = 0; y < c.height; y += 2) {
            for (var x = 0; x < c.width; x += 2) if (data[(y * c.width + x) * 4 + 3] > 128) filled.push([x, y]);
        }
        var out = [];
        if (!filled.length) return wave(n, r);
        for (var i = 0; i < n; i++) {
            var p = filled[Math.floor(r() * filled.length)];
            out.push([(p[0] + r() * 2 - 210) / 100, (110 - p[1] - r() * 2) / 100]);
        }
        return out;
    }

    // An audio waveform: bars whose heights follow a couple of beating sines
    // under an envelope that tapers at both ends.
    function wave(n, r) {
        var BARS = 56, out = [];
        for (var i = 0; i < n; i++) {
            var b = Math.floor(r() * BARS), u = (b + 0.5) / BARS * 2 - 1;
            var env = 1 - Math.pow(Math.abs(u), 2.2);
            var amp = 0.1 + 0.8 * env * Math.abs(Math.sin(u * 7.3 + 0.4) * 0.65 + Math.sin(u * 17.1) * 0.35);
            out.push([u * 1.7 + (r() - 0.5) * 0.03, (r() * 2 - 1) * amp]);
        }
        return out;
    }

    function shuffle(a, r) {
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(r() * (i + 1)), t = a[i];
            a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    function pickGlyph(r) {
        var x = r(), acc = 0;
        for (var i = 0; i < GLYPH_ODDS.length; i++) { acc += GLYPH_ODDS[i]; if (x < acc) return i; }
        return 0;
    }

    function rgbTriplet(s) {
        var p = s.split(',').map(function (v) { return parseFloat(v) / 255; });
        return [p[0] || 0, p[1] || 0, p[2] || 0];
    }

    function hexRgb(h) {
        var m = /^#?([0-9a-f]{6})$/i.exec(h.trim());
        if (!m) return [0.23, 0.51, 0.96];
        var v = parseInt(m[1], 16);
        return [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255];
    }

    var VERTEX = [
        'attribute vec3 aField;',
        'attribute vec3 aA;',
        'attribute vec3 aB;',
        'attribute vec3 aC;',
        'attribute float aGlyph;',
        'attribute float aSeed;',
        'attribute float aAccent;',
        'uniform float uPhase;',
        'uniform float uIntro;',
        'uniform float uTime;',
        'uniform float uDrift;',
        'uniform float uSize;',
        'uniform float uAspect;',
        'uniform vec2 uPointer;',
        'uniform float uPointerOn;',
        'varying float vGlyph;',
        'varying float vAccent;',
        'vec3 shapeAt(float i) {',
        '    if (i < 0.5) return aA;',
        '    if (i < 1.5) return aB;',
        '    return aC;',
        '}',
        'void main() {',
        '    float k = floor(uPhase);',
        '    float f = uPhase - k;',
        // Each shape holds for most of its segment and morphs at the end,
        // the points a little out of step with each other.
        '    float m = smoothstep(0.62 + aSeed * 0.12, 0.92 + aSeed * 0.08, f);',
        '    vec3 p = mix(shapeAt(mod(k, 3.0)), shapeAt(mod(k + 1.0, 3.0)), m);',
        '    p.z += sin(m * 3.14159) * (0.35 + aSeed * 0.5);',
        '    float t = clamp(uIntro * 1.3 - aSeed * 0.3, 0.0, 1.0);',
        '    t = 1.0 - pow(1.0 - t, 3.0);',
        '    p = mix(aField, p, t);',
        '    p.xy += uDrift * 0.02 * vec2(sin(uTime * 0.9 + aSeed * 40.0), cos(uTime * 0.7 + aSeed * 23.0));',
        '    vec4 mv = modelViewMatrix * vec4(p, 1.0);',
        '    vec4 clip = projectionMatrix * mv;',
        // Glyphs near the pointer are pushed away from it on screen.
        '    vec2 d = clip.xy / clip.w - uPointer;',
        '    d.x *= uAspect;',
        '    float d2 = dot(d, d);',
        '    if (d2 > 1e-6) {',
        '        float push = uPointerOn * exp(-d2 * 18.0) * 0.12;',
        '        clip.xy += normalize(d) / vec2(uAspect, 1.0) * push * clip.w;',
        '    }',
        '    gl_Position = clip;',
        '    gl_PointSize = uSize / -mv.z;',
        '    vGlyph = aGlyph;',
        '    vAccent = aAccent;',
        '}'
    ].join('\n');

    var FRAGMENT = [
        'uniform sampler2D uAtlas;',
        'uniform vec3 uInk;',
        'uniform vec3 uAccent;',
        'uniform float uAlpha;',
        'varying float vGlyph;',
        'varying float vAccent;',
        'void main() {',
        '    vec2 uv = vec2((vGlyph + gl_PointCoord.x) / 5.0, 1.0 - gl_PointCoord.y);',
        '    float a = texture2D(uAtlas, uv).a;',
        '    if (a < 0.04) discard;',
        '    gl_FragColor = vec4(mix(uInk, uAccent, vAccent), a * uAlpha);',
        '}'
    ].join('\n');

    MODAL_FX.register('about', function (stage, api) {
        var dead = false, raf = 0, last = 0, fallback = null;
        var renderer, scene, camera, points, material, geometry, atlas;
        var elapsed = 0, settled = false, active = true, idleSince = 0;
        var pointer = { x: 0, y: 0, tx: 0, ty: 0, on: 0, ton: 0 };
        var rot = { x: 0, y: 0 };
        var reduced = api.reduced();
        var narrow = api.narrow();
        var N = narrow ? 800 : 1200;

        // Positions for every shape, shared by the 3D and the 2D paths.
        var r = rng(20260415);
        var A = shuffle(denmark(N, r), r), B = shuffle(braces(N, r), r), C = shuffle(wave(N, r), r);
        var glyph = new Float32Array(N), seed = new Float32Array(N), accent = new Float32Array(N);
        var field = new Float32Array(N * 3), pa = new Float32Array(N * 3), pb = new Float32Array(N * 3), pc = new Float32Array(N * 3);
        for (var i = 0; i < N; i++) {
            glyph[i] = pickGlyph(r);
            seed[i] = r();
            accent[i] = r() < ACCENT_ODDS ? 1 : 0;
            field[i * 3] = (r() * 2 - 1) * 3.4;
            field[i * 3 + 1] = (r() * 2 - 1) * 1.5;
            field[i * 3 + 2] = -1.8 - r() * 1.2;
            var z = (r() - 0.5) * 0.16;
            pa[i * 3] = A[i][0]; pa[i * 3 + 1] = A[i][1]; pa[i * 3 + 2] = z;
            pb[i * 3] = B[i][0]; pb[i * 3 + 1] = B[i][1]; pb[i * 3 + 2] = z;
            pc[i * 3] = C[i][0]; pc[i * 3 + 1] = C[i][1]; pc[i * 3 + 2] = z;
        }

        function size() {
            return { w: stage.clientWidth || 520, h: stage.clientHeight || 230 };
        }

        // ── 2D fallback ──
        function drawFallback() {
            if (dead) return;
            var s = size(), dpr = Math.min(2, window.devicePixelRatio || 1);
            if (!fallback) {
                fallback = document.createElement('canvas');
                fallback.style.cssText = 'display:block;width:100%;height:100%';
                stage.appendChild(fallback);
            }
            fallback.width = Math.round(s.w * dpr);
            fallback.height = Math.round(s.h * dpr);
            var g = fallback.getContext('2d'), c = api.colors();
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.clearRect(0, 0, s.w, s.h);
            var scale = s.h / 2.65;
            g.font = '600 ' + (narrow ? 8 : 9) + 'px "Roboto Condensed", Arial, sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            for (var i = 0; i < N; i++) {
                g.fillStyle = accent[i] ? c.accent : 'rgba(' + c.paper + ',0.85)';
                g.fillText(GLYPHS[glyph[i]], s.w / 2 + pa[i * 3] * scale, s.h / 2 - pa[i * 3 + 1] * scale);
            }
            api.ready();
        }

        // ── 3D ──
        function makeAtlas(THREE) {
            var c = document.createElement('canvas');
            c.width = 64 * GLYPHS.length; c.height = 64;
            var g = c.getContext('2d');
            g.font = '600 50px "Roboto Condensed", Arial, sans-serif';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillStyle = '#fff';
            for (var i = 0; i < GLYPHS.length; i++) g.fillText(GLYPHS[i], i * 64 + 32, 34);
            var tex = new THREE.CanvasTexture(c);
            tex.needsUpdate = true;
            return tex;
        }

        function applyColors() {
            if (!material) return;
            var c = api.colors();
            material.uniforms.uInk.value.fromArray(rgbTriplet(c.paper));
            material.uniforms.uAccent.value.fromArray(hexRgb(c.accent));
        }

        function build(THREE) {
            var s = size();
            try {
                renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
            } catch (e) {
                drawFallback();
                return;
            }
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.5 : 2));
            renderer.setSize(s.w, s.h, false);
            renderer.setClearColor(0x000000, 0);
            var canvas = renderer.domElement;
            canvas.style.cssText = 'display:block;width:100%;height:100%';
            canvas.addEventListener('webglcontextlost', onLost);
            stage.appendChild(canvas);

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(35, s.w / s.h, 0.1, 50);
            camera.position.z = CAMERA_Z;

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(pa, 3));
            geometry.setAttribute('aField', new THREE.BufferAttribute(field, 3));
            geometry.setAttribute('aA', new THREE.BufferAttribute(pa, 3));
            geometry.setAttribute('aB', new THREE.BufferAttribute(pb, 3));
            geometry.setAttribute('aC', new THREE.BufferAttribute(pc, 3));
            geometry.setAttribute('aGlyph', new THREE.BufferAttribute(glyph, 1));
            geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
            geometry.setAttribute('aAccent', new THREE.BufferAttribute(accent, 1));

            atlas = makeAtlas(THREE);
            material = new THREE.ShaderMaterial({
                vertexShader: VERTEX,
                fragmentShader: FRAGMENT,
                transparent: true,
                depthTest: false,
                depthWrite: false,
                uniforms: {
                    uPhase: { value: 0 },
                    uIntro: { value: reduced ? 1 : 0 },
                    uTime: { value: 0 },
                    uDrift: { value: reduced ? 0 : 1 },
                    uSize: { value: (narrow ? 7.5 : 8.5) * renderer.getPixelRatio() * CAMERA_Z },
                    uAspect: { value: s.w / s.h },
                    uPointer: { value: new THREE.Vector2(0, 0) },
                    uPointerOn: { value: 0 },
                    uAtlas: { value: atlas },
                    uInk: { value: new THREE.Vector3() },
                    uAccent: { value: new THREE.Vector3() },
                    uAlpha: { value: 0.85 }
                }
            });
            applyColors();
            points = new THREE.Points(geometry, material);
            points.frustumCulled = false;
            scene.add(points);

            if (reduced) {
                settled = true;
                renderer.render(scene, camera);
            } else {
                wake();
            }
            api.ready();
        }

        function onLost(e) {
            e.preventDefault();
            stop();
            teardown3d();
            drawFallback();
        }

        // ── Loop ──
        function wake() {
            if (dead || !renderer || reduced || !active || raf) return;
            last = performance.now();
            raf = requestAnimationFrame(frame);
        }

        function stop() {
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
        }

        function frame(now) {
            raf = 0;
            if (dead || !renderer || !active) return;
            var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
            last = now;
            var u = material.uniforms;

            if (!settled) {
                elapsed += dt;
                u.uIntro.value = Math.min(1, elapsed / INTRO);
                var phase = Math.max(0, (elapsed - INTRO * 0.6) / HOLD);
                if (phase >= CYCLES * 3) { phase = CYCLES * 3; settled = true; idleSince = now; }
                u.uPhase.value = phase;
            } else {
                // Settled: the drift fades out so the picture can come to rest.
                u.uDrift.value = Math.max(0, u.uDrift.value - dt * 0.8);
            }
            u.uTime.value += dt;

            pointer.x += (pointer.tx - pointer.x) * 0.15;
            pointer.y += (pointer.ty - pointer.y) * 0.15;
            pointer.on += (pointer.ton - pointer.on) * 0.12;
            u.uPointer.value.set(pointer.x, pointer.y);
            u.uPointerOn.value = pointer.on;

            var sway = settled ? 0 : Math.sin(u.uTime.value * 0.3) * 0.1;
            var ry = pointer.ton ? pointer.x * 0.35 : sway, rx = pointer.ton ? -pointer.y * 0.18 : 0;
            rot.y += (ry - rot.y) * 0.06;
            rot.x += (rx - rot.x) * 0.06;
            points.rotation.set(rot.x, rot.y, 0);

            renderer.render(scene, camera);

            // At rest once every eased value has reached its target, which
            // includes a mouse that has stopped over the picture.
            var still = settled && u.uDrift.value === 0 &&
                Math.abs(pointer.tx - pointer.x) < 1e-3 && Math.abs(pointer.ty - pointer.y) < 1e-3 &&
                Math.abs(pointer.ton - pointer.on) < 0.01 &&
                Math.abs(rx - rot.x) < 0.002 && Math.abs(ry - rot.y) < 0.002;
            if (still && now - idleSince > IDLE_STOP_MS) return;
            if (!still) idleSince = now;
            raf = requestAnimationFrame(frame);
        }

        // ── Pointer ──
        function onMove(e) {
            var b = stage.getBoundingClientRect();
            if (!b.width || !b.height) return;
            pointer.tx = ((e.clientX - b.left) / b.width) * 2 - 1;
            pointer.ty = -(((e.clientY - b.top) / b.height) * 2 - 1);
            pointer.ton = e.pointerType === 'touch' ? 0 : 1;
            wake();
        }
        function onLeave() {
            pointer.ton = 0;
            wake();
        }
        if (!reduced) {
            stage.addEventListener('pointermove', onMove);
            stage.addEventListener('pointerleave', onLeave);
        }

        var resizeObs = null;
        if (window.ResizeObserver) {
            resizeObs = new ResizeObserver(function () {
                if (dead) return;
                var s = size();
                if (renderer) {
                    renderer.setSize(s.w, s.h, false);
                    camera.aspect = s.w / s.h;
                    camera.updateProjectionMatrix();
                    material.uniforms.uAspect.value = s.w / s.h;
                    if (!raf) renderer.render(scene, camera);
                } else if (fallback) {
                    drawFallback();
                }
            });
            resizeObs.observe(stage);
        }

        function teardown3d() {
            if (geometry) geometry.dispose();
            if (material) material.dispose();
            if (atlas) atlas.dispose();
            if (renderer) {
                renderer.domElement.removeEventListener('webglcontextlost', onLost);
                renderer.dispose();
                // Hand the context back now rather than at garbage collection:
                // browsers allow a page only a handful at once.
                renderer.forceContextLoss();
                if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            renderer = scene = camera = points = material = geometry = atlas = null;
        }

        loadThree().then(function (THREE) {
            if (!dead) build(THREE);
        }, function () {
            drawFallback();
        });

        return {
            visible: function (on) {
                active = on;
                if (on) wake(); else stop();
            },
            theme: function () {
                if (material) {
                    applyColors();
                    if (!raf && renderer) renderer.render(scene, camera);
                } else if (fallback) {
                    drawFallback();
                }
            },
            destroy: function () {
                dead = true;
                stop();
                stage.removeEventListener('pointermove', onMove);
                stage.removeEventListener('pointerleave', onLeave);
                if (resizeObs) resizeObs.disconnect();
                teardown3d();
                if (fallback && fallback.parentNode) fallback.parentNode.removeChild(fallback);
                fallback = null;
            }
        };
    });
})();
