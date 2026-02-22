# TarsChat — Real-time Live Chat App

A full-stack real-time messaging app built with:
- **Next.js 14** (App Router)
- **TypeScript**
- **Convex** (backend, database, realtime subscriptions)
- **Clerk** (authentication)
- **Tailwind CSS** + **shadcn/ui** inspired design

---

## Features Implemented

### Core (Required)
1. ✅ **Authentication** — Clerk sign-up/sign-in (email + social), user profile in Convex
2. ✅ **User List & Search** — Browse all users, live search by name
3. ✅ **1-on-1 Direct Messages** — Real-time messages via Convex subscriptions
4. ✅ **Message Timestamps** — Today → time only, older → date + time, different year → includes year
5. ✅ **Empty States** — Helpful messages when no conversations/messages/search results
6. ✅ **Responsive Layout** — Sidebar + chat on desktop; mobile toggles between sidebar and chat
7. ✅ **Online/Offline Status** — Green dot on avatar, updates in real time
8. ✅ **Typing Indicator** — Animated dots + "Alex is typing..." text, auto-clears after 2s
9. ✅ **Unread Message Count** — Badge on sidebar conversations, clears on open
10. ✅ **Smart Auto-Scroll** — Scrolls to latest message; shows "↓ New messages" if scrolled up

### Optional
11. ✅ **Delete Own Messages** — Shows "This message was deleted" in italics
12. ✅ **Message Reactions** — 👍 ❤️ 😂 😮 😢 with counts, toggle on/off
13. ⬜ **Loading & Error States** — Can extend with skeleton loaders
14. ✅ **Group Chat** — Create group conversations with name + multiple members

---

## Setup Instructions

### Step 1: Clone/Extract Project
```bash
cd tars-chat
npm install
```

### Step 2: Set Up Clerk
1. Go to https://dashboard.clerk.com and create a new application
2. Enable Email/Password and optionally Google OAuth
3. Copy your **Publishable Key** and **Secret Key**

### Step 3: Set Up Convex
```bash
npx convex dev
```
- This will open a browser to create a Convex project
- Copy the **Convex URL** it gives you

### Step 4: Configure Environment Variables
```bash
cp .env.local.example .env.local
```
Fill in `.env.local` with your actual keys from Step 2 and 3.

### Step 5: Deploy Convex Schema
The schema auto-deploys when you run `npx convex dev`. Keep that terminal running.

### Step 6: Run the App
In a second terminal:
```bash
npm run dev
```

Open http://localhost:3000 — it will redirect to `/sign-in`.

---

## Project Structure

```
tars-chat/
├── app/
│   ├── layout.tsx          # Root layout with Clerk + Convex providers
│   ├── page.tsx            # Redirects to /chat or /sign-in
│   ├── globals.css         # Tailwind + scrollbar styles
│   ├── chat/
│   │   └── page.tsx        # Protected chat page
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
├── components/
│   ├── ConvexClientProvider.tsx  # Wraps app with Convex client
│   ├── UserSyncProvider.tsx      # Syncs Clerk user → Convex on login
│   ├── ChatLayout.tsx            # Root layout: sidebar + chat area
│   ├── Sidebar.tsx               # Conversation list, user search, group creation
│   └── ChatWindow.tsx            # Message list, input, reactions, typing
├── convex/
│   ├── schema.ts           # Database schema (users, conversations, messages, etc.)
│   ├── users.ts            # User queries & mutations
│   ├── conversations.ts    # Conversation queries & mutations
│   └── messages.ts         # Message queries, mutations, typing, reactions
├── lib/
│   └── utils.ts            # Timestamp formatting utilities
├── middleware.ts            # Clerk route protection
└── .env.local.example      # Template for environment variables
```

---

## How the Real-time Works

Convex provides **live queries** — `useQuery()` hooks automatically re-render when data changes in the database. No websocket setup needed. When User A sends a message:
1. `sendMessage` mutation writes to Convex DB
2. User B's `useQuery(api.messages.getMessages)` instantly re-renders with the new message

Same for typing indicators and online status.

---

## Deployment (Vercel)

```bash
npm run build
```
Deploy to Vercel and add the same environment variables in the Vercel dashboard.
Convex auto-handles its own hosting — just make sure `npx convex deploy` is run for production.
