# Publishing My AI App for Free

Since your application uses a **React (Vite) frontend** and a **Node.js (Express) backend** with a **MongoDB database**, we can use the following free services to host it:

*   **Frontend**: Vercel or Netlify (Fast, automatic deployments)
*   **Backend**: Render or Railway (Free tier web services)
*   **Database**: MongoDB Atlas (Free Shared Tier)

---

## Phase 1: Local Preparation

Before we start, we need to ensure the app is ready for production.

### 1. Update the GitHub Repository
If you haven't already, push your code to a GitHub repository.
1. Create a repository on [GitHub](https://github.com/).
2. Initialize and push your local code.
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/your-repo-name.git
   git push -u origin main
   ```

### 2. Prepare the Backend for Production
Ensure that your `server` code uses a dynamic port provided by the environment.
I'll check your `server/server.js` or `server/app.js` and make sure it has:
```javascript
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
```

---

## Phase 2: Database Setup (MongoDB Atlas)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.
2. Create a new **Shared Cluster** (it's free).
3. Create a **Database User** with a password.
4. Add your **IP address** to the IP Access List (or allow access from anywhere `0.0.0.0/0` for production).
5. Copy your **Connection String**. It will look like: 
   `mongodb+srv://<db_user>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

---

## Phase 3: Backend Deployment (Render.com)

Render is one of the best free options for hosting Node.js servers.

1. Create an account at [Render](https://render.com/).
2. Select **New** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Language**: Node
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && node server.js`
5. Go to the **Environment** tab and add your `.env` variables from your local server folder:
   - `MONGODB_URI`: (Your Atlas connection string)
   - `JWT_SECRET`: (A secure random string)
   - `PORT`: 10000 (Render uses this by default)
6. Click **Deploy**.

---

## Phase 4: Frontend Deployment (Vercel)

Vercel is the easiest place to host Vite/React apps.

1. Go to [Vercel](https://vercel.com/) and connect your GitHub account.
2. Select **Add New** > **Project** and pick your repository.
3. Configure the settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variables**:
   - `VITE_API_URL`: The URL of your **Render backend** (e.g., `https://my-backend.onrender.com/api`)
5. Click **Deploy**.

---

## Phase 5: Final Wiring

Once both are deployed:
1. Update your **CORS configuration** in the backend (`server/app.js`) to allow requests from your Vercel URL.
2. If you find the backend "sleeps" (free Render services spin down after 15 mins of inactivity), the first request to the app might be slow. This is normal for free hosting.
