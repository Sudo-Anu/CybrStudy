# CybrStudy — Project Architecture & Setup Guide

## Design Preview

![CybrStudy UI Preview](C:\Users\Aniruddha Raut\.gemini\antigravity-ide\brain\356908d5-adc7-4a8f-936b-cdf4e44d77fb\cybrstudy_ui_preview_1790517995312.jpg)

---

## 1. Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| **Frontend** | React 19 + Vite 8 | SPA, static output, fast builds |
| **Routing** | React Router v6 (HashRouter) | GitHub Pages needs hash-based routing |
| **Styling** | Vanilla CSS Design System | Full control, zero runtime overhead |
| **Database** | Firebase Firestore | Real-time, SDK works from static sites |
| **Auth** | Firebase Auth (Email/Password) | Secure admin login, no server needed |
| **File Storage** | Google Drive via Apps Script | Free, keeps OAuth server-side |
| **Hosting** | GitHub Pages | Free, deploys from GitHub Actions |
| **Deploy CI** | GitHub Actions | Injects secrets at build time |

---

## 2. File Structure

```
CybrStudy/
├── .github/workflows/deploy.yml    ← Auto-deploy to GitHub Pages
├── public/
│   ├── 404.html                    ← SPA fallback for direct URL access
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx          ← Sticky glassmorphism header
│   │   │   ├── Sidebar.jsx         ← Recursive section nav (infinite depth)
│   │   │   └── Layout.jsx          ← Shell: header + sidebar + main
│   │   ├── ui/
│   │   │   ├── Modal.jsx           ← Accessible modal (Esc close, scroll lock)
│   │   │   └── Spinner.jsx
│   │   ├── files/
│   │   │   ├── FileGrid.jsx        ← Responsive card grid + delete for admin
│   │   │   └── MediaPreview.jsx    ← Full-screen PDF/image overlay (Drive iframe)
│   │   └── admin/
│   │       ├── SectionManager.jsx  ← Recursive CRUD tree (infinite subsections)
│   │       └── FileUploader.jsx    ← Drag-drop + progress + Drive upload
│   ├── pages/
│   │   ├── HomePage.jsx            ← Hero, section cards, features strip
│   │   ├── BrowsePage.jsx          ← Breadcrumbs, subsection cards, file grid
│   │   ├── AdminLoginPage.jsx      ← Firebase Auth login form
│   │   └── AdminPage.jsx           ← Full dashboard (sections + upload tabs)
│   ├── services/
│   │   ├── firebase.js             ← Firestore helpers + real-time subscriptions
│   │   ├── authService.js          ← Firebase Auth helpers
│   │   ├── driveService.js         ← Drive proxy calls (upload/delete/URL)
│   │   └── AppScript_DriveProxy.js ← Paste into Google Apps Script
│   ├── context/
│   │   ├── AuthContext.jsx         ← Real-time auth state
│   │   └── ToastContext.jsx        ← Toast notification system
│   ├── hooks/
│   │   ├── useSections.js          ← Real-time Firestore + buildTree()
│   │   └── useFiles.js             ← Real-time files per section
│   ├── styles/
│   │   ├── index.css               ← Design tokens, typography, animations
│   │   ├── components.css          ← Buttons, cards, modals, toasts, preview
│   │   └── admin.css               ← Admin layout, section tree, dropzone
│   ├── utils/helpers.js
│   ├── App.jsx                     ← HashRouter + all routes
│   └── main.jsx
├── .env.example                    ← Template (never commit .env)
├── .gitignore
├── vite.config.js
└── README.md
```

---

## 3. Security Architecture

### How API Keys Stay Hidden

```
┌─────────────────────────┐    Build time only    ┌──────────────────────────────┐
│   GitHub Repository     │ ─────────────────────→ │  GitHub Actions Runner       │
│                         │                         │  Reads GitHub Secrets        │
│  .env.example (public)  │                         │  Injects as VITE_* env vars  │
│  Source code (public)   │                         │  → npm run build             │
└─────────────────────────┘                         └──────────────────────────────┘
                                                                │
                                                                ▼
                                                    ┌──────────────────────────────┐
                                                    │  dist/ (static HTML/JS/CSS)  │
                                                    │  Keys baked in as literals   │
                                                    │  Deployed to GitHub Pages    │
                                                    └──────────────────────────────┘
```

> [!IMPORTANT]
> Firebase keys embedded in the client bundle are **normal and safe** — they are restricted by Firestore Security Rules. Only authenticated admins can write data. The rules you configure are the actual security boundary.

### Google Drive — Zero Client-Side Credentials

```
Browser                Apps Script (your Google Account)
  │                            │
  │  POST { action, fileData } │
  │ ─────────────────────────→ │  ← OAuth runs here, as YOU
  │                            │  ← Your Drive, your auth
  │  { fileId, viewUrl }       │
  │ ←───────────────────────── │
```

**Your Google OAuth tokens never leave Google's servers.**

---

## 4. Setup Steps (Quick Reference)

### Step 1 — Firebase

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore** (production mode) and **Authentication** (Email/Password)
3. Create admin user: Authentication → Add user
4. Set Firestore Security Rules (see README)
5. Copy Web App config keys

### Step 2 — Google Drive Proxy

1. Open [script.google.com](https://script.google.com) → New Project
2. Replace all code with contents of [`AppScript_DriveProxy.js`](file:///c:/Users/Aniruddha Raut/Documents/Projects/CybrStudy/src/services/AppScript_DriveProxy.js)
3. Deploy → New Deployment → Web App
   - Execute as: **Me**
   - Access: **Anyone**
4. Copy the Web App URL

### Step 3 — Local .env

```bash
cp .env.example .env
# Fill in Firebase keys + Apps Script URL
```

### Step 4 — GitHub Secrets

Settings → Secrets → Actions → Add each `VITE_*` variable:

| Secret | Value |
|---|---|
| `VITE_FIREBASE_API_KEY` | From Firebase console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_GDRIVE_PROXY_URL` | Apps Script web app URL |

### Step 5 — Enable GitHub Pages

Settings → Pages → Source: **GitHub Actions**

### Step 6 — Set Your Repo Name in vite.config.js

```js
base: '/CybrStudy/',  // ← Change to your GitHub repo name
```

---

## 5. Admin Access

> [!CAUTION]
> **Never link to this URL from the public site.** It is hidden by design.

Access at: `https://YOUR_USERNAME.github.io/CybrStudy/#/login`

Or locally: `http://localhost:5173/#/login`

To **customize the path**, set `VITE_ADMIN_ROUTE` in `.env`:
```env
VITE_ADMIN_ROUTE=/login
```

---

## 6. Infinite Depth Sections — How It Works

Sections use a **flat list + parentId** pattern in Firestore. The `buildTree()` function in [`useSections.js`](file:///c:/Users/Aniruddha Raut/Documents/Projects/CybrStudy/src/hooks/useSections.js) converts it to a tree at runtime.

```
Firestore `sections` collection:
  { id: "A", name: "Semester 1", parentId: null }
  { id: "B", name: "Mathematics", parentId: "A" }
  { id: "C", name: "Calculus",    parentId: "B" }
  { id: "D", name: "Chapter 1",   parentId: "C" }
  ↓ buildTree()
  Semester 1
    └── Mathematics
          └── Calculus
                └── Chapter 1  (infinite depth ✓)
```

The [`SectionManager.jsx`](file:///c:/Users/Aniruddha Raut/Documents/Projects/CybrStudy/src/components/admin/SectionManager.jsx) `<SectionNode>` component renders itself recursively, so any depth is supported with no code changes.

---

## 7. Run Locally

```bash
npm install
cp .env.example .env   # Fill in values
npm run dev
```

Open: `http://localhost:5173/`  
Admin: `http://localhost:5173/#/login`
