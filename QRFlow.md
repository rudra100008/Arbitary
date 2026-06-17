### Tilt Your Music Lottery Flow

## Step 1 
 Phone opens the link. The browser sends GET /tilt/redeem to your server — no token included, since fragments don't travel over the network, as covered earlier. The server responds with the redeem page's HTML and JavaScript, having no idea any token was even involved.
## Step 2 
The page's JavaScript runs and reads the fragment. Now running in the browser, the code calls window.location.hash, gets back #t=AbC123xyz, parses out AbC123xyz into a plain variable. It also writes a backup copy into sessionStorage under tilt_redeem_pending_token, purely so a second accidental run of this same code (from React Strict Mode in dev) doesn't lose the value.
## Step 3 
The address bar gets cleaned. history.replaceState() rewrites the visible URL to plain /tilt/redeem, no fragment. Nothing in the database has changed yet — this step is purely cosmetic, browser-side.
## Step 4 
 The token is sent to the server, for the first and only time. The code fires fetch('/api/tilt/redeem', { method: 'POST', body: JSON.stringify({ token: 'AbC123xyz' }) }). This is the moment AbC123xyz finally reaches your server.
## Step 5 
The server looks the token up, but hasn't burned it yet. Inside the route handler, it runs SELECT * FROM qr_tokens WHERE token = 'AbC123xyz'. It checks: does this row exist? Is expires_at still in the future? Is used_at still NULL? If all three pass, it proceeds to the actual burn.
## Step 6 
The burn itself, one atomic database transaction. Two things happen together, as a single unit that either both succeed or both fail:

UPDATE qr_tokens SET used_at = NOW(), session_id = 'XyZ789session' WHERE token = 'AbC123xyz' AND used_at IS NULL — this is the actual "burning." The WHERE used_at IS NULL clause is doing real work here: if two requests somehow tried to burn the same token at almost the same instant, only one of them can successfully match a row where used_at is still NULL — the other one's UPDATE affects zero rows, because by the time it runs, used_at is no longer NULL. That's how the system guarantees only one of two simultaneous attempts can ever win, with no gap for both to succeed.
INSERT INTO lottery_sessions (id, token_id, campaign_id) VALUES ('XyZ789session', ...) — a brand new row is created, a fresh session, identified by a freshly generated random ID with no relationship to the original token string.

After this transaction commits, the qr_tokens row for AbC123xyz now permanently looks like: used_at: 2026-06-17 09:41:37, session_id: 'XyZ789session'. That row will never again have used_at set back to NULL — there's no code path that does that. It's burned, permanently, as a historical record.


## Step 7 
The server responds, and only now does a cookie get involved. The POST's response includes a Set-Cookie: lsid=XyZ789session header, plus the same XyZ789session value in the JSON body as a fallback field. The browser stores that cookie. The original token AbC123xyz is never mentioned again by anything from this point forward — its entire purpose was just to authorize this one moment of session creation.
## Step 8 
What happens if someone tries to reuse the link. Say the same QR gets opened a second time — by the original scanner refreshing, or by someone the link got forwarded to. Steps 1 through 4 repeat identically, sending AbC123xyz to the server again. But at step 5's lookup, used_at is no longer NULL — it's a real timestamp. Per the corrected, strict anti-sharing rule, the server now always responds ALREADY_USED in this case, full stop, no session created, no cookie set. The person attempting this gets sent to an error page; they never get a working session, regardless of who they are.