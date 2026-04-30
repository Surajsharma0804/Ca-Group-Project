// Volunteer page: theme/nav helpers + volunteer form submission.
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

// Wire up the volunteer application form.
function setupVolunteerForm() {
  if (bodyPage !== 'volunteer') return;
  const form = document.getElementById('volunteerForm');
  if (!form) return;

  const submitButton = document.getElementById('volunteerSubmitButton');
  const successEl = document.getElementById('volunteerSuccess');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!submitButton) return;
    if (successEl) {
      successEl.textContent = '';
      successEl.className = 'helper-text';
    }

    const name = cleanText(document.getElementById('volunteerName')?.value);
    const email = cleanText(document.getElementById('volunteerEmail')?.value).toLowerCase();
    const phone = cleanText(document.getElementById('volunteerPhone')?.value);
    const area = cleanText(document.getElementById('volunteerArea')?.value);
    const message = cleanText(document.getElementById('volunteerMessage')?.value);

    if (!name || !email || !phone || !area) {
      if (successEl) successEl.textContent = 'Please fill all required fields.';
      return;
    }

    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';

    fetchApiWithFallback(
      '/api/volunteer',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, area, message }),
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
          if (successEl) successEl.textContent = payload.message || 'Unable to submit application.';
          submitButton.disabled = false;
          submitButton.textContent = originalText;
          return;
        }

        if (successEl)
          successEl.textContent = payload.message || 'Application submitted. We will contact you when roles open.';
        form.reset();
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    );
  });
}

setupThemeToggle();
setupNavActive();
setupVolunteerForm();
