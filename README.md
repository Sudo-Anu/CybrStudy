# CybrStudy

> A beautifully designed, human-centric Study Material Platform hosted on GitHub Pages.

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend Framework | React 19 + Vite | Fast builds, SPA routing, GitHub Pages compatible |
| Styling | Vanilla CSS (custom design system) | Full control, zero runtime cost |
| Database / BaaS | Firebase Firestore | Real-time, SDK works from static sites |
| Authentication | Firebase Auth (Email/Password) | Secure, no server needed |
| File Storage | Google Drive (via Apps Script proxy) | Free, private, hides admin identity |
| PDF Preview | pdfjs-dist | In-browser, no download required |
| Routing | React Router v6 | Hash routing for GitHub Pages |

---

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/CybrStudy.git
cd CybrStudy
npm install
```

### 2. Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (disable Google Analytics for simplicity)
3. Go to **Build → Firestore Database** → Create database (start in **production mode**)
4. Go to **Build → Authentication** → Sign-in method → Enable **Email/Password**
5. Create an admin user via the Firebase console (Authentication → Add user)
6. Go to **Project Settings** → copy your Web App config keys

### 3. Configure Firestore Security Rules

Go to Firestore → Rules and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read sections and files (public content)
    match /sections/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /files/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 4. Set Up Google Drive Proxy (Apps Script)

1. Go to [script.google.com](https://script.google.com) → New Project
2. Paste the contents of `src/services/AppScript_DriveProxy.js`
3. Click **Deploy → New Deployment → Web App**
   - Execute as: **Me** (your Google account)
   - Who has access: **Anyone**
4. Copy the deployment URL and add it to your `.env` file

### 5. Configure Environment Variables

```bash
cp .env.example .env
# Fill in your values in .env
```

### 6. Configure GitHub Secrets (for CI/CD Deploy)

In your GitHub repository → **Settings → Secrets and variables → Actions**, add:

| Secret Name | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |
| `VITE_GDRIVE_PROXY_URL` | Your Apps Script Web App URL |

### 7. Deploy to GitHub Pages

The `.github/workflows/deploy.yml` will auto-deploy on every push to `main`.

Enable GitHub Pages: **Settings → Pages → Source: GitHub Actions**

---

## Admin Access

The admin panel is intentionally hidden from all navigation.

Access it at: `https://YOUR_USERNAME.github.io/CybrStudy/#/admin-portal-xyz`

*(Change the route in `vite.config.js` → `VITE_ADMIN_ROUTE` to something unique)*

---

## Folder Structure

```
CybrStudy/
├── .github/
│   └── workflows/
│       └── deploy.yml           # Auto-deploy to GitHub Pages
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── Layout.jsx
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Spinner.jsx
│   │   │   └── Toast.jsx
│   │   ├── sections/
│   │   │   ├── SectionTree.jsx  # Recursive section renderer
│   │   │   └── SectionNode.jsx  # Single node with expand/collapse
│   │   ├── files/
│   │   │   ├── FileGrid.jsx
│   │   │   ├── FileCard.jsx
│   │   │   └── MediaPreview.jsx # PDF.js + image previewer
│   │   └── admin/
│   │       ├── SectionManager.jsx
│   │       ├── FileUploader.jsx
│   │       └── AdminDashboard.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── BrowsePage.jsx
│   │   ├── AdminLoginPage.jsx
│   │   └── AdminPage.jsx
│   ├── services/
│   │   ├── firebase.js          # Firebase init + Firestore helpers
│   │   ├── driveService.js      # Google Drive proxy calls
│   │   └── authService.js       # Firebase Auth helpers
│   │   AppScript_DriveProxy.js  # Paste into Google Apps Script
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── ToastContext.jsx
│   ├── hooks/
│   │   ├── useSections.js
│   │   └── useFiles.js
│   ├── styles/
│   │   ├── index.css            # Design system tokens + global styles
│   │   ├── components.css       # Shared component styles
│   │   └── admin.css            # Admin-specific styles
│   ├── utils/
│   │   └── helpers.js
│   ├── App.jsx
│   └── main.jsx
├── public/
│   └── 404.html                 # SPA fallback for GitHub Pages
├── .env.example
├── .gitignore
├── index.html
├── vite.config.js
└── README.md
```
