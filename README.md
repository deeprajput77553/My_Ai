# 🚀 MY AI - Full Stack Project

A powerful AI assistant application featuring real-time chat, file analysis (PDF/DOCX), automated notes generation, and web-enhanced search capabilities.

---

## 🛠 Prerequisites

- **Node.js:** version 18 (Recommended)
- **Database:** MongoDB (Local or Atlas)
- **API Keys:** Nvidia NIM API Key (Optional, for fallback check `.env`)

---

## 📥 Installation Steps

### 1. Environment Configuration
Navigate to the `server` directory and create a `.env` file based on your credentials:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
NVIDIA_API_KEY_CHAT=your_nvidia_key
NVIDIA_API_KEY_CODE=your_nvidia_key
```

### 2. Install All Modules
To install all dependencies for both Frontend and Backend in one go, run:
```bash
# From the root directory:
cd client && npm install && cd ../server && npm install && cd ..
```

---

## 📱 Termux (Android) Special Instructions

If you are running this on **Termux**, follow these specific steps to ensure compatibility:

### 1. Install Build Tools
Required for processing binary files and some node modules:
```bash
pkg update && pkg upgrade
pkg install git python build-essential binutils
```

### 2. Downgrade/Set Node Version (v18)
If you have a newer version and need to switch:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

---

## 🚀 Running the Project

You need to run both the server and the client simultaneously.

### Start the Backend Server:
```bash
cd server
npm run dev
```

### Start the Frontend Client:
```bash
cd client
npm run dev
```
*Note: If accessing from another device on the same network, use `npm run dev -- --host`.*

---

## 📦 Key Included Modules
*   **PDF/Docx Support:** `jspdf`, `html2canvas`, `mammoth`, `pdfjs-dist`
*   **UI/UX:** `react-markdown`, `remark-gfm`, `@hello-pangea/dnd`
*   **Backend:** `express`, `mongoose`, `bcryptjs`, `multer`