// ── Modal content for each ball ──
//
// Both language versions live here and the page picks one via <html lang>, set
// by /index.html (en) and /da/index.html (da). One file keeps the structure in
// a single place, so a new entry can't be added to one language and forgotten
// in the other. Shipping both costs a few KB gzipped.

// ── Recommendation marks ──
// Glyph pictures for the Recommendations modal, in the background's own
// 0 1 : . set: a quotation mark beside a written post and a check beside
// endorsed skills. Rasterised once from Roboto Condensed bold; a few digits
// are picked out in the accent.
const REC_MARKS = {
    quote: [
        '    001:    .110.',
        '   <span class="ac">0</span>01100  .11000:',
        '  <span class="ac">1</span>01010. .00011<span class="ac">0</span>',
        ' :11111:  11100<span class="ac">0</span>.',
        ' 000100. :0111<span class="ac">0</span>0',
        ':001001  001<span class="ac">1</span>111',
        ':101111  1<span class="ac">1</span>11110',
        ':10111<span class="ac">1</span>  1101110',
        '.000<span class="ac">1</span>11  :01111:'
    ].join('\n'),
    check: [
        '               ::',
        '             .111<span class="ac">1</span>',
        '            :1101:',
        '           :1001.',
        ' .:.      01<span class="ac">1</span>00.',
        '.0001   .0110<span class="ac">1</span>',
        ' 11010..0110:',
        '  :0<span class="ac">1</span>011101:',
        '   .1000<span class="ac">1</span>0.',
        '     1011.'
    ].join('\n')
};

// ── Grade ruler ──
// A drafting scale under the Education entry (styles.css, "Grade ruler"): the
// Danish 7-point grades at their true places on a -3..12 axis and a cursor at
// the GPA. Built here so both languages share it and the fine ticks follow
// the GPA: whole numbers between the grades, halves everywhere, and tenths
// only in the unit the GPA falls in. The tenth under the cursor is left out,
// as the two would merge into one smudged line. readout is the GPA as the
// page writes it (7.62, or 7,62 in Danish).
function gradeRuler(gpa, readout) {
    const at = v => +((v + 3) / 15 * 100).toFixed(3) + '%';
    const GRADES = [[-3, '<span>&minus;</span>3'], [0, '00'], [2, '02'], [4, '4'], [7, '7'], [10, '10'], [12, '12']];
    const graded = GRADES.map(g => g[0]);
    let ticks = '';
    for (let n = -3; n < 12; n++) {
        if (graded.indexOf(n) < 0) ticks += `<i style="left:${at(n)}"></i>`;
        ticks += `<i class="h" style="left:${at(n + 0.5)}"></i>`;
    }
    const unit = Math.floor(gpa);
    for (let k = 1; k < 10; k++) {
        const v = unit + k / 10;
        if (k !== 5 && Math.abs(v - gpa) >= 0.05) ticks += `<i class="t" style="left:${at(v)}"></i>`;
    }
    const labels = GRADES.map(g => `<b style="left:${at(g[0])}">${g[1]}</b>`).join('');
    return `<div class="grade-ruler" aria-hidden="true">` +
        `<div class="gr-scale">${ticks}${labels}</div>` +
        `<div class="gr-cursor" style="--gr-at:${at(gpa)}"><i style="left:${at(gpa)}"><span>${readout}</span></i></div>` +
        `</div>`;
}

// ── Lab index ──
// Rendered from posts.js rather than written out here, so the modal list and the
// /lab page are the same data and cannot drift apart. Until there are entries the
// modal has no visible text: the Lab's picture (fx/lab.js) grows out of the
// empty-state line, which stays in the markup for screen readers.
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

    if (!rows) {
        return `
            <div class="lab-empty sr-only">
                <p>${t.emptyLead}</p>
            </div>`;
    }

    return `${rows}
            <p style="margin-top:20px; font-size:0.85rem; opacity:0.7">
                <a href="/lab/">${t.all}</a>
            </p>`;
}

const CONTENT_EN = {
    about: {
        number: '01',
        title: 'About',
        html: `
            <p>Hi, I'm <strong>Alex</strong>, an AI engineer in Denmark with a
            BEng in Software Technology from DTU. My background is C# and .NET:
            backend services, REST APIs, and enterprise integrations.</p>
            <p style="margin-top:12px">Outside work I train and produce music.</p>
        `
    },

    experience: {
        number: '02',
        title: 'Experience',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>Senior Software Engineer, AI Infrastructure at Alignerr (Contract)</h3>
                    <span class="entry-date">Signed 2026, not yet started</span>
                </div>
                <p>Signed contract, first assignment still pending. The agreed scope is the
                infrastructure behind AI training, evaluation, and deployment pipelines, in
                Python and TypeScript.</p>
                <div style="margin-top:8px">
                    <span class="tag">Python</span>
                    <span class="tag">TypeScript</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>AI Engineer & Co-Owner at Acconta (Startup)</h3>
                    <span class="entry-date">2026–Present</span>
                </div>
                <p>Building a multi-tenant Danish bookkeeping SaaS across the stack: microservices
                in ASP.NET Core and EF Core on .NET Aspire and Azure, with OpenAPI/NSwag generated
                typed clients, and the Next.js client on top. Moved six services onto a shared
                service base for startup, configuration, health checks, OpenAPI docs, and
                authorization. Took VAT reporting to SKAT from the 17-field return calculation
                through to the Next.js screens and SKAT's production gateway. The integration signs
                its NemVirksomhed (RSU) SOAP calls with WS-Security, using a certificate held in
                Azure Key Vault. Built the bank reconciliation backend on an open banking feed
                (Aiia): matches that must sum exactly to the bank line, a reconciliation overview,
                and an idempotent transaction sync in its own service. Upgraded SAF-T import and
                export to the 2.1 schema, with tenant isolation and explicit refusal rules, ahead of
                the 2027 audit-file mandate. Owning Stripe billing end to end: subscriptions and
                seat logic (proration, credits, plan switching, yearly plans, plan lapses),
                webhooks, and secret hardening. Built integrations for daily currency rates
                (Danmarks Nationalbank), CVR company data (Danish Business Authority), and
                transactional email. Leading e-invoicing over NemHandel and Peppol (OIOUBL, Peppol
                BIS) and building the service that sends and receives invoices. Wrote the
                requirements spec, ran the access point provider selection, and clarified the
                registration model with the Danish Business Authority. Turning the Bookkeeping Act
                and its executive orders into implementation specs and reviewing the platform's
                authentication and multi-tenant security. Doing most of the team's in-depth code
                review. Set up an autonomous AI development agent (an OpenAI dot) that the team
                assigns GitHub issues to, and developed its operating prompt from a colleague's
                first draft over seven revisions. The agent is built to hand each change to Codex
                agents that implement, review, and test it, then open a pull request for human
                review. Wrote and presented the team's guide to AI-assisted development with Claude
                Code.</p>
                <div style="margin-top:8px">
                    <span class="tag">C#</span>
                    <span class="tag">.NET Aspire</span>
                    <span class="tag">ASP.NET Core</span>
                    <span class="tag">Entity Framework</span>
                    <span class="tag">Microservices</span>
                    <span class="tag">Azure</span>
                    <span class="tag">Stripe</span>
                    <span class="tag">Next.js</span>
                    <span class="tag">NemHandel</span>
                    <span class="tag">Peppol</span>
                    <span class="tag">AI Agents</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>AI Safety Expert at Mercor (Contract)</h3>
                    <span class="entry-date">2026–Present</span>
                </div>
                <p>Writing prompts and conversations that test how AI models handle harmful and
                sensitive requests, and pointing out where their responses fall short of safety
                guidelines. The finished work becomes safety training data for large language
                models.</p>
                <div style="margin-top:8px">
                    <span class="tag">AI Safety</span>
                    <span class="tag">Red Teaming</span>
                    <span class="tag">Prompt Writing</span>
                    <span class="tag">LLM Training Data</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Generalist Expert, AI Evaluation at Mercor (Contract)</h3>
                    <span class="entry-date">2026–Present</span>
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
                    <h3>Generalist Danish Annotator at Mercor (Contract)</h3>
                    <span class="entry-date">2026</span>
                </div>
                <p>Wrote prompts in natural Danish on topics of general interest and annotated
                how AI models responded to them. The annotations pointed out errors in the
                responses, including errors in their Danish. The finished work became training
                data for large language models.</p>
                <div style="margin-top:8px">
                    <span class="tag">Data Annotation</span>
                    <span class="tag">Danish Language</span>
                    <span class="tag">Prompt Writing</span>
                    <span class="tag">LLM Training Data</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>AI Data Annotator at Outlier</h3>
                    <span class="entry-date">2025–Present</span>
                </div>
                <p>Contributed to advanced AI model development through data annotation, prompt
                engineering, trajectory refinement, and QA across projects including Clutch Zayu,
                Maraca Camera, Mechanic Astrologer, and Meter Pavilion (OpenClaw). Crafted system
                prompts defining model behavior and constraints, and designed single and multi turn
                conversational and agentic datasets spanning 50+ risk categories including bias,
                misinformation, privacy, and safety. Built autonomous agent trajectories exercising
                skill discovery, memory, long horizon context, and native tools (cron, sub agent
                delegation). Served as both author and reviewer on Mechanic Astrologer, auditing
                peer Task Blueprints against structured rubrics, verifying ground truth, and
                writing teaching feedback.</p>
                <div style="margin-top:8px">
                    <span class="tag">AI/ML</span>
                    <span class="tag">Prompt Engineering</span>
                    <span class="tag">Agentic AI</span>
                    <span class="tag">Data Annotation</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Software Development Intern at IT Operators / Simple Agency Group</h3>
                    <span class="entry-date">2024</span>
                </div>
                <p>Developed REST APIs with auth, plus usage-limit monitoring with email alerts.
                Built fullstack web apps with Angular, .NET, and Bootstrap, including JWT auth,
                real-time dashboards, and automated reporting. Migrated an in-house ERP's time
                representation from quarter hours to minutes across every display, estimate and
                report field, then rebuilt the billing review on top of it so a task worked by
                employees from more than one group billed under each of those groups instead of one.
                Validated the rebuilt invoicing screen by reconciling a full month of billing data
                against what had actually been invoiced.</p>
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
                    <h3>Custom REST API for Uno X</h3>
                    <span class="entry-date">Client: ISTOBAL</span>
                </div>
                <p>Built a custom API for ISTOBAL (car wash manufacturer) to serve operational
                data to their client Uno X (Nordic fuel station chain). Implemented a custom token based
                authentication system and per-call usage counting with automated email alerts when a
                usage limit is reached.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">REST API</span>
                    <span class="tag">Auth</span>
                    <span class="tag">Usage Limits</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Automated SMS alert system, Eye4u</h3>
                    <span class="entry-date">Client: Eye4u</span>
                </div>
                <p>Extended a customer monitoring portal with automated SMS notifications triggered
                by medicine cooler temperature deviations across a sensor network. Added an adjustable
                pre-alarm tier that warns by SMS and email without raising an incident, with suppression
                logic so a sensor sitting outside its threshold does not re-notify on every check. Built
                as a multi-tenant module, each customer with their own sensor configuration and alert
                thresholds.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">IoT / Sensors</span>
                    <span class="tag">Multi-tenant SaaS</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Internal portal, Dexa Bodyscan</h3>
                    <span class="entry-date">Client: Dexa Bodyscan</span>
                </div>
                <p>Built the initial web application for a body-scan clinic's internal portal, from
                an empty repository to a working authenticated application in eight working days:
                project scaffold, Dockerfile, DNS record, SSL certificate, MySQL schema, Entity
                Framework contexts, JWT login, salted password hashing, role-gated pages, and
                password reset from an email link.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">Entity Framework</span>
                    <span class="tag">Docker</span>
                    <span class="tag">Auth</span>
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
                    <h3>External API integrations, TIMEVAT</h3>
                    <span class="entry-date">Client: TIMEVAT</span>
                </div>
                <p>Integrated the EU VIES API for VAT number validation and daily currency exchange
                rates from the European Central Bank into a VAT compliance platform.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">VIES API</span>
                    <span class="tag">API Integration</span>
                </div>
            </div>

            <p style="opacity:0.5; font-size:0.78rem; margin:24px 0 16px; letter-spacing:0.02em;">
                Bachelor project at DTU, in collaboration with IT Operators / Simple Agency
            </p>

            <div class="entry">
                <div class="entry-header">
                    <h3>Accelo to Business Central integration</h3>
                    <span class="entry-date">DTU, Feb–Jun 2025</span>
                </div>
                <p>Fullstack application that imports time registrations from Accelo (PSA) into MSSQL for
                review: the Accelo side of an integration with Microsoft Business Central (ERP). Built a
                custom UI for reviewing and adjusting hours and designed the data model in MSSQL. Designed
                the Business Central side against its API v2.0; it was not built, because the company's API
                credentials arrived too late. Implemented single sign-on via Microsoft Entra ID
                (single-tenant) and ran the app in Docker in a Jenkins CI/CD pipeline, with SQL Server
                outside the containers. Unit tests on both layers (63 backend tests, 161 frontend specs),
                plus end-to-end tests using WebApplicationFactory and headless Selenium for the core fetch
                and overview flows.</p>
                <div style="margin-top:8px">
                    <span class="tag">Angular</span>
                    <span class="tag">.NET</span>
                    <span class="tag">MSSQL</span>
                    <span class="tag">Docker</span>
                    <span class="tag">Jenkins</span>
                    <span class="tag">Selenium</span>
                </div>
            </div>

            <p style="opacity:0.5; font-size:0.78rem; margin:24px 0 16px; letter-spacing:0.02em;">
                Personal projects
            </p>

            <div class="entry">
                <div class="entry-header">
                    <h3>Invarix Guard</h3>
                    <span class="entry-date"><a href="https://invarix.dk/products/invarix-guard" target="_blank" rel="noopener">Website</a> &middot; <a href="https://www.nuget.org/packages/Invarix.Guard" target="_blank" rel="noopener">NuGet</a></span>
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
                returning one of five verdicts: allow, warn, escalate, deny, or terminate. Eleven
                detectors cover destructive SQL, shell commands, git history rewrites, cloud
                teardown, credential egress, runaway loops, protected targets, mass sends, tools
                outside an agent's allowlist, call and token ceilings, and edits to Gate's own
                policy. Ten of them distill real incidents, most with public postmortems.
                Matching is pure CPU pattern work with no model call, so a verdict lands in a
                median of 57 µs and the same call under the same policy always decides the same
                way. Policy is written as YAML or fluent C#, it attaches through
                Microsoft.Extensions.AI and Microsoft Agent Framework, and it reports the surfaces
                it cannot see rather than rendering a clean run. Ships with a test corpus of
                about 220 scenarios, more than 90 of which exist to prove ordinary work stays
                quiet, since a detector that only ever fires gets switched off in its first
                week.</p>
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
                    <span class="entry-date">Paused</span>
                </div>
                <p>A concept app for generating customizable guided meditations using AI driven
                text to speech, layered with Hemi Sync binaural beat technology for brainwave
                entrainment. Built in React Native targeting both iOS and Android.</p>
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
                    <h3>BEng Software Technology, Technical University of Denmark (DTU)</h3>
                    <span class="entry-date">2021–2025</span>
                </div>
                <p>Electives in Computer Graphics, Rendering, C++ Programming, and Engineering Economics.
                Bachelor's project: a PSA-to-ERP integration (Accelo to Microsoft Business Central),
                with the Accelo side built from scratch and the Business Central side designed but
                not built. GPA: 7.62 (Danish <span style="white-space:nowrap">7-point</span> scale).</p>
                ${gradeRuler(7.62, '7.62')}
            </div>
        `
    },

    recommendations: {
        number: '06',
        title: 'Recommendations',
        html: `
            <div class="rec">
                <pre class="rec-mark" aria-hidden="true">${REC_MARKS.quote}</pre>
                <div>
                    <h3>Mike Valencia</h3>
                    <p class="rec-role">CEO at Simple Agency Group</p>
                    <p>Wrote about Alex Batten's work at Simple Agency Group.</p>
                    <p style="margin-top:8px"><a href="https://www.linkedin.com/posts/mike-valencia-8858352a_development-software-integrations-activity-7196790268858138624-zarE" target="_blank" rel="noopener">View the post on LinkedIn</a></p>
                </div>
            </div>

            <div class="rec">
                <pre class="rec-mark" aria-hidden="true">${REC_MARKS.check}</pre>
                <div>
                    <h3>Erik Seifert</h3>
                    <p class="rec-role">Endorsed the following skills</p>
                    <div class="rec-stamps">
                        <span class="tag">C#</span>
                        <span class="tag">.NET Framework</span>
                        <span class="tag">Entity Framework (EF) Core</span>
                    </div>
                </div>
            </div>
        `
    },

    hire: {
        number: '07',
        title: 'Start a Project',
        html: `
            <p class="brief-intro">Available for new freelance and contract work. Tell me
            what you need, with or without AI, and I will reply within a couple of days.</p>

            <form class="brief-form" id="brief-form" novalidate>
                <input type="hidden" name="access_key" value="">
                <input type="hidden" name="subject" value="New project request from your portfolio">
                <input type="hidden" name="from_name" value="alexbatten.dk Project Request">
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
                    <span class="brief-label">Type of work <em>(pick one or more)</em></span>
                    <div class="brief-pills">
                        <button type="button" class="brief-pill" data-value="AI &amp; automation">AI &amp; automation</button>
                        <button type="button" class="brief-pill" data-value="AI safety &amp; testing">AI safety &amp; testing</button>
                        <button type="button" class="brief-pill" data-value="Connecting systems">Connecting systems</button>
                        <button type="button" class="brief-pill" data-value="Web app">Web app</button>
                        <button type="button" class="brief-pill" data-value="Something else">Something else</button>
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
                        placeholder="What are you trying to solve, and what does success look like?"></textarea>
                </label>

                <button type="submit" class="brief-submit">Send request</button>
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
            emptyLead: `nothing here yet.`
        })
    },

    // Opened by the ball physics.js ("Sent ball") drops into the playground
    // once a project request is sent. Unlike 01 to 08, it has no ball in the
    // page markup.
    sent: {
        number: '&#10003;',
        title: 'Request sent',
        html: `
            <p>Thanks for reaching out. I'll get back to you within a couple of days.</p>
            <p style="margin-top:12px">The ball with the check mark is yours to throw around until you leave the page.</p>
        `
    },

    contact: {
        title: 'Get in Touch',
        html: `
            <p>Available for new freelance and contract work. Email alex.batten1234@gmail.com
            or send a project brief through the form on this site.</p>
            <ul style="list-style:none;padding:0;margin-top:16px">
                <li style="margin-bottom:10px">
                    <a href="mailto:alex.batten1234@gmail.com">alex.batten1234@gmail.com</a>
                </li>
                <li style="margin-bottom:10px">
                    <a href="https://github.com/AlexBatten" target="_blank" rel="noopener">GitHub</a>
                </li>
                <li style="margin-bottom:10px">
                    <a href="https://www.linkedin.com/in/alex-batten-48b28b2a2" target="_blank" rel="noopener">LinkedIn</a>
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
            <p>Hej, jeg hedder <strong>Alex</strong>. Jeg er AI-udvikler i Danmark og
            diplomingeniør (BEng) i softwareteknologi fra DTU. Min baggrund er
            C# og .NET: backendservices, REST-API'er og virksomhedsintegrationer.</p>
            <p style="margin-top:12px">Uden for arbejdet træner jeg og producerer musik.</p>
        `
    },

    experience: {
        number: '02',
        title: 'Erfaring',
        html: `
            <div class="entry">
                <div class="entry-header">
                    <h3>Senior Software Engineer, AI-infrastruktur hos Alignerr (kontrakt)</h3>
                    <span class="entry-date">Underskrevet 2026, ikke påbegyndt</span>
                </div>
                <p>Kontrakten er underskrevet, og den første opgave er endnu ikke gået i gang.
                Det aftalte omfang er infrastrukturen bag pipelines til træning, evaluering og
                udrulning af AI, i Python og TypeScript.</p>
                <div style="margin-top:8px">
                    <span class="tag">Python</span>
                    <span class="tag">TypeScript</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>AI-udvikler & medejer hos Acconta (startup)</h3>
                    <span class="entry-date">2026–nu</span>
                </div>
                <p>Bygger en multi-tenant SaaS-platform til dansk bogføring på tværs af hele
                stakken: mikroservices i ASP.NET Core og EF Core på .NET Aspire og Azure, med typede
                klienter genereret via OpenAPI/NSwag, og Next.js-klienten ovenpå. Har flyttet seks
                services over på en fælles servicebase til opstart, konfiguration, health checks,
                OpenAPI-dokumentation og autorisation. Har bygget momsindberetningen til SKAT fra
                ende til anden: beregningen af de 17 felter i momsangivelsen, integrationen mod
                NemVirksomheds (RSU) SOAP-grænseflade med WS-Security-signering, skærmbillederne i
                Next.js og forbindelsen til SKATs produktionsgateway, med signeringscertifikatet i
                Azure Key Vault. Har bygget backenden til bankafstemning på et open banking-feed
                (Aiia): matchede posteringer, der tilsammen skal gå præcist op med bankposteringen,
                et afstemningsoverblik og en idempotent synkronisering af transaktioner, der kører i
                sin egen service. Har opgraderet SAF-T-import og -eksport til 2.1-skemaet, med
                adskillelse mellem tenants og eksplicitte afvisningsregler, forud for kravet om
                standardiseret regnskabsfil i 2027. Har det fulde ansvar for Stripe-betalinger:
                abonnementer og licenslogik pr. bruger (proration, kreditter, planskift,
                årsabonnementer, bortfaldne abonnementer), webhooks og hærdning af hemmeligheder.
                Har bygget integrationer til daglige valutakurser (Nationalbanken), virksomhedsdata
                via CVR (Erhvervsstyrelsen) og transaktionelle e-mails. Leder arbejdet med
                e-fakturering via NemHandel og Peppol (OIOUBL, Peppol BIS) og bygger servicen, der
                sender og modtager fakturaerne. Har skrevet kravspecifikationen, stået for valget af
                accesspoint-leverandør og afklaret registreringsmodellen med Erhvervsstyrelsen.
                Omsætter bogføringsloven og de tilhørende bekendtgørelser til tekniske
                kravspecifikationer og gennemgår platformens autentificering og sikkerhed på tværs
                af tenants. Står for det meste af teamets grundige code review. Har opsat en autonom
                AI-udviklingsagent (en OpenAI-dot), som teamet tildeler GitHub-issues, og har
                udviklet agentens styringsprompt fra en kollegas første udkast gennem syv
                revisioner. Agenten er bygget til at lade Codex-agenter implementere, reviewe og
                teste hver ændring og derefter åbne en pull request til review hos et menneske. Har
                skrevet og præsenteret teamets guide til AI-assisteret udvikling med Claude Code.</p>
                <div style="margin-top:8px">
                    <span class="tag">C#</span>
                    <span class="tag">.NET Aspire</span>
                    <span class="tag">ASP.NET Core</span>
                    <span class="tag">Entity Framework</span>
                    <span class="tag">Mikroservices</span>
                    <span class="tag">Azure</span>
                    <span class="tag">Stripe</span>
                    <span class="tag">Next.js</span>
                    <span class="tag">NemHandel</span>
                    <span class="tag">Peppol</span>
                    <span class="tag">AI-agenter</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>AI Safety Expert hos Mercor (kontrakt)</h3>
                    <span class="entry-date">2026–nu</span>
                </div>
                <p>Skriver prompts og samtaler for at afprøve, hvordan AI-modeller håndterer
                skadelige og følsomme forespørgsler, og påpeger, hvor svarene ikke lever op til
                sikkerhedsretningslinjerne. Det færdige arbejde bruges som sikkerhedstræningsdata
                til store sprogmodeller.</p>
                <div style="margin-top:8px">
                    <span class="tag">AI-sikkerhed</span>
                    <span class="tag">Red teaming</span>
                    <span class="tag">Promptskrivning</span>
                    <span class="tag">LLM-træningsdata</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Generalist Expert, AI-evaluering hos Mercor (kontrakt)</h3>
                    <span class="entry-date">2026–nu</span>
                </div>
                <p>Evaluerer AI-modellers output mod strukturerede evalueringsretningslinjer og
                skriver begrundelsen bag hver enkelt bedømmelse. Arbejdet er nærlæsning: at
                kontrollere et svar for faktuel korrekthed, holdbar argumentation, efterlevelse af
                instruktioner og tone, og derefter præcist angive, hvor det holder, og hvor det
                falder fra hinanden, med belæg. Anvender den samme standard konsekvent på tværs
                af mange fagområder, så vurderinger forbliver sammenlignelige mellem bedømmere.</p>
                <div style="margin-top:8px">
                    <span class="tag">AI-evaluering</span>
                    <span class="tag">LLM-output</span>
                    <span class="tag">Struktureret feedback</span>
                    <span class="tag">Teknisk skrivning</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>Generalist Danish Annotator hos Mercor (kontrakt)</h3>
                    <span class="entry-date">2026</span>
                </div>
                <p>Skrev prompts på naturligt dansk om emner af almen interesse og annoterede
                AI-modellers svar. Annoteringerne påpegede fejl i svarene, også sproglige. Det
                færdige arbejde blev brugt som træningsdata til store sprogmodeller.</p>
                <div style="margin-top:8px">
                    <span class="tag">Dataannotering</span>
                    <span class="tag">Dansk sprog</span>
                    <span class="tag">Promptskrivning</span>
                    <span class="tag">LLM-træningsdata</span>
                </div>
            </div>
            <div class="entry">
                <div class="entry-header">
                    <h3>AI-dataannotator hos Outlier</h3>
                    <span class="entry-date">2025–nu</span>
                </div>
                <p>Bidrog til udvikling af avancerede AI-modeller gennem dataannotering, prompt
                engineering, forfining af trajektorier og QA på tværs af projekterne Clutch Zayu,
                Maraca Camera, Mechanic Astrologer og Meter Pavilion (OpenClaw). Udformede
                systemprompts, der definerer modellens adfærd og begrænsninger, og designede
                datasæt til samtaler og agenter, både single-turn og multi-turn, på tværs af 50+
                risikokategorier, heriblandt bias, misinformation, privatliv og sikkerhed. Byggede
                autonome agenttrajektorier, der afprøver skill discovery, hukommelse, kontekst over
                lange forløb og indbyggede værktøjer (cron, delegering til underagenter).
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
                    <h3>Softwareudviklerpraktikant hos IT Operators / Simple Agency Group</h3>
                    <span class="entry-date">2024</span>
                </div>
                <p>Udviklede REST-API'er med autentificering samt overvågning af forbrugsgrænser med
                e-mailadvarsler. Byggede fullstack-webapplikationer med Angular, .NET og Bootstrap,
                herunder JWT-autentificering, realtidsdashboards og automatiseret rapportering.
                Migrerede tidsangivelsen i et internt ERP-system fra kvarter til minutter i alle
                visnings-, estimat- og rapportfelter, og byggede derefter faktureringsgennemgangen om på
                det nye grundlag, så en opgave, der var udført af medarbejdere fra flere grupper, blev
                faktureret under hver af grupperne i stedet for kun én. Validerede den ombyggede
                faktureringsskærm ved at afstemme en hel måneds faktureringsdata mod det, der rent
                faktisk var blevet faktureret.</p>
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
                    <h3>Skræddersyet REST-API til Uno X</h3>
                    <span class="entry-date">Kunde: ISTOBAL</span>
                </div>
                <p>Byggede et skræddersyet API til ISTOBAL (producent af bilvaskeanlæg), som leverer
                driftsdata til deres kunde Uno X (nordisk tankstationskæde). Implementerede et
                tokenbaseret autentificeringssystem og optælling af forbrug pr. kald med automatiske
                e-mailadvarsler, når en forbrugsgrænse nås.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">REST-API</span>
                    <span class="tag">Autentificering</span>
                    <span class="tag">Forbrugsgrænser</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Automatisk SMS-alarmsystem, Eye4u</h3>
                    <span class="entry-date">Kunde: Eye4u</span>
                </div>
                <p>Udvidede en kundeportal til overvågning med automatiske SMS-notifikationer udløst
                af temperaturafvigelser i medicinkølere på tværs af et sensornetværk. Tilføjede et
                justerbart foralarmniveau, der advarer på SMS og e-mail uden at oprette en hændelse,
                med undertrykkelseslogik, så en sensor, der ligger uden for sin grænseværdi, ikke
                sender besked igen ved hvert tjek. Bygget som et multi-tenant-modul, hvor hver kunde
                har sin egen sensoropsætning og sine egne alarmgrænser.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">IoT / sensorer</span>
                    <span class="tag">Multi-tenant SaaS</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Intern portal, Dexa Bodyscan</h3>
                    <span class="entry-date">Kunde: Dexa Bodyscan</span>
                </div>
                <p>Byggede den første webapplikation til den interne portal hos en
                bodyscanklinik, fra tomt repository til en fungerende applikation med login på otte
                arbejdsdage: projektskelet, Dockerfile, DNS-record, SSL-certifikat, MySQL-skema,
                Entity Framework-kontekster, JWT-login, saltet hashing af adgangskoder, rollestyrede
                sider og nulstilling af adgangskode via et link i en e-mail.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">Entity Framework</span>
                    <span class="tag">Docker</span>
                    <span class="tag">Autentificering</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Interne overvågningsdashboards</h3>
                    <span class="entry-date">IT Operators</span>
                </div>
                <p>Realtidsdashboards udrullet på Raspberry Pi'er til kontorets TV-skærme, som
                overvåger tidsregistreringer og status på cron-jobs, så man kan følge
                arbejdseffektiviteten og opdage fejlede jobs tidligt.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">Realtid</span>
                    <span class="tag">Raspberry Pi</span>
                </div>
            </div>

            <div class="entry">
                <div class="entry-header">
                    <h3>Eksterne API-integrationer, TIMEVAT</h3>
                    <span class="entry-date">Kunde: TIMEVAT</span>
                </div>
                <p>Integrerede EU's VIES-API til validering af momsnumre og daglige valutakurser
                fra Den Europæiske Centralbank i en momscompliance-platform.</p>
                <div style="margin-top:8px">
                    <span class="tag">.NET</span>
                    <span class="tag">VIES-API</span>
                    <span class="tag">API-integration</span>
                </div>
            </div>

            <p style="opacity:0.5; font-size:0.78rem; margin:24px 0 16px; letter-spacing:0.02em;">
                Bachelorprojekt på DTU i samarbejde med IT Operators / Simple Agency
            </p>

            <div class="entry">
                <div class="entry-header">
                    <h3>Accelo til Business Central-integration</h3>
                    <span class="entry-date">DTU, feb.–jun. 2025</span>
                </div>
                <p>Fullstack-applikation, der importerer tidsregistreringer fra Accelo (PSA) til
                MSSQL, så de kan gennemgås: Accelo-delen af en integration med Microsoft Business
                Central (ERP). Byggede en brugerflade til at gennemgå og justere timer og designede
                datamodellen i MSSQL. Designede Business Central-delen op mod systemets API v2.0;
                den blev ikke bygget, fordi virksomhedens adgangsoplysninger til API'et kom for
                sent. Implementerede single sign-on via Microsoft Entra ID (single-tenant) og kørte
                applikationen i Docker i en Jenkins CI/CD-pipeline, med SQL Server uden for
                containerne. Unit tests i begge lag (63 backend-tests og 161 frontend-specs) samt
                end-to-end-tests med WebApplicationFactory og headless Selenium af de centrale
                flows til hentning og oversigt.</p>
                <div style="margin-top:8px">
                    <span class="tag">Angular</span>
                    <span class="tag">.NET</span>
                    <span class="tag">MSSQL</span>
                    <span class="tag">Docker</span>
                    <span class="tag">Jenkins</span>
                    <span class="tag">Selenium</span>
                </div>
            </div>

            <p style="opacity:0.5; font-size:0.78rem; margin:24px 0 16px; letter-spacing:0.02em;">
                Personlige projekter
            </p>

            <div class="entry">
                <div class="entry-header">
                    <h3>Invarix Guard</h3>
                    <span class="entry-date"><a href="https://invarix.dk/products/invarix-guard" target="_blank" rel="noopener">Website</a> &middot; <a href="https://www.nuget.org/packages/Invarix.Guard" target="_blank" rel="noopener">NuGet</a></span>
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
                en af fem afgørelser: tillad, advar, eskalér, afvis eller afbryd. Elleve
                detektorer dækker destruktiv SQL, shell-kommandoer, omskrivning af git-historik,
                nedlukning af cloud-ressourcer, lækkede hemmeligheder, løbske løkker, beskyttede
                mål, masseudsendelser, værktøjer uden for agentens tilladelsesliste, lofter over
                kald og tokens samt ændringer i Gates egen politik. Ti af dem bygger på virkelige
                hændelser, de fleste med offentlige postmortems. Matchningen er ren
                CPU-mønstergenkendelse uden kald til en model, så en afgørelse falder på 57 µs i
                median, og det samme kald under den samme politik afgøres altid ens. Politikken
                skrives som YAML eller flydende C#, den kobles på Microsoft.Extensions.AI og
                Microsoft Agent Framework, og den rapporterer de flader, den ikke kan se, frem for
                at vise et rent resultat. Leveres med et testkorpus på omkring 220 scenarier,
                hvoraf mere end 90 alene skal vise, at almindeligt arbejde ikke udløser noget. En
                detektor, der altid udløses, bliver slået fra i sin første uge.</p>
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
                    <span class="entry-date">På pause</span>
                </div>
                <p>En konceptapp til at generere tilpassede guidede meditationer med AI-drevet
                tekst-til-tale, lagt sammen med Hemi-Sync binaurale beats til hjernebølge-entrainment.
                Bygget i React Native til både iOS og Android.</p>
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
                    <h3>Diplomingeniør (BEng) i softwareteknologi, Danmarks Tekniske Universitet (DTU)</h3>
                    <span class="entry-date">2021–2025</span>
                </div>
                <p>Valgfag i computergrafik, rendering, C++-programmering og ingeniørøkonomi.
                Bachelorprojekt: en PSA-til-ERP-integration (Accelo til Microsoft Business Central),
                hvor Accelo-delen blev bygget fra bunden, og Business Central-delen blev designet,
                men ikke bygget.
                Gennemsnit: 7,62 (dansk <span style="white-space:nowrap">7-trinsskala</span>).</p>
                ${gradeRuler(7.62, '7,62')}
            </div>
        `
    },

    recommendations: {
        number: '06',
        title: 'Anbefalinger',
        html: `
            <div class="rec">
                <pre class="rec-mark" aria-hidden="true">${REC_MARKS.quote}</pre>
                <div>
                    <h3>Mike Valencia</h3>
                    <p class="rec-role">CEO hos Simple Agency Group</p>
                    <p>Har skrevet om Alex Battens arbejde hos Simple Agency Group.</p>
                    <p style="margin-top:8px"><a href="https://www.linkedin.com/posts/mike-valencia-8858352a_development-software-integrations-activity-7196790268858138624-zarE" target="_blank" rel="noopener">Se opslaget på LinkedIn</a></p>
                </div>
            </div>

            <div class="rec">
                <pre class="rec-mark" aria-hidden="true">${REC_MARKS.check}</pre>
                <div>
                    <h3>Erik Seifert</h3>
                    <p class="rec-role">Har bekræftet følgende kompetencer</p>
                    <div class="rec-stamps">
                        <span class="tag">C#</span>
                        <span class="tag">.NET Framework</span>
                        <span class="tag">Entity Framework (EF) Core</span>
                    </div>
                </div>
            </div>
        `
    },

    hire: {
        number: '07',
        title: 'Start et projekt',
        html: `
            <p class="brief-intro">Jeg er ledig til nye freelance- og kontraktopgaver. Fortæl
            mig, hvad du har brug for, med eller uden AI, så svarer jeg inden for et par dage.</p>

            <form class="brief-form" id="brief-form" novalidate>
                <input type="hidden" name="access_key" value="">
                <input type="hidden" name="subject" value="New project request from your portfolio (DA)">
                <input type="hidden" name="from_name" value="alexbatten.dk Project Request">
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
                    <span class="brief-label">Opgavetype <em>(vælg gerne flere)</em></span>
                    <div class="brief-pills">
                        <button type="button" class="brief-pill" data-value="AI og automatisering">AI og automatisering</button>
                        <button type="button" class="brief-pill" data-value="AI-sikkerhed og test">AI-sikkerhed og test</button>
                        <button type="button" class="brief-pill" data-value="Systemer der taler sammen">Systemer der taler sammen</button>
                        <button type="button" class="brief-pill" data-value="Webapplikation">Webapplikation</button>
                        <button type="button" class="brief-pill" data-value="Noget andet">Noget andet</button>
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
                        placeholder="Hvad prøver du at løse, og hvornår er det en succes?"></textarea>
                </label>

                <button type="submit" class="brief-submit">Send forespørgsel</button>
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
            emptyLead: `intet her endnu.`
        })
    },

    sent: {
        number: '&#10003;',
        title: 'Forespørgsel sendt',
        html: `
            <p>Tak fordi du skrev. Jeg vender tilbage inden for et par dage.</p>
            <p style="margin-top:12px">Bolden med fluebenet er din at kaste rundt med, til du forlader siden.</p>
        `
    },

    contact: {
        title: 'Kontakt',
        html: `
            <p>Jeg er ledig til nye freelance- og kontraktopgaver. Skriv til
            alex.batten1234@gmail.com, eller send en projektbeskrivelse via formularen
            her på siden.</p>
            <ul style="list-style:none;padding:0;margin-top:16px">
                <li style="margin-bottom:10px">
                    <a href="mailto:alex.batten1234@gmail.com">alex.batten1234@gmail.com</a>
                </li>
                <li style="margin-bottom:10px">
                    <a href="https://github.com/AlexBatten" target="_blank" rel="noopener">GitHub</a>
                </li>
                <li style="margin-bottom:10px">
                    <a href="https://www.linkedin.com/in/alex-batten-48b28b2a2" target="_blank" rel="noopener">LinkedIn</a>
                </li>
            </ul>
        `
    }
};

// physics.js reads CONTENT[id] directly, so resolve the language here and leave
// that call site untouched.
const CONTENT = document.documentElement.lang === 'da' ? CONTENT_DA : CONTENT_EN;
