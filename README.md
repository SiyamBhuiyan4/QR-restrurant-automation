# 🍽️ SmartDine — Local-First / Offline-First Smart Restaurant Ordering System

A 100% free, local-first restaurant table ordering system built to run directly on your local computer and restaurant Wi-Fi router without needing cloud hosting, paid VPS, or an active internet connection.

---

## 🌟 Key Features

1. **Table-Specific QR Code Detection**:
   - Each table has a unique QR code pointing to `https://<YOUR-LAN-IP>:3000/?table=X`.
   - The app automatically detects the table number on scan, or prompts customer to pick if visited directly.

2. **Offline-First PWA (Progressive Web App)**:
   - Full offline caching using Workbox Service Worker and IndexedDB (`smartdine_offline_db`).
   - Customers can browse food categories, view high-res food images, read descriptions, and add items to their cart even if the Wi-Fi drops.
   - If offline when pressing "Place Order", the order is safely queued in IndexedDB and automatically syncs to the kitchen the instant the phone reconnects to the restaurant Wi-Fi.

3. **Customer Voice & Text Customization**:
   - Customers can record custom voice instructions for the chef (e.g., *"Make it extra crispy, sauce on the side"*) with live audio waveform and time limits.
   - Per-dish custom text notes (e.g., *"No onions, less spicy"*).

4. **Kitchen Display System (KDS)**:
   - Real-time dark mode display for kitchen tablets/monitors (`/kds`).
   - Synthesizes a pleasant Web Audio chime bell on incoming orders (zero external MP3 files needed).
   - Shows table number, order urgency timer (green $\rightarrow$ yellow $\rightarrow$ pulsing red after 20m), dish items, custom text notes, and an inline audio player for customer voice notes.
   - One-tap status progression: *Pending* $\rightarrow$ *Preparing* $\rightarrow$ *Ready* $\rightarrow$ *Served*.

5. **Waiter Calling Bell**:
   - Floating "Call Waiter" button on the customer menu with 1-tap presets: *💧 Water Refill*, *🧻 Napkins / Tissue*, *🍴 Extra Cutlery*, *💳 Request Bill / Check*, and *🙋 Staff Assistance*.
   - Dedicated Waiter Dashboard (`/waiter`) with counter bell alert sound and visual urgency alerts for requests waiting over 3 minutes.

6. **Admin Dashboard & Printable QR Code Generator**:
   - Live restaurant KPIs (active orders, revenue, table traffic, waiter requests).
   - Categorized Menu Manager to add dishes, update prices, and toggle in-stock/out-of-stock switches.
   - Batch Table QR Generator to input table ranges (e.g. Tables 1 to 20), preview stylish QR stickers, and click "Print Stickers" for printable A4 sticker sheets.

---

## 🚀 Quick Start Guide

### 1. Start the Server
From the project folder, simply run:
```bash
npm start
```

The server automatically:
- Detects your Mac's LAN IP (e.g., `192.168.1.100`).
- Generates a local SSL certificate for secure LAN access.
- Initializes the SQLite database (`server/restaurant.db`) and seeds 20 realistic dishes.
- Serves both the backend API and the frontend PWA on port `3000`.

### 2. Accessing the System
| Role | Local URL | Network / Phone URL (LAN Wi-Fi) |
| :--- | :--- | :--- |
| **Customer Menu** | [https://localhost:3000/?table=1](https://localhost:3000/?table=1) | `https://192.168.1.100:3000/?table=1` |
| **Kitchen Display (KDS)** | [https://localhost:3000/kds](https://localhost:3000/kds) | `https://192.168.1.100:3000/kds` |
| **Waiter Calling Panel** | [https://localhost:3000/waiter](https://localhost:3000/waiter) | `https://192.168.1.100:3000/waiter` |
| **Admin Dashboard** | [https://localhost:3000/admin](https://localhost:3000/admin) | `https://192.168.1.100:3000/admin` |
| **Printable QR Generator** | [https://localhost:3000/qr](https://localhost:3000/qr) | `https://192.168.1.100:3000/qr` |

---

## 📱 Testing on Mobile Phones (Local Wi-Fi)

1. Connect your phone to the **same Wi-Fi router** as your computer.
2. Open your phone's browser (Safari or Chrome) and navigate to:
   ```text
   https://192.168.1.100:3000/?table=3
   ```
3. **One-Time SSL Acceptance**:
   - Because the server uses a local self-signed certificate, your browser will show a standard certificate warning.
   - Tap **"Advanced"** $\rightarrow$ **"Proceed to 192.168.1.100 (unsafe)"**.
   - *Why HTTPS?* Modern mobile browsers require HTTPS to allow **Microphone access** (voice notes) and **Service Worker PWA** offline installation!

---

## 🛠️ Tech Stack Details

- **Backend**: Node.js 24 + Express + Socket.IO
- **Database**: SQLite (Node 24 built-in `node:sqlite` in WAL mode)
- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide React
- **Offline & Cache**: `vite-plugin-pwa` (Workbox) + IndexedDB (`idb`)
- **Audio & Sound**: Web Audio API synthesis (zero MP3 files needed) + HTML5 `MediaRecorder`
- **QR Codes**: `qrcode` generator with high-resolution SVG/DataURL export
