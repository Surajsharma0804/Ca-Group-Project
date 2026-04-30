// Shared helpers for theme, navigation, and registration flows.
const bodyPage = document.body.dataset.page;
const themeToggles = document.querySelectorAll('[data-theme-toggle]');

// Theme handling.
export function applyTheme(theme) {
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

export function setupThemeToggle() {
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

// Highlight the current page in the nav.
export function setupNavActive(currentPage = bodyPage) {
  document.querySelectorAll('.desktop-nav a').forEach(function (link) {
    const href = normalizePagePath(link.getAttribute('href'));

    if (
      (currentPage === 'home' && href === 'index.html') ||
      (currentPage === 'events' && href === 'events.html') ||
      (currentPage === 'gallery' && href === 'gallery.html') ||
      (currentPage === 'volunteer' && href === 'volunteer.html') ||
      (currentPage === 'contact' && href === 'contact.html')
    ) {
      link.classList.add('active');
    }
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

// Lightweight XHR wrapper to avoid bundlers.
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

function setupHeroGalleryRotation() {
  if (bodyPage !== 'home') return;

  const background = document.getElementById('heroGalleryBackground');
  if (!background) return;

  const slides = Array.from(background.querySelectorAll('.hero-gallery-slide'));
  if (slides.length <= 1) return;

  let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('active')));

  function setActiveSlide(nextIndex) {
    activeIndex = (nextIndex + slides.length) % slides.length;
    slides.forEach(function (slide, index) {
      slide.classList.toggle('active', index === activeIndex);
    });
  }

  if (window.__hacklpuHeroGalleryInterval) window.clearInterval(window.__hacklpuHeroGalleryInterval);
  window.__hacklpuHeroGalleryInterval = window.setInterval(function () {
    setActiveSlide(activeIndex + 1);
  }, 5000);

  setActiveSlide(activeIndex);
}

function setupMomentsSlideshow() {
  if (bodyPage !== 'home') return;

  const slideshow = document.getElementById('homeMomentsSlideshow');
  if (!slideshow) return;

  const slides = Array.from(slideshow.querySelectorAll('.moment-slide'));
  const prevButton = document.getElementById('momentsPrev');
  const nextButton = document.getElementById('momentsNext');
  const dotsContainer = document.getElementById('momentsDots');

  if (slides.length === 0) return;

  let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('active')));
  const dots = [];

  function setActiveSlide(nextIndex) {
    activeIndex = (nextIndex + slides.length) % slides.length;
    slides.forEach(function (slide, index) {
      slide.classList.toggle('active', index === activeIndex);
    });
    dots.forEach(function (dot, index) {
      dot.classList.toggle('active', index === activeIndex);
    });
  }

  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    slides.forEach(function (_slide, index) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'slider-dot';
      dot.setAttribute('aria-label', `Show moment ${index + 1}`);
      dot.addEventListener('click', function () {
        setActiveSlide(index);
      });
      dotsContainer.appendChild(dot);
      dots.push(dot);
    });
  }

  if (prevButton) {
    prevButton.addEventListener('click', function () {
      setActiveSlide(activeIndex - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', function () {
      setActiveSlide(activeIndex + 1);
    });
  }

  if (window.__hacklpuMomentsInterval) window.clearInterval(window.__hacklpuMomentsInterval);
  window.__hacklpuMomentsInterval = window.setInterval(function () {
    setActiveSlide(activeIndex + 1);
  }, 6000);

  setActiveSlide(activeIndex);
}

// Multi-step registration modal flow used by home/events pages.
export function setupRegistrationFlow(configProvider = {}) {
  const modal = document.getElementById('registrationModal');
  if (!modal) return;

  const { getDefaultEventConfig, parseEventConfig } = configProvider;
  if (typeof getDefaultEventConfig !== 'function' || typeof parseEventConfig !== 'function') return;

  const closeModal = document.getElementById('closeModal');
  const backButton = document.getElementById('backButton');
  const nextButton = document.getElementById('nextButton');
  const payNowButton = document.getElementById('payNowButton');
  const formMessage = document.getElementById('formMessage');
  const stepTitle = document.getElementById('stepTitle');
  const registrationHeaderLabel = document.getElementById('registrationHeaderLabel');
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

  // Show demo payment notice if server reports demo mode active
  fetchApiWithFallback('/api/health', {}, function (error, result) {
    if (error) return;
    const demo = result.data?.demoPaymentMode;
    if (demo && paymentModeNotice) paymentModeNotice.classList.remove('hidden');
  });

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

    if (teamSize <= 1) return;

    for (let i = 2; i <= teamSize; i += 1) {
      const block = document.createElement('div');
      block.className = 'form-field-grid';

      block.innerHTML = `
        <div class="input-field">
          <label for="memberName${i}">Member ${i} Name</label>
          <input type="text" id="memberName${i}" placeholder="Full name" />
        </div>
        <div class="input-field">
          <label for="memberEmail${i}">Member ${i} Email</label>
          <input type="email" id="memberEmail${i}" placeholder="Email address" />
        </div>
      `;

      memberFields.appendChild(block);
    }
  }

  function renderReview() {
    if (!reviewPanel) return;

    const headName = cleanText(document.getElementById('headName')?.value);
    const headEmail = cleanText(document.getElementById('headEmail')?.value);
    const headPhone = cleanText(document.getElementById('headPhone')?.value);
    const collegeName = cleanText(document.getElementById('collegeName')?.value);
    const teamName = cleanText(document.getElementById('teamName')?.value);

    const members = [];
    if (teamSize > 1) {
      for (let i = 2; i <= teamSize; i += 1) {
        members.push({
          name: cleanText(document.getElementById(`memberName${i}`)?.value),
          email: cleanText(document.getElementById(`memberEmail${i}`)?.value),
        });
      }
    }

    const reviewHtml = [
      `<p><strong>Event:</strong> ${escapeHtml(selectedEvent)}</p>`,
      `<p><strong>Team name:</strong> ${escapeHtml(teamName || 'Not specified')}</p>`,
      `<p><strong>College:</strong> ${escapeHtml(collegeName || 'Not specified')}</p>`,
      `<p><strong>Team size:</strong> ${teamSize}</p>`,
      `<p><strong>Head:</strong> ${escapeHtml(headName || 'Not specified')} (${escapeHtml(headEmail || 'Not specified')})</p>`,
    ];

    if (headPhone) {
      reviewHtml.push(`<p><strong>Phone:</strong> ${escapeHtml(headPhone)}</p>`);
    }

    if (members.length) {
      reviewHtml.push('<p><strong>Members:</strong></p>');
      reviewHtml.push(
        '<ul>' +
          members
            .map(function (member, index) {
              return `<li>Member ${index + 2}: ${escapeHtml(member.name || 'Not specified')} (${escapeHtml(member.email || 'Not specified')})</li>`;
            })
            .join('') +
          '</ul>'
      );
    }

    reviewPanel.innerHTML = reviewHtml.join('');

    if (paymentTitle) {
      paymentTitle.textContent = selectedEventConfig.fee ? `Rs. ${selectedEventConfig.fee} per team` : 'Free registration';
    }

    if (paymentDescription) {
      paymentDescription.textContent = selectedEventConfig.fee
        ? 'Team fee is charged once. Registration is confirmed after successful payment.'
        : 'Registration is confirmed instantly.';
    }

    if (registrationModeBadge) {
      registrationModeBadge.textContent = selectedEventConfig.mode === 'paid' ? 'Paid registration' : 'Free registration';
    }

    if (payNowButton) {
      payNowButton.textContent = selectedEventConfig.cta;
    }
  }

  function collectRegistrationPayload() {
    const headName = cleanText(document.getElementById('headName')?.value);
    const headEmail = cleanText(document.getElementById('headEmail')?.value);
    const headPhone = cleanText(document.getElementById('headPhone')?.value);
    const collegeName = cleanText(document.getElementById('collegeName')?.value);
    const teamName = cleanText(document.getElementById('teamName')?.value);

    const members = [];
    if (teamSize > 1) {
      for (let i = 2; i <= teamSize; i += 1) {
        members.push({
          name: cleanText(document.getElementById(`memberName${i}`)?.value),
          email: cleanText(document.getElementById(`memberEmail${i}`)?.value),
        });
      }
    }

    return {
      eventTitle: selectedEvent,
      teamSize,
      teamName,
      collegeName,
      head: {
        name: headName,
        email: headEmail,
        phone: headPhone,
      },
      members,
    };
  }

  function updatePaymentStatus(state) {
    if (!upiQrPanel || !upiQrStatus) return;
    upiQrStatus.textContent = state;
  }

  function showPaymentError(message) {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = 'message-box error';
  }

  function showPaymentSuccess(message) {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.className = 'message-box success';
  }

  function markRegistrationComplete(message) {
    showPaymentSuccess(message);
    if (payNowButton) {
      payNowButton.textContent = 'Registered';
      payNowButton.disabled = true;
    }
  }

  function resetPaymentUi() {
    if (upiQrPanel) upiQrPanel.classList.add('hidden');
    if (upiQrImage) upiQrImage.removeAttribute('src');
    if (upiQrStatus) upiQrStatus.textContent = '';
  }

  function validateStep(step) {
    if (step === 1) {
      const headName = cleanText(document.getElementById('headName')?.value);
      const headEmail = cleanText(document.getElementById('headEmail')?.value);
      const headPhone = cleanText(document.getElementById('headPhone')?.value);

      if (!headName || !headEmail || !headPhone) {
        showPaymentError('Please enter all group head details.');
        return false;
      }
    }

    if (step === 2) {
      if (!selectedEvent) {
        showPaymentError('Please select an event.');
        return false;
      }
    }

    if (step === 3) {
      if (teamSize <= 1) return true;

      for (let i = 2; i <= teamSize; i += 1) {
        const memberName = cleanText(document.getElementById(`memberName${i}`)?.value);
        const memberEmail = cleanText(document.getElementById(`memberEmail${i}`)?.value);

        if (!memberName || !memberEmail) {
          showPaymentError(`Please fill member ${i} name and email before continuing.`);
          return false;
        }
      }
    }

    return true;
  }

  function handlePaymentSession(responseData, payload) {
    if (!responseData) return;
    const paymentMode = responseData.mode || selectedEventConfig.mode;

    if (paymentMode === 'free') {
      markRegistrationComplete(selectedEventConfig.successMessage);
      resetPaymentUi();
      return;
    }

    if (!upiQrPanel || !upiQrImage) return;

    const qrUrl = responseData.qrCodeUrl || responseData.qrCodeImageUrl;
    const qrId = responseData.qrCodeId;
    if (!qrUrl || !qrId) {
      showPaymentError('Unable to start payment. Please try again.');
      return;
    }

    upiQrImage.src = qrUrl;
    upiQrPanel.classList.remove('hidden');
    updatePaymentStatus('Waiting for payment confirmation...');

    const pollInterval = setInterval(function () {
      fetchApiWithFallback(
        `/api/registration/upi/${qrId}`,
        {
          method: 'GET',
        },
        function (error, result) {
          if (error) return;
          const status = result.data?.status;
          if (status === 'paid') {
            updatePaymentStatus('Payment verified. Saving registration...');
            clearInterval(pollInterval);
            if (paymentMode === 'demo') {
              markRegistrationComplete(selectedEventConfig.successMessage);
              return;
            }
            submitRegistration(payload, responseData);
          }
        }
      );
    }, 2500);
  }

  function submitRegistration(payload, sessionData) {
    fetchApiWithFallback(
      '/api/registration',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, sessionId: sessionData?.sessionId }),
      },
      function (error, result) {
        if (error) {
          showPaymentError('Network error. Please try again later.');
          return;
        }

        const payloadResponse = result.data || {};
        if (!result.ok) {
          showPaymentError(payloadResponse.message || 'Unable to complete registration.');
          return;
        }

        markRegistrationComplete(payloadResponse.message || selectedEventConfig.successMessage);
      }
    );
  }

  function startPaidFlow(payload) {
    fetchApiWithFallback(
      '/api/registration/upi',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          eventTitle: selectedEvent,
          amount: selectedEventConfig.fee,
        }),
      },
      function (error, result) {
        if (error) {
          showPaymentError('Network error. Please try again later.');
          return;
        }

        const payloadResponse = result.data || {};
        if (!result.ok) {
          showPaymentError(payloadResponse.message || 'Unable to initiate payment.');
          return;
        }

        handlePaymentSession(payloadResponse, payload);
      }
    );
  }

  function handleRegistrationSubmit() {
    clearMessage();

    const payload = collectRegistrationPayload();
    if (!payload.head.name || !payload.head.email || !payload.head.phone) {
      showPaymentError('Please fill all required fields.');
      return;
    }

    if (teamSize > 1) {
      for (let i = 2; i <= teamSize; i += 1) {
        const member = payload.members[i - 2];
        if (!member || !member.name || !member.email) {
          showPaymentError(`Please fill member ${i} name and email before continuing.`);
          return;
        }
      }
    }

    if (selectedEventConfig.mode === 'free') {
      fetchApiWithFallback(
        '/api/registration',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        function (error, result) {
          if (error) {
            showPaymentError('Network error. Please try again later.');
            return;
          }

          const payloadResponse = result.data || {};
          if (!result.ok) {
            showPaymentError(payloadResponse.message || 'Unable to register.');
            return;
          }

          markRegistrationComplete(payloadResponse.message || selectedEventConfig.successMessage);
        }
      );
      return;
    }

    startPaidFlow(payload);
  }

  function updateSelectedEvent(nextEvent, eventConfig) {
    selectedEvent = nextEvent;
    selectedEventConfig = eventConfig;

    if (registrationHeaderLabel) registrationHeaderLabel.textContent = `${eventConfig.category || 'Event'} Registration`;
    if (selectedEventLabel) selectedEventLabel.textContent = nextEvent;

    setTeamSize(eventConfig.teamSize.min);
    resetPaymentUi();
    clearMessage();
  }

  function setupEventTriggers() {
    // Support both dynamically rendered cards (data-event-card) and static .event-card markup
    document.querySelectorAll('[data-event-card], .event-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const parsedConfig = parseEventConfig(card, card.dataset.eventTitle);
        updateSelectedEvent(card.dataset.eventTitle, parsedConfig);
        setStep(1);
        modal.classList.remove('hidden');
        modal.classList.add('active');
      });
    });
  }

  function setupCtaTriggers() {
    // Support both data-register-button and legacy/static .register-trigger buttons
    document.querySelectorAll('[data-register-button], .register-trigger').forEach(function (button) {
      button.addEventListener('click', function (ev) {
        // Avoid triggering when click originates from a child element inside a card
        ev.stopPropagation?.();
        const parsedConfig = parseEventConfig(button, button.dataset.eventTitle);
        updateSelectedEvent(button.dataset.eventTitle, parsedConfig);
        setStep(1);
        modal.classList.remove('hidden');
        modal.classList.add('active');
      });
    });
  }

  function handleModalClose() {
    modal.classList.remove('active');
    modal.classList.add('hidden');
    resetPaymentUi();
  }

  function setupModalClose() {
    if (closeModal) {
      closeModal.addEventListener('click', handleModalClose);
    }

    modal.addEventListener('click', function (event) {
      if (event.target === modal) handleModalClose();
    });
  }

  function setupStepButtons() {
    if (nextButton) {
      nextButton.addEventListener('click', function () {
        if (!validateStep(currentStep)) return;
        if (currentStep === 2 && teamSize <= 1) {
          setStep(4);
          return;
        }

        if (currentStep < 4) setStep(currentStep + 1);
      });
    }

    if (backButton) {
      backButton.addEventListener('click', function () {
        if (currentStep > 1) setStep(currentStep - 1);
      });
    }
  }

  function setupTeamSizeButtons() {
    teamSizeButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        setTeamSize(Number(button.dataset.size));
      });
    });
  }

  function setupPaymentButton() {
    if (!payNowButton) return;

    payNowButton.addEventListener('click', function () {
      if (!validateStep(currentStep)) return;
      handleRegistrationSubmit();
    });
  }

  setupModalClose();
  setupStepButtons();
  setupTeamSizeButtons();
  setupPaymentButton();
  setupEventTriggers();
  setupCtaTriggers();

  setStep(1);
}

// Countdown ticker for registration deadlines.
export function setupRegistrationCountdowns() {
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

  if (window.__hacklpuCountdownInterval) window.clearInterval(window.__hacklpuCountdownInterval);
  window.__hacklpuCountdownInterval = window.setInterval(updateCountdowns, 1000);
}

// Fetch dynamic event metadata from the backend.
export function fetchEvents(callback) {
  fetchApiWithFallback('/api/health', {}, function (error, result) {
    if (error) {
      callback(error, []);
      return;
    }

    if (!result.ok) {
      callback(new Error(result.data?.message || 'Unable to fetch events'), []);
      return;
    }

    callback(null, result.data?.events || []);
  });
}

// Render dynamic event cards into the provided container.
export function renderEvents(container, events, limit = 6) {
  if (!container) return;

  const items = events.slice(0, limit);
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p class="helper-text">No events available right now.</p>';
    return;
  }

  items.forEach(function (event) {
    const card = document.createElement('article');
    card.className = 'event-card';
    card.dataset.eventTitle = event.title;
    card.dataset.eventFee = event.fee;
    card.dataset.eventMode = event.mode;
    card.dataset.eventCategory = event.category;
    card.dataset.teamMin = event.teamSize?.min ?? 1;
    card.dataset.teamMax = event.teamSize?.max ?? 1;
    card.dataset.eventCta = event.mode === 'paid' ? 'Generate UPI QR' : 'Confirm Registration';

    card.innerHTML = `
      <h3>${escapeHtml(event.title)}</h3>
      <p class="helper-text">${escapeHtml(event.category || 'Event')}</p>
      <div class="event-meta">
        <span>${event.mode === 'paid' ? `₹${event.fee}` : 'Free'}</span>
        <span>Team size: ${event.teamSize?.min ?? 1}-${event.teamSize?.max ?? 1}</span>
      </div>
      <button class="secondary-button" data-register-button data-event-title="${escapeHtml(event.title)}">Register</button>
    `;

    container.appendChild(card);
  });
}

// Boot dynamic events section on the home page.
export function setupDynamicEvents() {
  const dynamicContainer = document.getElementById('dynamicEvents');
  if (!dynamicContainer) return;

  fetchEvents(function (error, events) {
    if (error) {
      dynamicContainer.innerHTML = '<p class="helper-text">Unable to load events right now.</p>';
      return;
    }

    renderEvents(dynamicContainer, events, 6);
  });
}

setupThemeToggle();
setupNavActive();
setupHeroGalleryRotation();
setupMomentsSlideshow();
