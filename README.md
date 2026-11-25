# Foodooza

Foodooza is a full-stack MERN food delivery platform with four distinct roles:

- `user` for browsing restaurants, placing orders, paying online or with cash on delivery, tracking deliveries, rating items, and reviewing restaurants
- `restaurant` for creating a shop, managing menu items, and updating order status
- `delivery` for accepting assignments, sharing live location, completing deliveries with OTP verification, and viewing daily earnings
- `admin` for managing users, shops, items, orders, and role/suspension controls

The project is split into a React + Vite frontend and an Express + MongoDB backend, with Socket.IO powering live order and location updates.

## Current Highlights

- Cookie-based JWT authentication
- Email OTP password reset flow
- Google sign-in and sign-up through Firebase Auth
- Smart search with debounced autocomplete and recent history
- Real-time order updates with Socket.IO and live ETA rebroadcasts
- Live delivery partner location tracking on maps
- Cash on delivery and Razorpay online payments
- Wallet payments, refunds, saved addresses, and scheduled orders
- FCM push notifications for order lifecycle updates
- AI-powered dish recommendations and smart coupon auto-apply
- Shop, item, favorite, coupon, review, analytics, and admin modules
- Role-aware dashboards for customer, restaurant owner, delivery partner, and admin
- Geo-based address lookup, shop availability checks, and map-driven checkout flow
- Dark mode with persistent theme preference

## Tech Stack

### Frontend

- React 19
- Vite
- Redux Toolkit
- React Router
- Axios
- Tailwind CSS v4
- Socket.IO Client
- Leaflet + React Leaflet
- Firebase Auth
- Recharts

### Backend

- Node.js
- Express 5
- MongoDB + Mongoose
- Socket.IO
- JWT + cookies
- Multer + Cloudinary
- Nodemailer
- Razorpay
- Helmet
- express-rate-limit
- express-mongo-sanitize
- node-cron

## Repository Structure

```text
Food-Delivery/
|- backend/
|  |- config/
|  |- controllers/
|  |- middlewares/
|  |- models/
|  |- routes/
|  |- utils/
|  |- index.js
|  |- seed.js
|  `- make-admin.js
|- frontend/
|  |- public/
|  |- src/
|  |  |- components/
|  |  |- context/
|  |  |- hooks/
|  |  |- pages/
|  |  `- redux/
|  `- vite.config.js
|- MONGODB_CONNECTION_FIX.md
`- README.md
```

## Architecture Overview

### Frontend

- `frontend/src/App.jsx` wires the authenticated routes and shared providers
- Redux stores user, cart, shop, order, and map state
- Socket context opens a live connection after login and identifies the current user
- Checkout uses Geoapify for geocoding and Leaflet for delivery location selection
- Order tracking listens for Socket.IO status and location updates

### Backend

- `backend/index.js` boots Express, Socket.IO, MongoDB, and admin bootstrap logic
- Authentication is cookie-based using a JWT stored as `token`
- Role access is enforced through `protectRoute` and `authorizeRoles`
- Orders support grouped shop orders, delivery assignment, OTP confirmation, and payment verification
- Admin endpoints expose overview stats plus moderation controls for users, shops, items, and orders

## Feature Breakdown

### Customer flow

- Sign up and sign in with email-password or Google
- Browse city-based shops and menu items
- Search items and filter by category, price, food type, and rating
- Use autocomplete search with recent search history
- Add and remove favorites
- Add to cart and place an order
- Choose COD, Razorpay online payment, or wallet payment
- Save delivery addresses and pick a default address at checkout
- Schedule orders up to 24 hours ahead
- Get best coupon auto-applied with optional manual override
- Track order progress and delivery partner location
- Cancel eligible orders and receive refunds through Razorpay or wallet credit fallback
- Receive push notifications for preparation, dispatch, and delivery
- Rate ordered items
- Leave one restaurant review per delivered order
- See AI-powered dish recommendations and wallet activity

### Restaurant flow

- Create or edit a shop with image upload
- Configure opening and closing times
- Add, edit, and delete menu items
- View incoming orders
- Toggle busy mode to temporarily stop taking new orders
- Update per-shop order status from `pending` to `preparing` to `out of delivery`
- Trigger nearby delivery assignment broadcast when an order is ready
- Review revenue, top items, and hourly order heatmaps on the analytics dashboard

### Delivery flow

- Register or log in as a delivery partner
- Receive live assignment broadcasts
- Accept one active assignment at a time
- Share live geolocation to connected clients
- Mark orders delivered using OTP verification
- View delivery counts, total earnings, average earnings, and range-based charts

### Admin flow

- View top-level counts for users, shops, items, orders, paid orders, and revenue
- Change user roles
- Suspend or unsuspend users
- Delete users, shops, items, and orders
- Clear all non-admin users

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm
- MongoDB Atlas or local MongoDB
- Cloudinary account for shop and item image uploads
- Firebase project for Google authentication
- Geoapify API key for address lookup
- Razorpay account for online payments
- SMTP email credentials for OTP emails

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Food-Delivery
```

### 2. Install dependencies

The repo does not use a root workspace package. Install frontend and backend separately.

```bash
cd backend
npm install
```

```bash
cd ../frontend
npm install
```

## Environment Variables

Create `backend/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development

MONGODB_URL=mongodb+srv://<user>:<password>@<cluster>/<db>
JWT_SECRET=replace_with_a_long_random_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

EMAIL=your_smtp_email
EMAIL_PASS=your_smtp_app_password

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

GEMINI_API_KEY=your_gemini_api_key
FIREBASE_SERVER_KEY=your_firebase_cloud_messaging_server_key

TRAFFIC_PROVIDER=osrm
TRAFFIC_CACHE_TTL_MS=15000
TRAFFIC_REQUEST_TIMEOUT_MS=5000

ADMIN_EMAIL=admin@example.com
ADMIN_PASS=change_me_securely
```

Create `frontend/.env`:

```env
VITE_SERVER_URL=http://localhost:5000
VITE_GEOAPIKEY=your_geoapify_api_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

VITE_FIREBASE_APIKEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_FIREBASE_VAPID_KEY=your_web_push_vapid_key
```

### Notes on env setup

- `MONGODB_URL` is required. The backend exits immediately if it is missing.
- `CLIENT_URL` must match the frontend URL so cookies and Socket.IO CORS work correctly.
- Cloudinary credentials are effectively required for shop and item image uploads.
- `EMAIL` and `EMAIL_PASS` are required for forgot-password OTP and delivery OTP email flows.
- Razorpay keys are optional only if you are happy to disable online payments. The checkout page automatically falls back to COD when the server reports payments are unavailable.
- `GEMINI_API_KEY` powers the personalized recommendations endpoint. This project currently uses Gemini because that API key was supplied for the feature work.
- `FIREBASE_SERVER_KEY` is required on the backend to send FCM push notifications.
- `VITE_FIREBASE_VAPID_KEY` is required on the frontend to register browser push tokens.
- `TRAFFIC_PROVIDER`, `TRAFFIC_CACHE_TTL_MS`, and `TRAFFIC_REQUEST_TIMEOUT_MS` control ETA lookup behavior.
- Firebase values are recommended even though the frontend currently contains fallback config values.
- `ADMIN_EMAIL` and `ADMIN_PASS` are optional. If provided, the backend attempts to bootstrap an admin account on startup.

## Running the App

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

## Available Scripts

### Backend

- `npm run dev` - start the API with Nodemon
- `npm run seed` - run the seed script
- `npm run make-admin` - manually create an admin user

### Frontend

- `npm run dev` - start the Vite dev server
- `npm run build` - create a production build
- `npm run lint` - run ESLint
- `npm run preview` - preview the production build locally

## API Modules

The backend mounts these route groups:

- `/api/auth` - signup, signin, signout, Google auth, forgot-password OTP flow
- `/api/user` - current user, location update, saved addresses CRUD, and AI recommendations
- `/api/shop` - create or edit shop, fetch own shop, fetch shops by city, busy mode, and analytics
- `/api/item` - add, edit, delete, search, fetch by city or shop, and rate items
- `/api/order` - payment config, place order, verify payment, scheduled activation, order history, cancellation, delivery assignment, tracking, and delivery OTP
- `/api/favorite` - favorite management
- `/api/coupon` - create, validate, fetch active coupons, and fetch the best eligible coupon
- `/api/admin` - admin overview and moderation endpoints
- `/api/delivery` - delivery partner registration, login, availability, assigned orders, and earnings analytics
- `/api/search` - smart search across restaurants and items
- `/api/wallet` - wallet balance and wallet transaction history
- `/api/notifications` - FCM token registration
- `/api/reviews` - create, update, delete, and fetch restaurant reviews

### Notable New Endpoints

- `GET /api/search?q=<term>&city=<city>` - fuzzy search for items and restaurants
- `POST /api/notifications/token` - register an FCM token for the current user
- `GET /api/wallet/balance` - fetch the current wallet balance
- `GET /api/wallet/transactions` - fetch wallet transaction history
- `POST /api/order/:id/cancel` - cancel an eligible order and trigger refund handling
- `GET /api/delivery/earnings?range=today|week|month` - delivery partner earnings summary and chart data
- `GET /api/shop/analytics?range=week|month` - restaurant analytics

## Data Models

Core collections in the backend:

- `User`
- `Shop`
- `Item`
- `Order`
- `DeliveryAssignment`
- `Favorite`
- `Coupon`
- `Review`

## Real-Time Events

Socket.IO is used for:

- user identity registration after login
- live delivery location broadcast
- live ETA updates to customers
- new order notifications to restaurant owners
- shop order status changes
- order delivery status updates
- delivery assignment broadcasts

## Important Project Notes

- The backend accepts both legacy role names (`owner`, `deliveryBoy`) and canonical role names (`restaurant`, `delivery`), then normalizes them internally.
- Live ETA now uses `backend/utils/trafficEta.js`, driver coordinates, and a one-minute rebroadcast loop.
- Scheduled orders are activated every minute by a cron job once their `scheduledFor` time arrives.
- Shop and item schemas now include the requested production indexes for search, geo queries, and order lookups.
- There is no automated test suite configured in the root project right now.
- If MongoDB connection issues appear during setup, see `MONGODB_CONNECTION_FIX.md`.

## Suggested Local Workflow

1. Start MongoDB or confirm your Atlas connection string works.
2. Run the backend and verify it connects successfully.
3. Run the frontend and create accounts for each role you want to test.
4. Use `ADMIN_EMAIL` and `ADMIN_PASS` or `npm run make-admin` to access admin features.
5. Add a shop and items before testing customer checkout flows.

## Author

Sourav Chowdhury

- GitHub: <https://github.com/sourav81R>
- Portfolio: <https://sourav.is-a.dev>
- LinkedIn: <https://www.linkedin.com/in/souravchowdhury-2003r>
