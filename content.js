// ── Modal content for each ball ──
// Edit this file to customize your portfolio content.

const CONTENT = {
    about: {
        title: 'About Me',
        html: `
            <p>Hi, I'm <strong>Alex</strong> — a software engineer who enjoys building clean,
            performant systems. I care about good architecture, developer experience,
            and shipping things that actually work.</p>
            <p style="margin-top:12px">When I'm not coding, you'll find me exploring new tech,
            contributing to open-source, or tinkering with side projects.</p>
        `
    },

    experience: {
        title: 'Experience',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>Senior Software Engineer — Company A</h3>
                    <span class="entry-date">2024 — Present</span>
                </div>
                <p>Led the redesign of the core API platform, improving response times by 40%.
                Built internal tooling used by 50+ engineers daily.</p>
                <div style="margin-top:8px">
                    <span class="tag">Node.js</span>
                    <span class="tag">TypeScript</span>
                    <span class="tag">AWS</span>
                    <span class="tag">PostgreSQL</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Software Engineer — Company B</h3>
                    <span class="entry-date">2022 — 2024</span>
                </div>
                <p>Developed and maintained microservices handling 10M+ requests/day.
                Implemented CI/CD pipelines that reduced deployment time by 60%.</p>
                <div style="margin-top:8px">
                    <span class="tag">Go</span>
                    <span class="tag">Docker</span>
                    <span class="tag">Kubernetes</span>
                    <span class="tag">gRPC</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Junior Developer — Company C</h3>
                    <span class="entry-date">2020 — 2022</span>
                </div>
                <p>Built full-stack features across the product, from database design
                to React front-end components.</p>
                <div style="margin-top:8px">
                    <span class="tag">React</span>
                    <span class="tag">Python</span>
                    <span class="tag">MongoDB</span>
                </div>
            </div>
        `
    },

    projects: {
        title: 'Projects',
        html: `
            <div class="entry">
                <h3>Project Alpha</h3>
                <p>A real-time collaboration tool for distributed teams.
                WebSocket-based architecture with conflict-free replicated data types (CRDTs).</p>
                <div style="margin-top:8px">
                    <span class="tag">TypeScript</span>
                    <span class="tag">WebSockets</span>
                    <span class="tag">Redis</span>
                </div>
            </div>
            <div class="entry">
                <h3>Project Beta</h3>
                <p>CLI tool that automates infrastructure provisioning and monitoring.
                Used by 200+ developers internally.</p>
                <div style="margin-top:8px">
                    <span class="tag">Go</span>
                    <span class="tag">Terraform</span>
                    <span class="tag">Prometheus</span>
                </div>
            </div>
            <div class="entry">
                <h3>Project Gamma</h3>
                <p>Open-source design system with accessible, composable components.
                500+ GitHub stars.</p>
                <div style="margin-top:8px">
                    <span class="tag">React</span>
                    <span class="tag">Storybook</span>
                    <span class="tag">CSS</span>
                </div>
            </div>
        `
    },

    skills: {
        title: 'Skills & Tools',
        html: `
            <h3>Languages</h3>
            <div style="margin-bottom:16px">
                <span class="tag">TypeScript</span>
                <span class="tag">JavaScript</span>
                <span class="tag">Go</span>
                <span class="tag">Python</span>
                <span class="tag">SQL</span>
                <span class="tag">Rust</span>
            </div>
            <h3>Frameworks & Libraries</h3>
            <div style="margin-bottom:16px">
                <span class="tag">React</span>
                <span class="tag">Next.js</span>
                <span class="tag">Node.js</span>
                <span class="tag">Express</span>
                <span class="tag">FastAPI</span>
            </div>
            <h3>Infrastructure</h3>
            <div style="margin-bottom:16px">
                <span class="tag">AWS</span>
                <span class="tag">Docker</span>
                <span class="tag">Kubernetes</span>
                <span class="tag">Terraform</span>
                <span class="tag">CI/CD</span>
            </div>
            <h3>Databases</h3>
            <div>
                <span class="tag">PostgreSQL</span>
                <span class="tag">Redis</span>
                <span class="tag">MongoDB</span>
                <span class="tag">DynamoDB</span>
            </div>
        `
    },

    education: {
        title: 'Education',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>B.S. Computer Science — University</h3>
                    <span class="entry-date">2016 — 2020</span>
                </div>
                <p>Focused on distributed systems, algorithms, and software architecture.
                Dean's list. Teaching assistant for Data Structures.</p>
            </div>
            <div class="entry">
                <h3>Certifications</h3>
                <p>AWS Solutions Architect Associate</p>
            </div>
        `
    },

    contact: {
        title: 'Get in Touch',
        html: `
            <p>I'm always open to interesting conversations and opportunities.</p>
            <ul style="list-style:none;padding:0;margin-top:16px">
                <li style="margin-bottom:10px">
                    <a href="mailto:alex@example.com">alex@example.com</a>
                </li>
                <li style="margin-bottom:10px">
                    <a href="https://github.com/alexb" target="_blank" rel="noopener">GitHub</a>
                </li>
                <li style="margin-bottom:10px">
                    <a href="https://linkedin.com/in/alexb" target="_blank" rel="noopener">LinkedIn</a>
                </li>
            </ul>
        `
    }
};
