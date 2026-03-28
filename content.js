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
            <p style="opacity:0.5; font-size:0.78rem; margin-bottom:16px; letter-spacing:0.02em;">
                Professional work completed at IT Operators / Simple Agency
            </p>

            <div class="entry">
                <div class="entry-header">
                    <h3>Accelo → Business Central Integration</h3>
                    <span class="entry-date">Bachelor Project</span>
                </div>
                <p>Full-stack application bridging two enterprise platforms — transferring and
                reconciling time registrations from Accelo (PSA) into Microsoft Business Central (ERP).
                Built a custom UI for reviewing and adjusting hours before syncing. Designed the data model
                in MSSQL, implemented multi-tenant authentication via Microsoft Entra ID, and containerized
                the entire stack with Docker in a Jenkins CI/CD pipeline. Fully tested — unit tests on both
                layers, plus end-to-end integration tests using Selenium and WebApplicationFactory.</p>
                <div style="margin-top:8px">
                    <span class="tag">Angular</span>
                    <span class="tag">.NET</span>
                    <span class="tag">MSSQL</span>
                    <span class="tag">Docker</span>
                    <span class="tag">Jenkins</span>
                    <span class="tag">Selenium</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Uno X — Custom REST API</h3>
                    <span class="entry-date">Client: ISTOBAL</span>
                </div>
                <p>Built a bespoke API for ISTOBAL (car wash equipment manufacturer) to serve operational
                data to their client Uno X (Nordic fuel station chain). Implemented a custom token-based
                authentication system and rate limiting with automated email alerts on threshold breach.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">REST API</span>
                    <span class="tag">Auth</span>
                    <span class="tag">Rate Limiting</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Eye4u — Automated SMS Alert System</h3>
                    <span class="entry-date">Client: Eye4u</span>
                </div>
                <p>Extended a surveillance customer portal with automated SMS notifications triggered
                by medicine cooler temperature deviations detected across a sensor network. Reduced risk
                of unnoticed electrical or staff errors. Built as a multi-tenant SaaS module — each customer
                with their own sensor configuration and alert thresholds.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">IoT / Sensors</span>
                    <span class="tag">Multi-tenant SaaS</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Internal Monitoring Dashboards</h3>
                    <span class="entry-date">IT Operators</span>
                </div>
                <p>Real-time dashboard views deployed on Raspberry Pis for office TV screens — monitoring
                time registrations and cron job health to track work efficiency and catch failed jobs early.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">Real-time</span>
                    <span class="tag">Raspberry Pi</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>TIMEVAT — External API Integrations</h3>
                    <span class="entry-date">Client: TIMEVAT</span>
                </div>
                <p>Integrated the EU VIES API for real-time VAT number validation and the Danish National
                Bank API for live currency exchange rates into a VAT compliance platform.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">VIES API</span>
                    <span class="tag">API Integration</span>
                </div>
            </div>

            <p style="opacity:0.5; font-size:0.78rem; margin:24px 0 16px; padding-top:16px; border-top:1px solid #e0e0e0; letter-spacing:0.02em;">
                Personal projects
            </p>

            <div class="entry">
                <div class="entry-header">
                    <h3>Hemi-Sync Guided Meditation App</h3>
                    <span class="entry-date">In progress</span>
                </div>
                <p>A concept app for generating customizable guided meditations using AI-driven
                text-to-speech, layered with Hemi-Sync binaural beat technology for brainwave
                entrainment. Built in React Native targeting both iOS and Android. Currently paused
                — planning to finish and open-source it.</p>
                <div style="margin-top:8px">
                    <span class="tag">React Native</span>
                    <span class="tag">OpenAI API</span>
                    <span class="tag">iOS / Android</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Distortion VST Plugin</h3>
                    <span class="entry-date"><a href="https://github.com/AlexBatten" target="_blank" rel="noopener">GitHub</a></span>
                </div>
                <p>A simple audio distortion plugin built with the JUCE framework. Compatible with
                most DAWs as a VST.</p>
                <div style="margin-top:8px">
                    <span class="tag">C++</span>
                    <span class="tag">JUCE</span>
                    <span class="tag">Audio / DSP</span>
                </div>
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
                <span class="tag">React Native</span>
                <span class="tag">Bootstrap</span>
                <span class="tag">JUCE</span>
            </div>
            <h3>Concepts & Practices</h3>
            <div style="margin-bottom:16px">
                <span class="tag">REST APIs</span>
                <span class="tag">System Design</span>
                <span class="tag">Agile / Scrum</span>
                <span class="tag">CI/CD</span>
                <span class="tag">JWT Auth</span>
                <span class="tag">Docker</span>
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
