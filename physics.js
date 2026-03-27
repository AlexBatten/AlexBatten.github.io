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

    // ── Walls ──
    const wallOpts = { isStatic: true, friction: 0.3, restitution: 0.4 };
    const floor = Bodies.rectangle(W / 2, H + 25, W + 100, 50, wallOpts);
    const leftWall = Bodies.rectangle(-25, H / 2, 50, H + 100, wallOpts);
    const rightWall = Bodies.rectangle(W + 25, H / 2, 50, H + 100, wallOpts);
    Composite.add(engine.world, [floor, leftWall, rightWall]);

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
            const x = body.position.x - r;
            const y = body.position.y - r;
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
        Body.setPosition(floor, { x: W / 2, y: H + 25 });
        Body.setPosition(rightWall, { x: W + 25, y: H / 2 });

        // Keep balls inside bounds
        for (const { body } of pairs) {
            const pos = body.position;
            if (pos.x > W - r) Body.setPosition(body, { x: W - r, y: pos.y });
            if (pos.x < r) Body.setPosition(body, { x: r, y: pos.y });
        }
    });
})();
