# 🍕 Foodooza - Real-Time Food Delivery App  

**Foodooza** is a **real-time food delivery web application** built using the **MERN stack (MongoDB, Express.js, React, Node.js)**.  
It allows users to browse restaurants, order food, and track delivery status live — all within a modern, responsive, and interactive interface.  
The app also includes an **admin panel** for managing orders, restaurants, and users efficiently.

---

## 🚀 Features

- 🍽️ Browse Restaurants and Menus  
- 🛒 Add to Cart & Checkout  
- 💳 Online Payment Integration (Stripe / Razorpay)  
- 🚴‍♂️ Real-Time Order Tracking (Socket.io)  
- 👤 User Authentication (JWT / Cookies)  
- 🧑‍🍳 Admin Dashboard for Restaurant Owners  
- 📱 Fully Responsive UI  
- ⚡ Instant Updates using Socket.io  
- ☁️ Cloud Image Uploads (Cloudinary or Multer)

---

## 🛠️ Tech Stack

**Frontend:**
- React.js (Vite)
- Redux Toolkit / Context API
- Axios
- Tailwind CSS
- React Router DOM
- Framer Motion
- Socket.io Client

**Backend:**
- Node.js
- Express.js
- MongoDB + Mongoose
- Socket.io
- Multer (for image uploads)
- bcrypt, jsonwebtoken, dotenv, cookie-parser
- Cloudinary (optional for images)

**Deployment:**
- Frontend → Render / Vercel  
- Backend → Render / Railway  
- Database → MongoDB Atlas  

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/sourav81R/foodooza.git
cd foodooza

cd backend
npm install

cd ../frontend
npm install

PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

cd backend
npm run dev

cd ../frontend
npm run dev

```
Then open 👉 http://localhost:5173
 in your browser.
 
# 👨‍💻 Author

## [Sourav Chowdhury](https://github.com/sourav81R)
[📧 Email](souravchowdhury0203@gmail.com)
[🌐 Portfolio](https://sourav.is-a.dev)
[🔗 LinkedIn](https://www.linkedin.com/in/souravchowdhury-2003r)

