# Ca-Group-Project

## Arena LPU

A polished multi-page hackathon website with:

- frontend: HTML, CSS, JavaScript
- backend: Node.js, Express
- payments: Razorpay UPI QR for paid events
- storage: MongoDB for registrations/volunteers and in-memory runtime storage for site content, contacts, and payment sessions

## Project structure

- `public/index.html` home page
- `public/events.html` events page
- `public/gallery.html` gallery page
- `public/contact.html` contact page
- `public/volunteer.html` volunteer page
- `public/styles.css` shared frontend styling
- `public/script-home.js` shared theme/nav helpers + registration flow utilities
- `public/script-events.js` events page interactions + registration flow
- `public/script-gallery.js` gallery page interactions
- `public/script-contact.js` contact form behavior
- `public/script-volunteer.js` volunteer form behavior
- `backend/server.js` Express server, validation, registrations, and Razorpay routes

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
2. Create a `.env` file in the project root
3. Choose one database option:
	- Local MongoDB: ensure MongoDB is running locally
	- MongoDB Atlas: create a cluster and use your Atlas connection string
4. Add your MongoDB and Razorpay configuration in `.env`
5. Set allowed frontend origins
6. Run `npm run dev`
7. Open `http://localhost:3001`

## MongoDB Atlas quick setup

1. Create a cluster in MongoDB Atlas.
2. Create a database user (username/password).
3. In **Network Access**, allow your current IP (or `0.0.0.0/0` temporarily for testing).
4. In **Connect > Drivers**, copy the connection string and set it as `MONGODB_URI` in `.env`.
5. Keep `MONGODB_DATABASE=hacklpu` (or your preferred DB name).

Example:

`MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/hacklpu?retryWrites=true&w=majority`

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
- Paid registration uses real Razorpay by default. To force payment demo mode for local testing, set `DEMO_PAYMENT_MODE=true` in `.env`.
- Set `ALLOWED_ORIGINS` to your deployed frontend domain in production
- `MONGODB_URI` can be local (`mongodb://127.0.0.1:27017/hacklpu`) or Atlas (`mongodb+srv://...`)
- Registrations and volunteer applications are stored in MongoDB collections: `registrations` and `volunteers`
- If MongoDB is unavailable, the backend now stays up and safely uses in-memory fallback for registrations and volunteer applications
- Contacts, payment sessions, and site content are handled in runtime memory inside `backend/server.js` (not persisted across server restart)
