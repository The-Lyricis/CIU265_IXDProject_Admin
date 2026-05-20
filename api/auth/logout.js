const COOKIE_NAME = 'ciu265_admin_session';

export default async function handler(req, res) {
    const cookie = [
        `${COOKIE_NAME}=`,
        'Path=/',
        'Max-Age=0',
        'HttpOnly',
        'SameSite=Lax',
        'Secure',
    ].join('; ');

    res.setHeader('Set-Cookie', cookie);
    res.json({ ok: true });
}
