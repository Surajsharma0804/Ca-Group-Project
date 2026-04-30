// Events page behavior and registration flow configuration.
import { setupThemeToggle, setupNavActive, setupRegistrationFlow } from './script-home.js';

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

// Helper to resolve event settings for the registration modal.
function getDefaultEventConfig(eventTitle) {
  const normalizedTitle = String(eventTitle || 'HackLPU 3.0').trim();
  return eventCatalog[normalizedTitle] || eventCatalog['HackLPU 3.0'];
}

// Read event config from data attributes when a card is clicked.
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
let countdownTimerId = null;

// Countdown strips for the events page.
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

// Search + filter interactions on the events page.
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

  applyFilters();
}

setupThemeToggle();
setupNavActive();
setupRegistrationCountdowns();
setupRegistrationFlow({ getDefaultEventConfig, parseEventConfig });
setupEventsPage();
