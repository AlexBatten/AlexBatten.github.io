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

    let W, H;
    const RADIUS = 40;
    const RADIUS_MOBILE = 32;

    function getRadius() {
        return window.innerWidth <= 600 ? RADIUS_MOBILE : RADIUS;
    }

    function resize() {
        W = playground.clientWidth;
        H = playground.clientHeight;
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

    // In-app browsers (e.g. LinkedIn iOS) may report 0 dimensions before
    // layout completes. Poll until the viewport is valid, then reposition walls.
    if (W === 0 || H === 0) {
        var layoutCheck = setInterval(function () {
            resize();
            if (W > 0 && H > 0) {
                clearInterval(layoutCheck);
                Body.setPosition(floor,     { x: W / 2, y: H + WALL / 2 });
                Body.setPosition(ceiling,   { x: W / 2, y: -WALL / 2 });
                Body.setPosition(leftWall,  { x: -WALL / 2, y: H / 2 });
                Body.setPosition(rightWall, { x: W + WALL / 2, y: H / 2 });
            }
        }, 50);
    }

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
        if (e.key === 'Escape') closeModal();
        // ── Easter egg: toggle zero gravity ──
        if ((e.key === 'g' || e.key === 'G') && !overlay.classList.contains('active') && !window.PINBALL_ACTIVE) {
            var grav = engine.world.gravity;
            if (grav.y !== 0) {
                grav.y = 0;
                // Give each ball a gentle random drift
                for (var i = 0; i < pairs.length; i++) {
                    Body.setVelocity(pairs[i].body, {
                        x: (Math.random() - 0.5) * 3,
                        y: (Math.random() - 0.5) * 3
                    });
                }
            } else {
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
