import { cookieName } from '../_auth.js';

export default async function handler(req, res) {
    const cookie = [
        `${cookieName()}=`,
        'Path=/',
        'Max-Age=0',
        'HttpOnly',
        'SameSite=Lax',
        'Secure',
    ].join('; ');

    res.setHeader('Set-Cookie', cookie);
    res.json({ ok: true });
}
