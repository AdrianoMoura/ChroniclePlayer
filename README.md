# Chronicle

> **YouTube, before the algorithm.**

*A desktop YouTube client that brings back the experience of opening YouTube and simply seeing the channels you chose to follow.*

<p align="center">
  <em>(Screenshots coming soon)</em>
</p>

---

## Why Chronicle exists

I built Chronicle because I realized I no longer enjoyed opening YouTube.

Instead of seeing the creators I intentionally subscribed to, I was immediately confronted with an endless stream of recommendations competing for my attention. Even when I knew exactly what I wanted to watch, I had to fight through a homepage designed to convince me otherwise.

I wanted something simpler.

Open the application.

See every new upload from my subscriptions.

Watch what interests me.

Close it.

Nothing more.

Chronicle is the application I wanted to use every day, so I built it.

I've been daily-driving it throughout development, continuously adjusting small interactions, removing friction, and experimenting with features until the experience feels right to me. Every improvement comes from actually living with the product instead of designing it in theory.

My hope is that what works well for me will also be useful for people who miss the YouTube experience before recommendation algorithms became the center of the platform.

---

## What Chronicle is

Chronicle is **not** a YouTube replacement.

It is a different client for consuming YouTube.

Your subscriptions are presented in strict chronological order, grouped into **Today**, **Yesterday**, **This Week**, and **Earlier**.

There is:

* no algorithmic Home feed
* no recommendation engine
* no endless content after you're caught up
* no autoplay leading into unrelated videos

When there are no new videos, Chronicle simply tells you that you're caught up.

That's the end.

Whenever you want something specific, you can still:

* search the entirety of YouTube
* open any YouTube URL
* watch videos using the official YouTube player
* support creators exactly as you normally would

Chronicle removes the algorithm's choices.

It never removes yours.

---

## Philosophy

The governing principle of Chronicle is:

> **Agency, not austerity.**

The goal isn't to make YouTube smaller.

The goal is to return control to the user.

Every feature is evaluated with a simple question:

> **Who is driving?**

If the answer is "the user", it belongs.

If the answer is "the algorithm", it probably doesn't.

---

## Features

Current functionality includes:

* Chronological subscriptions feed
* Multiple YouTube accounts
* Read / unread tracking
* Ignore videos (with undo)
* Favorites
* Watch Later
* Full YouTube search
* Open any YouTube URL
* Keyboard navigation
* Local SQLite database
* JSON export
* Optional Shorts filtering
* Local caching for offline browsing and instant startup

---

## Core principles

### Local first

Everything lives on your machine.

Chronicle stores its data in a local SQLite database. There are no Chronicle servers.

Caching exists only to make the application faster—it should never change how the application behaves.

Searching and filtering should always feel like you're talking directly to YouTube.

---

### Privacy first

Chronicle collects:

* no telemetry
* no analytics
* no usage statistics
* no crash reports
* no tracking

Nothing is sent anywhere.

Ever.

---

### Your credentials, your quota

Chronicle ships with **no embedded Google credentials**.

Instead, you create your own free Google Cloud project during onboarding.

This means:

* you own your API quota
* you control your credentials
* there is no shared API key that can be revoked for everyone

The application is designed to be extremely conservative with quota usage. A normal refresh costs only a few units out of Google's daily free allowance.

---

### No engagement mechanics

Chronicle intentionally avoids mechanics designed to maximize watch time.

There are no recommendation loops.

No infinite feeds.

No "you might also like."

When you're caught up, the application simply says so.

---

### Shorts are your decision

Shorts are **visible by default** because they're part of many creators' output.

However, if you don't want them in your subscriptions feed, there's a single setting that hides them completely.

Chronicle doesn't make that decision for you.

Shorts appear in the feed just like any other upload.

There is no separate endless Shorts feed or swipe-based interface.

---

## Built with AI

Chronicle was developed using modern AI coding tools. 

I prefer to be transparent about it. Whether you see that as a positive or a negative is up to you. If AI-assisted development isn't your thing, that's perfectly okay—the source code is right here.

This project is, in many ways, an experiment in **vibe coding** for me.

That doesn't mean AI wrote the application on its own.

Development follows a specification-driven workflow. Features are first designed and documented as specifications that describe the desired behavior, constraints, and rationale. Those specifications are then implemented by AI coding agents, reviewed, tested, and refined before becoming part of the application.

Every architectural decision, product decision, trade-off, and final implementation decision is ultimately mine.

I use AI the same way I use a compiler, debugger, documentation, or IDE: as a tool that helps me build software faster—not as a substitute for software engineering.

The product itself—its philosophy, behavior, UX decisions, and countless refinements—comes from using Chronicle every day, noticing friction, and continuously iterating on the experience.

Rather than replacing software engineering, AI allows me to spend more time designing the product and less time writing repetitive code. More importantly, it made this project possible. Without these tools, Chronicle would likely have remained just another idea in my ever-growing personal backlog.

---

## Project status

Chronicle is currently pre-release, but it's already my primary way of using YouTube.

Development is guided by the documents in `.specs/`, where the architecture, roadmap, design decisions, and long-term vision are maintained alongside the code.

Whenever implementation and specification diverge, the specification is updated as part of the same change.

---

## Installation

Packaged releases are currently unsigned.

This only affects the first launch.

### Linux

Download the AppImage.

```bash
chmod +x Chronicle.AppImage
./Chronicle.AppImage
```

No installation.

No root access required.

### macOS

Download the DMG.

Drag Chronicle into Applications.

On first launch, Gatekeeper may warn that the application is unsigned. Right-click → **Open**, or allow it through **System Settings → Privacy & Security**.

Only required once.

### Windows

Run the installer.

SmartScreen may display **"Windows protected your PC."**

Click **More info**, then **Run anyway**.

Only required once.

Chronicle periodically checks GitHub for new releases (this can be disabled in Settings). It does not download or installs updates automatically, at least not yet.

---

## Running from source

Requirements:

* Node.js 22+
* npm

```bash
git clone <repository>
cd ChroniclePlayer
npm install
npm run dev
```

On first launch, Chronicle walks you through creating your own Google Cloud project and OAuth credentials.

The process usually takes around five minutes and only needs to be completed once.

Detailed instructions are also available in `docs/setup.md`.

Useful development commands:

```bash
npm run typecheck
npm run lint
npm test

CHRONICLE_FIXTURES=1 npm run dev
```

---

## Your data

Your data belongs to you.

* Local SQLite database
* Secrets stored in your operating system's credential manager whenever available
* One-click JSON export
* Complete local data deletion
* OAuth tokens revoked on sign-out

You can inspect your database with any SQLite browser.

Nothing is hidden behind proprietary formats.

---

## Design documents

Chronicle is specified before it's implemented.

The `.specs/` directory contains:

* Product vision
* Non-goals
* Architecture
* Design decisions
* Roadmap

These documents evolve together with the code so that implementation and intent remain aligned.

---

## License

TBD