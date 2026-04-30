// Contact page: theme/nav helpers + contact form submission.
import { setupThemeToggle, setupNavActive } from './script-home.js';

const bodyPage = document.body.dataset.page;

function cleanText(value) {
  return String(value || '').trim();
}

// Basic XHR helper to keep the frontend dependency-free.
function fetchApiWithFallback(path, options, callback) {
  const rawPath = String(path || '');
  const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const requestOptions = options || {};
  const method = requestOptions.method || 'GET';
  const headers = requestOptions.headers || {};
  const body = requestOptions.body || null;

  const xhr = new XMLHttpRequest();
  xhr.open(method, normalizedPath, true);

  Object.keys(headers).forEach(function (key) {
    xhr.setRequestHeader(key, headers[key]);
  });

  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;

    let data = {};
    if (xhr.responseText) {
      try {
        data = JSON.parse(xhr.responseText);
      } catch (_e) {
        data = {};
      }
    }

    callback(null, {
      ok: xhr.status >= 200 && xhr.status < 300,
      status: xhr.status,
      data,
    });
  };

  xhr.onerror = function () {
    callback(new Error('Network error'));
  };

  xhr.send(body);
}

// Wire up the contact form submission and inline feedback.
function setupContactForm() {
  if (bodyPage !== 'contact') return;
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitButton = document.getElementById('contactSubmitButton');
  const successEl = document.getElementById('contactSuccess');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!submitButton) return;
    if (successEl) {
      successEl.textContent = '';
      successEl.className = 'helper-text';
    }

    const name = cleanText(document.getElementById('contactName')?.value);
    const email = cleanText(document.getElementById('contactEmail')?.value).toLowerCase();
    const subject = cleanText(document.getElementById('contactSubject')?.value);
    const phone = cleanText(document.getElementById('contactPhone')?.value);
    const message = cleanText(document.getElementById('contactMessage')?.value);

    if (!name || !email || !subject || !message) {
      if (successEl) successEl.textContent = 'Please fill all required fields.';
      return;
    }

    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Sending...';

    fetchApiWithFallback(
      '/api/contact',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, phone, message }),
      },
      function (error, result) {
        if (error) {
          if (successEl) successEl.textContent = 'Network error. Please try again later.';
          submitButton.disabled = false;
          submitButton.textContent = originalText;
          return;
        }

        const payload = result.data || {};
        if (!result.ok) {
          if (successEl) successEl.textContent = payload.message || 'Unable to send message.';
          submitButton.disabled = false;
          submitButton.textContent = originalText;
          return;
        }

        if (successEl) successEl.textContent = payload.message || 'Message sent. We will get back to you soon.';
        form.reset();
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    );
  });
}

setupThemeToggle();
setupNavActive();
setupContactForm();
