# MongoDB Connection Troubleshooting Guide

## Error Analysis
Your error: `Error: querySrv ECONNREFUSED _mongodb._tcp.cluster0.idpiqcz.mongodb.net`

This means your application cannot reach the MongoDB Atlas cluster. Here's how to fix it:

---

## Step 1: Verify MongoDB Atlas Cluster Status
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Login to your account
3. Check your `Cluster0` status:
   - ✅ Should be **GREEN** (running/available)
   - ❌ If PAUSED or OFFLINE, click **Resume** to start it

---

## Step 2: Check IP Whitelist
MongoDB Atlas only allows connections from specific IP addresses.

1. Go to Atlas Dashboard → Your Project → **Network Access**
2. Check the **IP Whitelist** (now called "Network Access")
3. Look for your IP address:
   - ❌ If your IP is NOT listed, add it:
     - Click **+ Add IP Address**
     - You can:
       - Add specific IP: Use `What is my IP` search to find yours
       - OR Allow any IP: Use `0.0.0.0/0` (⚠️ Only for development, NOT production)
4. If you're on a **dynamic IP** (WiFi/mobile), use `0.0.0.0/0` for development

---

## Step 3: Verify Credentials
Check your `.env` file MongoDB URL matches your Atlas database user:

1. Atlas Dashboard → **Database** → **Connect**
2. Click **Drivers** 
3. Select **Node.js** and copy the connection string
4. Replace the username and password in your `.env`:
   ```
   MONGODB_URL=mongodb+srv://<USERNAME>:<PASSWORD>@cluster0.idpiqcz.mongodb.net/?appName=Cluster0
   ```

---

## Step 4: Test Connection (Optional)
Create a test file to verify the connection:

```javascript
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log("✅ Connected!"))
  .catch(err => console.error("❌ Error:", err.message));
```

---

## Quick Checklist
- [ ] Cluster0 is running (not paused)
- [ ] Your IP address is whitelisted
- [ ] Username and password in .env are correct
- [ ] .env file is in `backend/` folder
- [ ] No special characters in password needing URL encoding

---

## Still Having Issues?
- **Check internet connection** - Can you browse the web?
- **Try from Mobile Hotspot** - If WiFi fails, DNS might be blocked
- **Check Firewall/VPN** - Some networks block MongoDB ports
- **Restart Backend** - After making changes: `npm run dev`

---

*Fixed: Added proper error throwing in `backend/config/db.js` and connection options*
