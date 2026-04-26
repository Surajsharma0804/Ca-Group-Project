const eventCatalog = {
  'HackLPU 3.0': {
    fee: 399,
    mode: 'paid',
    category: 'Hackathon',
    teamSize: { min: 1, max: 4 },
    cta: 'Generate UPI QR',
    successMessage: 'Payment verified successfully. Team registration is confirmed.',
  },

  'Web Dev Bootcamp': {
    fee: 0,
    mode: 'free',
    category: 'Workshop',
    teamSize: { min: 1, max: 1 },
    cta: 'Confirm Registration',
    successMessage: 'Registration completed successfully. Watch your email for updates.',
  },

  'DSA Challenge Week': {
    fee: 0,
    mode: 'free',
    category: 'Competition',
    teamSize: { min: 1, max: 1 },
    cta: 'Join Challenge',
    successMessage: 'Challenge registration completed successfully.',
  },

  'AI/ML Workshop': {
    fee: 0,
    mode: 'free',
    category: 'Workshop',
    teamSize: { min: 1, max: 1 },
    cta: 'Reserve Seat',
    successMessage: 'Workshop registration completed successfully.',
  },

  'HackLPU 2.0': {
    fee: 399,
    mode: 'paid',
    category: 'Hackathon',
    teamSize: { min: 1, max: 4 },
    cta: 'Generate UPI QR',
    successMessage: 'Registration recorded for HackLPU 2.0.',
  },
};


function getDefaultEventConfig(eventTitle) {
  const normalizedTitle = String(eventTitle || 'HackLPU 3.0').trim();
  return eventCatalog[normalizedTitle] || eventCatalog['HackLPU 3.0'];
}


function parseEventConfig(trigger, fallbackTitle = 'HackLPU 3.0') {
  const fallback = getDefaultEventConfig(trigger?.dataset?.eventTitle || fallbackTitle);
  const fee = Number(trigger?.dataset?.eventFee);
  const teamMin = Number(trigger?.dataset?.teamMin);
  const teamMax = Number(trigger?.dataset?.teamMax);

  return {
    fee: Number.isFinite(fee) ? fee : fallback.fee,
    mode: trigger?.dataset?.eventMode || fallback.mode,
    category: trigger?.dataset?.eventCategory || fallback.category,
    teamSize: {
      min: Number.isFinite(teamMin) ? teamMin : fallback.teamSize.min,
      max: Number.isFinite(teamMax) ? teamMax : fallback.teamSize.max,
    },
    cta: trigger?.dataset?.eventCta || fallback.cta,
    successMessage: trigger?.dataset?.successMessage || fallback.successMessage,
  };
}


const bodyPage = document.body.dataset.page;
const themeToggles = document.querySelectorAll('[data-theme-toggle]');
let countdownTimerId = null;


function applyTheme(theme) {
  const nextTheme = theme === 'light' ? 'light' : 'dark';
  document.body.dataset.theme = nextTheme;

  themeToggles.forEach(function (button) {
    button.textContent = nextTheme === 'light' ? 'Dark Mode' : 'Light Mode';
    button.setAttribute(
      'aria-label',
      nextTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
    );
  });
}


function setupThemeToggle() {
  const savedTheme = window.localStorage.getItem('arena-theme');
  applyTheme(savedTheme || 'dark');

  themeToggles.forEach(function (button) {
    button.addEventListener('click', function () {
      const nextTheme = document.body.dataset.theme === 'light' ? 'dark' : 'light';
      window.localStorage.setItem('arena-theme', nextTheme);
      applyTheme(nextTheme);
    });
  });
}

function normalizePagePath(value) {
  return String(value || '').replace(/^\//, '').replace(/^\.\//, '');
}


document.querySelectorAll('.desktop-nav a').forEach(function (link) {
  const href = normalizePagePath(link.getAttribute('href'));

  if (
    (bodyPage === 'home' && href === 'index.html') ||
    (bodyPage === 'events' && href === 'events.html') ||
    (bodyPage === 'gallery' && href === 'gallery.html') ||
    (bodyPage === 'volunteer' && href === 'volunteer.html') ||
    (bodyPage === 'contact' && href === 'contact.html')
  ) {
    link.classList.add('active');
  }
});


function setupRegistrationCountdowns() {
  const countdownBlocks = document.querySelectorAll('.countdown-strip');
  if (!countdownBlocks.length) return;

  function formatRemainingTime(targetDate) {
    const distance = new Date(targetDate).getTime() - Date.now();
    if (distance <= 0) return 'Registration closed';

    const days = Math.floor(distance / 86400000);
    const hours = Math.floor((distance % 86400000) / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    const seconds = Math.floor((distance % 60000) / 1000);

    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }

  function updateCountdowns() {
    countdownBlocks.forEach(function (block) {
      const value = block.querySelector('.countdown-value');
      const deadline = block.dataset.deadline;
      if (!value || !deadline) return;
      value.textContent = formatRemainingTime(deadline);
    });
  }

  updateCountdowns();

  if (countdownTimerId) window.clearInterval(countdownTimerId);
  countdownTimerId = window.setInterval(updateCountdowns, 1000);
}


// Events page: search + filter handling
function setupEventsPage() {
  if (bodyPage !== 'events') return;

  const searchInput = document.getElementById('eventSearch');
  const filterButtons = Array.from(document.querySelectorAll('.filter-button'));
  const upcomingGrid = document.getElementById('upcomingEvents');
  const pastGrid = document.getElementById('pastEvents');
  const upcomingEmpty = document.getElementById('upcomingEmpty');
  const pastEmpty = document.getElementById('pastEmpty');

  if (!upcomingGrid && !pastGrid) return;

  let selectedFilter = (filterButtons.find((b) => b.classList.contains('active')) || {}).dataset?.filter || 'All';

  function normalize(str) {
    return String(str || '').trim().toLowerCase();
  }

  function matchesCard(card, query, filter) {
    const tag = normalize(card.dataset.tag);
    const dataSearch = normalize(card.dataset.search);
    const title = normalize(card.querySelector('h3')?.textContent);
    const combined = `${tag} ${dataSearch} ${title}`;

    const passesFilter = filter === 'All' || (tag && tag === normalize(filter));
    const passesSearch = !query || combined.indexOf(query) !== -1;
    return passesFilter && passesSearch;
  }

  function applyFilters() {
    const q = normalize(searchInput?.value || '');

    if (upcomingGrid) {
      const cards = Array.from(upcomingGrid.querySelectorAll('.event-card'));
      let anyVisible = false;
      cards.forEach((card) => {
        const ok = matchesCard(card, q, selectedFilter);
        card.style.display = ok ? '' : 'none';
        if (ok) anyVisible = true;
      });
      if (upcomingEmpty) upcomingEmpty.classList.toggle('hidden', anyVisible);
    }

    if (pastGrid) {
      const cards = Array.from(pastGrid.querySelectorAll('.event-card'));
      let anyVisible = false;
      cards.forEach((card) => {
        const ok = matchesCard(card, q, selectedFilter);
        card.style.display = ok ? '' : 'none';
        if (ok) anyVisible = true;
      });
      if (pastEmpty) pastEmpty.classList.toggle('hidden', anyVisible);
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      applyFilters();
    });
  }

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      filterButtons.forEach(function (b) {
        b.classList.toggle('active', b === button);
      });
      selectedFilter = button.dataset.filter || 'All';
      applyFilters();
    });
  });

  // initial apply
  applyFilters();
}


// Contact form handler
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


// Volunteer form handler
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

        if (successEl) successEl.textContent = payload.message || 'Application submitted. We will contact you when roles open.';
        form.reset();
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    );
  });
}


function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


function cleanText(value) {
  return String(value || '').trim();
}


// Simple direct XHR wrapper (no localhost fallback) kept for registration calls
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


// --- Slideshows (home) ---
function setupHomeMomentsSlideshow() {
  if (bodyPage !== 'home') return;

  const slider = document.getElementById('homeMomentsSlideshow');
  const viewport = document.getElementById('momentsViewport');
  const prevButton = document.getElementById('momentsPrev');
  const nextButton = document.getElementById('momentsNext');
  const dotsHost = document.getElementById('momentsDots');

  if (!slider || !viewport || !prevButton || !nextButton || !dotsHost) return;

  const slides = Array.from(viewport.querySelectorAll('.moment-slide'));
  if (!slides.length) return;

  let currentIndex = 0;
  let autoplayId = null;

  const dots = slides.map(function (_slide, index) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'slider-dot';
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);

    dot.addEventListener('click', function () {
      setActive(index);
      restartAutoplay();
    });

    dotsHost.appendChild(dot);
    return dot;
  });

  function setActive(index) {
    currentIndex = (index + slides.length) % slides.length;

    slides.forEach(function (slide, slideIndex) {
      const isActive = slideIndex === currentIndex;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
    });

    dots.forEach(function (dot, dotIndex) {
      dot.classList.toggle('active', dotIndex === currentIndex);
    });
  }

  function startAutoplay() {
    if (autoplayId) window.clearInterval(autoplayId);
    autoplayId = window.setInterval(function () {
      setActive(currentIndex + 1);
    }, 3500);
  }

  function restartAutoplay() {
    startAutoplay();
  }

  prevButton.addEventListener('click', function () {
    setActive(currentIndex - 1);
    restartAutoplay();
  });

  nextButton.addEventListener('click', function () {
    setActive(currentIndex + 1);
    restartAutoplay();
  });

  slider.addEventListener('mouseenter', function () {
    if (autoplayId) window.clearInterval(autoplayId);
  });

  slider.addEventListener('mouseleave', function () {
    startAutoplay();
  });

  setActive(0);
  startAutoplay();
}


function setupHeroTopGallerySlideshow() {
  if (bodyPage !== 'home') return;

  const heroBackground = document.getElementById('heroGalleryBackground');
  if (!heroBackground) return;

  const slides = Array.from(heroBackground.querySelectorAll('.hero-gallery-slide'));
  if (!slides.length) return;

  let currentIndex = 0;

  function setActive(index) {
    currentIndex = (index + slides.length) % slides.length;
    slides.forEach(function (slide, slideIndex) {
      slide.classList.toggle('active', slideIndex === currentIndex);
    });
  }

  setActive(0);
  window.setInterval(function () {
    setActive(currentIndex + 1);
  }, 3600);
}


// --- Registration flow (kept minimal) ---
function setupRegistrationFlow() {
  const modal = document.getElementById('registrationModal');
  if (!modal) return;

  const closeModal = document.getElementById('closeModal');
  const backButton = document.getElementById('backButton');
  const nextButton = document.getElementById('nextButton');
  const payNowButton = document.getElementById('payNowButton');
  const formMessage = document.getElementById('formMessage');
  const stepTitle = document.getElementById('stepTitle');
  const selectedEventLabel = document.getElementById('selectedEventLabel');
  const progressLabel = document.getElementById('progressLabel');
  const progressText = document.getElementById('progressText');
  const progressFill = document.getElementById('progressFill');
  const formSteps = document.querySelectorAll('.form-step');
  const teamSizeButtons = document.querySelectorAll('.team-size-button');
  const teamSizeNote = document.getElementById('teamSizeNote');
  const memberFields = document.getElementById('memberFields');
  const reviewPanel = document.getElementById('reviewPanel');
  const paymentTitle = document.getElementById('paymentTitle');
  const paymentDescription = document.getElementById('paymentDescription');
  const registrationModeBadge = document.getElementById('registrationModeBadge');
  const upiQrPanel = document.getElementById('upiQrPanel');
  const upiQrImage = document.getElementById('upiQrImage');
  const upiQrStatus = document.getElementById('upiQrStatus');

  let currentStep = 1;
  let teamSize = 1;
  let selectedEvent = 'HackLPU 3.0';
  let selectedEventConfig = getDefaultEventConfig(selectedEvent);

  function clearMessage() {
    if (!formMessage) return;
    formMessage.textContent = '';
    formMessage.className = 'message-box hidden';
  }

  function setStep(step) {
    currentStep = step;

    if (stepTitle)
      stepTitle.textContent = {
        1: 'Group Head Details',
        2: 'Team Size',
        3: 'Additional Member Details',
        4: 'Review and Confirm',
      }[step];

    if (progressLabel) progressLabel.textContent = `Step ${step} of 4`;

    if (progressText)
      progressText.textContent = {
        1: 'Group Head Details',
        2: 'Team Size',
        3: 'Additional Member Details',
        4: 'Review and Confirm',
      }[step];

    if (progressFill) progressFill.style.width = `${(step / 4) * 100}%`;

    formSteps.forEach(function (section) {
      const isCurrentStep = Number(section.dataset.step) === step;
      section.classList.toggle('active', isCurrentStep);
      section.hidden = !isCurrentStep;
    });

    backButton && backButton.classList.toggle('hidden', step === 1);
    nextButton && nextButton.classList.toggle('hidden', step === 4);

    clearMessage();
    if (step === 4) renderReview();
  }

  function setTeamSize(size) {
    const minSize = selectedEventConfig.teamSize.min;
    const maxSize = selectedEventConfig.teamSize.max;

    teamSize = Math.max(minSize, Math.min(maxSize, size));

    teamSizeButtons.forEach(function (button) {
      const buttonSize = Number(button.dataset.size);
      const isAllowed = buttonSize >= minSize && buttonSize <= maxSize;
      button.disabled = !isAllowed;
      button.classList.toggle('active', buttonSize === teamSize);
      button.classList.toggle('disabled-option', !isAllowed);
    });

    if (teamSizeNote)
      teamSizeNote.textContent =
        teamSize === 1
          ? 'You selected 1 member, so the next step will go directly to review.'
          : `You selected ${teamSize} total members.`;

    renderMemberFields();
  }

  function renderMemberFields() {
    if (!memberFields) return;
    memberFields.innerHTML = '';

    const extraMembers = teamSize - 1;
    for (let index = 0; index < extraMembers; index += 1) {
      const memberCard = document.createElement('div');
      memberCard.className = 'member-card';
      memberCard.innerHTML =
        `<h3>Member ${index + 2}</h3>
         <div class="form-grid">
           <label><span>Full Name</span><input type="text" data-field="name" /></label>
           <label><span>Email ID</span><input type="email" data-field="email" /></label>
           <label><span>Phone Number</span><input type="text" data-field="phone" /></label>
           <label><span>Course / Year</span><input type="text" data-field="courseYear" /></label>
         </div>`;

      memberFields.appendChild(memberCard);
    }
  }

  function getHeadData() {
    return {
      name: document.getElementById('headName')?.value.trim() || '',
      email: document.getElementById('headEmail')?.value.trim().toLowerCase() || '',
      phone: document.getElementById('headPhone')?.value.trim() || '',
      courseYear: document.getElementById('headCourseYear')?.value.trim() || '',
    };
  }

  function getMemberData() {
    if (!memberFields) return [];
    return Array.from(memberFields.querySelectorAll('.member-card')).map(function (card) {
      const inputs = card.querySelectorAll('input');
      const member = {};
      inputs.forEach(function (input) {
        member[input.dataset.field] = input.value.trim();
      });
      member.email = (member.email || '').toLowerCase();
      return member;
    });
  }

  function getFormData() {
    return {
      eventTitle: selectedEvent,
      teamName: document.getElementById('teamName')?.value.trim() || '',
      collegeName: document.getElementById('collegeName')?.value.trim() || '',
      teamSize,
      head: getHeadData(),
      members: getMemberData(),
    };
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateHeadStep() {
    const data = getFormData();
    if (
      !data.teamName ||
      !data.collegeName ||
      !data.head.name ||
      !data.head.email ||
      !data.head.phone ||
      !data.head.courseYear
    ) {
      showMessage('Please fill all group head and team details.', 'error');
      return false;
    }

    if (!validateEmail(data.head.email)) {
      showMessage('Please enter a valid email address for the group head.', 'error');
      return false;
    }

    return true;
  }

  function validateMemberStep() {
    const data = getFormData();
    const participants = [data.head, ...data.members];

    const hasMissingFields = participants.some(function (p) {
      return !p.name || !p.email || !p.phone || !p.courseYear;
    });

    if (hasMissingFields) {
      showMessage('Please fill all visible member details.', 'error');
      return false;
    }

    const hasInvalidEmail = participants.some(function (p) {
      return !validateEmail(p.email);
    });

    if (hasInvalidEmail) {
      showMessage('Please use valid email IDs for every participant.', 'error');
      return false;
    }

    const emails = participants.map(function (p) {
      return p.email;
    });

    if (new Set(emails).size !== emails.length) {
      showMessage('Every team member, including the head, must have a unique email ID.', 'error');
      return false;
    }

    return true;
  }

  function renderReview() {
    const data = getFormData();
    const participants = [data.head, ...data.members];
    if (!reviewPanel) return;

    reviewPanel.innerHTML =
      `<div class="review-block">
         <h3>Event Summary</h3>
         <p><strong>Event:</strong> ${escapeHtml(data.eventTitle)}</p>
         <p><strong>Format:</strong> ${escapeHtml(selectedEventConfig.category)}</p>
         <p><strong>Team Name:</strong> ${escapeHtml(data.teamName)}</p>
         <p><strong>College:</strong> ${escapeHtml(data.collegeName)}</p>
         <p><strong>Team Size:</strong> ${escapeHtml(data.teamSize)}</p>
       </div>` +
      participants
        .map(function (participant, index) {
          const title = index === 0 ? 'Group Head' : `Member ${index + 1}`;
          return `<div class="review-block">
                    <h3>${escapeHtml(title)}</h3>
                    <p>${escapeHtml(participant.name)}</p>
                    <p>${escapeHtml(participant.email)}</p>
                    <p>${escapeHtml(participant.phone)}</p>
                    <p>${escapeHtml(participant.courseYear)}</p>
                  </div>`;
        })
        .join('');
  }

  function showMessage(message, type) {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = `message-box ${type}`;
    formMessage.classList.remove('hidden');
  }

  function handlePayment() {
    clearMessage();

    if (!validateHeadStep()) {
      setStep(1);
      return;
    }

    if (teamSize > 1 && !validateMemberStep()) {
      setStep(3);
      return;
    }

    const data = getFormData();

    if (selectedEventConfig.mode === 'free') {
      payNowButton.disabled = true;
      payNowButton.textContent = 'Confirming...';

      fetchApiWithFallback(
        '/api/register-free',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
        function (error, result) {
          if (error) {
            showMessage('Something went wrong while completing registration.', 'error');
            payNowButton.disabled = false;
            payNowButton.textContent = selectedEventConfig.cta;
            return;
          }

          const registerData = result.data || {};
          if (!result.ok) {
            showMessage(registerData.message || 'Unable to complete registration.', 'error');
            payNowButton.disabled = false;
            payNowButton.textContent = selectedEventConfig.cta;
            return;
          }

          showMessage(selectedEventConfig.successMessage, 'success');
          payNowButton.textContent = 'Registered';
        }
      );
      return;
    }

    payNowButton.disabled = true;
    payNowButton.textContent = 'Generating QR...';

    if (upiQrPanel) upiQrPanel.classList.add('hidden');

    fetchApiWithFallback(
      '/api/create-upi-session',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
      function (error, result) {
        if (error) {
          showMessage('Something went wrong while generating the UPI QR.', 'error');
          payNowButton.disabled = false;
          payNowButton.textContent = selectedEventConfig.cta;
          return;
        }

        const orderData = result.data || {};
        if (!result.ok) {
          showMessage(orderData.message || 'Unable to create payment order.', 'error');
          payNowButton.disabled = false;
          payNowButton.textContent = selectedEventConfig.cta;
          return;
        }

        if (upiQrPanel && upiQrImage) {
          upiQrImage.src = orderData.qrCodeImageUrl;
          upiQrPanel.classList.remove('hidden');
        }

        if (upiQrStatus) upiQrStatus.textContent = `Scan this QR with any UPI app to pay Rs. ${orderData.amountDisplay}.`;

        payNowButton.disabled = false;
        payNowButton.textContent = 'Generate New UPI QR';

        // Polling simplified: single check after a short delay
        setTimeout(function () {
          fetchApiWithFallback(`/api/payment-status/${orderData.sessionId}`, null, function (_statusError, statusResult) {
            if (_statusError || !statusResult || !statusResult.ok) return;
            const statusJson = statusResult.data || {};
            if (statusJson.status === 'paid') {
              showMessage(selectedEventConfig.successMessage, 'success');
              if (upiQrStatus) upiQrStatus.textContent = 'Payment received and registration confirmed.';
              payNowButton.disabled = true;
              payNowButton.textContent = 'Payment Completed';
            }
          });
        }, 4000);
      }
    );
  }

  document.addEventListener('click', function (event) {
    const trigger = event.target.closest('.register-trigger');
    if (!trigger) return;

    selectedEvent = cleanText(trigger.dataset.eventTitle || 'HackLPU 3.0');
    selectedEventConfig = parseEventConfig(trigger, selectedEvent);
    selectedEventLabel && (selectedEventLabel.textContent = `Selected event: ${selectedEvent}`);
    setTeamSize(selectedEventConfig.teamSize.min);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  });

  closeModal &&
    closeModal.addEventListener('click', function () {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    });

  backButton &&
    backButton.addEventListener('click', function () {
      if (currentStep === 4 && teamSize > 1) {
        setStep(3);
        return;
      }
      if (currentStep > 1) setStep(currentStep - 1);
    });

  nextButton &&
    nextButton.addEventListener('click', function () {
      if (currentStep === 1) {
        if (!validateHeadStep()) return;
        setStep(2);
        return;
      }
      if (currentStep === 2) {
        if (teamSize === 1) {
          if (!validateHeadStep()) return;
          setStep(4);
          return;
        }
        setStep(3);
        return;
      }
      if (currentStep === 3) {
        if (!validateHeadStep() || !validateMemberStep()) return;
        setStep(4);
      }
    });

  payNowButton && payNowButton.addEventListener('click', handlePayment);

  teamSizeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      setTeamSize(Number(button.dataset.size));
    });
  });

  setTeamSize(selectedEventConfig.teamSize.min);
  setStep(1);
}


// Initialize minimal features
function initPageSpecific() {
  try {
    if (bodyPage === 'home') {
      // Homepage: slideshows + countdowns
      setupHomeMomentsSlideshow();
      setupHeroTopGallerySlideshow();
      setupRegistrationCountdowns();
    } else if (bodyPage === 'events') {
      // Events page: countdowns + registration flow available
      setupRegistrationCountdowns();
      setupEventsPage();
    } else if (bodyPage === 'gallery') {
      // Gallery page: no heavy JS, registration flow remains available
    } else if (bodyPage === 'contact') {
      // Contact page: initialize contact form
      setupContactForm();
    } else if (bodyPage === 'volunteer') {
      // Volunteer page: initialize volunteer form
      setupVolunteerForm();
    }
  } catch (e) {
    /* ignore page init errors */
  }
}

setupThemeToggle();
setupRegistrationFlow();
initPageSpecific();
