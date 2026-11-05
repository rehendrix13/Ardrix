# Ardrix

Turn big goals into skill trees you can level up. Pick a goal (or build your own), clear small quests to earn XP, unlock harder skills, and climb from E-rank to S-rank.

Ardrix is an installable web app (PWA). It works offline, saves progress on the device, and backs it up to your account when you sign in. It's built to be wrapped into iPhone and Android apps later with Capacitor.

## What's inside

| Area | Where |
| --- | --- |
| Game rules (XP, levels, ranks, unlocking, side quests, calendar, disciplines) | `src/lib/game.ts` |
| Launch templates (Get Fit, Mind and Mood, Eat Healthier, Money Basics, Learn Something New, Product Owner) | `src/content/templates.ts` |
| "Build my own" goal builder | `src/lib/builder.ts`, `src/screens/Builder.tsx` |
| Screens | `src/screens/` |
| Accounts and sync (Supabase, email code sign-in) | `src/lib/supabase.ts`, `src/lib/store.tsx` |
| Database setup | `supabase/schema.sql` |
| Reminder notifications | `supabase/functions/notify/index.ts`, `supabase/reminders.sql` |
| Settings you can change without rebuilding | `public/config.js` |

## Setup, step by step

### 1. Put the code on GitHub

1. On github.com, click **New repository**. Name it `ardrix`, set it to **Public**, and leave every "Add a README / .gitignore / license" box **unchecked**.
2. Upload this folder's contents to it (or ask Claude to push it for you).
3. In the repo, go to **Settings → Pages**. Under **Source**, choose **GitHub Actions**.
4. Go to the **Actions** tab. The **Deploy** workflow runs on every push; when it turns green, your app is live at `https://YOUR-USERNAME.github.io/ardrix/`.

At this point Ardrix already works, saving progress on each device. Steps 2 to 4 add accounts and backup.

### 2. Create the Supabase project

1. At supabase.com, click **New project**. Name it `ardrix`. (Keep it separate from your personal skill-tree project.)
2. Open **SQL Editor → New query**, paste everything from `supabase/schema.sql`, and click **Run**.

### 3. Turn on email-code sign-in

Ardrix signs people in with a 6-digit code instead of a link, because links open Safari instead of the installed iPhone app.

1. **Authentication → Sign In / Providers → Email**: make sure Email is enabled.
2. **Authentication → Emails → Templates → Magic Link**: replace the message body with:

   ```html
   <h2>Your Ardrix code</h2>
   <p>Enter this code in the app to sign in:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
   ```

3. **Authentication → URL Configuration**: set **Site URL** to your app's address from step 1.
4. Before launch: Supabase's built-in email only sends a few messages per hour. Under **Authentication → Emails → SMTP Settings**, connect an email service (Resend, Postmark, etc.) so sign-in codes always arrive.

### 4. Connect the app to Supabase

1. In Supabase, open **Project Settings → API Keys**. Copy the **Project URL** and the **publishable** key.
2. Edit `public/config.js` in GitHub and paste them in. Both are safe to publish, because row level security limits every user to their own data.
3. Commit. The app redeploys in about a minute, and sign-in appears under **You → Account & backup**.

### 5. Reminders (optional)

1. Create a key pair: run `node scripts/vapid-keys.mjs` on any computer with Node.js (or ask Claude to run it).
2. Put the **public** key in `public/config.js` as `vapidPublicKey`.
3. In Supabase: **Edge Functions → Deploy a new function → Via editor**. Name it `notify`, paste `supabase/functions/notify/index.ts`, and deploy. In the function's settings, turn **Verify JWT** off.
4. **Edge Functions → Secrets**, add:
   - `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (from step 1; the private key goes **only** here)
   - `VAPID_SUBJECT`: `mailto:` plus your email
   - `CRON_SECRET`: any long random string
   - `APP_URL`: your app's address
5. Open `supabase/reminders.sql`, replace the two placeholders, and run it in the SQL Editor.
6. In the app, go to **You → Reminders → Turn on reminders**, then **Send a test**. On iPhone, add Ardrix to your home screen first, since iOS only allows notifications for installed web apps.

## Working on the code

```bash
npm install
npm run dev        # local server at http://localhost:5173
npm test           # game rules and sync client tests
npm run typecheck
npm run build      # production build in dist/
```

Changing a template? Edit `src/content/templates.ts` and run `npm test`. The tests check that every template is playable.

## Notes

- Free Supabase projects pause after about a week without activity. If sync shows a problem, open the project and click **Restore**. Nothing is lost.
- Progress is stored as one JSON document per player (`user_state`), the same approach as the personal skill-tree app. Templates ship with the app.
- `public/privacy.html` is a draft. Review it before a public launch.
