// ── Freelance project-request form (the "07 Hire" ball) ──
//
// Submissions are delivered by Web3Forms (https://web3forms.com) — a free,
// no-backend form endpoint that emails each request straight to you.
//
//   SETUP: paste your free access key below. Get one in ~30 seconds at
//   https://web3forms.com — enter the email you want requests sent to and
//   they email you the key. No account, no dashboard required.
const WEB3FORMS_ACCESS_KEY = '30293598-c27a-46d8-8b77-dc6f1a6e3006';

(function () {
    // Status and button text, matched to the language of the page the form was
    // opened from. The form markup itself is translated in content.js.
    const STRINGS = {
        en: {
            incomplete: 'Please fill in your name, email, and a few details.',
            sending: 'Sending…',
            submit: 'Send project request',
            failed: "Couldn't send right now. Email me directly at alex.batten1234@gmail.com.",
            successTitle: 'Request sent',
            successBody: "Thanks for reaching out. I'll get back to you within a couple of days."
        },
        da: {
            incomplete: 'Udfyld venligst navn, e-mail og et par detaljer.',
            sending: 'Sender…',
            submit: 'Send projektforespørgsel',
            failed: 'Kunne ikke sende lige nu. Skriv direkte til alex.batten1234@gmail.com.',
            successTitle: 'Forespørgsel sendt',
            successBody: 'Tak fordi du skrev. Jeg vender tilbage inden for et par dage.'
        }
    };
    const T = document.documentElement.lang === 'da' ? STRINGS.da : STRINGS.en;

    // The form is injected into the modal via innerHTML when the ball is
    // clicked, so we delegate from the document rather than binding directly.

    // Toggle the project-type pills and mirror the selection into the hidden
    // project_type field so it rides along in the submission.
    document.addEventListener('click', function (e) {
        const pill = e.target.closest('.brief-pill');
        if (!pill) return;
        pill.classList.toggle('active');
        syncPills(pill.closest('form'));
    });

    function syncPills(form) {
        if (!form) return;
        const chosen = Array.from(form.querySelectorAll('.brief-pill.active'))
            .map(p => p.dataset.value);
        const hidden = form.querySelector('input[name="project_type"]');
        if (hidden) hidden.value = chosen.join(', ');
    }

    document.addEventListener('submit', function (e) {
        const form = e.target.closest('#brief-form');
        if (!form) return;
        e.preventDefault();
        submitBrief(form);
    });

    async function submitBrief(form) {
        const status = form.querySelector('#brief-status');
        const btn = form.querySelector('.brief-submit');
        const honeypot = form.querySelector('.brief-hp');

        // Bot filled the hidden field — silently drop it.
        if (honeypot && honeypot.checked) return;

        // Basic required-field check (form is novalidate so we control the UX).
        const name = form.querySelector('[name="name"]');
        const email = form.querySelector('[name="email"]');
        const message = form.querySelector('[name="message"]');
        if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
            showStatus(status, T.incomplete, 'error');
            return;
        }

        syncPills(form);
        form.querySelector('input[name="access_key"]').value = WEB3FORMS_ACCESS_KEY;

        btn.disabled = true;
        btn.textContent = T.sending;
        showStatus(status, '', '');

        try {
            const res = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: new FormData(form)
            });
            const json = await res.json();
            if (json.success) {
                showSuccess(form);
            } else {
                throw new Error(json.message || 'Request failed');
            }
        } catch (err) {
            btn.disabled = false;
            btn.textContent = T.submit;
            showStatus(status, T.failed, 'error');
        }
    }

    function showStatus(el, msg, type) {
        if (!el) return;
        el.textContent = msg;
        el.className = 'brief-status' + (type ? ' ' + type : '');
    }

    // Swap the whole form out for a confirmation once it's sent.
    function showSuccess(form) {
        form.innerHTML =
            '<div class="brief-success">' +
                '<div class="brief-success-icon">&#10003;</div>' +
                '<h3>' + T.successTitle + '</h3>' +
                '<p>' + T.successBody + '</p>' +
            '</div>';
    }
})();
