# Tilt Your Music - System Overview

## 1. Roles

**SUPERADMIN**
- Internal operator of the platform
- Creates and manages lottery campaigns
- Invites new outlets, revokes invites, removes outlets
- Views all entries across all campaigns
- Manages outlet user accounts

**Outlet**
- The partner business
- Logs in to generate QR codes for customers
- Sees their own scan count and submission stats (not customer data)
- Manages their business name/address

---

## 2. Invite & Signup Flow

- SUPERADMIN invites an outlet by email
- Outlet receives the invite link (out-of-band)
- Outlet creates an account at `/tilt/signup`
- One invite = one account (invite is consumed on signup)
- If an invite is revoked before signup, the outlet can no longer register
- Outlets cannot sign up without an invite

---

## 3. How a Campaign Works

- **Creation** : SUPERADMIN sets name, start date, end date
- **Activation** : When start date arrives, campaign becomes active
- **QR Generation** : Outlets see active campaigns and can generate QR codes
- **Customer Entry** : Customers scan QR, fill form, entry recorded
- **Expiry** : Campaign ends at end date (or can be force-ended early by SUPERADMIN)

---

## 4. QR Flow (from scan to entry)

- Scanning a QR opens a link on the customer's phone
- The token is carried in the URL fragment (never sent to the server in a URL parameter - no server logs ever see it)
- The server validates the token: is it real? not expired? not already used?
- If valid, the token is permanently burned (one-time use) and a session is created
- Customer is redirected to the entry form with a session cookie
- If the same QR is scanned again, it's rejected - the link has already been used
- Two simultaneous scans cannot both succeed: database-level atomic burn prevents it

---

## 5. Entry Flow (the form)

- Customer fills: full name, email, phone, address
- Server validates: email format, not disposable, phone is valid
- Server checks for duplicates: no other entry with same email or phone for this campaign
- Phone is hashed for dedup - not stored as readable text
- Common email typos are silently corrected (e.g. `gnail.com` → `gmail.com`)
- On success: entry saved, session closed
- Customer sees confirmation: "Application received!"

---

## 6. Privacy & Security

- QR tokens never appear in URLs or server logs (fragment-only transport)
- Phone numbers are hashed - not stored in readable form
- No customer data exposed to outlets - outlets see only scan/submit counts
- Disposable email addresses are rejected
- Email typos are corrected server-side before saving

---

## 7. Session Rules

- One QR = one scan = one session = one entry
- 30-minute window to complete the form after scanning
- Once submitted, the same session cannot be reused
- Expired sessions are rejected, requiring a fresh QR scan
