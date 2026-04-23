# Ca-Group-Project

## Arena LPU

A polished multi-page hackathon website with:

- frontend: HTML, CSS, JavaScript
- backend: Node.js, Express
- payments: Razorpay UPI QR for paid events
- storage: MongoDB for registrations/volunteers and JSON files for site content, contacts, and payment sessions

## Project structure

- `public/index.html` home page
- `public/events.html` events page
- `public/gallery.html` gallery page
- `public/contact.html` contact page
- `public/styles.css` shared frontend styling
- `public/script.js` shared frontend behavior and registration flow
- `backend/server.js` Express server, validation, registrations, and Razorpay routes
- `.env.example` sample environment configuration

## What's improved

- paid and free events now use different registration flows
- Razorpay keys move to environment variables instead of hardcoded source
- contact form submissions save on the backend
- successful free and paid registrations are persisted in MongoDB
- volunteer applications are persisted in MongoDB
- paid events use single-use UPI QR sessions with server-side verification
- event pricing and team-size rules are enforced on the server

## Setup

1. Run `npm install`
2. Copy `.env.example` to `.env`
3. Ensure MongoDB is running locally (or provide a remote MongoDB URI)
4. Add your MongoDB and Razorpay configuration in `.env`
5. Set allowed frontend origins
6. Run `npm run dev`
7. Open `http://localhost:3001`

## Routes

- `GET /api/health`
- `POST /api/contact`
- `POST /api/register-free`
- `POST /api/create-upi-session`
- `GET /api/payment-status/:sessionId`
- `POST /api/payment-session/:sessionId/cancel`
- `POST /api/razorpay/webhook`

## Notes

- Use Razorpay test credentials first
- Set `ALLOWED_ORIGINS` to your deployed frontend domain in production
- `MONGODB_URI` defaults to `mongodb://127.0.0.1:27017/hacklpu`, which works with local MongoDB and Compass
- Registrations and volunteer applications are stored in MongoDB collections: `registrations` and `volunteers`
- Contacts, payment sessions, and site content remain in `backend/data` JSON files
