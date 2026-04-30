import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const dataDir = path.join(__dirname, 'data');
const contactsFile = path.join(dataDir, 'contacts.json');
const siteContentFile = path.join(dataDir, 'site-content.json');
const paymentSessionsFile = path.join(dataDir, 'payment-sessions.json');
const envFile = path.join(rootDir, '.env');

export function loadEnvFile(filePath) {
  if (!fsSync.existsSync(filePath)) return;
  const fileContents = fsSync.readFileSync(filePath, 'utf8');
  fileContents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) process.env[key] = value;
  });
}

export function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

loadEnvFile(envFile);

export const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hacklpu',
  mongodbDatabase: process.env.MONGODB_DATABASE || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  demoPaymentMode: parseBooleanEnv(process.env.DEMO_PAYMENT_MODE, false),
  allowedOrigins: String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export const eventCatalog = {
  'HackLPU 3.0': { fee: 399, currency: 'INR', mode: 'paid', teamSize: { min: 1, max: 4 }, category: 'Hackathon' },
  'Web Dev Bootcamp': { fee: 0, currency: 'INR', mode: 'free', teamSize: { min: 1, max: 1 }, category: 'Workshop' },
  'DSA Challenge Week': { fee: 0, currency: 'INR', mode: 'free', teamSize: { min: 1, max: 1 }, category: 'Competition' },
  'AI/ML Workshop': { fee: 0, currency: 'INR', mode: 'free', teamSize: { min: 1, max: 1 }, category: 'Workshop' },
};

export const defaultSiteContent = {
  highlights: [
    { title: 'Hackathons', description: 'High-energy team events for product building, demos, and campus innovation.' },
    { title: 'Workshops', description: 'Practical sessions that help students move from basics to deployable projects.' },
    { title: 'Competitions', description: 'Problem solving, coding rounds, and regular challenges that sharpen fundamentals.' },
  ],
    upcomingEvents: [
    { title: 'HackLPU 3.0', category: 'Hackathon', dateLabel: 'May 15, 2026', registrationDeadline: '2026-05-05T23:59:59+05:30', description: '36-hour flagship hackathon with mentors, checkpoints, and final demos.', registerEnabled: true },
    { title: 'Web Dev Bootcamp', category: 'Workshop', dateLabel: 'May 6, 2026', registrationDeadline: '2026-05-06T23:59:59+05:30', description: '3-day workshop on HTML, CSS, JavaScript, and deployment basics.', registerEnabled: true },
    { title: 'DSA Challenge Week', category: 'Competition', dateLabel: 'May 8, 2026', registrationDeadline: '2026-05-08T23:59:59+05:30', description: 'Daily coding rounds with rankings and prizes.', registerEnabled: true },
  ],
  testimonials: [
    { quote: 'Arena LPU helped me move from tutorials to actually building projects with other students.', author: 'Ritika Verma', role: '3rd Year CSE' },
    { quote: 'The hackathons gave me confidence, team experience, and better project thinking.', author: 'Aman Joshi', role: '2nd Year IT' },
    { quote: 'Even as a beginner, the event environment felt welcoming and easy to join.', author: 'Divya Nair', role: '4th Year ECE' },
  ],
  faqs: [
    { question: 'Who can join Arena LPU?', answer: 'Any LPU student from any branch or year can join the club and participate in activities.' },
    { question: 'How does registration work?', answer: 'The team head enters details first, chooses the team size, reviews every participant, and then either completes payment for paid events or confirms a free registration.' },
    { question: 'Can students join solo?', answer: 'Yes. Solo registration works for the hackathon and is the default format for the free side events.' },
  ],
  contact: {
    heroTitle: 'Connect with the Arena LPU team.',
    heroCopy: 'For event support, partnerships, and club operations, use the channels below.',
    channels: [
      { label: 'General', title: 'Team Desk', description: 'Questions about registrations, schedules, and updates.' },
      { label: 'Partnerships', title: 'Collaborations', description: 'Brand partnerships, campus initiatives, and sponsorship discussions.' },
      { label: 'Response', title: 'Support Window', description: 'Most queries are reviewed within one business day.' },
    ],
    teamMembers: [
      { name: 'Aarav Malhotra', role: 'CEO', type: 'Core Leadership', email: 'ceo@arenalpu.org', phone: '+91 98765 10001' },
      { name: 'Nisha Verma', role: 'Co-Founder', type: 'Core Leadership', email: 'cofounder@arenalpu.org', phone: '+91 98765 10002' },
      { name: 'Arjun Mehta', role: 'President', type: 'Operations', email: 'arjun@arenalpu.org', phone: '+91 98765 10003' },
      { name: 'Priya Sharma', role: 'Vice President', type: 'Operations', email: 'priya@arenalpu.org', phone: '+91 98765 10004' },
      { name: 'Rohan Gupta', role: 'Tech Lead', type: 'Technology', email: 'rohan@arenalpu.org', phone: '+91 98765 10005' },
      { name: 'Sneha Patel', role: 'Events Head', type: 'Programs', email: 'sneha@arenalpu.org', phone: '+91 98765 10006' },
      { name: 'Karan Singh', role: 'Design Lead', type: 'Creative', email: 'karan@arenalpu.org', phone: '+91 98765 10007' },
      { name: 'Ananya Roy', role: 'PR & Outreach', type: 'Communications', email: 'ananya@arenalpu.org', phone: '+91 98765 10008' },
    ],
  },
  volunteer: { open: true, badge: 'Open Application Pool', intro: "Apply to join Arena's volunteer team when roles are open.", note: 'Roles include event operations, design, technical support, and outreach.' },
};

export { __dirname as serverDir, rootDir, publicDir, dataDir, contactsFile, siteContentFile, paymentSessionsFile, envFile };
