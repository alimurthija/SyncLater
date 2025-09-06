# SyncLater
SynergySphere
A full-stack real-time video meeting application with AI features, built using React + Vite + TypeScript (frontend) and Node.js + Express + PostgreSQL + Drizzle ORM (backend).

🚀 Features
Real-time 1:1 video calls with WebRTC and WebSockets
AI-powered transcription & summarization using OpenAI
Team collaboration tools (chat, tasks, leave requests, mood tracking)
Gamification (points, streaks, badges)
Authentication & session management
Responsive UI with shadcn/ui + TailwindCSS
PostgreSQL database with Drizzle ORM

📦 Dependencies
Frontend
React 18 (react, react-dom)
Vite (bundler) + @vitejs/plugin-react
TypeScript
TailwindCSS + @tailwindcss/typography + tailwindcss-animate + tw-animate-css
Shadcn/ui components (based on Radix UI):
@radix-ui/react-* (accordion, dialog, dropdown, tooltip, etc.)
TanStack Query (@tanstack/react-query)
Wouter (lightweight router)
Framer Motion (animations)
Lucide-react (icons)
React-hook-form + @hookform/resolvers
Recharts (charts/graphs)
date-fns, clsx, class-variance-authority, tailwind-merge
Backend
Express
express-session
connect-pg-simple
passport + passport-local
ws (WebSocket server)
socket.io (real-time events)
memorystore (session store)
OpenAI SDK (openai)
drizzle-orm + drizzle-kit + drizzle-zod
zod + zod-validation-error
Development Tools
Vite
esbuild
tsx
PostCSS
autoprefixer
TypeScript

⚙️ Setup
1. Clone & Install
git clone <your-repo-url>
cd synergy-sphere
npm install
2. Environment Variables
Create a .env file with:
DATABASE_URL=postgresql://user:password@localhost:5432/synergy
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=supersecretkey
3. Database Migration
npm run db:push
4. Development
Start both frontend & backend:
npm run dev
5. Production Build
npm run build
npm start


📂 Project Structure
.
├── client/                # React frontend
│   ├── src/
│   ├── index.css          # TailwindCSS entry
│   └── ...
├── server/                # Express backend
│   ├── index.ts
│   └── ...
├── components.json        # shadcn/ui config
├── tailwind.config.ts
├── postcss.config.js
├── package.json
└── replit.md              # Project overview

  
🛠️ Scripts
npm run dev → Start development (frontend + backend)
npm run build → Build production frontend & backend
npm start → Run production server
npm run check → Type-check
npm run db:push → Push database schema with Drizzle
