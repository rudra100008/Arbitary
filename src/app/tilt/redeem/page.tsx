'use client';

import { useEffect } from 'react';

const INVALID_BASE = '/tilt/invalid';

function invalidUrl(reason: string) {
    return `${INVALID_BASE}?reason=${reason}`;
}

const PENDING_TOKEN_KEY = 'tilt_redeem_pending_token';

function readTokenFromHash(hashValue: string): string {
    const withoutHash = hashValue.startsWith('#')
        ? hashValue.slice(1)
        : hashValue;

    if (!withoutHash) {
        return '';
    }

    const candidates = [withoutHash];

    try {
        candidates.push(decodeURIComponent(withoutHash));
    } catch {
        // Ignore bad URI sequences and keep raw value path.
    }

    for (const candidate of candidates) {
        const direct = new URLSearchParams(candidate).get('t')?.trim() ?? '';
        if (direct) {
            return direct;
        }

        const match = candidate.match(/(?:^|[?&])t=([^&]+)/i);
        if (match?.[1]) {
            try {
                return decodeURIComponent(match[1]).trim();
            } catch {
                return match[1].trim();
            }
        }
    }

    return '';
}

export default function TiltRedeemPage() {
    useEffect(() => {
        let cancelled = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        const hashToken = readTokenFromHash(window.location.hash);
        // Compatibility fallback for previously generated QR links that used query params.
        const queryToken = new URLSearchParams(window.location.search).get('t')?.trim() ?? '';
        const storedPendingToken = sessionStorage.getItem(PENDING_TOKEN_KEY)?.trim() ?? '';
        const token = hashToken || queryToken || storedPendingToken;

        if (token) {
            // Preserve token through React Strict Mode double effects in development.
            sessionStorage.setItem(PENDING_TOKEN_KEY, token);
        }

        // Remove token from visible URL/history as early as possible.
        window.history.replaceState(null, '', '/tilt/redeem');

        if (!token) {
            window.location.replace(invalidUrl('missing_token'));
            return () => {
                cancelled = true;
            };
        }

        timeoutId = setTimeout(() => {
            if (cancelled) {
                return;
            }

            (async () => {
                try {
                    const response = await fetch('/api/tilt/redeem', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({ token }),
                    });

                    const payload = await response.json().catch(() => null);
                    const nextPath = typeof payload?.next === 'string'
                        ? payload.next
                        : invalidUrl('server_error');

                    if (!response.ok) {
                        sessionStorage.removeItem(PENDING_TOKEN_KEY);
                        if (!cancelled) {
                            window.location.replace(nextPath);
                        }
                        return;
                    }

                    if (typeof payload?.session_id === 'string') {
                        sessionStorage.setItem('tilt_lsid_fallback', payload.session_id);

                        const target = new URL(nextPath, window.location.origin);
                        target.searchParams.set('sid', payload.session_id);
                        if (!cancelled) {
                            window.location.replace(target.pathname + target.search);
                        }
                        sessionStorage.removeItem(PENDING_TOKEN_KEY);
                        return;
                    }
                    sessionStorage.removeItem(PENDING_TOKEN_KEY);

                    if (!cancelled) {
                        window.location.replace(nextPath);
                    }
                } catch (error) {
                    console.error('[tilt/redeem/page]', error);
                    sessionStorage.removeItem(PENDING_TOKEN_KEY);
                    if (!cancelled) {
                        window.location.replace(invalidUrl('server_error'));
                    }
                }
            })();
        }, 0);

        return () => {
            cancelled = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    return (
        <div
            className="min-h-screen flex items-center justify-center"
            style={{
                background:
                    'radial-gradient(circle at 80% -10%, rgba(200,230,60,0.08), transparent 40%), #0e1f10',
            }}
        >
            <div className="flex flex-col items-center gap-4">
                <div
                    style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        border: '3px solid rgba(200,230,60,0.15)',
                        borderTop: '3px solid #c8e63c',
                        animation: 'spin 0.8s linear infinite',
                    }}
                />
                <p
                    className="text-xs font-bold uppercase tracking-[0.18em]"
                    style={{ color: 'rgba(200,230,60,0.75)' }}
                >
                    Processing Lottery Session
                </p>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
