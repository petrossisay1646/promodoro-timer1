# 🍅 Pomodoro Timer

A modern, beautifully designed Pomodoro Timer web app built with pure HTML, CSS, and Vanilla JavaScript. Stay focused, track your sessions, and boost your productivity — all in a sleek, premium glassmorphic interface.

🚀 Live Demo

🔗 View Website: [(https://promodoro-timer1-1rshxpwz4-petros-sisay.vercel.app/)](https://promodoro-timer1-1rshxpwz4-petros-sisay.vercel.app)
---

## ✨ Features

- **25-Minute Focus Timer** — Classic Pomodoro countdown with large, readable display
- **Short & Long Breaks** — Automatic break scheduling (5-min short, 15-min long)
- **Session Tracking** — Tracks sessions completed and total focus time accumulated
- **Audio Notification** — Plays a sound when the timer reaches zero
- **Customizable Settings** — Adjust focus, short break, and long break durations
- **Persistent Stats** — Sessions and focus time saved to `localStorage` across page reloads
- **Modern UI** — Premium glassmorphism design with smooth animations and micro-interactions
- **Custom Confirmation Modal** — Stylish, animated modal replaces the browser's native alert for clearing stats

---

## 🖥️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure and semantic markup |
| CSS3 | Glassmorphism styling, animations, responsive layout |
| Vanilla JavaScript | Timer logic, state management, DOM manipulation |


---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher) — for the local dev server
- A modern browser (Chrome, Firefox, Edge, Safari)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/pomodoro-timer.git

# Navigate into the project directory
cd pomodoro-timer

# Install dev dependencies
npm install

# Start the local development server
npm run dev
```

Then open your browser and visit the URL shown in the terminal (usually `http://localhost:5173` or similar).

### Running Without Node.js

You can also just open `index.html` directly in any modern browser — no build step required.

---

## 📁 Project Structure

```
pomodoro-timer/
├── index.html      # App layout, modal markup, and settings panel
├── style.css       # All styles — glassmorphism, animations, responsive design
├── app.js          # Timer logic, event handling, localStorage persistence
├── package.json    # Dev server configuration
└── README.md       # You are here
```

---

## 🎯 How to Use

1. **Start the Timer** — Click the **Start** button to begin your 25-minute focus session.
2. **Pause / Resume** — Click the button again to pause mid-session.
3. **Reset** — Click **Reset** to restart the current mode's timer.
4. **Break Modes** — Use the **Short Break** and **Long Break** buttons to switch modes.
5. **Settings** — Click the ⚙️ gear icon to customize timer durations.
6. **Stats** — Your completed sessions and total focus time are shown at the bottom.
7. **Clear Stats** — Click the trash icon to reset your stats (a confirmation modal will appear).

---

## ⚙️ Settings

| Setting | Default | Description |
|---|---|---|
| Focus Duration | 25 min | Length of each Pomodoro session |
| Short Break | 5 min | Length of short breaks |
| Long Break | 15 min | Length of long breaks |

Settings are saved automatically to `localStorage`.

---

## 🔔 Notifications

When the timer reaches zero:
- An audio chime plays in the browser
- The tab title updates to alert you
- The timer automatically stops (or advances to the next phase)

> **Note:** Browser audio requires a user interaction before it can play. Click Start at least once before expecting audio to work.

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a pull request

---

<p align="center">
  Built with ❤️ and focused energy. Stay in the zone. 🍅
</p>
