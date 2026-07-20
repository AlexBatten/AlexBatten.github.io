// ── Modal content for each ball ──

const CONTENT = {
    about: {
        number: '01',
        title: 'About',
        html: `
            <p>Hi, I'm <strong>Alex</strong>, a software engineer based in Denmark with a
            BEng in Software Technology from DTU. I care about functional clean code, solid architecture,
            and building things that actually work.</p>
            <p style="margin-top:12px">I'm drawn to system design, performance optimization,
            and writing maintainable software. Outside of coding, I'm into strength training
            and music production, from audio engineering to composition.</p>
        `
    },

    experience: {
        number: '02',
        title: 'Experience',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>Senior Software Engineer, AI Infrastructure — Alignerr (Contract)</h3>
                    <span class="entry-date">2026 — Present</span>
                </div>
                <p>Designing, building, and scaling the production infrastructure behind AI
                training, evaluation, and deployment pipelines used by millions. Working
                primarily in Python and TypeScript across backend services, APIs, and data
                pipelines, architecting for reliability and long term maintainability at scale
                on cloud and containerized environments. Collaborating asynchronously with ML
                engineers, researchers, and product managers across a global distributed team,
                covering system design, code reviews, debugging across distributed systems,
                and contributing to engineering best practices.</p>
                <div style="margin-top:8px">
                    <span class="tag">Python</span>
                    <span class="tag">TypeScript</span>
                    <span class="tag">AI Infrastructure</span>
                    <span class="tag">Distributed Systems</span>
                    <span class="tag">Data Pipelines</span>
                    <span class="tag">Cloud</span>
                    <span class="tag">Containers</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Backend Developer — Acconta (Startup)</h3>
                    <span class="entry-date">2026 — Present</span>
                </div>
                <p>Designed and shipped production microservices on a multi-tenant SaaS
                platform (.NET Aspire, ASP.NET Core, EF Core), each taken from prototype to
                deployed service with OpenAPI/NSwag generated typed clients. Owned Stripe
                billing end to end: subscriptions and seat logic (proration, credits, plan
                switching, yearly plans, webhooks, secret hardening), plus a working
                subscription flow prototype in the Next.js client. Implemented Danish tax
                compliance: VAT reporting to SKAT via the NemVirksomhed service (SOAP with
                WS signing), computing all 17 VAT return fields, plus SAF-T import with
                schema validation. Also built standalone integrations for daily currency
                rates (National Bank) and company data via CVR (Danish Business Authority).</p>
                <div style="margin-top:8px">
                    <span class="tag">C#</span>
                    <span class="tag">.NET Aspire</span>
                    <span class="tag">ASP.NET Core</span>
                    <span class="tag">Entity Framework</span>
                    <span class="tag">Microservices</span>
                    <span class="tag">Stripe</span>
                    <span class="tag">Next.js</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>AI Data Annotator — Outlier</h3>
                    <span class="entry-date">2025 — Present</span>
                </div>
                <p>Contributed to advanced AI model development through data annotation, prompt
                engineering, trajectory refinement, and QA across projects including Clutch Zayu,
                Maraca Camera, Mechanic Astrologer, and Meter Pavilion (OpenClaw). Crafted system
                prompts defining model behavior and constraints, and designed single and multi turn
                conversational and agentic datasets spanning 50+ risk categories including bias,
                misinformation, privacy, and safety. Built autonomous agent trajectories exercising
                skill discovery, memory, long horizon context, and native tools (cron, sub agent
                delegation), and refined Golden Trajectories for efficiency and grounding. Served as
                both author and reviewer on Mechanic Astrologer, auditing peer Task Blueprints against
                structured rubrics, verifying ground truth, and writing teaching feedback.</p>
                <div style="margin-top:8px">
                    <span class="tag">AI/ML</span>
                    <span class="tag">Prompt Engineering</span>
                    <span class="tag">Agentic AI</span>
                    <span class="tag">Data Annotation</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Software Development Intern — IT Operators / Simple Agency Group</h3>
                    <span class="entry-date">2024</span>
                </div>
                <p>Developed REST APIs with auth, rate limiting, and monitoring. Built fullstack
                web apps with Angular, .NET, and Bootstrap, including JWT auth, real-time dashboards,
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
        number: '03',
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
                <p>Fullstack application bridging two enterprise platforms, transferring and
                reviewing time registrations from Accelo (PSA) into Microsoft Business Central (ERP).
                Built a custom UI for reviewing and adjusting hours before syncing. Designed the data model
                in MSSQL, implemented multi tenant authentication via Microsoft Entra ID, and containerized
                the entire stack with Docker in a Jenkins CI/CD pipeline. Fully tested, unit tests on both
                layers, plus integration tests using Selenium and WebApplicationFactory.</p>
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
                <p>Built a custom API for ISTOBAL (car wash manufacturer) to serve operational
                data to their client Uno X (Nordic fuel station chain). Implemented a custom token based
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
                of unnoticed electrical or staff errors. Built as a multi tenant SaaS module, each customer
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
                <p>Real time dashboard views deployed on Raspberry Pis for office TV screens, monitoring
                time registrations and cron job health to track work efficiency and catch failed jobs early.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">Real time</span>
                    <span class="tag">Raspberry Pi</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>TIMEVAT — External API Integrations</h3>
                    <span class="entry-date">Client: TIMEVAT</span>
                </div>
                <p>Integrated the EU VIES API for VAT number validation and the Danish National
                Bank API for daily currency exchange rates into a VAT compliance platform.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">VIES API</span>
                    <span class="tag">API Integration</span>
                </div>
            </div>

            <p style="opacity:0.5; font-size:0.78rem; margin:24px 0 16px; letter-spacing:0.02em;">
                Personal projects
            </p>

            <div class="entry">
                <div class="entry-header">
                    <h3>Invarix Guard</h3>
                    <span class="entry-date"><a href="https://invarix.dk" target="_blank" rel="noopener">Website</a> &middot; <a href="https://www.nuget.org/packages/Invarix.Guard" target="_blank" rel="noopener">NuGet</a></span>
                </div>
                <p>A plug and play AI safety library for .NET, shipped as a NuGet package. Covers
                several AI safety categories out of the box, prompt injection, PII, and content
                safety, so apps can add guardrails in a few lines of code.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">NuGet</span>
                    <span class="tag">AI Safety</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Invarix Guard Evidence</h3>
                    <span class="entry-date"><a href="https://invarix.dk/products/invarix-guard-evidence" target="_blank" rel="noopener">Website</a> &middot; <a href="https://www.nuget.org/packages/Invarix.Guard.Evidence" target="_blank" rel="noopener">NuGet</a></span>
                </div>
                <p>A tamper evident audit trail for AI decisions in .NET, free under Elastic
                License 2.0. Records each decision as a CloudEvents event keyed on SHA-256
                hashes rather than the prompt text, then seals batches into an RFC 6962 Merkle
                tree signed with the customer's own Ed25519 key, so an auditor can verify a
                record was never altered using standard Certificate Transparency tooling.
                Also ships retention policies with legal holds, signed deletion certificates,
                and a streaming export endpoint. Runs fully in process with no outbound calls.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">NuGet</span>
                    <span class="tag">Cryptography</span>
                    <span class="tag">Audit Logging</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Hemi-Sync Guided Meditation App</h3>
                    <span class="entry-date">In progress</span>
                </div>
                <p>A concept app for generating customizable guided meditations using AI driven
                text to speech, layered with Hemi Sync binaural beat technology for brainwave
                entrainment. Built in React Native targeting both iOS and Android. Currently paused </p>
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
                <p>A simple audio distortion plugin with bitcrushing capabilities built with the JUCE framework. Compatible with
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
        number: '04',
        title: 'Skills & Tools',
        html: `
            <h3>Languages</h3>
            <div style="margin-bottom:16px">
                <span class="tag">C#</span>
                <span class="tag">C++</span>
                <span class="tag">Python</span>
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
                <span class="tag">Distributed Systems</span>
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
        number: '05',
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

    recommendations: {
        number: '06',
        title: 'Recommendations',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>Mike Valencia — Simple Agency Group</h3>
                </div>
                <p>CEO at Simple Agency Group</p>
                <p style="margin-top:8px"><a href="https://www.linkedin.com/posts/mike-valencia-8858352a_development-software-integrations-activity-7196790268858138624-zarE" target="_blank" rel="noopener">View recommendation on LinkedIn &rarr;</a></p>
            </div>
        `
    },

    hire: {
        number: '07',
        title: 'Start a Project',
        html: `
            <p class="brief-intro">Have something you'd like built? Tell me about
            it and I'll get back to you within a couple of days.</p>

            <form class="brief-form" id="brief-form" novalidate>
                <input type="hidden" name="access_key" value="">
                <input type="hidden" name="subject" value="New project request from your portfolio">
                <input type="hidden" name="from_name" value="alexbatten.dk — Project Request">
                <input type="hidden" name="project_type" value="">
                <input type="checkbox" name="botcheck" class="brief-hp" tabindex="-1" autocomplete="off" aria-hidden="true">

                <div class="brief-row">
                    <label class="brief-field">
                        <span class="brief-label">Name</span>
                        <input type="text" name="name" required autocomplete="name">
                    </label>
                    <label class="brief-field">
                        <span class="brief-label">Email</span>
                        <input type="email" name="email" required autocomplete="email">
                    </label>
                </div>

                <div class="brief-field">
                    <span class="brief-label">Project type</span>
                    <div class="brief-pills">
                        <button type="button" class="brief-pill" data-value="Web app">Web app</button>
                        <button type="button" class="brief-pill" data-value="API / integration">API / integration</button>
                        <button type="button" class="brief-pill" data-value="AI / ML">AI / ML</button>
                        <button type="button" class="brief-pill" data-value="Mobile">Mobile</button>
                        <button type="button" class="brief-pill" data-value="Other">Other</button>
                    </div>
                </div>

                <div class="brief-row">
                    <label class="brief-field">
                        <span class="brief-label">Budget <em>(optional)</em></span>
                        <select name="budget">
                            <option value="">No preference</option>
                            <option>Under €2k</option>
                            <option>€2k – €5k</option>
                            <option>€5k – €10k</option>
                            <option>€10k+</option>
                            <option>Not sure yet</option>
                        </select>
                    </label>
                    <label class="brief-field">
                        <span class="brief-label">Timeline <em>(optional)</em></span>
                        <select name="timeline">
                            <option value="">No preference</option>
                            <option>ASAP</option>
                            <option>Within 1 month</option>
                            <option>1 – 2 months</option>
                            <option>2 – 3 months</option>
                            <option>Flexible</option>
                        </select>
                    </label>
                </div>

                <label class="brief-field">
                    <span class="brief-label">Project details</span>
                    <textarea name="message" rows="4" required
                        placeholder="What are you trying to build, and what does success look like?"></textarea>
                </label>

                <button type="submit" class="brief-submit">Send project request</button>
                <p class="brief-status" id="brief-status" role="status" aria-live="polite"></p>
                <p class="brief-note">No account needed. Goes straight to my inbox.</p>
            </form>
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
