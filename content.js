// ── Modal content for each ball ──
//
// Both language versions live here and the page picks one via <html lang>, set
// by /index.html (en) and /da/index.html (da). One file keeps the structure in
// a single place, so a new entry can't be added to one language and forgotten
// in the other. Shipping both costs a few KB gzipped.

// ── Lab index ──
// Rendered from posts.js rather than written out here, so the modal list and the
// /lab page are the same data and cannot drift apart. Articles are English; the
// Danish modal says so rather than pretending a translation exists.
const LAB_MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LAB_MONTHS_DA = ['jan.', 'feb.', 'mar.', 'apr.', 'maj', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'dec.'];

function labHtml(t) {
    const rows = [...POSTS].sort((a, b) => b.date.localeCompare(a.date)).map(function (p) {
        const parts = p.date.split('-');
        const month = (t.lang === 'da' ? LAB_MONTHS_DA : LAB_MONTHS_EN)[Number(parts[1]) - 1];
        const date = t.lang === 'da'
            ? Number(parts[2]) + '. ' + month + ' ' + parts[0]
            : Number(parts[2]) + ' ' + month + ' ' + parts[0];
        return `
            <div class="entry">
                <div class="entry-header">
                    <h3><a href="/lab/${p.slug}">${p.title}</a></h3>
                    <span class="entry-date">${date}</span>
                </div>
                <p class="article-meta"><span class="article-type">${p.type === 'note' ? t.note : t.post}</span> &middot; ${p.minutes} ${t.read}</p>
                <p>${p.hook}</p>
                <div style="margin-top:8px">${p.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            </div>`;
    }).join('');

    const body = rows || `
            <div class="lab-empty">
                <p>${t.emptyLead}</p>
            </div>`;

    return `<p class="brief-intro">${t.intro}</p>${body}
            <p style="margin-top:20px; font-size:0.85rem; opacity:0.7">
                <a href="/lab/">${t.all}</a>
            </p>`;
}

const CONTENT_EN = {
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
                    <span class="entry-date">Signed 2026, not yet started</span>
                </div>
                <p>Signed contract, first assignment still pending. The agreed scope is
                designing, building, and scaling the production infrastructure behind AI
                training, evaluation, and deployment pipelines: Python and TypeScript across
                backend services, APIs, and data pipelines, architected for reliability and
                long term maintainability at scale on cloud and containerized environments.
                The role also covers system design, code reviews, and debugging across
                distributed systems, working asynchronously with ML engineers, researchers,
                and product managers on a global distributed team.</p>
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
                    <h3>Generalist Expert, AI Evaluation — Mercor (Contract)</h3>
                    <span class="entry-date">2026 — Present</span>
                </div>
                <p>Evaluating AI model outputs against structured evaluation guidelines and
                writing the rationale behind every judgment. The work is close reading: checking
                a response for factual accuracy, sound reasoning, instruction following, and
                tone, then stating precisely where it holds up and where it breaks down, with
                evidence. Applying the same standard consistently across a wide range of subject
                areas so that assessments stay comparable between reviewers.</p>
                <div style="margin-top:8px">
                    <span class="tag">AI Evaluation</span>
                    <span class="tag">LLM Outputs</span>
                    <span class="tag">Structured Feedback</span>
                    <span class="tag">Technical Writing</span>
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
                    <h3>Invarix Gate</h3>
                    <span class="entry-date"><a href="https://invarix.dk/products/invarix-gate" target="_blank" rel="noopener">Website</a> &middot; <a href="https://www.nuget.org/packages/Invarix.Gate" target="_blank" rel="noopener">NuGet</a></span>
                </div>
                <p>A deterministic action firewall for AI agents in .NET. Gate sits in front of
                an agent's tool calls and evaluates each one against a policy before it runs,
                returning one of five verdicts: allow, warn, escalate, deny, or terminate. Ten
                detectors cover destructive SQL, shell commands, git history rewrites, cloud
                teardown, credential egress, and runaway loops, each grounded in a dated public
                incident. Matching is pure CPU pattern work with no model call, so a verdict
                lands in a median of 57 µs and the same call under the same policy always decides
                the same way. Policy is written as YAML or fluent C#, it attaches through
                Microsoft.Extensions.AI and Microsoft Agent Framework, and it reports the surfaces
                it cannot see rather than rendering a clean run. Ships with a 194 scenario policy
                corpus in which roughly half the cases assert a detector stays quiet, since a
                detector that only ever fires gets switched off in its first week.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">NuGet</span>
                    <span class="tag">AI Agents</span>
                    <span class="tag">Policy as Code</span>
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
                <span class="tag">.NET Aspire</span>
                <span class="tag">Next.js</span>
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
                <span class="tag">Claude Code</span>
                <span class="tag">ERP Systems</span>
                <span class="tag">Multi-tenant SaaS</span>
                <span class="tag">SAF-T</span>
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

            <div class="entry">
                <div class="entry-header">
                    <h3>Erik Seifert</h3>
                </div>
                <p>Endorsed the following skills:</p>
                <div style="margin-top:8px">
                    <span class="tag">C#</span>
                    <span class="tag">.NET Framework</span>
                    <span class="tag">Entity Framework (EF) Core</span>
                </div>
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

    lab: {
        number: '08',
        title: 'Lab',
        html: labHtml({
            lang: 'en',
            note: 'Note',
            post: 'Post',
            read: 'min read',
            all: 'All entries',
            intro: `Findings, unfinished ideas, and things I wish someone had written down
                before I needed them. Notes are short and about one thing. Posts are longer.
                Some of it is meant for you to take and build.`,
            emptyLead: `nothing here yet. turns out the ideas were the easy part.`
        })
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

const CONTENT_DA = {
    about: {
        number: '01',
        title: 'Om mig',
        html: `
            <p>Hej, jeg hedder <strong>Alex</strong>. Jeg er softwareudvikler med base i Danmark
            og diplomingeniør (BEng) i softwareteknologi fra DTU. Jeg går op i ren, funktionel
            kode, solid arkitektur og at bygge ting, der rent faktisk virker.</p>
            <p style="margin-top:12px">Jeg arbejder helst med systemdesign, performanceoptimering
            og software, der kan vedligeholdes over tid. Uden for koden går der styrketræning og
            musikproduktion i den, fra lydteknik til komposition.</p>
        `
    },

    experience: {
        number: '02',
        title: 'Erfaring',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>Senior Software Engineer, AI-infrastruktur — Alignerr (kontrakt)</h3>
                    <span class="entry-date">Underskrevet 2026, ikke påbegyndt</span>
                </div>
                <p>Kontrakten er underskrevet, men første opgave er endnu ikke gået i gang. Det
                aftalte omfang er at designe, bygge og skalere den produktionsinfrastruktur, der
                ligger bag pipelines til træning, evaluering og udrulning af AI: Python og TypeScript
                på tværs af backendservices, API'er og datapipelines, arkitekteret til driftssikkerhed
                og langsigtet vedligeholdelse i stor skala i cloudmiljøer og containere. Rollen dækker
                også systemdesign, code reviews og fejlfinding på tværs af distribuerede systemer, med
                asynkront samarbejde med ML-ingeniører, forskere og produktchefer i et globalt
                distribueret team.</p>
                <div style="margin-top:8px">
                    <span class="tag">Python</span>
                    <span class="tag">TypeScript</span>
                    <span class="tag">AI-infrastruktur</span>
                    <span class="tag">Distribuerede systemer</span>
                    <span class="tag">Datapipelines</span>
                    <span class="tag">Cloud</span>
                    <span class="tag">Containere</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Backendudvikler — Acconta (startup)</h3>
                    <span class="entry-date">2026 — nu</span>
                </div>
                <p>Designede og leverede mikroservices i produktion på en multi-tenant SaaS-platform
                (.NET Aspire, ASP.NET Core, EF Core), hver især taget fra prototype til udrullet
                service med typede klienter genereret via OpenAPI/NSwag. Havde det fulde ansvar for
                Stripe-betalinger: abonnementer og licenslogik pr. bruger (proration, kreditter,
                planskift, årsabonnementer, webhooks, hærdning af hemmeligheder) samt en fungerende
                prototype af abonnementsflowet i Next.js-klienten. Implementerede dansk
                skattecompliance: momsindberetning til SKAT via NemVirksomhed (SOAP med WS-signering)
                med beregning af alle 17 felter i momsangivelsen, samt SAF-T-import med skemavalidering.
                Byggede desuden selvstændige integrationer til daglige valutakurser (Nationalbanken)
                og virksomhedsdata via CVR (Erhvervsstyrelsen).</p>
                <div style="margin-top:8px">
                    <span class="tag">C#</span>
                    <span class="tag">.NET Aspire</span>
                    <span class="tag">ASP.NET Core</span>
                    <span class="tag">Entity Framework</span>
                    <span class="tag">Mikroservices</span>
                    <span class="tag">Stripe</span>
                    <span class="tag">Next.js</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Generalist Expert, AI-evaluering — Mercor (kontrakt)</h3>
                    <span class="entry-date">2026 — nu</span>
                </div>
                <p>Evaluerer AI-modellers output mod strukturerede evalueringsretningslinjer og
                skriver begrundelsen bag hver enkelt bedømmelse. Arbejdet er nærlæsning: at
                kontrollere et svar for faktuel korrekthed, holdbar argumentation, efterlevelse af
                instruktioner og tone, og derefter præcist angive, hvor det holder, og hvor det
                falder fra hinanden, med belæg. Den samme standard anvendes konsistent på tværs af
                mange fagområder, så vurderinger forbliver sammenlignelige mellem bedømmere.</p>
                <div style="margin-top:8px">
                    <span class="tag">AI-evaluering</span>
                    <span class="tag">LLM-output</span>
                    <span class="tag">Struktureret feedback</span>
                    <span class="tag">Teknisk skrivning</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>AI-dataannotator — Outlier</h3>
                    <span class="entry-date">2025 — nu</span>
                </div>
                <p>Bidrog til udvikling af avancerede AI-modeller gennem dataannotering, prompt
                engineering, forfining af trajektorier og QA på tværs af projekterne Clutch Zayu,
                Maraca Camera, Mechanic Astrologer og Meter Pavilion (OpenClaw). Udformede
                systemprompts, der definerer modellens adfærd og begrænsninger, og designede
                datasæt til samtaler og agenter, både med én tur og flere ture på tværs af 50+
                risikokategorier, heriblandt bias, misinformation, privatliv og sikkerhed. Byggede
                autonome agenttrajektorier, der afprøver skill discovery, hukommelse, kontekst over
                lange forløb og indbyggede værktøjer (cron, delegering til underagenter), og
                forfinede Golden Trajectories med fokus på effektivitet og forankring i kilder.
                Fungerede både som forfatter og reviewer på Mechanic Astrologer, hvor jeg auditerede
                kollegers Task Blueprints mod strukturerede rubrikker, verificerede ground truth og
                skrev vejledende feedback.</p>
                <div style="margin-top:8px">
                    <span class="tag">AI/ML</span>
                    <span class="tag">Prompt engineering</span>
                    <span class="tag">Agentisk AI</span>
                    <span class="tag">Dataannotering</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Softwareudviklerpraktikant — IT Operators / Simple Agency Group</h3>
                    <span class="entry-date">2024</span>
                </div>
                <p>Udviklede REST-API'er med autentificering, rate limiting og overvågning. Byggede
                fullstack-webapplikationer med Angular, .NET og Bootstrap, herunder JWT-autentificering,
                realtidsdashboards og automatiseret rapportering. Vedligeholdt og optimerede
                ERP-systemer i produktion.</p>
                <div style="margin-top:8px">
                    <span class="tag">Angular</span>
                    <span class="tag">.NET</span>
                    <span class="tag">REST-API'er</span>
                    <span class="tag">SQL</span>
                </div>
            </div>
        `
    },

    projects: {
        number: '03',
        title: 'Projekter',
        html: `
            <p style="opacity:0.5; font-size:0.78rem; margin-bottom:16px; letter-spacing:0.02em;">
                Professionelt arbejde udført hos IT Operators / Simple Agency
            </p>

            <div class="entry">
                <div class="entry-header">
                    <h3>Accelo → Business Central-integration</h3>
                    <span class="entry-date">Bachelorprojekt</span>
                </div>
                <p>Fullstack-applikation, der forbinder to virksomhedsplatforme og overfører og
                gennemgår tidsregistreringer fra Accelo (PSA) til Microsoft Business Central (ERP).
                Byggede en brugerflade til at gennemgå og justere timer inden synkronisering.
                Designede datamodellen i MSSQL, implementerede multi-tenant-autentificering via
                Microsoft Entra ID og containeriserede hele stakken med Docker i en Jenkins
                CI/CD-pipeline. Fuldt testet med unit tests i begge lag samt integrationstests med
                Selenium og WebApplicationFactory.</p>
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
                    <h3>Uno X — skræddersyet REST-API</h3>
                    <span class="entry-date">Kunde: ISTOBAL</span>
                </div>
                <p>Byggede et skræddersyet API til ISTOBAL (producent af bilvaskeanlæg), som leverer
                driftsdata til deres kunde Uno X (nordisk tankstationskæde). Implementerede et
                tokenbaseret autentificeringssystem og rate limiting med automatiske e-mailadvarsler,
                når en grænseværdi overskrides.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">REST-API</span>
                    <span class="tag">Autentificering</span>
                    <span class="tag">Rate limiting</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Eye4u — automatisk SMS-alarmsystem</h3>
                    <span class="entry-date">Kunde: Eye4u</span>
                </div>
                <p>Udvidede en kundeportal til overvågning med automatiske SMS-notifikationer udløst
                af temperaturafvigelser i medicinkølere, målt på tværs af et sensornetværk. Reducerede
                risikoen for uopdagede fejl i el eller hos personalet. Bygget som et multi-tenant SaaS-modul,
                hvor hver kunde har sin egen sensoropsætning og sine egne alarmgrænser.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">IoT / sensorer</span>
                    <span class="tag">Multi-tenant SaaS</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Interne overvågningsdashboards</h3>
                    <span class="entry-date">IT Operators</span>
                </div>
                <p>Realtidsdashboards udrullet på Raspberry Pi'er til kontorets TV-skærme, som
                overvåger tidsregistreringer og sundheden af cron-jobs, så arbejdseffektiviteten kan
                følges og fejlede jobs opdages tidligt.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">Realtid</span>
                    <span class="tag">Raspberry Pi</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>TIMEVAT — eksterne API-integrationer</h3>
                    <span class="entry-date">Kunde: TIMEVAT</span>
                </div>
                <p>Integrerede EU's VIES-API til validering af momsnumre og Nationalbankens API til
                daglige valutakurser i en momscompliance-platform.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">VIES-API</span>
                    <span class="tag">API-integration</span>
                </div>
            </div>

            <p style="opacity:0.5; font-size:0.78rem; margin:24px 0 16px; letter-spacing:0.02em;">
                Personlige projekter
            </p>

            <div class="entry">
                <div class="entry-header">
                    <h3>Invarix Guard</h3>
                    <span class="entry-date"><a href="https://invarix.dk" target="_blank" rel="noopener">Website</a> &middot; <a href="https://www.nuget.org/packages/Invarix.Guard" target="_blank" rel="noopener">NuGet</a></span>
                </div>
                <p>Et plug and play-AI-sikkerhedsbibliotek til .NET, udgivet som NuGet-pakke. Dækker
                flere AI-sikkerhedskategorier ud af boksen: prompt injection, persondata (PII) og
                indholdssikkerhed, så applikationer kan tilføje guardrails med få linjers kode.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">NuGet</span>
                    <span class="tag">AI-sikkerhed</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Invarix Guard Evidence</h3>
                    <span class="entry-date"><a href="https://invarix.dk/products/invarix-guard-evidence" target="_blank" rel="noopener">Website</a> &middot; <a href="https://www.nuget.org/packages/Invarix.Guard.Evidence" target="_blank" rel="noopener">NuGet</a></span>
                </div>
                <p>Et revisionsspor til AI-beslutninger i .NET, hvor enhver efterfølgende ændring kan
                påvises. Gratis under Elastic License 2.0. Hver beslutning registreres som en
                CloudEvents-hændelse nøglet på SHA-256-hashes frem for selve prompteksten, og batches
                forsegles derefter i et RFC 6962 Merkle-træ signeret med kundens egen Ed25519-nøgle,
                så en revisor kan verificere med standardværktøjer fra Certificate Transparency, at en
                post aldrig er blevet ændret. Leveres desuden med opbevaringspolitikker med legal hold,
                signerede sletteattester og et endpoint til streaming-eksport. Kører fuldt ud
                in-process uden udgående kald.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">NuGet</span>
                    <span class="tag">Kryptografi</span>
                    <span class="tag">Revisionslogning</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Invarix Gate</h3>
                    <span class="entry-date"><a href="https://invarix.dk/products/invarix-gate" target="_blank" rel="noopener">Website</a> &middot; <a href="https://www.nuget.org/packages/Invarix.Gate" target="_blank" rel="noopener">NuGet</a></span>
                </div>
                <p>En deterministisk handlingsfirewall til AI-agenter i .NET. Gate ligger foran
                agentens tool calls og vurderer hvert kald mod en politik, inden det udføres, med
                en af fem afgørelser: tillad, advar, eskalér, afvis eller afbryd. Ti detektorer
                dækker destruktiv SQL, shell-kommandoer, omskrivning af git-historik, nedlukning
                af cloud-ressourcer, lækkede hemmeligheder og løbske løkker, og hver enkelt er
                forankret i en dateret offentlig hændelse. Matchningen er ren
                CPU-mønstergenkendelse uden kald til en model, så en afgørelse falder på 57 µs i
                median, og det samme kald under den samme politik afgøres altid ens. Politikken
                skrives som YAML eller flydende C#, den kobles på Microsoft.Extensions.AI og
                Microsoft Agent Framework, og den rapporterer de flader, den ikke kan se, frem for
                at vise et rent resultat. Leveres med et korpus på 194 scenarier, hvor omtrent
                halvdelen kontrollerer, at en detektor forbliver tavs, for en detektor, der kun
                udløses, bliver slået fra i sin første uge.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">NuGet</span>
                    <span class="tag">AI-agenter</span>
                    <span class="tag">Politik som kode</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Hemi-Sync guidet meditations-app</h3>
                    <span class="entry-date">Undervejs</span>
                </div>
                <p>En konceptapp til at generere tilpassede guidede meditationer med AI-drevet
                tekst-til-tale, lagt sammen med Hemi-Sync binaurale beats til hjernebølge-entrainment.
                Bygget i React Native til både iOS og Android. Sat på pause i øjeblikket.</p>
                <div style="margin-top:8px">
                    <span class="tag">React Native</span>
                    <span class="tag">OpenAI API</span>
                    <span class="tag">iOS / Android</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Distortion VST-plugin</h3>
                    <span class="entry-date"><a href="https://github.com/AlexBatten" target="_blank" rel="noopener">GitHub</a></span>
                </div>
                <p>Et simpelt distortion-plugin med bitcrushing bygget med JUCE-frameworket.
                Kompatibelt med de fleste DAW'er som VST.</p>
                <div style="margin-top:8px">
                    <span class="tag">C++</span>
                    <span class="tag">JUCE</span>
                    <span class="tag">Lyd / DSP</span>
                </div>
            </div>
        `
    },

    skills: {
        number: '04',
        title: 'Kompetencer & værktøjer',
        html: `
            <h3>Sprog</h3>
            <div style="margin-bottom:16px">
                <span class="tag">C#</span>
                <span class="tag">C++</span>
                <span class="tag">Java</span>
                <span class="tag">TypeScript</span>
                <span class="tag">JavaScript</span>
                <span class="tag">Kotlin</span>
                <span class="tag">SQL</span>
            </div>
            <h3>Frameworks & biblioteker</h3>
            <div style="margin-bottom:16px">
                <span class="tag">ASP.NET Core</span>
                <span class="tag">Entity Framework</span>
                <span class="tag">Angular</span>
                <span class="tag">.NET</span>
                <span class="tag">.NET Aspire</span>
                <span class="tag">Next.js</span>
                <span class="tag">React Native</span>
                <span class="tag">Bootstrap</span>
                <span class="tag">JUCE</span>
            </div>
            <h3>Metoder & praksis</h3>
            <div style="margin-bottom:16px">
                <span class="tag">REST-API'er</span>
                <span class="tag">Systemdesign</span>
                <span class="tag">Distribuerede systemer</span>
                <span class="tag">Agile / Scrum</span>
                <span class="tag">CI/CD</span>
                <span class="tag">JWT-autentificering</span>
                <span class="tag">Docker</span>
            </div>
            <h3>Andet</h3>
            <div>
                <span class="tag">Git</span>
                <span class="tag">Claude Code</span>
                <span class="tag">ERP-systemer</span>
                <span class="tag">Multi-tenant SaaS</span>
                <span class="tag">SAF-T</span>
                <span class="tag">Lydteknik</span>
            </div>
        `
    },

    education: {
        number: '05',
        title: 'Uddannelse',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>Diplomingeniør (BEng) i softwareteknologi — Danmarks Tekniske Universitet (DTU)</h3>
                    <span class="entry-date">2021 — 2025</span>
                </div>
                <p>Valgfag i computergrafik, rendering, C++-programmering og ingeniørøkonomi.
                Bachelorprojektet handlede om at bygge en integration mellem to ERP-systemer fra
                bunden. Gennemsnit: 7,62 (dansk 7-trinsskala).</p>
            </div>
        `
    },

    recommendations: {
        number: '06',
        title: 'Anbefalinger',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>Mike Valencia — Simple Agency Group</h3>
                </div>
                <p>CEO hos Simple Agency Group</p>
                <p style="margin-top:8px"><a href="https://www.linkedin.com/posts/mike-valencia-8858352a_development-software-integrations-activity-7196790268858138624-zarE" target="_blank" rel="noopener">Se anbefalingen på LinkedIn &rarr;</a></p>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Erik Seifert</h3>
                </div>
                <p>Har anbefalet følgende kompetencer:</p>
                <div style="margin-top:8px">
                    <span class="tag">C#</span>
                    <span class="tag">.NET Framework</span>
                    <span class="tag">Entity Framework (EF) Core</span>
                </div>
            </div>
        `
    },

    hire: {
        number: '07',
        title: 'Start et projekt',
        html: `
            <p class="brief-intro">Har du noget, du gerne vil have bygget? Fortæl mig om
            det, så vender jeg tilbage inden for et par dage.</p>

            <form class="brief-form" id="brief-form" novalidate>
                <input type="hidden" name="access_key" value="">
                <input type="hidden" name="subject" value="New project request from your portfolio (DA)">
                <input type="hidden" name="from_name" value="alexbatten.dk — Project Request">
                <input type="hidden" name="project_type" value="">
                <input type="checkbox" name="botcheck" class="brief-hp" tabindex="-1" autocomplete="off" aria-hidden="true">

                <div class="brief-row">
                    <label class="brief-field">
                        <span class="brief-label">Navn</span>
                        <input type="text" name="name" required autocomplete="name">
                    </label>
                    <label class="brief-field">
                        <span class="brief-label">E-mail</span>
                        <input type="email" name="email" required autocomplete="email">
                    </label>
                </div>

                <div class="brief-field">
                    <span class="brief-label">Projekttype</span>
                    <div class="brief-pills">
                        <button type="button" class="brief-pill" data-value="Webapplikation">Webapplikation</button>
                        <button type="button" class="brief-pill" data-value="API / integration">API / integration</button>
                        <button type="button" class="brief-pill" data-value="AI / ML">AI / ML</button>
                        <button type="button" class="brief-pill" data-value="Mobil">Mobil</button>
                        <button type="button" class="brief-pill" data-value="Andet">Andet</button>
                    </div>
                </div>

                <div class="brief-row">
                    <label class="brief-field">
                        <span class="brief-label">Budget <em>(valgfrit)</em></span>
                        <select name="budget">
                            <option value="">Ingen præference</option>
                            <option>Under €2k</option>
                            <option>€2k – €5k</option>
                            <option>€5k – €10k</option>
                            <option>€10k+</option>
                            <option>Ved ikke endnu</option>
                        </select>
                    </label>
                    <label class="brief-field">
                        <span class="brief-label">Tidshorisont <em>(valgfrit)</em></span>
                        <select name="timeline">
                            <option value="">Ingen præference</option>
                            <option>Hurtigst muligt</option>
                            <option>Inden for 1 måned</option>
                            <option>1 – 2 måneder</option>
                            <option>2 – 3 måneder</option>
                            <option>Fleksibel</option>
                        </select>
                    </label>
                </div>

                <label class="brief-field">
                    <span class="brief-label">Projektdetaljer</span>
                    <textarea name="message" rows="4" required
                        placeholder="Hvad prøver du at bygge, og hvordan ser succes ud?"></textarea>
                </label>

                <button type="submit" class="brief-submit">Send projektforespørgsel</button>
                <p class="brief-status" id="brief-status" role="status" aria-live="polite"></p>
                <p class="brief-note">Ingen konto nødvendig. Går direkte til min indbakke.</p>
            </form>
        `
    },

    lab: {
        number: '08',
        title: 'Lab',
        html: labHtml({
            lang: 'da',
            note: 'Note',
            post: 'Artikel',
            read: 'min. læsning',
            all: 'Alle indlæg',
            intro: `Fund, ufærdige idéer og ting, jeg ville ønske nogen havde skrevet ned,
                før jeg fik brug for dem. Noter er korte og handler om én ting. Artikler er
                længere. Noget af det er ment til, at du tager det og bygger videre.
                Indlæggene er skrevet på engelsk.`,
            emptyLead: `her er tomt endnu. det viser sig, at idéerne var den nemme del.`
        })
    },

    contact: {
        title: 'Kontakt',
        html: `
            <p>Jeg er altid åben for interessante samtaler og muligheder.</p>
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

// physics.js reads CONTENT[id] directly, so resolve the language here and leave
// that call site untouched.
const CONTENT = document.documentElement.lang === 'da' ? CONTENT_DA : CONTENT_EN;
