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
    const engine = Engine.create();
    engine.world.gravity.y = 1.2;

    // ── Walls (all 4 sides) ──
    const wallOpts = { isStatic: true, friction: 0.3, restitution: 0.6 };
    const WALL = 50;
    const floor    = Bodies.rectangle(W / 2, H + WALL / 2, W + 200, WALL, wallOpts);
    const ceiling  = Bodies.rectangle(W / 2, -WALL / 2, W + 200, WALL, wallOpts);
    const leftWall = Bodies.rectangle(-WALL / 2, H / 2, WALL, H + 200, wallOpts);
    const rightWall = Bodies.rectangle(W + WALL / 2, H / 2, WALL, H + 200, wallOpts);
    Composite.add(engine.world, [floor, ceiling, leftWall, rightWall]);

    // ── Create physics bodies for each ball ──
    const r = getRadius();
    const pairs = balls.map((el, i) => {
        const body = Bodies.circle(
            80 + Math.random() * (W - 160),
            -60 - i * 100,  // staggered drop
            r,
            {
                restitution: 0.55,
                friction: 0.15,
                frictionAir: 0.015,
                density: 0.003,
                label: el.dataset.id
            }
        );
        Composite.add(engine.world, body);
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
    canvas.addEventListener('touchstart', function (e) {
        if (e.touches.length === 1) {
            // Only prevent default if we're actually grabbing a ball
            const rect = canvas.getBoundingClientRect();
            const x = e.touches[0].clientX - rect.left;
            const y = e.touches[0].clientY - rect.top;
            const hit = pairs.some(p => {
                const dx = p.body.position.x - x;
                const dy = p.body.position.y - y;
                return Math.sqrt(dx * dx + dy * dy) < r + 5;
            });
            if (hit) e.preventDefault();
        }
    }, { passive: false });

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
            if (CONTENT[label]) {
                openModal(label);
            }
        }
        mouseDownPos = null;
    });

    // ── Modal ──
    function openModal(id) {
        const data = CONTENT[id];
        if (!data) return;
        modalContent.innerHTML = `<h2>${data.title}</h2>${data.html}`;
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
    });

    // ── Render loop (sync DOM balls to physics) ──
    const runner = Runner.create();
    Runner.run(runner, engine);

    function render() {
        const r = getRadius();
        for (const { body, el } of pairs) {
            // Clamp position so balls never visually leave the playground
            let bx = body.position.x;
            let by = body.position.y;
            if (bx < r) { bx = r; Body.setPosition(body, { x: r, y: by }); Body.setVelocity(body, { x: Math.abs(body.velocity.x), y: body.velocity.y }); }
            if (bx > W - r) { bx = W - r; Body.setPosition(body, { x: W - r, y: by }); Body.setVelocity(body, { x: -Math.abs(body.velocity.x), y: body.velocity.y }); }
            if (by < r) { by = r; Body.setPosition(body, { x: bx, y: r }); Body.setVelocity(body, { x: body.velocity.x, y: Math.abs(body.velocity.y) }); }
            if (by > H - r) { by = H - r; Body.setPosition(body, { x: bx, y: H - r }); Body.setVelocity(body, { x: body.velocity.x, y: -Math.abs(body.velocity.y) }); }

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
})();
