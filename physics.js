// ── Matter.js Physics Playground ──

(function () {
    const {
        Engine, Runner, Bodies, Body, Composite,
        Mouse, MouseConstraint, Events, Vector
    } = Matter;

    // ── Setup ──
    const playground = document.getElementById('playground');
    const canvas = document.getElementById('physics-canvas');
    const ctx = canvas.getContext('2d');
    const balls = Array.from(document.querySelectorAll('.ball'));
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    const modalClose = document.getElementById('modal-close');
    const hint = document.getElementById('hint');

    // ── Hints panel ──
    const hintsBtn = document.getElementById('hints-btn');
    const hintsOverlay = document.getElementById('hints-overlay');
    const hintsClose = document.getElementById('hints-close');

    hintsBtn.addEventListener('click', function () {
        hintsOverlay.classList.add('active');
    });

    function closeHints() {
        hintsOverlay.classList.remove('active');
    }

    hintsClose.addEventListener('click', closeHints);
    hintsOverlay.addEventListener('click', function (e) {
        if (e.target === hintsOverlay) closeHints();
    });

    let W, H;
    const RADIUS = 40;
    const RADIUS_MOBILE = 32;

    function getRadius() {
        return document.documentElement.clientWidth <= 600 ? RADIUS_MOBILE : RADIUS;
    }

    function resize() {
        // Use document.documentElement dimensions — they are the most reliable
        // in iOS WKWebView (LinkedIn/Facebook/Instagram in-app browsers) where
        // element.clientHeight and window.innerHeight can report stale values.
        W = document.documentElement.clientWidth;
        H = document.documentElement.clientHeight;
        canvas.width = W;
        canvas.height = H;
    }
    resize();

    // ── Engine ──
    const engine = Engine.create({ enableSleeping: true });
    engine.world.gravity.y = 1.2;

    // ── Walls (all 4 sides) ──
    // Use oversized walls (10000px) so they always cover any viewport size
    const wallOpts = { isStatic: true, friction: 0.3, restitution: 0.6 };
    const WALL = 50;
    const floor    = Bodies.rectangle(W / 2, H + WALL / 2, 10000, WALL, wallOpts);
    const ceiling  = Bodies.rectangle(W / 2, -WALL / 2, 10000, WALL, wallOpts);
    const leftWall = Bodies.rectangle(-WALL / 2, H / 2, WALL, 10000, wallOpts);
    const rightWall = Bodies.rectangle(W + WALL / 2, H / 2, WALL, 10000, wallOpts);
    Composite.add(engine.world, [floor, ceiling, leftWall, rightWall]);

    // iOS WKWebView (LinkedIn, Facebook, Instagram in-app browsers) often
    // reports wrong viewport dimensions on first load — not necessarily 0,
    // but 60-80px off. Use double-rAF to wait for layout to stabilize,
    // then unconditionally reposition walls with correct dimensions.
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            var prevH = H;
            resize();
            if (H !== prevH) {
                Body.setPosition(floor,     { x: W / 2, y: H + WALL / 2 });
                Body.setPosition(ceiling,   { x: W / 2, y: -WALL / 2 });
                Body.setPosition(leftWall,  { x: -WALL / 2, y: H / 2 });
                Body.setPosition(rightWall, { x: W + WALL / 2, y: H / 2 });
            }
        });
    });

    // ── Create physics bodies for each ball (staggered drop-in) ──
    const r = getRadius();
    const DROP_DELAY = 250; // ms between each ball
    const pairs = balls.map((el, i) => {
        const body = Bodies.circle(
            W * 0.2 + Math.random() * (W * 0.6),
            -60,
            r,
            {
                restitution: 0.55,
                friction: 0.15,
                frictionAir: 0.015,
                density: 0.003,
                label: el.dataset.id,
                isSleeping: true  // start frozen, wake on drop
            }
        );
        Composite.add(engine.world, body);
        // Stagger: reveal and wake each ball after a delay
        setTimeout(() => {
            el.classList.add('visible');
            Matter.Sleeping.set(body, false);
            // After last ball drops, disable sleeping so gravity toggle works
            if (i === balls.length - 1) {
                setTimeout(() => {
                    engine.enableSleeping = false;
                    pairs.forEach(p => Matter.Sleeping.set(p.body, false));
                }, 1000);
            }
        }, i * DROP_DELAY + 300);
        return { body, el };
    });

    // ── Bounce sound (dynamic volume based on impact speed) ──
    // AudioContext starts suspended — browser blocks audio until first user
    // interaction. We load the buffer eagerly so sound plays instantly once
    // the user clicks/touches/presses a key.
    const bounceCtx = new (window.AudioContext || window.webkitAudioContext)();
    let bounceBuffer = null;
    const bounceCooldowns = {};
    const BOUNCE_COOLDOWN = 120;  // ms between sounds per ball
    const MAX_CONCURRENT = 3;     // max overlapping bounce sounds
    const GLOBAL_COOLDOWN = 80;   // ms between any two sounds
    let activeSources = 0;
    let lastGlobalBounce = 0;

    fetch('audio/ballsound.mp3')
        .then(r => r.arrayBuffer())
        .then(buf => bounceCtx.decodeAudioData(buf))
        .then(decoded => { bounceBuffer = decoded; });

    function playBounce(speed) {
        if (!bounceBuffer || speed < 1.5) return;
        const now = performance.now();
        if (now - lastGlobalBounce < GLOBAL_COOLDOWN) return;
        if (activeSources >= MAX_CONCURRENT) return;
        if (bounceCtx.state === 'suspended') bounceCtx.resume();
        lastGlobalBounce = now;
        activeSources++;
        const source = bounceCtx.createBufferSource();
        const gain = bounceCtx.createGain();
        source.buffer = bounceBuffer;
        gain.gain.value = Math.min(1, speed / 12);
        source.playbackRate.value = 0.95 + Math.random() * 0.1;
        source.connect(gain);
        gain.connect(bounceCtx.destination);
        source.onended = () => { activeSources--; };
        source.start(0);
    }

    // Resume audio context on first user interaction (browser autoplay policy).
    // On iOS, Web Audio defaults to the "ambient" session — muted by the ring/silent
    // switch and routed away from the speaker. Playing a silent HTMLAudioElement
    // once flips the page to "playback" so Web Audio reaches the speaker.
    const silentUnlock = new Audio(
        'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7097lVE/NrchYxYnzkgU7HVF9X///9FacnlkkoU5//cfYBAdAAACgAAQBEAFIAAAQAAAQAAAAIAAAAAAAAAAAQAQAAAAAAQAAAAgAAAACA='
    );
    silentUnlock.loop = false;
    ['click', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, () => {
            bounceCtx.resume();
            silentUnlock.play().catch(() => {});
        }, { once: true });
    });

    // Play bounce sound on any ball collision with a surface
    const ballBodyIds = new Set(pairs.map(p => p.body.id));
    Events.on(engine, 'collisionStart', function (ev) {
        const now = Date.now();
        ev.pairs.forEach(function (pair) {
            let ball = null;
            if (ballBodyIds.has(pair.bodyA.id)) ball = pair.bodyA;
            else if (ballBodyIds.has(pair.bodyB.id)) ball = pair.bodyB;
            if (!ball) return;
            if (bounceCooldowns[ball.id] && now - bounceCooldowns[ball.id] < BOUNCE_COOLDOWN) return;
            bounceCooldowns[ball.id] = now;
            const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
            playBounce(speed);
        });
    });

    // ── Mouse constraint for drag ──
    const mouse = Mouse.create(canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: { visible: false }
        }
    });
    Composite.add(engine.world, mouseConstraint);

    // Don't hijack page scroll
    canvas.addEventListener('wheel', function (e) {
        // Allow default scroll
    }, { passive: true });
    mouse.element.removeEventListener('mousewheel', mouse.mousewheel);
    mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);

    // ── Touch support ──
    let touchStartPos = null;
    let touchStartTime = 0;
    let touchedPair = null;

    canvas.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1) {
            const rect = canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            touchStartPos = { x, y };
            touchStartTime = Date.now();
            touchedPair = null;
            for (const p of pairs) {
                const dx = p.body.position.x - x;
                const dy = p.body.position.y - y;
                if (Math.sqrt(dx * dx + dy * dy) < r + 10) {
                    touchedPair = p;
                    e.preventDefault();
                    break;
                }
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchend', function (e) {
        if (!touchStartPos || !touchedPair) return;
        const rect = canvas.getBoundingClientRect();
        const touch = e.changedTouches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const dx = x - touchStartPos.x;
        const dy = y - touchStartPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const elapsed = Date.now() - touchStartTime;

        if (dist < 15 && elapsed < 400) {
            const label = touchedPair.body.label;
            const linkEl = document.querySelector(`.ball-link[data-id="${label}"]`);
            if (linkEl && linkEl.dataset.href) {
                const href = linkEl.dataset.href;
                if (href.startsWith('mailto:')) {
                    window.location.href = href;
                } else {
                    // Use <a> click for iOS Safari compatibility
                    const a = document.createElement('a');
                    a.href = href;
                    a.target = '_blank';
                    a.rel = 'noopener';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                }
            } else if (CONTENT[label]) {
                openModal(label);
            }
        }
        touchStartPos = null;
        touchedPair = null;
    }, { passive: true });

    // ── Track hover for visual feedback ──
    let hoveredBody = null;
    Events.on(mouseConstraint, 'mousemove', function () {
        const pos = mouse.position;
        let found = null;
        for (const p of pairs) {
            const dx = p.body.position.x - pos.x;
            const dy = p.body.position.y - pos.y;
            if (Math.sqrt(dx * dx + dy * dy) < r + 5) {
                found = p;
                break;
            }
        }
        if (hoveredBody !== found) {
            if (hoveredBody) hoveredBody.el.classList.remove('hovered');
            hoveredBody = found;
            if (hoveredBody) hoveredBody.el.classList.add('hovered');
            canvas.style.cursor = found ? 'grab' : 'default';
        }
    });

    // ── Click detection (distinguish from drag) ──
    let mouseDownPos = null;
    let mouseDownTime = 0;

    Events.on(mouseConstraint, 'startdrag', function () {
        mouseDownPos = { x: mouse.position.x, y: mouse.position.y };
        mouseDownTime = Date.now();
    });

    Events.on(mouseConstraint, 'enddrag', function (e) {
        if (!mouseDownPos) return;
        const dx = mouse.position.x - mouseDownPos.x;
        const dy = mouse.position.y - mouseDownPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const elapsed = Date.now() - mouseDownTime;

        // If barely moved and quick tap, treat as click
        if (dist < 8 && elapsed < 300) {
            const label = e.body.label;
            // Check if it's a link ball (linkedin, email, github)
            const linkEl = document.querySelector(`.ball-link[data-id="${label}"]`);
            if (linkEl && linkEl.dataset.href) {
                window.open(linkEl.dataset.href, linkEl.dataset.href.startsWith('mailto:') ? '_self' : '_blank');
            } else if (CONTENT[label]) {
                openModal(label);
            }
        }
        mouseDownPos = null;
    });

    // ── Modal ──
    function openModal(id) {
        const data = CONTENT[id];
        if (!data) return;
        modalContent.innerHTML = `<h2><span class="modal-number">${data.number}</span> ${data.title}</h2>${data.html}`;
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    modalClose.addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { closeModal(); closeHints(); }
        // ── Easter egg: toggle zero gravity ──
        if ((e.key === 'g' || e.key === 'G') && !overlay.classList.contains('active') && !window.PINBALL_ACTIVE) {
            var grav = engine.world.gravity;
            if (!window.ZERO_GRAVITY) {
                window.ZERO_GRAVITY = true;
                grav.x = 0;
                grav.y = 0;
                // Give each ball a gentle random drift
                for (var i = 0; i < pairs.length; i++) {
                    Body.setVelocity(pairs[i].body, {
                        x: (Math.random() - 0.5) * 3,
                        y: (Math.random() - 0.5) * 3
                    });
                }
            } else {
                window.ZERO_GRAVITY = false;
                grav.x = 0;
                grav.y = 1.2;
            }
        }
    });

    // ── Render loop (sync DOM balls to physics) ──
    const runner = Runner.create();
    Runner.run(runner, engine);

    function render() {
        const r = getRadius();
        for (const { body, el } of pairs) {
            let bx = body.position.x;
            let by = body.position.y;

            // Clamp position so balls never leave the playground (skip during pinball)
            if (!window.PINBALL_ACTIVE) {
                if (bx < r) { bx = r; Body.setPosition(body, { x: r, y: by }); Body.setVelocity(body, { x: Math.abs(body.velocity.x), y: body.velocity.y }); }
                if (bx > W - r) { bx = W - r; Body.setPosition(body, { x: W - r, y: by }); Body.setVelocity(body, { x: -Math.abs(body.velocity.x), y: body.velocity.y }); }
                if (by < r) { by = r; Body.setPosition(body, { x: bx, y: r }); Body.setVelocity(body, { x: body.velocity.x, y: Math.abs(body.velocity.y) }); }
                if (by > H - r) { by = H - r; Body.setPosition(body, { x: bx, y: H - r }); Body.setVelocity(body, { x: body.velocity.x, y: -Math.abs(body.velocity.y) }); }
            }

            const x = bx - r;
            const y = by - r;
            el.style.transform = `translate(${x}px, ${y}px) rotate(${body.angle}rad)`;
        }
        requestAnimationFrame(render);
    }
    render();

    // ── Hide hint after first interaction ──
    let hintHidden = false;
    Events.on(mouseConstraint, 'startdrag', function () {
        if (!hintHidden) {
            hint.classList.add('hidden');
            hintHidden = true;
        }
    });

    // ── Handle resize ──
    window.addEventListener('resize', function () {
        resize();
        const r = getRadius();

        // Reposition all 4 walls
        Body.setPosition(floor,     { x: W / 2, y: H + WALL / 2 });
        Body.setPosition(ceiling,   { x: W / 2, y: -WALL / 2 });
        Body.setPosition(leftWall,  { x: -WALL / 2, y: H / 2 });
        Body.setPosition(rightWall, { x: W + WALL / 2, y: H / 2 });

        // Clamp balls inside bounds
        for (const { body } of pairs) {
            const pos = body.position;
            let nx = pos.x, ny = pos.y;
            if (nx < r) nx = r;
            if (nx > W - r) nx = W - r;
            if (ny < r) ny = r;
            if (ny > H - r) ny = H - r;
            if (nx !== pos.x || ny !== pos.y) {
                Body.setPosition(body, { x: nx, y: ny });
            }
        }
    });

    // ── Device orientation → tilt gravity (mobile only) ──
    // Project Earth's gravity onto the phone's screen plane using real 3D math.
    // Balls always fall toward the lowest physical point of the phone.
    var GRAVITY_SCALE = 1.2;
    var SMOOTHING = 0.15;
    var smoothGx = 0;
    var smoothGy = GRAVITY_SCALE;

    function handleOrientation(e) {
        if (window.PINBALL_ACTIVE || window.ZERO_GRAVITY) return;
        var beta = e.beta;
        var gamma = e.gamma;
        if (beta === null || gamma === null) return;

        // Convert to radians
        var b = beta * Math.PI / 180;
        var g = gamma * Math.PI / 180;

        // Project Earth's gravity onto the screen plane:
        // Screen X = how much gravity pulls left/right on screen
        // Screen Y = how much gravity pulls up/down on screen
        var targetGx = Math.sin(g) * Math.cos(b) * GRAVITY_SCALE;
        var targetGy = Math.sin(b) * GRAVITY_SCALE;

        // Smooth interpolation to prevent jitter
        smoothGx += (targetGx - smoothGx) * SMOOTHING;
        smoothGy += (targetGy - smoothGy) * SMOOTHING;

        engine.world.gravity.x = smoothGx;
        engine.world.gravity.y = smoothGy;
    }

    // Only enable on touch devices
    if ('ontouchstart' in window) {
        // iOS 13+ requires permission request from a click gesture (touchstart doesn't qualify)
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            document.addEventListener('click', function requestTilt() {
                DeviceOrientationEvent.requestPermission()
                    .then(function (state) {
                        if (state === 'granted') {
                            window.addEventListener('deviceorientation', handleOrientation);
                        }
                    })
                    .catch(function () {});
            }, { once: true });
        } else {
            window.addEventListener('deviceorientation', handleOrientation);
        }
    }

    // ── Expose for pinball module ──
    window.PLAYGROUND = { engine, pairs, canvas, ctx, mouseConstraint, getSize: function () { return { W: W, H: H }; } };
})();

// ── Console easter egg ──
(function () {
    var lines = [
        '%c┌─────────────────────────────────────┐',
        '│                                     │',
        '│   Looking under the hood?           │',
        '│                                     │',
        '│   Let\'s talk:                       │',
        '│   alex.batten1234@gmail.com         │',
        '│                                     │',
        '│   hint: press G                     │',
        '│                                     │',
        '└─────────────────────────────────────┘'
    ];
    console.log(
        lines.join('\n'),
        'color: #3b82f6; font-family: monospace; font-size: 13px; line-height: 1.4;'
    );
})();
