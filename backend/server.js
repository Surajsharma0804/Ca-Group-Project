import crypto from "crypto";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import cors from "cors";
import express from "express";
import Razorpay from "razorpay";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const publicDir = path.join(rootDir, "public");
const dataDir = path.join(__dirname, "data");
const registrationsFile = path.join(dataDir, "registrations.json");
const contactsFile = path.join(dataDir, "contacts.json");
const volunteersFile = path.join(dataDir, "volunteers.json");
const siteContentFile = path.join(dataDir, "site-content.json");
const paymentSessionsFile = path.join(dataDir, "payment-sessions.json");
const envFile = path.join(rootDir, ".env");

function loadEnvFile(filePath) {
  if (!fsSync.existsSync(filePath)) {
    return;
  }

  const fileContents = fsSync.readFileSync(filePath, "utf8");
  fileContents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

loadEnvFile(envFile);

const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || "development",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  allowedOrigins: String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

const eventCatalog = {
  "HackLPU 3.0": {
    fee: 399,
    currency: "INR",
    mode: "paid",
    teamSize: { min: 1, max: 4 },
    category: "Hackathon",
  },
  "Web Dev Bootcamp": {
    fee: 0,
    currency: "INR",
    mode: "free",
    teamSize: { min: 1, max: 1 },
    category: "Workshop",
  },
  "DSA Challenge Week": {
    fee: 0,
    currency: "INR",
    mode: "free",
    teamSize: { min: 1, max: 1 },
    category: "Competition",
  },
  "AI/ML Workshop": {
    fee: 0,
    currency: "INR",
    mode: "free",
    teamSize: { min: 1, max: 1 },
    category: "Workshop",
  },
};

const defaultSiteContent = {
  highlights: [
    {
      title: "Hackathons",
      description: "High-energy team events for product building, demos, and campus innovation.",
    },
    {
      title: "Workshops",
      description: "Practical sessions that help students move from basics to deployable projects.",
    },
    {
      title: "Competitions",
      description: "Problem solving, coding rounds, and regular challenges that sharpen fundamentals.",
    },
  ],
  upcomingEvents: [
    {
      title: "HackLPU 3.0",
      category: "Hackathon",
      dateLabel: "May 15, 2026",
      registrationDeadline: "2026-05-05T23:59:59+05:30",
      description: "36-hour flagship hackathon with mentors, checkpoints, and final demos.",
      registerEnabled: true,
    },
    {
      title: "Web Dev Bootcamp",
      category: "Workshop",
      dateLabel: "Apr 20, 2026",
      registrationDeadline: "2026-04-18T23:59:59+05:30",
      description: "3-day workshop on HTML, CSS, JavaScript, and deployment basics.",
      registerEnabled: true,
    },
    {
      title: "DSA Challenge Week",
      category: "Competition",
      dateLabel: "Apr 28, 2026",
      registrationDeadline: "2026-04-26T23:59:59+05:30",
      description: "Daily coding rounds with rankings and prizes.",
      registerEnabled: true,
    },
  ],
  testimonials: [
    {
      quote: "Arena LPU helped me move from tutorials to actually building projects with other students.",
      author: "Ritika Verma",
      role: "3rd Year CSE",
    },
    {
      quote: "The hackathons gave me confidence, team experience, and better project thinking.",
      author: "Aman Joshi",
      role: "2nd Year IT",
    },
    {
      quote: "Even as a beginner, the event environment felt welcoming and easy to join.",
      author: "Divya Nair",
      role: "4th Year ECE",
    },
  ],
  faqs: [
    {
      question: "Who can join Arena LPU?",
      answer: "Any LPU student from any branch or year can join the club and participate in activities.",
    },
    {
      question: "How does registration work?",
      answer: "The team head enters details first, chooses the team size, reviews every participant, and then either completes payment for paid events or confirms a free registration.",
    },
    {
      question: "Can students join solo?",
      answer: "Yes. Solo registration works for the hackathon and is the default format for the free side events.",
    },
  ],
  contact: {
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
      {
        name: "Priya Sharma",
        role: "Vice President",
        type: "Operations",
        email: "priya@arenalpu.org",
        phone: "+91 98765 10004",
      },
      {
        name: "Rohan Gupta",
        role: "Tech Lead",
        type: "Technology",
        email: "rohan@arenalpu.org",
        phone: "+91 98765 10005",
      },
      {
        name: "Sneha Patel",
        role: "Events Head",
        type: "Programs",
        email: "sneha@arenalpu.org",
        phone: "+91 98765 10006",
      },
      {
        name: "Karan Singh",
        role: "Design Lead",
        type: "Creative",
        email: "karan@arenalpu.org",
        phone: "+91 98765 10007",
      },
      {
        name: "Ananya Roy",
        role: "PR & Outreach",
        type: "Communications",
        email: "ananya@arenalpu.org",
        phone: "+91 98765 10008",
      },
    ],
  },
  volunteer: {
    open: true,
    badge: "Open Application Pool",
    intro: "Apply to join Arena's volunteer team when roles are open.",
    note: "Roles include event operations, design, technical support, and outreach.",
  },
};

const app = express();
const razorpay =
  config.razorpayKeyId && config.razorpayKeySecret
    ? new Razorpay({
        key_id: config.razorpayKeyId,
        key_secret: config.razorpayKeySecret,
      })
    : null;

const fileLocks = new Map();

function withFileLock(filePath, operation) {
  const previous = fileLocks.get(filePath) || Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  fileLocks.set(
    filePath,
    next.finally(() => {
      if (fileLocks.get(filePath) === next) {
        fileLocks.delete(filePath);
      }
    }),
  );
  return next;
}

function setSecurityHeaders(request, response, next) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (request.path.startsWith("/api/")) {
    response.setHeader("Cache-Control", "no-store");
  }

  next();
}

function isAllowedOrigin(origin) {
  return !config.allowedOrigins.length || config.allowedOrigins.includes(origin);
}

app.use(setSecurityHeaders);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("This origin is not allowed."));
    },
    methods: ["GET", "POST", "OPTIONS"],
  }),
);
app.use((request, response, next) => {
  if (request.path === "/api/razorpay/webhook") {
    next();
    return;
  }
  express.json({ limit: "100kb" })(request, response, next);
});
app.use(express.static(publicDir));

function cleanText(value) {
  return String(value || "").trim();
}

function cleanEmail(value) {
  return cleanText(value).toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value) {
  return /^[0-9+\-\s()]{8,20}$/.test(value);
}

function getEventDetails(eventTitle) {
  return eventCatalog[cleanText(eventTitle)] || null;
}

function normalizeParticipant(participant = {}) {
  return {
    name: cleanText(participant.name),
    email: cleanEmail(participant.email),
    phone: cleanText(participant.phone),
    courseYear: cleanText(participant.courseYear),
  };
}

function validateRegistrationPayload(payload, { requirePaidEvent = false } = {}) {
  const eventTitle = cleanText(payload.eventTitle);
  const teamName = cleanText(payload.teamName);
  const collegeName = cleanText(payload.collegeName);
  const head = normalizeParticipant(payload.head);
  const members = Array.isArray(payload.members) ? payload.members.map(normalizeParticipant) : [];
  const requestedTeamSize = Number(payload.teamSize);
  const event = getEventDetails(eventTitle);

  if (!event) {
    return { ok: false, message: "Selected event is not available." };
  }

  if (requirePaidEvent && event.mode !== "paid") {
    return { ok: false, message: "This event does not require online payment." };
  }

  if (!teamName || !collegeName) {
    return { ok: false, message: "Team and college details are required." };
  }

  if (!head.name || !head.email || !head.phone || !head.courseYear) {
    return { ok: false, message: "Group head details are incomplete." };
  }

  if (!isEmail(head.email)) {
    return { ok: false, message: "Group head email is not valid." };
  }

  if (!isPhone(head.phone)) {
    return { ok: false, message: "Group head phone number is not valid." };
  }

  const teamSize = Number.isFinite(requestedTeamSize) ? requestedTeamSize : members.length + 1;
  if (teamSize < event.teamSize.min || teamSize > event.teamSize.max) {
    return { ok: false, message: `Team size for ${eventTitle} must be between ${event.teamSize.min} and ${event.teamSize.max}.` };
  }

  if (members.length !== Math.max(teamSize - 1, 0)) {
    return { ok: false, message: "Additional member details do not match the chosen team size." };
  }

  const participants = [head, ...members];
  const hasMissingMemberFields = participants.some((participant) => {
    return !participant.name || !participant.email || !participant.phone || !participant.courseYear;
  });

  if (hasMissingMemberFields) {
    return { ok: false, message: "Every listed participant must have complete details." };
  }

  const invalidMemberEmail = participants.find((participant) => !isEmail(participant.email));
  if (invalidMemberEmail) {
    return { ok: false, message: `Email address is invalid for ${invalidMemberEmail.name || "a participant"}.` };
  }

  const invalidPhoneParticipant = participants.find((participant) => !isPhone(participant.phone));
  if (invalidPhoneParticipant) {
    return { ok: false, message: `Phone number is invalid for ${invalidPhoneParticipant.name || "a participant"}.` };
  }

  const emails = participants.map((participant) => participant.email);
  if (new Set(emails).size !== emails.length) {
    return { ok: false, message: "Each participant must use a unique email address." };
  }

  return {
    ok: true,
    data: {
      eventTitle,
      event,
      teamName,
      collegeName,
      teamSize,
      head,
      members,
    },
  };
}

async function ensureDataFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]", "utf8");
  }
}

async function ensureJsonFile(filePath, initialValue) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(initialValue, null, 2), "utf8");
  }
}

async function readSiteContent() {
  await ensureJsonFile(siteContentFile, defaultSiteContent);
  const raw = JSON.parse(await fs.readFile(siteContentFile, "utf8"));

  return {
    ...defaultSiteContent,
    ...raw,
    highlights: Array.isArray(raw.highlights) ? raw.highlights : defaultSiteContent.highlights,
    upcomingEvents: Array.isArray(raw.upcomingEvents) ? raw.upcomingEvents : defaultSiteContent.upcomingEvents,
    testimonials: Array.isArray(raw.testimonials) ? raw.testimonials : defaultSiteContent.testimonials,
    faqs: Array.isArray(raw.faqs) ? raw.faqs : defaultSiteContent.faqs,
    contact: {
      ...defaultSiteContent.contact,
      ...(raw.contact || {}),
      channels: Array.isArray(raw.contact?.channels) ? raw.contact.channels : defaultSiteContent.contact.channels,
      teamMembers: Array.isArray(raw.contact?.teamMembers) ? raw.contact.teamMembers : defaultSiteContent.contact.teamMembers,
    },
    volunteer: {
      ...defaultSiteContent.volunteer,
      ...(raw.volunteer || {}),
    },
  };
}

async function appendRecord(filePath, record) {
  await withFileLock(filePath, async () => {
    await ensureDataFile(filePath);
    const existing = JSON.parse(await fs.readFile(filePath, "utf8"));
    existing.push(record);
    await fs.writeFile(filePath, JSON.stringify(existing, null, 2), "utf8");
  });
}

async function readRecords(filePath) {
  await ensureDataFile(filePath);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeRecords(filePath, records) {
  await withFileLock(filePath, async () => {
    await ensureDataFile(filePath);
    await fs.writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
  });
}

async function findPaymentSession(sessionId) {
  const sessions = await readRecords(paymentSessionsFile);
  return sessions.find((session) => session.id === sessionId) || null;
}

async function updatePaymentSession(sessionId, updater) {
  return withFileLock(paymentSessionsFile, async () => {
    await ensureDataFile(paymentSessionsFile);
    const sessions = JSON.parse(await fs.readFile(paymentSessionsFile, "utf8"));
    const index = sessions.findIndex((session) => session.id === sessionId);

    if (index === -1) {
      return null;
    }

    const nextValue = updater(sessions[index]);
    sessions[index] = nextValue;
    await fs.writeFile(paymentSessionsFile, JSON.stringify(sessions, null, 2), "utf8");
    return nextValue;
  });
}

async function createPaymentSession(session) {
  await appendRecord(paymentSessionsFile, session);
}

async function finalizePaidRegistration(session, paymentId) {
  return withFileLock(registrationsFile, async () => {
    await ensureDataFile(registrationsFile);
    const registrations = JSON.parse(await fs.readFile(registrationsFile, "utf8"));
    const existing = registrations.find((registration) => registration.paymentSessionId === session.id);

    if (existing) {
      return existing;
    }

    const record = {
      id: crypto.randomUUID(),
      registrationType: "paid",
      paymentStatus: "verified",
      paymentId,
      paymentSessionId: session.id,
      qrCodeId: session.qrCodeId,
      amount: session.amount,
      createdAt: new Date().toISOString(),
      eventTitle: session.eventTitle,
      event: session.event,
      teamName: session.teamName,
      collegeName: session.collegeName,
      teamSize: session.teamSize,
      head: session.head,
      members: session.members,
    };

    registrations.push(record);
    await fs.writeFile(registrationsFile, JSON.stringify(registrations, null, 2), "utf8");
    return record;
  });
}

async function handleSuccessfulPayment({
  sessionId,
  paymentId,
  paymentAmount,
}) {
  const session = await findPaymentSession(sessionId);
  if (!session) {
    return null;
  }

  if (Math.round(session.amount * 100) !== Number(paymentAmount)) {
    return null;
  }

  const record = await finalizePaidRegistration(session, paymentId);
  await updatePaymentSession(sessionId, (current) => ({
    ...current,
    status: "paid",
    paymentId,
    registrationId: record.id,
    paidAt: new Date().toISOString(),
  }));

  return record;
}

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    razorpayConfigured: Boolean(razorpay),
    events: Object.entries(eventCatalog).map(([title, event]) => ({
      title,
      fee: event.fee,
      mode: event.mode,
      category: event.category,
      teamSize: event.teamSize,
    })),
  });
});

app.post("/api/contact", async (request, response) => {
  try {
    const name = cleanText(request.body.name);
    const email = cleanEmail(request.body.email);
    const subject = cleanText(request.body.subject);
    const phone = cleanText(request.body.phone);
    const message = cleanText(request.body.message);

    if (!name || !email || !subject || !message) {
      response.status(400).json({ message: "Name, email, inquiry type, and message are required." });
      return;
    }

    if (!isEmail(email)) {
      response.status(400).json({ message: "Please enter a valid email address." });
      return;
    }

    if (phone && !isPhone(phone)) {
      response.status(400).json({ message: "Please enter a valid phone number." });
      return;
    }

    await appendRecord(contactsFile, {
      id: crypto.randomUUID(),
      name,
      email,
      subject,
      phone,
      message,
      createdAt: new Date().toISOString(),
    });

    response.json({
      success: true,
      message: "Thanks for reaching out. The message has been saved successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save your message right now.";
    response.status(500).json({ message });
  }
});

app.get("/api/site-content", async (_request, response) => {
  try {
    const siteContent = await readSiteContent();
    response.json({ success: true, content: siteContent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load site content.";
    response.status(500).json({ message });
  }
});

app.post("/api/volunteer", async (request, response) => {
  try {
    const siteContent = await readSiteContent();
    if (!siteContent.volunteer.open) {
      response.status(403).json({ message: "Volunteer applications are currently closed." });
      return;
    }

    const name = cleanText(request.body.name);
    const email = cleanEmail(request.body.email);
    const phone = cleanText(request.body.phone);
    const area = cleanText(request.body.area);
    const message = cleanText(request.body.message);

    if (!name || !email || !phone || !area || !message) {
      response.status(400).json({ message: "Name, email, phone, preferred area, and message are required." });
      return;
    }

    if (!isEmail(email)) {
      response.status(400).json({ message: "Please enter a valid email address." });
      return;
    }

    if (!isPhone(phone)) {
      response.status(400).json({ message: "Please enter a valid phone number." });
      return;
    }

    await appendRecord(volunteersFile, {
      id: crypto.randomUUID(),
      name,
      email,
      phone,
      area,
      message,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    response.json({
      success: true,
      message: "Your volunteer application has been submitted. We will contact you when matching vacancies open.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save volunteer application right now.";
    response.status(500).json({ message });
  }
});

app.post("/api/register-free", async (request, response) => {
  try {
    const validation = validateRegistrationPayload(request.body);
    if (!validation.ok) {
      response.status(400).json({ message: validation.message });
      return;
    }

    if (validation.data.event.mode !== "free") {
      response.status(400).json({ message: "This event requires payment before registration is completed." });
      return;
    }

    const record = {
      id: crypto.randomUUID(),
      registrationType: "free",
      paymentStatus: "not_required",
      createdAt: new Date().toISOString(),
      ...validation.data,
    };

    await appendRecord(registrationsFile, record);

    response.json({
      success: true,
      message: "Registration completed successfully.",
      registrationId: record.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save registration.";
    response.status(500).json({ message });
  }
});

app.post("/api/create-upi-session", async (request, response) => {
  try {
    if (!razorpay) {
      response.status(500).json({
        message: "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET before taking payments.",
      });
      return;
    }

    const validation = validateRegistrationPayload(request.body, { requirePaidEvent: true });
    if (!validation.ok) {
      response.status(400).json({ message: validation.message });
      return;
    }

    const amount = validation.data.event.fee;
    const sessionId = crypto.randomUUID();
    const closeBy = Math.floor(Date.now() / 1000) + 15 * 60;
    const qrCode = await razorpay.qrCode.create({
      type: "upi_qr",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: Math.round(amount * 100),
      name: `${validation.data.eventTitle} Registration`,
      description: `${validation.data.teamName} - ${validation.data.head.email}`,
      close_by: closeBy,
      notes: {
        paymentSessionId: sessionId,
        eventTitle: validation.data.eventTitle,
        teamName: validation.data.teamName,
        headName: validation.data.head.name,
        headEmail: validation.data.head.email,
      },
    });

    await createPaymentSession({
      id: sessionId,
      status: "pending",
      kind: "upi_qr",
      qrCodeId: qrCode.id,
      qrCodeImageUrl: qrCode.image_url,
      amount,
      closeBy,
      createdAt: new Date().toISOString(),
      ...validation.data,
    });

    response.json({
      sessionId,
      qrCodeId: qrCode.id,
      qrCodeImageUrl: qrCode.image_url,
      amount: Math.round(amount * 100),
      amountDisplay: amount,
      currency: validation.data.event.currency,
      expiresAt: new Date(closeBy * 1000).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create UPI payment session.";
    response.status(500).json({ message });
  }
});

app.get("/api/payment-status/:sessionId", async (request, response) => {
  try {
    if (!razorpay) {
      response.status(500).json({ message: "Payment verification is not configured." });
      return;
    }

    const sessionId = cleanText(request.params.sessionId);
    if (!sessionId) {
      response.status(400).json({ message: "Payment session ID is required." });
      return;
    }

    const session = await findPaymentSession(sessionId);
    if (!session) {
      response.status(404).json({ message: "Payment session not found." });
      return;
    }

    if (session.status === "paid") {
      response.json({
        success: true,
        status: "paid",
        registrationId: session.registrationId,
      });
      return;
    }

    if (session.status === "expired") {
      response.json({
        success: false,
        status: "expired",
        message: "This UPI QR has expired. Generate a fresh QR to continue.",
      });
      return;
    }

    const qrDetails = await razorpay.qrCode.fetch(session.qrCodeId);
    const payments = await razorpay.qrCode.fetchAllPayments(session.qrCodeId, { count: 10 });
    const successfulPayment = (payments.items || []).find((payment) => {
      return payment.status === "captured" && Number(payment.amount) === Math.round(session.amount * 100);
    });

    if (successfulPayment) {
      const record = await finalizePaidRegistration(session, successfulPayment.id);
      await updatePaymentSession(sessionId, (current) => ({
        ...current,
        status: "paid",
        paymentId: successfulPayment.id,
        registrationId: record.id,
        paidAt: new Date().toISOString(),
      }));

      if (qrDetails.status !== "closed") {
        try {
          await razorpay.qrCode.close(session.qrCodeId);
        } catch {
          // Ignore close failures after a successful capture.
        }
      }

      response.json({
        success: true,
        status: "paid",
        registrationId: record.id,
      });
      return;
    }

    if (qrDetails.status === "closed" || (session.closeBy && Date.now() > session.closeBy * 1000)) {
      await updatePaymentSession(sessionId, (current) => ({
        ...current,
        status: "expired",
        expiredAt: new Date().toISOString(),
      }));

      response.json({
        success: false,
        status: "expired",
        message: "This UPI QR has expired. Generate a fresh QR to continue.",
      });
      return;
    }

    response.json({
      success: false,
      status: "pending",
      amountDisplay: session.amount,
      expiresAt: new Date(session.closeBy * 1000).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify payment.";
    response.status(500).json({ message });
  }
});

app.post("/api/payment-session/:sessionId/cancel", async (request, response) => {
  try {
    if (!razorpay) {
      response.status(500).json({ message: "Payment cancellation is not configured." });
      return;
    }

    const sessionId = cleanText(request.params.sessionId);
    const session = await findPaymentSession(sessionId);

    if (!session) {
      response.status(404).json({ message: "Payment session not found." });
      return;
    }

    if (session.status === "paid") {
      response.status(400).json({ message: "A completed payment session cannot be cancelled." });
      return;
    }

    try {
      await razorpay.qrCode.close(session.qrCodeId);
    } catch {
      // Ignore close failures and still mark the session as cancelled locally.
    }

    await updatePaymentSession(sessionId, (current) => ({
      ...current,
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    }));

    response.json({ success: true, status: "cancelled" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel payment session.";
    response.status(500).json({ message });
  }
});

app.post("/api/razorpay/webhook", express.raw({ type: "application/json" }), (request, response) => {
  if (!config.razorpayWebhookSecret) {
    response.status(202).json({ received: true, message: "Webhook secret not configured." });
    return;
  }

  const signature = request.header("x-razorpay-signature");
  const expectedSignature = crypto
    .createHmac("sha256", config.razorpayWebhookSecret)
    .update(request.body)
    .digest("hex");

  if (!signature || signature !== expectedSignature) {
    response.status(400).json({ message: "Webhook signature is invalid." });
    return;
  }

  try {
    const payload = JSON.parse(request.body.toString("utf8"));
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const notes = paymentEntity?.notes || {};
    const sessionId = cleanText(notes.paymentSessionId);

    if (event === "payment.captured" && sessionId && paymentEntity?.id) {
      handleSuccessfulPayment({
        sessionId,
        paymentId: paymentEntity.id,
        paymentAmount: paymentEntity.amount,
      }).catch(() => undefined);
    }

    response.json({ received: true });
  } catch {
    response.status(400).json({ message: "Webhook payload is invalid." });
  }
});

app.use("/api", (_request, response) => {
  response.status(404).json({ message: "API route not found." });
});

app.get("*", (_request, response) => {
  response.sendFile(path.join(publicDir, "index.html"));
});

app.use((error, _request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof SyntaxError) {
    response.status(400).json({ message: "Request body is not valid JSON." });
    return;
  }

  if (error instanceof Error && error.message === "This origin is not allowed.") {
    response.status(403).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: "Internal server error." });
});

app.listen(config.port, () => {
  console.log(`HackLPU app running on http://localhost:${config.port}`);
});
