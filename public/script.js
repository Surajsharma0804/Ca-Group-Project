const eventCatalog = {
  "HackLPU 3.0": {
    fee: 399,
    mode: "paid",
    category: "Hackathon",
    teamSize: { min: 1, max: 4 },
    cta: "Generate UPI QR",
    successMessage: "Payment verified successfully. Team registration is confirmed.",
  },
  "Web Dev Bootcamp": {
    fee: 0,
    mode: "free",
    category: "Workshop",
    teamSize: { min: 1, max: 1 },
    cta: "Confirm Registration",
    successMessage: "Registration completed successfully. Watch your email for updates.",
  },
  "DSA Challenge Week": {
    fee: 0,
    mode: "free",
    category: "Competition",
    teamSize: { min: 1, max: 1 },
    cta: "Join Challenge",
    successMessage: "Challenge registration completed successfully.",
  },
  "AI/ML Workshop": {
    fee: 0,
    mode: "free",
    category: "Workshop",
    teamSize: { min: 1, max: 1 },
    cta: "Reserve Seat",
    successMessage: "Workshop registration completed successfully.",
  },
};

const menuToggle = document.getElementById("menuToggle");
const mobileNav = document.getElementById("mobileNav");
const bodyPage = document.body.dataset.page;
const themeToggles = document.querySelectorAll("[data-theme-toggle]");
let countdownTimerId = null;

function applyTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  themeToggles.forEach(function (button) {
    button.textContent = nextTheme === "light" ? "Dark Mode" : "Light Mode";
    button.setAttribute("aria-label", nextTheme === "light" ? "Switch to dark mode" : "Switch to light mode");
  });
}

function setupThemeToggle() {
  const savedTheme = window.localStorage.getItem("arena-theme");
  applyTheme(savedTheme || "dark");

  themeToggles.forEach(function (button) {
    button.addEventListener("click", function () {
      const nextTheme = document.body.dataset.theme === "light" ? "dark" : "light";
      window.localStorage.setItem("arena-theme", nextTheme);
      applyTheme(nextTheme);
    });
  });
}

function setupMobileNavigation() {
  if (!menuToggle || !mobileNav) {
    return;
  }

  function setMenuState(isOpen) {
    mobileNav.classList.toggle("open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  }

  setMenuState(false);

  menuToggle.addEventListener("click", function () {
    const nextState = !mobileNav.classList.contains("open");
    setMenuState(nextState);
  });

  mobileNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setMenuState(false);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      setMenuState(false);
    }
  });
}

function normalizePagePath(value) {
  return String(value || "")
    .replace(/^\//, "")
    .replace(/^\.?\//, "");
}

document.querySelectorAll(".desktop-nav a, .mobile-nav a").forEach(function (link) {
  const href = normalizePagePath(link.getAttribute("href"));
  if (
    (bodyPage === "home" && href === "index.html") ||
    (bodyPage === "events" && href === "events.html") ||
    (bodyPage === "gallery" && href === "gallery.html") ||
    (bodyPage === "contact" && href === "contact.html")
  ) {
    link.classList.add("active");
  }
});

function setupEventFilters() {
  const searchInput = document.getElementById("eventSearch");
  const filterButtons = document.querySelectorAll(".filter-button");
  const upcomingEmpty = document.getElementById("upcomingEmpty");
  const pastEmpty = document.getElementById("pastEmpty");

  if (!searchInput || !filterButtons.length) {
    return;
  }

  let activeFilter = "All";

  function filterCards(cards, emptyState) {
    let visibleCount = 0;
    const searchValue = searchInput.value.trim().toLowerCase();

    cards.forEach(function (card) {
      const tag = card.dataset.tag;
      const searchText = String(card.dataset.search || "").toLowerCase();
      const matchesFilter = activeFilter === "All" || tag === activeFilter;
      const matchesSearch = !searchValue || searchText.includes(searchValue);
      const shouldShow = matchesFilter && matchesSearch;

      card.classList.toggle("hidden", !shouldShow);
      if (shouldShow) {
        visibleCount += 1;
      }
    });

    emptyState.classList.toggle("hidden", visibleCount > 0);
  }

  function applyFilters() {
    const upcomingEvents = document.querySelectorAll("#upcomingEvents .event-card");
    const pastEvents = document.querySelectorAll("#pastEvents .event-card");
    filterCards(upcomingEvents, upcomingEmpty);
    filterCards(pastEvents, pastEmpty);
  }

  searchInput.addEventListener("input", applyFilters);

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.dataset.filter;
      filterButtons.forEach(function (item) {
        item.classList.remove("active");
      });
      button.classList.add("active");
      applyFilters();
    });
  });
}

function setupAutomaticEventSections() {
  const upcomingContainer = document.getElementById("upcomingEvents");
  const pastContainer = document.getElementById("pastEvents");

  if (!upcomingContainer || !pastContainer) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function getEventDate(card) {
    const rawDate = card.dataset.eventDate;
    if (!rawDate) {
      return null;
    }

    const parsedDate = new Date(rawDate);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  function applyPastStyles(card, isPast) {
    card.classList.toggle("muted-card", isPast);
    const tag = card.querySelector(".tag");
    if (tag) {
      tag.classList.toggle("muted-tag", isPast);
    }
  }

  const cards = Array.from(document.querySelectorAll("#upcomingEvents .event-card, #pastEvents .event-card"));

  const upcomingCards = [];
  const pastCards = [];

  cards.forEach(function (card) {
    const eventDate = getEventDate(card);
    if (eventDate && eventDate < today) {
      applyPastStyles(card, true);
      pastCards.push(card);
      return;
    }

    applyPastStyles(card, false);
    upcomingCards.push(card);
  });

  upcomingCards.sort(function (leftCard, rightCard) {
    const leftDate = getEventDate(leftCard);
    const rightDate = getEventDate(rightCard);
    return (leftDate ? leftDate.getTime() : 0) - (rightDate ? rightDate.getTime() : 0);
  });

  pastCards.sort(function (leftCard, rightCard) {
    const leftDate = getEventDate(leftCard);
    const rightDate = getEventDate(rightCard);
    return (rightDate ? rightDate.getTime() : 0) - (leftDate ? leftDate.getTime() : 0);
  });

  upcomingCards.forEach(function (card) {
    upcomingContainer.appendChild(card);
  });

  pastCards.forEach(function (card) {
    pastContainer.appendChild(card);
  });
}

function setupGalleryLightbox() {
  const cards = document.querySelectorAll(".gallery-card");
  const lightbox = document.getElementById("galleryLightbox");
  const closeLightbox = document.getElementById("closeLightbox");
  const lightboxTitle = document.getElementById("lightboxTitle");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxImage = document.getElementById("lightboxImage");

  if (!cards.length || !lightbox || !closeLightbox) {
    return;
  }

  function hideLightbox() {
    lightbox.classList.add("hidden");
    document.body.style.overflow = "";
  }

  cards.forEach(function (card) {
    card.addEventListener("click", function () {
      lightboxTitle.textContent = card.dataset.imageTitle;
      lightboxCaption.textContent = card.dataset.imageCaption;
      lightboxImage.style.background = getComputedStyle(card).backgroundImage;
      lightbox.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    });
  });

  closeLightbox.addEventListener("click", hideLightbox);
  lightbox.addEventListener("click", function (event) {
    if (event.target === lightbox) {
      hideLightbox();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !lightbox.classList.contains("hidden")) {
      hideLightbox();
    }
  });
}

function setupContactForm() {
  const contactForm = document.getElementById("contactForm");
  const contactSuccess = document.getElementById("contactSuccess");
  const contactButton = document.getElementById("contactSubmitButton");

  if (!contactForm || !contactSuccess) {
    return;
  }

  contactForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
      name: document.getElementById("contactName").value.trim(),
      email: document.getElementById("contactEmail").value.trim(),
      subject: document.getElementById("contactSubject").value.trim(),
      phone: document.getElementById("contactPhone").value.trim(),
      message: document.getElementById("contactMessage").value.trim(),
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      contactSuccess.textContent = "Please fill all contact form fields.";
      contactSuccess.className = "helper-text error-text";
      return;
    }

    if (contactButton) {
      contactButton.disabled = true;
      contactButton.textContent = "Sending...";
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        contactSuccess.textContent = result.message || "Unable to send your message right now.";
        contactSuccess.className = "helper-text error-text";
        return;
      }

      contactSuccess.textContent = result.message;
      contactSuccess.className = "helper-text success-text";
      contactForm.reset();
    } catch (_error) {
      contactSuccess.textContent = "Unable to send your message right now.";
      contactSuccess.className = "helper-text error-text";
    } finally {
      if (contactButton) {
        contactButton.disabled = false;
        contactButton.textContent = "Send Message";
      }
    }
  });
}

function setupVolunteerForm() {
  const volunteerForm = document.getElementById("volunteerForm");
  const volunteerSuccess = document.getElementById("volunteerSuccess");
  const volunteerButton = document.getElementById("volunteerSubmitButton");

  if (!volunteerForm || !volunteerSuccess) {
    return;
  }

  volunteerForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
      name: document.getElementById("volunteerName").value.trim(),
      email: document.getElementById("volunteerEmail").value.trim(),
      phone: document.getElementById("volunteerPhone").value.trim(),
      area: document.getElementById("volunteerArea").value.trim(),
      message: document.getElementById("volunteerMessage").value.trim(),
    };

    if (!payload.name || !payload.email || !payload.phone || !payload.area || !payload.message) {
      volunteerSuccess.textContent = "Please fill all volunteer form fields.";
      volunteerSuccess.className = "helper-text error-text";
      return;
    }

    if (volunteerButton) {
      volunteerButton.disabled = true;
      volunteerButton.textContent = "Submitting...";
    }

    try {
      const response = await fetch("/api/volunteer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        volunteerSuccess.textContent = result.message || "Unable to save volunteer application right now.";
        volunteerSuccess.className = "helper-text error-text";
        return;
      }

      volunteerSuccess.textContent = result.message;
      volunteerSuccess.className = "helper-text success-text";
      volunteerForm.reset();
    } catch (_error) {
      volunteerSuccess.textContent = "Unable to save volunteer application right now.";
      volunteerSuccess.className = "helper-text error-text";
    } finally {
      if (volunteerButton) {
        volunteerButton.disabled = false;
        volunteerButton.textContent = "Submit Volunteer Application";
      }
    }
  });
}

function setupRegistrationCountdowns() {
  const countdownBlocks = document.querySelectorAll(".countdown-strip");

  if (!countdownBlocks.length) {
    return;
  }

  function formatRemainingTime(targetDate) {
    const distance = new Date(targetDate).getTime() - Date.now();

    if (distance <= 0) {
      return "Registration closed";
    }

    const days = Math.floor(distance / 86400000);
    const hours = Math.floor((distance % 86400000) / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    const seconds = Math.floor((distance % 60000) / 1000);

    return `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }

  function updateCountdowns() {
    countdownBlocks.forEach(function (block) {
      const value = block.querySelector(".countdown-value");
      const deadline = block.dataset.deadline;

      if (!value || !deadline) {
        return;
      }

      value.textContent = formatRemainingTime(deadline);
    });
  }

  updateCountdowns();
  if (countdownTimerId) {
    window.clearInterval(countdownTimerId);
  }
  countdownTimerId = window.setInterval(updateCountdowns, 1000);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchSiteContentWithFallback() {
  const endpoints = ["/api/site-content", "http://localhost:3001/api/site-content"];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      const payload = await response.json();
      if (response.ok && payload && payload.content) {
        return payload.content;
      }
    } catch (_error) {
      // Try next endpoint.
    }
  }

  return null;
}

function setupDynamicHomepage() {
  if (bodyPage !== "home") {
    return;
  }

  const highlightsSection = document.getElementById("highlightsSection");
  const highlightsGrid = document.getElementById("highlightsGrid");
  const upcomingSection = document.getElementById("homeUpcomingSection");
  const upcomingGrid = document.getElementById("homeUpcomingGrid");
  const testimonialsSection = document.getElementById("testimonialsSection");
  const testimonialsGrid = document.getElementById("testimonialsGrid");
  const faqsSection = document.getElementById("faqsSection");
  const faqsList = document.getElementById("faqsList");
  const volunteerSection = document.getElementById("volunteerSection");
  const volunteerBadge = document.getElementById("volunteerBadge");
  const volunteerIntro = document.getElementById("volunteerIntro");
  const volunteerNote = document.getElementById("volunteerNote");

  function showOrHideSection(section, hasContent) {
    if (!section) {
      return;
    }
    section.classList.toggle("hidden", !hasContent);
  }

  fetchSiteContentWithFallback()
    .then(function (content) {
      if (!content) {
        throw new Error("Unable to load homepage content.");
      }

      const highlights = Array.isArray(content.highlights) ? content.highlights : [];
      showOrHideSection(highlightsSection, highlights.length > 0);
      if (highlightsGrid) {
        highlightsGrid.innerHTML = highlights
          .map(function (item) {
            return `
              <article class="team-card">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description)}</p>
              </article>
            `;
          })
          .join("");
      }

      const upcomingEvents = Array.isArray(content.upcomingEvents) ? content.upcomingEvents : [];
      showOrHideSection(upcomingSection, upcomingEvents.length > 0);
      if (upcomingGrid) {
        upcomingGrid.innerHTML = upcomingEvents
          .map(function (item) {
            const title = escapeHtml(item.title);
            const category = escapeHtml(item.category || "Event");
            const dateLabel = escapeHtml(item.dateLabel || "Date TBA");
            const description = escapeHtml(item.description || "");
            const deadlineMarkup = item.registrationDeadline
              ? `
                <div class="countdown-strip" data-deadline="${escapeHtml(item.registrationDeadline)}">
                  <span class="countdown-label">Registration closes in</span>
                  <span class="countdown-value">Loading...</span>
                </div>
              `
              : "";
            const registerButtonMarkup = item.registerEnabled && eventCatalog[item.title]
              ? `<a class="link-button" href="events.html">Register</a>`
              : "";

            return `
              <article class="event-card" data-tag="${category}">
                <div class="card-top">
                  <span class="tag">${category}</span>
                  <span class="mono-text">${dateLabel}</span>
                </div>
                <h3>${title}</h3>
                <p>${description}</p>
                ${deadlineMarkup}
                <div class="card-actions">
                  ${registerButtonMarkup}
                  <a class="link-button" href="events.html">Details</a>
                </div>
              </article>
            `;
          })
          .join("");
      }

      const testimonials = Array.isArray(content.testimonials) ? content.testimonials : [];
      showOrHideSection(testimonialsSection, testimonials.length > 0);
      if (testimonialsGrid) {
        testimonialsGrid.innerHTML = testimonials
          .map(function (item) {
            const author = escapeHtml(item.author || "Member");
            const role = escapeHtml(item.role || "");
            return `
              <article class="quote-card">
                <p>"${escapeHtml(item.quote)}"</p>
                <div class="quote-meta">${author}${role ? ` | ${role}` : ""}</div>
              </article>
            `;
          })
          .join("");
      }

      const faqs = Array.isArray(content.faqs) ? content.faqs : [];
      showOrHideSection(faqsSection, faqs.length > 0);
      if (faqsList) {
        faqsList.innerHTML = faqs
          .map(function (item) {
            return `
              <article class="faq-item">
                <h3>${escapeHtml(item.question)}</h3>
                <p>${escapeHtml(item.answer)}</p>
              </article>
            `;
          })
          .join("");
      }

      const volunteerContent = content.volunteer || {};
      const volunteerOpen = Boolean(volunteerContent.open);
      showOrHideSection(volunteerSection, volunteerOpen);
      if (volunteerBadge) {
        volunteerBadge.textContent = volunteerContent.badge || "Open Application Pool";
      }
      if (volunteerIntro) {
        volunteerIntro.textContent = volunteerContent.intro || volunteerIntro.textContent;
      }
      if (volunteerNote) {
        volunteerNote.textContent = volunteerContent.note || volunteerNote.textContent;
      }

      setupRegistrationCountdowns();
    })
    .catch(function () {
      // Keep existing markup visible as fallback if API content fails.
    });
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return parts.map(function (part) { return part[0]; }).join("").toUpperCase() || "AR";
}

function setupDynamicContactPage() {
  if (bodyPage !== "contact") {
    return;
  }

  const heroTitle = document.getElementById("contactHeroTitle");
  const heroCopy = document.getElementById("contactHeroCopy");
  const channelsSection = document.getElementById("contactChannelsSection");
  const channelsGrid = document.getElementById("contactChannelsGrid");
  const teamSection = document.getElementById("contactTeamSection");
  const teamGrid = document.getElementById("contactTeamGrid");

  const fallbackContact = {
    heroTitle: "Connect with the Arena LPU team.",
    heroCopy: "For event support, partnerships, and club operations, use the channels below.",
    channels: [
      {
        label: "General",
        title: "Team Desk",
        description: "Questions about registrations, schedules, and updates.",
      },
      {
        label: "Partnerships",
        title: "Collaborations",
        description: "Brand partnerships, campus initiatives, and sponsorship discussions.",
      },
      {
        label: "Response",
        title: "Support Window",
        description: "Most queries are reviewed within one business day.",
      },
    ],
    teamMembers: [
      {
        name: "Aarav Malhotra",
        role: "CEO",
        type: "Core Leadership",
        email: "ceo@arenalpu.org",
        phone: "+91 98765 10001",
      },
      {
        name: "Nisha Verma",
        role: "Co-Founder",
        type: "Core Leadership",
        email: "cofounder@arenalpu.org",
        phone: "+91 98765 10002",
      },
      {
        name: "Arjun Mehta",
        role: "President",
        type: "Operations",
        email: "arjun@arenalpu.org",
        phone: "+91 98765 10003",
      },
    ],
  };

  function showOrHide(section, hasContent) {
    if (!section) {
      return;
    }
    section.classList.toggle("hidden", !hasContent);
  }

  function renderContact(contact) {
    if (!contact) {
      return;
    }

    if (heroTitle && contact.heroTitle) {
      heroTitle.textContent = contact.heroTitle;
    }
    if (heroCopy && contact.heroCopy) {
      heroCopy.textContent = contact.heroCopy;
    }

    const channels = Array.isArray(contact.channels) ? contact.channels : [];
    showOrHide(channelsSection, channels.length > 0);
    if (channelsGrid) {
      channelsGrid.innerHTML = channels
        .map(function (item) {
          const label = escapeHtml(item.label || "General");
          const title = escapeHtml(item.title || "Contact");
          const description = escapeHtml(item.description || "");
          const actionText = escapeHtml(item.actionText || "");
          const actionHref = String(item.actionHref || "").trim();
          const actionMarkup = actionText && actionHref
            ? `<a class="link-button" href="${escapeHtml(actionHref)}" target="_blank" rel="noreferrer">${actionText}</a>`
            : "";

          return `
            <article class="event-card contact-point">
              <div class="card-top"><span class="tag">${label}</span></div>
              <h3>${title}</h3>
              <p>${description}</p>
              ${actionMarkup ? `<div class="card-actions">${actionMarkup}</div>` : ""}
            </article>
          `;
        })
        .join("");
    }

    const teamMembers = Array.isArray(contact.teamMembers) ? contact.teamMembers : [];
    showOrHide(teamSection, teamMembers.length > 0);
    if (teamGrid) {
      teamGrid.innerHTML = teamMembers
        .map(function (member) {
          const name = escapeHtml(member.name || "Team Member");
          const role = escapeHtml(member.role || "Core Team");
          const memberType = escapeHtml(member.type || "");
          const email = escapeHtml(member.email || "");
          const phone = escapeHtml(member.phone || "");
          const initials = escapeHtml(getInitials(member.name));
          const emailHref = member.email ? `mailto:${encodeURIComponent(String(member.email).trim())}` : "";
          const phoneHref = member.phone ? `tel:${encodeURIComponent(String(member.phone).replace(/\s+/g, ""))}` : "";

          return `
            <article class="team-card">
              <div class="avatar-circle">${initials}</div>
              <h3>${name}</h3>
              <p class="team-role">${role}</p>
              ${memberType ? `<p class="team-type">${memberType}</p>` : ""}
              ${email ? `<a class="team-contact" href="${emailHref}">${email}</a>` : ""}
              ${phone ? `<a class="team-contact" href="${phoneHref}">${phone}</a>` : ""}
            </article>
          `;
        })
        .join("");
    }
  }

  renderContact(fallbackContact);

  fetchSiteContentWithFallback()
    .then(function (content) {
      if (!content || !content.contact) {
        return;
      }
      renderContact(content.contact);
    })
    .catch(function () {
      renderContact(fallbackContact);
    });
}

function setupHomeMomentsSlideshow() {
  if (bodyPage !== "home") {
    return;
  }

  const slider = document.getElementById("homeMomentsSlideshow");
  const viewport = document.getElementById("momentsViewport");
  const prevButton = document.getElementById("momentsPrev");
  const nextButton = document.getElementById("momentsNext");
  const dotsHost = document.getElementById("momentsDots");

  if (!slider || !viewport || !prevButton || !nextButton || !dotsHost) {
    return;
  }

  const slides = Array.from(viewport.querySelectorAll(".moment-slide"));
  if (!slides.length) {
    return;
  }

  let currentIndex = 0;
  let autoplayId = null;

  const dots = slides.map(function (_slide, index) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "slider-dot";
    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
    dot.addEventListener("click", function () {
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
      slide.classList.toggle("active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    dots.forEach(function (dot, dotIndex) {
      dot.classList.toggle("active", dotIndex === currentIndex);
    });
  }

  function startAutoplay() {
    if (autoplayId) {
      window.clearInterval(autoplayId);
    }
    autoplayId = window.setInterval(function () {
      setActive(currentIndex + 1);
    }, 3500);
  }

  function restartAutoplay() {
    startAutoplay();
  }

  prevButton.addEventListener("click", function () {
    setActive(currentIndex - 1);
    restartAutoplay();
  });

  nextButton.addEventListener("click", function () {
    setActive(currentIndex + 1);
    restartAutoplay();
  });

  slider.addEventListener("mouseenter", function () {
    if (autoplayId) {
      window.clearInterval(autoplayId);
    }
  });

  slider.addEventListener("mouseleave", function () {
    startAutoplay();
  });

  setActive(0);
  startAutoplay();
}

function setupRegistrationFlow() {
  const modal = document.getElementById("registrationModal");
  const closeModal = document.getElementById("closeModal");
  const backButton = document.getElementById("backButton");
  const nextButton = document.getElementById("nextButton");
  const payNowButton = document.getElementById("payNowButton");
  const formMessage = document.getElementById("formMessage");
  const stepTitle = document.getElementById("stepTitle");
  const selectedEventLabel = document.getElementById("selectedEventLabel");
  const progressLabel = document.getElementById("progressLabel");
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");
  const formSteps = document.querySelectorAll(".form-step");
  const teamSizeButtons = document.querySelectorAll(".team-size-button");
  const teamSizeNote = document.getElementById("teamSizeNote");
  const memberFields = document.getElementById("memberFields");
  const reviewPanel = document.getElementById("reviewPanel");
  const paymentTitle = document.getElementById("paymentTitle");
  const paymentDescription = document.getElementById("paymentDescription");
  const registrationModeBadge = document.getElementById("registrationModeBadge");
  const upiQrPanel = document.getElementById("upiQrPanel");
  const upiQrImage = document.getElementById("upiQrImage");
  const upiQrStatus = document.getElementById("upiQrStatus");

  if (!modal) {
    return;
  }

  let currentStep = 1;
  let teamSize = 1;
  let selectedEvent = "HackLPU 3.0";
  let selectedEventConfig = eventCatalog[selectedEvent];
  let paymentStatusPoll = null;
  let currentPaymentSessionId = "";

  const stepTitles = {
    1: "Group Head Details",
    2: "Team Size",
    3: "Additional Member Details",
    4: "Review and Confirm",
  };

  function clearMessage() {
    formMessage.textContent = "";
    formMessage.className = "message-box hidden";
  }

  function stopPaymentPolling() {
    if (paymentStatusPoll) {
      window.clearInterval(paymentStatusPoll);
      paymentStatusPoll = null;
    }
  }

  async function cancelCurrentPaymentSession() {
    if (!currentPaymentSessionId) {
      return;
    }

    const sessionId = currentPaymentSessionId;
    currentPaymentSessionId = "";
    stopPaymentPolling();

    try {
      await fetch(`/api/payment-session/${sessionId}/cancel`, {
        method: "POST",
      });
    } catch (_error) {
      // Ignore cancellation failures on the client.
    }
  }

  function resetQrPanel() {
    stopPaymentPolling();
    currentPaymentSessionId = "";
    if (upiQrPanel) {
      upiQrPanel.classList.add("hidden");
    }
    if (upiQrImage) {
      upiQrImage.removeAttribute("src");
    }
    if (upiQrStatus) {
      upiQrStatus.textContent = "Scan this UPI QR and keep this screen open while we verify the payment.";
    }
  }

  function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `message-box ${type}`;
    formMessage.classList.remove("hidden");
  }

  function getTeamSizeMessage(size) {
    if (size === 1) {
      return "You selected 1 member, so the next step will go directly to review.";
    }

    return `You selected ${size} total members, so ${size - 1} additional member form${size - 1 > 1 ? "s" : ""} will appear next.`;
  }

  function updatePaymentPanel() {
    if (paymentTitle) {
      paymentTitle.textContent =
        selectedEventConfig.mode === "paid" ? `Rs. ${selectedEventConfig.fee} per team` : "Free registration";
    }

    if (paymentDescription) {
      paymentDescription.textContent =
        selectedEventConfig.mode === "paid"
          ? "This event uses UPI-only payment. Generate a single-use QR, complete the payment in any UPI app, and we will confirm it automatically."
          : "No payment is required for this event. We will save your registration immediately after the final review.";
    }

    if (registrationModeBadge) {
      registrationModeBadge.textContent =
        selectedEventConfig.mode === "paid" ? "Paid registration" : "Free registration";
    }

    payNowButton.textContent = selectedEventConfig.cta;
    resetQrPanel();
  }

  function resetForm() {
    document.getElementById("teamName").value = "";
    document.getElementById("collegeName").value = "Lovely Professional University";
    document.getElementById("headName").value = "";
    document.getElementById("headEmail").value = "";
    document.getElementById("headPhone").value = "";
    document.getElementById("headCourseYear").value = "";
    payNowButton.disabled = false;
    selectedEventConfig = eventCatalog[selectedEvent] || eventCatalog["HackLPU 3.0"];
    setTeamSize(selectedEventConfig.teamSize.min);
    updatePaymentPanel();
    setStep(1);
    clearMessage();
  }

  function openModal(eventTitle) {
    selectedEvent = eventTitle || "HackLPU 3.0";
    selectedEventConfig = eventCatalog[selectedEvent] || eventCatalog["HackLPU 3.0"];
    selectedEventLabel.textContent = `Selected event: ${selectedEvent}`;
    updatePaymentPanel();
    setTeamSize(selectedEventConfig.teamSize.min);
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeRegistrationModal() {
    cancelCurrentPaymentSession();
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    resetForm();
  }

  function setStep(step) {
    currentStep = step;
    stepTitle.textContent = stepTitles[step];
    if (progressLabel) {
      progressLabel.textContent = `Step ${step} of 4`;
    }
    if (progressText) {
      progressText.textContent = stepTitles[step];
    }
    if (progressFill) {
      progressFill.style.width = `${(step / 4) * 100}%`;
    }
    formSteps.forEach(function (section) {
      const isCurrentStep = Number(section.dataset.step) === step;
      section.classList.toggle("active", isCurrentStep);
      section.hidden = !isCurrentStep;
    });
    backButton.classList.toggle("hidden", step === 1);
    nextButton.classList.toggle("hidden", step === 4);
    clearMessage();
    if (step === 4) {
      renderReview();
    }
  }

  function setTeamSize(size) {
    const minSize = selectedEventConfig.teamSize.min;
    const maxSize = selectedEventConfig.teamSize.max;
    teamSize = Math.max(minSize, Math.min(maxSize, size));

    teamSizeButtons.forEach(function (button) {
      const buttonSize = Number(button.dataset.size);
      const isAllowed = buttonSize >= minSize && buttonSize <= maxSize;
      button.disabled = !isAllowed;
      button.classList.toggle("active", buttonSize === teamSize);
      button.classList.toggle("disabled-option", !isAllowed);
    });

    teamSizeNote.textContent = getTeamSizeMessage(teamSize);
    renderMemberFields();
  }

  function renderMemberFields() {
    memberFields.innerHTML = "";
    const extraMembers = teamSize - 1;

    for (let index = 0; index < extraMembers; index += 1) {
      const memberCard = document.createElement("div");
      memberCard.className = "member-card";
      memberCard.innerHTML = `
        <h3>Member ${index + 2}</h3>
        <div class="form-grid">
          <label><span>Full Name</span><input type="text" data-field="name" /></label>
          <label><span>Email ID</span><input type="email" data-field="email" /></label>
          <label><span>Phone Number</span><input type="text" data-field="phone" /></label>
          <label><span>Course / Year</span><input type="text" data-field="courseYear" /></label>
        </div>
      `;
      memberFields.appendChild(memberCard);
    }
  }

  function getHeadData() {
    return {
      name: document.getElementById("headName").value.trim(),
      email: document.getElementById("headEmail").value.trim().toLowerCase(),
      phone: document.getElementById("headPhone").value.trim(),
      courseYear: document.getElementById("headCourseYear").value.trim(),
    };
  }

  function getMemberData() {
    return Array.from(memberFields.querySelectorAll(".member-card")).map(function (card) {
      const inputs = card.querySelectorAll("input");
      const member = {};
      inputs.forEach(function (input) {
        member[input.dataset.field] = input.value.trim();
      });
      member.email = (member.email || "").toLowerCase();
      return member;
    });
  }

  function getFormData() {
    return {
      eventTitle: selectedEvent,
      teamName: document.getElementById("teamName").value.trim(),
      collegeName: document.getElementById("collegeName").value.trim(),
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
    if (!data.teamName || !data.collegeName || !data.head.name || !data.head.email || !data.head.phone || !data.head.courseYear) {
      showMessage("Please fill all group head and team details.", "error");
      return false;
    }

    if (!validateEmail(data.head.email)) {
      showMessage("Please enter a valid email address for the group head.", "error");
      return false;
    }

    return true;
  }

  function validateMemberStep() {
    const data = getFormData();
    const participants = [data.head, ...data.members];
    const hasMissingFields = participants.some(function (participant) {
      return !participant.name || !participant.email || !participant.phone || !participant.courseYear;
    });

    if (hasMissingFields) {
      showMessage("Please fill all visible member details.", "error");
      return false;
    }

    const hasInvalidEmail = participants.some(function (participant) {
      return !validateEmail(participant.email);
    });

    if (hasInvalidEmail) {
      showMessage("Please use valid email IDs for every participant.", "error");
      return false;
    }

    const emails = participants.map(function (participant) {
      return participant.email;
    });

    if (new Set(emails).size !== emails.length) {
      showMessage("Every team member, including the head, must have a unique email ID.", "error");
      return false;
    }

    return true;
  }

  function renderReview() {
    const data = getFormData();
    const participants = [data.head, ...data.members];

    reviewPanel.innerHTML = `
      <div class="review-block">
        <h3>Event Summary</h3>
        <p><strong>Event:</strong> ${data.eventTitle}</p>
        <p><strong>Format:</strong> ${selectedEventConfig.category}</p>
        <p><strong>Team Name:</strong> ${data.teamName}</p>
        <p><strong>College:</strong> ${data.collegeName}</p>
        <p><strong>Team Size:</strong> ${data.teamSize}</p>
      </div>
      ${participants
        .map(function (participant, index) {
          const title = index === 0 ? "Group Head" : `Member ${index + 1}`;
          return `
            <div class="review-block">
              <h3>${title}</h3>
              <p>${participant.name}</p>
              <p>${participant.email}</p>
              <p>${participant.phone}</p>
              <p>${participant.courseYear}</p>
            </div>
          `;
        })
        .join("")}
    `;
  }

  async function pollPaymentStatus() {
    if (!currentPaymentSessionId) {
      return;
    }

    try {
      const response = await fetch(`/api/payment-status/${currentPaymentSessionId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to verify payment status.");
      }

      if (result.status === "paid") {
        stopPaymentPolling();
        currentPaymentSessionId = "";
        showMessage(selectedEventConfig.successMessage, "success");
        if (upiQrStatus) {
          upiQrStatus.textContent = "Payment received and registration confirmed.";
        }
        payNowButton.disabled = true;
        payNowButton.textContent = "Payment Completed";
        return;
      }

      if (result.status === "expired") {
        stopPaymentPolling();
        if (upiQrStatus) {
          upiQrStatus.textContent = result.message || "This UPI QR has expired.";
        }
        showMessage(result.message || "This UPI QR has expired. Generate a fresh QR to continue.", "error");
        payNowButton.disabled = false;
        payNowButton.textContent = "Generate New UPI QR";
        currentPaymentSessionId = "";
        return;
      }

      if (upiQrStatus) {
        upiQrStatus.textContent = "Waiting for UPI payment confirmation...";
      }
    } catch (error) {
      stopPaymentPolling();
      showMessage(error instanceof Error ? error.message : "Unable to verify payment status.", "error");
      payNowButton.disabled = false;
      payNowButton.textContent = "Generate New UPI QR";
    }
  }

  function handleNext() {
    clearMessage();

    if (currentStep === 1) {
      if (!validateHeadStep()) {
        return;
      }
      setStep(2);
      return;
    }

    if (currentStep === 2) {
      if (teamSize === 1) {
        if (!validateHeadStep()) {
          return;
        }
        setStep(4);
        return;
      }
      setStep(3);
      return;
    }

    if (currentStep === 3) {
      if (!validateHeadStep() || !validateMemberStep()) {
        return;
      }
      setStep(4);
    }
  }

  function handleBack() {
    clearMessage();
    if (currentStep === 4 && teamSize > 1) {
      setStep(3);
      return;
    }
    if (currentStep > 1) {
      setStep(currentStep - 1);
    }
  }

  async function handlePayment() {
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

    if (selectedEventConfig.mode === "free") {
      try {
        payNowButton.disabled = true;
        payNowButton.textContent = "Confirming...";

        const registerResponse = await fetch("/api/register-free", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const registerData = await registerResponse.json();
        if (!registerResponse.ok) {
          showMessage(registerData.message || "Unable to complete registration.", "error");
          payNowButton.disabled = false;
          payNowButton.textContent = selectedEventConfig.cta;
          return;
        }

        showMessage(selectedEventConfig.successMessage, "success");
        payNowButton.textContent = "Registered";
        return;
      } catch (_error) {
        showMessage("Something went wrong while completing registration.", "error");
        payNowButton.disabled = false;
        payNowButton.textContent = selectedEventConfig.cta;
        return;
      }
    }

    try {
      await cancelCurrentPaymentSession();
      payNowButton.disabled = true;
      payNowButton.textContent = "Generating QR...";
      resetQrPanel();

      const createOrderResponse = await fetch("/api/create-upi-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const orderData = await createOrderResponse.json();

      if (!createOrderResponse.ok) {
        showMessage(orderData.message || "Unable to create payment order.", "error");
        payNowButton.disabled = false;
        payNowButton.textContent = selectedEventConfig.cta;
        return;
      }

      currentPaymentSessionId = orderData.sessionId;

      if (upiQrPanel && upiQrImage) {
        upiQrImage.src = orderData.qrCodeImageUrl;
        upiQrPanel.classList.remove("hidden");
      }

      if (upiQrStatus) {
        upiQrStatus.textContent = `Scan this QR with any UPI app to pay Rs. ${orderData.amountDisplay}. We will confirm automatically.`;
      }

      payNowButton.disabled = false;
      payNowButton.textContent = "Generate New UPI QR";
      paymentStatusPoll = window.setInterval(pollPaymentStatus, 4000);
      await pollPaymentStatus();
    } catch (_error) {
      showMessage("Something went wrong while generating the UPI QR.", "error");
      payNowButton.disabled = false;
      payNowButton.textContent = selectedEventConfig.cta;
    }
  }

  document.addEventListener("click", function (event) {
    const trigger = event.target.closest(".register-trigger");
    if (!trigger) {
      return;
    }
    openModal(trigger.dataset.eventTitle || "HackLPU 3.0");
  });

  closeModal.addEventListener("click", closeRegistrationModal);
  backButton.addEventListener("click", handleBack);
  nextButton.addEventListener("click", handleNext);
  payNowButton.addEventListener("click", handlePayment);

  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeRegistrationModal();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeRegistrationModal();
    }
  });

  teamSizeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setTeamSize(Number(button.dataset.size));
    });
  });

  updatePaymentPanel();
  setTeamSize(selectedEventConfig.teamSize.min);
  setStep(1);
}

setupThemeToggle();
setupMobileNavigation();
setupDynamicHomepage();
setupDynamicContactPage();
setupHomeMomentsSlideshow();
setupAutomaticEventSections();
setupEventFilters();
setupGalleryLightbox();
setupContactForm();
setupVolunteerForm();
setupRegistrationCountdowns();
setupRegistrationFlow();
