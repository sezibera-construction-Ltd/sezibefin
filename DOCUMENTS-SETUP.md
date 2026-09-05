# Secure role documents — setup and day-to-day use

The four role instruction documents live behind a sign-in at
**https://www.sezibera.com/documents.html**

Nobody can reach them from the public site. There is no link in the menu, they
are excluded from the sitemap and from search engines, and the page itself is
useless without an approved email address. You share the link directly with the
person who needs it.

---

## Part 1 — What you have to do once, before it works

The code is finished. Three things need to be set up in accounts you control.
Budget about twenty minutes.

**Do steps 1 to 3 before you push.** If you push first, the deploy still
succeeds and the rest of the site is unaffected — but anyone trying to sign in
gets *"The code could not be sent"*, because the keys are not there yet. Vercel
also does not apply new environment variables to a deployment that has already
been built, so adding them afterwards means triggering a redeploy. Setting them
first avoids that round trip.

### 1. Add the session secret to Vercel

This is the key that signs the login cookies. Without it the sign-in page
returns an error.

Go to your Vercel project → **Settings** → **Environment Variables** → **Add**:

| Name | Value |
| --- | --- |
| `SESSION_SECRET` | `d5b1a5195cc3e64a098866dc05632715d5189f170eb37a5311b6375488003987` |

Apply it to **Production, Preview and Development**.

That value was generated for you and has been used nowhere else. If you would
rather make your own, any random string of 32+ characters works. Changing it
later simply signs everyone out; nothing breaks.

### 2. Set up email sending with Resend

The site emails people a six-digit code, so it needs an email service. Resend
is free for this volume.

1. Create an account at **https://resend.com**.
2. Go to **Domains** → **Add Domain** → enter `sezibera.com`.
3. Resend shows you three DNS records. Add them wherever `sezibera.com`'s DNS
   is managed. Verification usually completes within the hour.
4. Go to **API Keys** → **Create API Key** → copy it. You only see it once.

Then add two more environment variables in Vercel, exactly as in step 1:

| Name | Value |
| --- | --- |
| `RESEND_API_KEY` | the key you just copied |
| `MAIL_FROM` | `Sezibera Construction <documents@sezibera.com>` |

**The domain verification in step 2 is not optional.** Until `sezibera.com` is
verified, Resend will only deliver to the address that owns the Resend account,
and everyone else will wait for a code that never arrives.

### 3. The allowlist — already done

`api/_lib/allowlist.js` now holds your real accounts:

```js
{ email: 'info@sezibera.com',     name: 'Sezibera Construction', docs: '*' },
{ email: 'wisecrepin4@gmail.com', name: 'Administrator',         docs: '*' }
```

Both see all four documents. To add a member of staff, copy one of the
commented example lines just below and change the three values:

```js
, { email: 'jean@gmail.com', name: 'Jean', docs: ['project-manager'] }
```

A personal Gmail works exactly as well as a company address — only what is
written in this file grants access, nothing else. The four document keys are
`project-manager`, `quantity-surveyor`, `procurement-officer`,
`office-administrator`; `docs: '*'` means all of them.

### 4. Deploy

```bash
git add -A && git commit -m "Add secure role document viewer" && git push
```

Vercel deploys automatically from GitHub — there is no CLI step. Watch it at
vercel.com → your project → **Deployments**; it takes about a minute. Vercel
runs `npm install` (which fetches `sharp` for Linux) and turns the `api/` folder
into serverless functions. The rest of the site is untouched.

Then open `https://www.sezibera.com/documents.html` and sign in with your own
address to confirm the whole chain works.

### How the pieces run

The site is static files on a CDN. The `api/` folder does not change that — each
file there is a small function that wakes on request and sleeps again after.

1. **Page loads.** `documents.js` asks `/api/auth/session` whether anyone is
   signed in. Nobody is, so the email form appears.
2. **Email submitted.** `/api/auth/request-code` checks the allowlist, generates
   six random digits, asks Resend to email them, and sets a cookie holding the
   address and a fingerprint of the code — signed with `SESSION_SECRET` and
   marked `httpOnly`, so page JavaScript cannot read it. The code itself is
   stored nowhere.
3. **Code entered.** `/api/auth/verify-code` recomputes the fingerprint and
   compares. On a match it re-checks the allowlist and issues an 8-hour session
   cookie.
4. **Each page read.** Every image on the viewer calls `/api/doc/page`. That
   function verifies the cookie, checks the allowlist *again*, loads the page
   image, composites the footer strip onto it, and returns a `no-store` PNG —
   then writes a `[docs]` line to the logs.

Three consequences worth understanding:

- The PDFs are not on your website at all. Not in the repo, not deployed. Only
  page images, inside `api/`, which Vercel never serves as static files.
- Every single page image is a fresh authorisation check, not just the login.
  Remove someone and push, and they stop mid-document on their next scroll.
- There is no database. All state lives in signed cookies — nothing to
  provision, back up, or leak.

---

## Part 2 — Day-to-day

**To give someone access:** add their line to `ALLOWLIST` in
`api/_lib/allowlist.js`, commit, push. Live in about a minute.

**To remove someone:** delete their line, commit, push. They are cut off on
their very next page request — even mid-read, even if they signed in an hour
ago. The allowlist is re-checked on every single page image, not just at login.

**To see who has read what:** Vercel dashboard → your project → **Logs**.
Search for `[docs]`. Every sign-in, every page opened, and every blocked
attempt is recorded with the email address and the time.

**What a reader experiences:** they open the link, type their work email, get a
code by email, type it in, and the document appears. They stay signed in for
8 hours. If they can only see one document it opens straight away with no menu
in between.

---

## Part 3 — What this does and does not stop

Worth being straight about, because it affects how you use it.

**It genuinely prevents:**

- Anyone not on the allowlist opening the documents at all.
- The PDF file ever reaching a browser. The original PDFs are not deployed to
  the website in any form — only page images, rendered one at a time, only for
  a signed-in reader who is still on the allowlist.
- Downloading, printing, right-click-saving, dragging out an image, or
  selecting and copying the text. Printing the page produces one sentence.
- Sharing a working link. Every document URL requires the cookie, and the
  cookie cannot be read or copied by anything running in the page.
- A forwarded code being useful. The code only works in the same browser that
  requested it.

**It cannot prevent someone photographing or screenshotting their screen.** No
web technology can. This is why every page carries a dark strip along the
bottom edge naming the reader's email address and the date and time. It is
composited into the image by the server before it is sent, so it cannot be
edited out with browser tools and it survives a screenshot or a photograph of
the screen. Nothing is laid over the document text itself. If a page ever
surfaces where it should not, that strip and the access log tell you exactly
whose account it came from and when. That traceability is the real deterrent.

**One deliberate trade-off:** if someone enters an email that is not on the
allowlist, the page tells them so plainly rather than staying silent. This means
an outsider could learn whether a given address is approved. That was chosen on
purpose — a colleague who mistypes their address would otherwise sit waiting
forever for an email. If you would rather have the silence, say so and it is a
two-line change in `api/auth/request-code.js`.

---

## Part 4 — Changing the documents themselves

If a role document is revised, replace the PDF in your `Downloads` folder and
run:

```bash
py -m pip install pymupdf
py tools/build-role-documents.py
```

Then commit and push. The script prints anything else that needs updating.
Adding a brand-new document is described in the comments at the top of that
script.

---

## Where everything is

| File | What it is |
| --- | --- |
| `documents.html` | The page people open |
| `documents.js` | Its browser code. Holds no secrets, grants no access |
| `api/_lib/allowlist.js` | **Who can read what.** The file you will edit |
| `api/_lib/auth.js` | Signed cookies, one-time codes |
| `api/_lib/mail.js` | Sending the code via Resend |
| `api/_lib/pages.js` | Loads a document's page images |
| `api/_lib/docs/*.js` | The page images. Generated, never edited by hand |
| `api/auth/*.js` | Sign-in, code check, session, sign-out |
| `api/doc/page.js` | Authorises, watermarks and serves one page |
| `tools/build-role-documents.py` | Regenerates the page images from the PDFs |
