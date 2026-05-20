const COOKIE_NAME = 'ciu265_admin_session';

function parseCookies(header = '') {
    return Object.fromEntries(
        header.split(';').map((part) => part.trim()).filter(Boolean).map((pair) => {
            const index = pair.indexOf('=');
            const key = index >= 0 ? pair.slice(0, index) : pair;
            const value = index >= 0 ? pair.slice(index + 1) : '';
            return [key, decodeURIComponent(value)];
        })
    );
}

function makeToken() {
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return Buffer.from(seed).toString('base64url');
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const { password, remember = false } = req.body || {};
    const expectedPassword = process.env.ADMIN_PASSWORD || '';

    if (!expectedPassword) {
        res.status(500).json({ error: 'ADMIN_PASSWORD is missing' });
        return;
    }

    if (!password || password !== expectedPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    const token = makeToken();
    const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
    const cookie = [
        `${COOKIE_NAME}=${encodeURIComponent(token)}`,
        'Path=/',
        `Max-Age=${maxAge}`,
        'HttpOnly',
        'SameSite=Lax',
        'Secure',
    ].join('; ');

    res.setHeader('Set-Cookie', cookie);
    res.json({ ok: true });
}
