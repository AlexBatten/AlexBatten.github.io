// ── Modal content for each ball ──
// Edit this file to customize your portfolio content.

const CONTENT = {
    about: {
        title: 'About Me',
        html: `
            <p>Hi, I'm <strong>Alex</strong> — a software engineer based in Denmark with a
            BEng in Software Technology from DTU. I care about clean code, solid architecture,
            and building things that actually work.</p>
            <p style="margin-top:12px">I'm drawn to system design, performance optimization,
            and writing maintainable software. Outside of coding, I'm into strength training
            and music production — from audio engineering to composition.</p>
        `
    },

    experience: {
        title: 'Experience',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>Backend Developer — Acconta (Startup)</h3>
                    <span class="entry-date">2026</span>
                </div>
                <p>Built external integrations for currency rates (National Bank), VAT reporting
                (Danish Tax Agency), business data via CVR, and Stripe payments. Worked within
                a multi-tenant SaaS architecture using ASP.NET Core and Entity Framework Core.</p>
                <div style="margin-top:8px">
                    <span class="tag">C#</span>
                    <span class="tag">ASP.NET Core</span>
                    <span class="tag">Entity Framework</span>
                    <span class="tag">Stripe</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>AI Data Annotator — Outlier</h3>
                    <span class="entry-date">2025 — 2026</span>
                </div>
                <p>Contributed to advanced AI model development through data annotation and QA.
                Crafted system prompts, designed multi-turn conversational datasets, and evaluated
                model responses across 50+ risk categories including bias, misinformation, and safety.</p>
                <div style="margin-top:8px">
                    <span class="tag">AI/ML</span>
                    <span class="tag">Prompt Engineering</span>
                    <span class="tag">Data Annotation</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Software Development Intern — IT Operators</h3>
                    <span class="entry-date">2024</span>
                </div>
                <p>Developed REST APIs with auth, rate limiting, and monitoring. Built fullstack
                web apps with Angular, .NET, and Bootstrap — including JWT auth, real-time dashboards,
                and automated reporting. Maintained and optimized ERP systems in production.</p>
                <div style="margin-top:8px">
                    <span class="tag">Angular</span>
                    <span class="tag">.NET</span>
                    <span class="tag">REST APIs</span>
                    <span class="tag">SQL</span>
                </div>
            </div>
        `
    },

    projects: {
        title: 'Projects',
        html: `
            <div class="entry">
                <p style="opacity:0.6; font-style:italic; text-align:center; padding: 32px 0;">
                    This section is still under construction.<br>
                    Check back soon — or visit my
                    <a href="https://github.com/AlexBatten" target="_blank" rel="noopener">GitHub</a>
                    in the meantime.
                </p>
            </div>
        `
    },

    skills: {
        title: 'Skills & Tools',
        html: `
            <h3>Languages</h3>
            <div style="margin-bottom:16px">
                <span class="tag">C#</span>
                <span class="tag">C++</span>
                <span class="tag">Java</span>
                <span class="tag">TypeScript</span>
                <span class="tag">JavaScript</span>
                <span class="tag">Kotlin</span>
                <span class="tag">SQL</span>
            </div>
            <h3>Frameworks & Libraries</h3>
            <div style="margin-bottom:16px">
                <span class="tag">ASP.NET Core</span>
                <span class="tag">Entity Framework</span>
                <span class="tag">Angular</span>
                <span class="tag">.NET</span>
                <span class="tag">Bootstrap</span>
            </div>
            <h3>Concepts & Practices</h3>
            <div style="margin-bottom:16px">
                <span class="tag">REST APIs</span>
                <span class="tag">System Design</span>
                <span class="tag">Agile / Scrum</span>
                <span class="tag">CI/CD</span>
                <span class="tag">JWT Auth</span>
            </div>
            <h3>Other</h3>
            <div>
                <span class="tag">Git</span>
                <span class="tag">ERP Systems</span>
                <span class="tag">Multi-tenant SaaS</span>
                <span class="tag">Audio Engineering</span>
            </div>
        `
    },

    education: {
        title: 'Education',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>BEng Software Technology — Technical University of Denmark (DTU)</h3>
                    <span class="entry-date">2021 — 2025</span>
                </div>
                <p>Electives in Computer Graphics, Rendering, C++ Programming, and Engineering Economics.
                Bachelor's project focused on building an integration between two ERP systems from scratch.
                GPA: 7.62 (Danish 7-point scale).</p>
            </div>
        `
    },

    contact: {
        title: 'Get in Touch',
        html: `
            <p>I'm always open to interesting conversations and opportunities.</p>
            <ul style="list-style:none;padding:0;margin-top:16px">
                <li style="margin-bottom:10px">
                    <a href="mailto:alex.batten1234@gmail.com">alex.batten1234@gmail.com</a>
                </li>
                <li style="margin-bottom:10px">
                    <a href="https://github.com/AlexBatten" target="_blank" rel="noopener">GitHub</a>
                </li>
                <li style="margin-bottom:10px">
                    <a href="https://www.linkedin.com/in/alex-batten-48b28b2a2/" target="_blank" rel="noopener">LinkedIn</a>
                </li>
            </ul>
        `
    }
};
