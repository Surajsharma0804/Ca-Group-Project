import path from 'path';
import express from 'express';
import cors from 'cors';
import Razorpay from 'razorpay';

import { config, eventCatalog, defaultSiteContent, publicDir } from './config.js';
import * as db from './db.js';
import { crypto } from './utils.js';

const app = express();

function cleanText(value) {
  return String(value || '').trim();
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createDemoQrImageUrl(seedText, label) {
  const size = 29;
  const quietZone = 4;
  const scale = 8;
  const totalSize = (size + quietZone * 2) * scale;
  const matrix = Array.from({ length: size }, () => Array(size).fill(false));
  const hash = crypto.createHash('sha256').update(seedText).digest();

  function paintFinder(startX, startY) {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const border = x === 0 || x === 6 || y === 0 || y === 6;
        const center = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        matrix[startY + y][startX + x] = border || center;
      }
    }
  }

  paintFinder(0, 0);
  paintFinder(size - 7, 0);
  paintFinder(0, size - 7);

  for (let i = 8; i < size - 8; i += 1) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const inFinderArea =
        (x < 7 && y < 7) ||
        (x >= size - 7 && y < 7) ||
        (x < 7 && y >= size - 7) ||
        x === 6 ||
        y === 6;
      if (inFinderArea) continue;

      const byte = hash[(x * 17 + y * 31) % hash.length];
      const bit = (byte >> ((x + y) % 8)) & 1;
      const accent = ((x + y + byte) % 11) < 4;
      matrix[y][x] = Boolean(bit ^ Number(accent));
    }
  }

  const modules = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!matrix[y][x]) continue;
      modules.push(`<rect x="${(x + quietZone) * scale}" y="${(y + quietZone) * scale}" width="${scale}" height="${scale}" rx="1" ry="1" />`);
    }
  }

  const safeLabel = escapeXml(label);
  const safeSeed = escapeXml(seedText);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${totalSize}" height="${totalSize}" role="img" aria-label="${safeLabel}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <g fill="#000000" shape-rendering="crispEdges">${modules.join('')}</g>
      <rect x="${quietZone * scale}" y="${quietZone * scale}" width="${size * scale}" height="${size * scale}" fill="none" stroke="#111111" stroke-width="2" rx="8" ry="8"/>
      <text x="${totalSize / 2}" y="${totalSize - 16}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" text-anchor="middle" fill="#111111">${safeLabel}</text>
      <text x="${totalSize / 2}" y="${totalSize - 2}" font-family="Arial, Helvetica, sans-serif" font-size="8" text-anchor="middle" fill="#666666">${safeSeed}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

let razorpay = null;
if (config.razorpayKeyId && config.razorpayKeySecret) {
  try {
    razorpay = new Razorpay({ key_id: config.razorpayKeyId, key_secret: config.razorpayKeySecret });
  } catch (err) {
    console.warn('Razorpay initialization failed:', err && err.message);
    razorpay = null;
  }
}

const isDemoPaymentMode = !razorpay && config.demoPaymentMode;

const runtimeStore = {
  siteContent: JSON.parse(JSON.stringify(defaultSiteContent)),
  contacts: [],
  paymentSessions: [],
  registrations: [],
  volunteers: [],
};

let hasLoggedMongoFallback = false;

function logMongoFallbackOnce(error) {
  if (hasLoggedMongoFallback) return;
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  console.warn(`MongoDB unavailable, using in-memory fallback storage: ${message}`);
  hasLoggedMongoFallback = true;
}

async function getDatabaseSafe() {
  try {
    return await db.getDatabase();
  } catch (error) {
    logMongoFallbackOnce(error);
    return null;
  }
}

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readSiteContent() {
  const raw = cloneDeep(runtimeStore.siteContent);
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : defaultSiteContent;
  return {
    ...defaultSiteContent,
    ...source,
    highlights: Array.isArray(source.highlights) ? source.highlights : defaultSiteContent.highlights,
    upcomingEvents: Array.isArray(source.upcomingEvents) ? source.upcomingEvents : defaultSiteContent.upcomingEvents,
    testimonials: Array.isArray(source.testimonials) ? source.testimonials : defaultSiteContent.testimonials,
    faqs: Array.isArray(source.faqs) ? source.faqs : defaultSiteContent.faqs,
    contact: {
      ...defaultSiteContent.contact,
      ...(source.contact || {}),
      channels: Array.isArray(source.contact?.channels) ? source.contact.channels : defaultSiteContent.contact.channels,
      teamMembers: Array.isArray(source.contact?.teamMembers) ? source.contact.teamMembers : defaultSiteContent.contact.teamMembers,
    },
    volunteer: {
      ...defaultSiteContent.volunteer,
      ...(source.volunteer || {}),
    },
  };
}

async function findPaymentSession(sessionId) {
  return runtimeStore.paymentSessions.find((session) => session.id === sessionId) || null;
}

async function updatePaymentSession(sessionId, updater) {
  const index = runtimeStore.paymentSessions.findIndex((session) => session.id === sessionId);
  if (index === -1) return null;

  const current = runtimeStore.paymentSessions[index];
  const next = updater(current);
  runtimeStore.paymentSessions[index] = next;
  return next;
}

async function createPaymentSession(session) {
  runtimeStore.paymentSessions.push(session);
  return session;
}

async function appendRecord(_storeName, record) {
  runtimeStore.contacts.push(record);
  return record;
}

async function createRegistration(record) {
  const database = await getDatabaseSafe();
  const recordToInsert = { ...record };
  delete recordToInsert._id;

  if (database) {
    const collection = database.collection('registrations');
    await collection.updateOne({ id: recordToInsert.id }, { $setOnInsert: recordToInsert }, { upsert: true });
    const saved = await collection.findOne({ id: recordToInsert.id });
    return saved || recordToInsert;
  } else {
    runtimeStore.registrations.push(recordToInsert);
  }
  return recordToInsert;
}

async function createVolunteerApplication(record) {
  const database = await getDatabaseSafe();
  const recordToInsert = { ...record };
  delete recordToInsert._id;

  if (database) {
    await database.collection('volunteers').insertOne(recordToInsert);
  } else {
    runtimeStore.volunteers.push(recordToInsert);
  }
  return recordToInsert;
}

async function finalizePaidRegistration(session, paymentId) {
  const record = {
    id: crypto.randomUUID(),
    registrationType: 'paid',
    paymentStatus: 'verified',
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

  const database = await getDatabaseSafe();
  if (!database) {
    const existing = runtimeStore.registrations.find((item) => item.paymentSessionId === session.id) || null;
    if (existing) return existing;
    runtimeStore.registrations.push(record);
    return record;
  }

  const collection = database.collection('registrations');
  const existing = await collection.findOne({ paymentSessionId: session.id });
  if (existing) return existing;

  try {
    const recordToInsert = { ...record };
    delete recordToInsert._id;
    await collection.updateOne({ paymentSessionId: session.id }, { $setOnInsert: recordToInsert }, { upsert: true });
    const saved = await collection.findOne({ paymentSessionId: session.id });
    return saved || recordToInsert;
  } catch (error) {
    if (error && error.code === 11000) {
      const duplicate = await collection.findOne({ paymentSessionId: session.id });
      if (duplicate) return duplicate;
    }
    throw error;
  }
}

async function handleSuccessfulPayment({ sessionId, paymentId, paymentAmount }) {
  const session = await findPaymentSession(sessionId);
  if (!session) return null;
  if (Math.round(session.amount * 100) !== Number(paymentAmount)) return null;
  const record = await finalizePaidRegistration(session, paymentId);
  await updatePaymentSession(sessionId, (current) => ({ ...current, status: 'paid', paymentId, registrationId: record.id, paidAt: new Date().toISOString() }));
  return record;
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.length === 0 || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('This origin is not allowed.'));
    },
    credentials: true,
  })
);

app.use('/api/razorpay/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

app.get('/api/health', (_request, response) => {
  response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongoConnected: db.isMongoReady,
    razorpayConfigured: Boolean(razorpay),
    demoPaymentMode: isDemoPaymentMode,
    events: Object.entries(eventCatalog).map(([title, event]) => ({
      title,
      fee: event.fee,
      mode: event.mode,
      category: event.category,
      teamSize: event.teamSize,
    })),
  });
});

app.post('/api/contact', async (request, response) => {
  try {
    const name = String(request.body.name || '').trim();
    const email = String(request.body.email || '').trim().toLowerCase();
    const subject = String(request.body.subject || '').trim();
    const phone = String(request.body.phone || '').trim();
    const message = String(request.body.message || '').trim();

    if (!name || !email || !subject || !message) {
      response.status(400).json({ message: 'Name, email, inquiry type, and message are required.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      response.status(400).json({ message: 'Please enter a valid email address.' });
      return;
    }

    if (phone && !/^[0-9+\-\s()]{8,20}$/.test(phone)) {
      response.status(400).json({ message: 'Please enter a valid phone number.' });
      return;
    }

    await appendRecord('contacts', {
      id: crypto.randomUUID(),
      name,
      email,
      subject,
      phone,
      message,
      createdAt: new Date().toISOString(),
    });

    response.json({ success: true, message: 'Thanks for reaching out. The message has been saved successfully.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save your message right now.';
    response.status(500).json({ message });
  }
});

app.get('/api/site-content', async (_request, response) => {
  try {
    const siteContent = await readSiteContent();
    response.json({ success: true, content: siteContent });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load site content.';
    response.status(500).json({ message });
  }
});

app.post('/api/volunteer', async (request, response) => {
  try {
    const siteContent = await readSiteContent();
    if (!siteContent.volunteer.open) {
      response.status(403).json({ message: 'Volunteer applications are currently closed.' });
      return;
    }

    const name = String(request.body.name || '').trim();
    const email = String(request.body.email || '').trim().toLowerCase();
    const phone = String(request.body.phone || '').trim();
    const area = String(request.body.area || '').trim();
    const message = String(request.body.message || '').trim();

    if (!name || !email || !phone || !area || !message) {
      response.status(400).json({ message: 'Name, email, phone, preferred area, and message are required.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      response.status(400).json({ message: 'Please enter a valid email address.' });
      return;
    }

    if (!/^[0-9+\-\s()]{8,20}$/.test(phone)) {
      response.status(400).json({ message: 'Please enter a valid phone number.' });
      return;
    }

    await createVolunteerApplication({ id: crypto.randomUUID(), name, email, phone, area, message, status: 'pending', createdAt: new Date().toISOString() });

    response.json({ success: true, message: 'Your volunteer application has been submitted. We will contact you when matching vacancies open.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save volunteer application right now.';
    response.status(500).json({ message });
  }
});

app.post('/api/register-free', async (request, response) => {
  try {
    // Reuse validation logic from original file by duplicating lightweight checks here
    const payload = request.body || {};
    // Basic validation: ensure eventTitle exists and mode is free on catalog
    const eventTitle = String(payload.eventTitle || '').trim();
    const event = eventCatalog[eventTitle];
    if (!event) return response.status(400).json({ message: 'Selected event is not available.' });
    if (event.mode !== 'free') return response.status(400).json({ message: 'This event requires payment before registration is completed.' });

    const record = { id: crypto.randomUUID(), registrationType: 'free', paymentStatus: 'not_required', createdAt: new Date().toISOString(), ...payload };
    await createRegistration(record);
    response.json({ success: true, message: 'Registration completed successfully.', registrationId: record.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save registration.';
    response.status(500).json({ message });
  }
});

app.post('/api/create-upi-session', async (request, response) => {
  try {
    if (!razorpay && !isDemoPaymentMode) {
      response.status(500).json({ message: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET before taking payments.' });
      return;
    }

    const payload = request.body || {};
    const eventTitle = String(payload.eventTitle || '').trim();
    const event = eventCatalog[eventTitle];
    if (!event || event.mode !== 'paid') return response.status(400).json({ message: 'Selected event not payable or not found.' });

    const amount = event.fee;
    const sessionId = crypto.randomUUID();
    const closeBy = Math.floor(Date.now() / 1000) + 15 * 60;

    if (isDemoPaymentMode) {
      const qrCodeId = `demo_qr_${sessionId}`;
      const qrCodeImageUrl = createDemoQrImageUrl(
        `${sessionId}|${eventTitle}|${amount}|${payload.teamName || ''}|${payload.head?.email || ''}`,
        `Demo QR • ${eventTitle}`
      );
      await createPaymentSession({ id: sessionId, status: 'pending', kind: 'demo_upi_qr', qrCodeId, qrCodeImageUrl, amount, closeBy, createdAt: new Date().toISOString(), demoAutoConfirmAt: Date.now() + 9000, ...payload });
      response.json({ sessionId, qrCodeId, qrCodeUrl: qrCodeImageUrl, qrCodeImageUrl, amount: Math.round(amount * 100), amountDisplay: amount, currency: event.currency, expiresAt: new Date(closeBy * 1000).toISOString(), mode: 'demo' });
      return;
    }

    const qrCode = await razorpay.qrCode.create({ type: 'upi_qr', usage: 'single_use', fixed_amount: true, payment_amount: Math.round(amount * 100), name: `${eventTitle} Registration`, description: `${payload.teamName || ''} - ${payload.head?.email || ''}`, close_by: closeBy, notes: { paymentSessionId: sessionId, eventTitle, teamName: payload.teamName || '', headEmail: payload.head?.email || '' } });

    await createPaymentSession({ id: sessionId, status: 'pending', kind: 'upi_qr', qrCodeId: qrCode.id, qrCodeImageUrl: qrCode.image_url, amount, closeBy, createdAt: new Date().toISOString(), ...payload });

    response.json({ sessionId, qrCodeId: qrCode.id, qrCodeImageUrl: qrCode.image_url, amount: Math.round(amount * 100), amountDisplay: amount, currency: event.currency, expiresAt: new Date(closeBy * 1000).toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create UPI payment session.';
    response.status(500).json({ message });
  }
});

// Compatibility routes for frontend (legacy paths expected by public scripts)
app.post('/api/registration/upi', async (request, response) => {
  try {
    // Reuse the same logic as /api/create-upi-session but return keys expected by frontend
    const payload = request.body || {};
    const eventTitle = String(payload.eventTitle || '').trim();
    const event = eventCatalog[eventTitle];
    if (!event || event.mode !== 'paid') return response.status(400).json({ message: 'Selected event not payable or not found.' });

    const amount = event.fee;
    const sessionId = crypto.randomUUID();
    const closeBy = Math.floor(Date.now() / 1000) + 15 * 60;

    if (isDemoPaymentMode) {
      const qrCodeId = `demo_qr_${sessionId}`;
      const qrCodeImageUrl = createDemoQrImageUrl(
        `${sessionId}|${eventTitle}|${amount}|${payload.teamName || ''}|${payload.head?.email || ''}`,
        `Demo QR • ${eventTitle}`
      );
      await createPaymentSession({ id: sessionId, status: 'pending', kind: 'demo_upi_qr', qrCodeId, qrCodeImageUrl, amount, closeBy, createdAt: new Date().toISOString(), demoAutoConfirmAt: Date.now() + 9000, ...payload, eventTitle });
      return response.json({ sessionId, qrCodeId, qrCodeUrl: qrCodeImageUrl, qrCodeImageUrl, amount: Math.round(amount * 100), amountDisplay: amount, currency: event.currency, expiresAt: new Date(closeBy * 1000).toISOString(), mode: 'demo' });
    }

    const qrCode = await razorpay.qrCode.create({ type: 'upi_qr', usage: 'single_use', fixed_amount: true, payment_amount: Math.round(amount * 100), name: `${eventTitle} Registration`, description: `${payload.teamName || ''} - ${payload.head?.email || ''}`, close_by: closeBy, notes: { paymentSessionId: sessionId, eventTitle, teamName: payload.teamName || '', headEmail: payload.head?.email || '' } });

    await createPaymentSession({ id: sessionId, status: 'pending', kind: 'upi_qr', qrCodeId: qrCode.id, qrCodeImageUrl: qrCode.image_url, amount, closeBy, createdAt: new Date().toISOString(), ...payload, eventTitle });

    return response.json({ sessionId, qrCodeId: qrCode.id, qrCodeUrl: qrCode.image_url, qrCodeImageUrl: qrCode.image_url, amount: Math.round(amount * 100), amountDisplay: amount, currency: event.currency, expiresAt: new Date(closeBy * 1000).toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create UPI payment session.';
    response.status(500).json({ message });
  }
});

app.get('/api/registration/upi/:qrId', async (request, response) => {
  try {
    const qrId = String(request.params.qrId || '').trim();
    if (!qrId) return response.status(400).json({ message: 'QR id is required.' });

    // Try to find a session by qrCodeId or by session id (some flows use session id)
    const session = runtimeStore.paymentSessions.find((s) => s.qrCodeId === qrId || s.id === qrId) || null;
    if (!session) return response.status(404).json({ message: 'Payment session not found.' });

    if (isDemoPaymentMode) {
      if (session.status === 'paid') return response.json({ success: true, status: 'paid', registrationId: session.registrationId });
      if (session.status === 'expired' || session.status === 'cancelled') return response.json({ success: false, status: 'expired', message: 'This UPI QR has expired. Generate a fresh QR to continue.' });
      if (session.closeBy && Date.now() > session.closeBy * 1000) {
        await updatePaymentSession(session.id, (current) => ({ ...current, status: 'expired', expiredAt: new Date().toISOString() }));
        return response.json({ success: false, status: 'expired', message: 'This UPI QR has expired. Generate a fresh QR to continue.' });
      }

      if (session.demoAutoConfirmAt && Date.now() >= Number(session.demoAutoConfirmAt)) {
        const paymentId = `demo_pay_${session.id.slice(0, 12)}`;
        await updatePaymentSession(session.id, (current) => ({ ...current, status: 'paid', paymentId, paidAt: new Date().toISOString() }));
        return response.json({ success: true, status: 'paid' });
      }

      return response.json({ success: false, status: 'pending', amountDisplay: session.amount, expiresAt: new Date(session.closeBy * 1000).toISOString() });
    }

    // Non-demo: check payments via Razorpay
    const qrDetails = await razorpay.qrCode.fetch(session.qrCodeId);
    const payments = await razorpay.qrCode.fetchAllPayments(session.qrCodeId, { count: 10 });
    const successfulPayment = (payments.items || []).find((payment) => payment.status === 'captured' && Number(payment.amount) === Math.round(session.amount * 100));
    if (successfulPayment) {
      await updatePaymentSession(session.id, (current) => ({ ...current, status: 'paid', paymentId: successfulPayment.id, paidAt: new Date().toISOString() }));
      try { if (qrDetails.status !== 'closed') await razorpay.qrCode.close(session.qrCodeId); } catch {}
      return response.json({ success: true, status: 'paid' });
    }

    if (qrDetails.status === 'closed' || (session.closeBy && Date.now() > session.closeBy * 1000)) {
      await updatePaymentSession(session.id, (current) => ({ ...current, status: 'expired', expiredAt: new Date().toISOString() }));
      return response.json({ success: false, status: 'expired', message: 'This UPI QR has expired. Generate a fresh QR to continue.' });
    }

    return response.json({ success: false, status: 'pending', amountDisplay: session.amount, expiresAt: new Date(session.closeBy * 1000).toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to query payment status.';
    response.status(500).json({ message });
  }
});

// Generic registration endpoint used by frontend to complete registration for both free and paid flows
app.post('/api/registration', async (request, response) => {
  try {
    const payload = request.body || {};
    const eventTitle = String(payload.eventTitle || '').trim();
    const event = eventCatalog[eventTitle];
    if (!event) return response.status(400).json({ message: 'Selected event is not available.' });

    // Paid flow: require sessionId and verify session is paid
    if (event.mode === 'paid') {
      const sessionId = String(payload.sessionId || '').trim();
      if (!sessionId) return response.status(400).json({ message: 'Payment session ID is required for paid registrations.' });
      const session = await findPaymentSession(sessionId);
      if (!session || session.status !== 'paid') return response.status(400).json({ message: 'Payment not verified yet.' });

      const record = await finalizePaidRegistration(session, session.paymentId || `manual_${Date.now()}`);
      return response.json({ success: true, message: event.successMessage || 'Registration completed successfully.', registrationId: record.id });
    }

    // Free flow: create registration immediately
    if (event.mode === 'free') {
      const record = { id: crypto.randomUUID(), registrationType: 'free', paymentStatus: 'not_required', createdAt: new Date().toISOString(), eventTitle, ...payload };
      await createRegistration(record);
      return response.json({ success: true, message: event.successMessage || 'Registration completed successfully.', registrationId: record.id });
    }

    response.status(400).json({ message: 'Unsupported registration mode.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to complete registration.';
    response.status(500).json({ message });
  }
});

app.get("/api/payment-status/:sessionId", async (request, response) => {
  try {
    if (!razorpay && !isDemoPaymentMode) {
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

    if (isDemoPaymentMode) {
      if (session.status === "paid") {
        response.json({
          success: true,
          status: "paid",
          registrationId: session.registrationId,
        });
        return;
      }

      if (session.status === "expired" || session.status === "cancelled") {
        response.json({
          success: false,
          status: "expired",
          message: "This UPI QR has expired. Generate a fresh QR to continue.",
        });
        return;
      }

      if (session.closeBy && Date.now() > session.closeBy * 1000) {
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


      if (session.demoAutoConfirmAt && Date.now() >= Number(session.demoAutoConfirmAt)) {
        const paymentId = `demo_pay_${session.id.slice(0, 12)}`;
        await updatePaymentSession(sessionId, (current) => ({ ...current, status: 'paid', paymentId, paidAt: new Date().toISOString() }));
        response.json({ success: true, status: 'paid' });
        return;
      }

      response.json({
        success: false,
        status: "pending",
        amountDisplay: session.amount,
        expiresAt: new Date(session.closeBy * 1000).toISOString(),
      });
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

    if (!isDemoPaymentMode) {
      const qrDetails = await razorpay.qrCode.fetch(session.qrCodeId);
      const payments = await razorpay.qrCode.fetchAllPayments(session.qrCodeId, { count: 10 });
      const successfulPayment = (payments.items || []).find((payment) => payment.status === 'captured' && Number(payment.amount) === Math.round(session.amount * 100));
      if (successfulPayment) {
        await updatePaymentSession(sessionId, (current) => ({ ...current, status: 'paid', paymentId: successfulPayment.id, paidAt: new Date().toISOString() }));
        if (qrDetails.status !== 'closed') {
          try { await razorpay.qrCode.close(session.qrCodeId); } catch {}
        }
        response.json({ success: true, status: 'paid' });
        return;
      }

      if (qrDetails.status === 'closed' || (session.closeBy && Date.now() > session.closeBy * 1000)) {
        await updatePaymentSession(sessionId, (current) => ({ ...current, status: 'expired', expiredAt: new Date().toISOString() }));
        response.json({ success: false, status: 'expired', message: 'This UPI QR has expired. Generate a fresh QR to continue.' });
        return;
      }
    } else {
      // demo branch already handled above; keep generic pending response
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
    if (!razorpay && !isDemoPaymentMode) {
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

    if (isDemoPaymentMode) {
      await updatePaymentSession(sessionId, (current) => ({
        ...current,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      }));

      response.json({ success: true, status: "cancelled" });
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

app.post('/api/razorpay/webhook', (request, response) => {
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

async function startServer() {
  try {
    try {
      await db.initializeMongoCollections();
    } catch (error) {
      logMongoFallbackOnce(error);
    }

    const portsToTry = [config.port, config.port + 1, config.port + 2];

    for (const port of portsToTry) {
      try {
        await new Promise((resolve, reject) => {
          const server = app.listen(port, '0.0.0.0', () => resolve(server));
          server.on('error', reject);
        });

        const url = `http://localhost:${port}/`;
        if (port !== config.port) {
          console.warn(`Port ${config.port} is busy, started on ${port} instead.`);
        }
        console.log(`HackLPU app running on ${url}`);
        return;
      } catch (error) {
        if (error && error.code === 'EADDRINUSE') continue;
        throw error;
      }
    }

    throw new Error(`Unable to start server on ports ${portsToTry.join(', ')}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unable to start server: ${message}`);
    process.exit(1);
  }
}

startServer();
