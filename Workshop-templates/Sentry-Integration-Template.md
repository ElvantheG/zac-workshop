# Sentry Integration Template — Catch Errors, Fix with Claude

> **Use case:** Non-technical builders who used AI to build an app now need a way to catch real production errors automatically and feed them to Claude for fixes — without reading stack traces manually.
> **Core unlock:** Sentry captures the error. Claude reads it. You fix it. You don't need to understand either one deeply.

---

## Why Sentry + Claude Works for Non-Technical Builders

When you ship an AI-built app, errors will happen. Without Sentry you find out from angry users. With Sentry you find out instantly — and you get the exact error text, file, and line number that Claude needs to fix it.

**The loop:**
```
User hits bug → Sentry captures it → You copy error into Claude → Claude fixes it → You ship the fix
```

This is Slide 10 of the workshop in practice: "Error → ask Claude → fixed."

---

## Phase 1 — Install Sentry (10 minutes)

### Step 1: Create a free Sentry account
Go to sentry.io → Create Project → pick your framework (Next.js, React, Python, etc.).

Sentry gives you a DSN key that looks like:
```
https://abc123@o456.ingest.sentry.io/789
```

### Step 2: Add Sentry to your project

Paste this prompt into Claude with your framework name:

```
I'm building a [Next.js / React / Python Flask / Node.js] app.
I have a Sentry DSN: [paste your DSN here].
Add Sentry error tracking to my project.
Show me exactly which files to create or edit and what to paste into each one.
I will copy-paste your output exactly — keep it simple.
```

Claude will give you 2–4 files to edit. Do exactly what it says.

### Step 3: Trigger a test error

Ask Claude:

```
How do I trigger a test error in my [framework] app to confirm Sentry is working?
Give me one line of code to add temporarily, and tell me exactly where to put it.
```

After triggering, check your Sentry dashboard. You should see the error appear within 30 seconds.

---

## Phase 2 — Reading a Sentry Error (5 minutes)

When an error arrives in Sentry, it shows you:

| Field | What it means | What to copy |
|-------|---------------|--------------|
| **Title** | Error type + message | Yes — copy this |
| **Stack Trace** | File names + line numbers | Yes — copy top 5–10 lines |
| **Breadcrumbs** | What the user did before the crash | Optional — copy if visible |
| **Tags / Context** | Browser, OS, user ID | Optional |

You do **not** need to understand any of this. You just need to copy it.

---

## Phase 3 — The Claude Fix Prompt (The Core Template)

When an error lands in Sentry, use this prompt:

```
I'm getting an error in my app. Here is the full Sentry error report:

--- SENTRY ERROR START ---
[Paste the error title here]
[Paste the stack trace here — top 10 lines is enough]
--- SENTRY ERROR END ---

My app is built with [your framework]. I did not write this code myself — Claude wrote it for me.

Please:
1. Explain in plain English what this error means
2. Show me exactly what to change to fix it (file name + new code)
3. Tell me if there is anything I should test after the fix
```

**Why this works:** You're giving Claude the exact structured data it needs. No guessing. No describing the error in your own words. The Sentry report is Claude's input.

---

## Phase 4 — Advanced Prompt Variants

### Variant A — Error happens only sometimes (intermittent bug)

```
This error doesn't happen every time. It started after I [added a feature / changed X].
Here is the Sentry error:

[paste error]

What would cause this to happen only sometimes? Give me 3 possible causes ranked most to least likely, and show me how to fix the most likely one first.
```

### Variant B — Error after a dependency update

```
I updated my packages and now I'm getting this error:

[paste error]

Which package change likely caused this? Show me how to roll back just that package OR how to update my code to be compatible with the new version.
```

### Variant C — Error in production but not in development

```
This error only happens in production (live site), not on my local machine.
Here is the Sentry error from production:

[paste error]

My hosting platform is [Vercel / Netlify / Railway / etc.].
What environment differences could cause this? Show me the fix.
```

### Variant D — Error you don't understand at all

```
I have no idea what this error means. I did not write this code.
Please explain it like I'm not a developer, then fix it.

[paste error]
```

---

## Phase 5 — Sentry Alerting Setup (Set Once, Forget It)

Set up Sentry to notify you automatically so you don't have to check the dashboard manually.

Ask Claude:

```
I use Sentry for error tracking. I want to be notified on [Slack / email / Discord] when a new error happens.
Walk me through setting up Sentry alerts for this. Give me step-by-step instructions — assume I'm not technical.
```

**Recommended alert rules:**
- New issue (error type not seen before) → notify immediately
- Error spike (same error 10+ times in 1 hour) → notify immediately
- All other errors → daily digest

---

## Phase 6 — Build the Fix Habit (Your Weekly Workflow)

| Frequency | Action |
|-----------|--------|
| Daily | Glance at Sentry dashboard — any new red errors? |
| Per new error | Copy → Claude fix prompt → deploy fix |
| Weekly | Review "most frequent" errors — fix the top 1–2 |
| After any new feature ships | Check Sentry for 30 minutes — catch regressions early |

---

## Objection Removal

**"I don't understand the code Sentry shows me."**
You don't need to. Claude reads it. You paste it.

**"What if Claude's fix breaks something else?"**
Test on a staging/preview URL before pushing to production. Ask Claude: "What should I test after making this change?"

**"Sentry seems complex to set up."**
The install prompt in Phase 1 handles it entirely. Claude will give you exact copy-paste instructions for your specific framework.

**"I already shipped — is it too late to add Sentry?"**
No. Sentry can be added to any existing project. The Phase 1 install prompt works the same way.

**"What if the error is in code I didn't write (a library)?"**
Include this line in your fix prompt: "This error may be in a third-party library I use. If so, tell me if I should update the library, work around it, or if there's nothing I can do."

---

## The 3-Sentence Pitch (For Your Workshop Slide)

> Sentry is a free tool that watches your app while it runs and captures every error automatically — with the exact details Claude needs to fix it.
> Instead of describing a bug to Claude in your own words, you paste the Sentry report and Claude tells you exactly what to change.
> It turns "I don't know what's broken" into "here's the fix" in under 10 minutes.

---

## My Niche Adaptation Checklist

When adding this to YOUR workshop:
- [ ] Install Sentry yourself on your demo project so you can show it live
- [ ] Screenshot a real Sentry error from your own app (blur any sensitive data)
- [ ] Demo the fix prompt live — paste the error into Claude on screen
- [ ] Include Sentry in your Tech Stack Reference section (it's free, add it to the stack)
- [ ] Add a Sentry FAQ entry: "What happens when users find bugs in my tool?"
- [ ] Update your beta case study language: "Bugs get reported and fixed live" (Slide 30 pattern)
