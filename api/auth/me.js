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

export default async function handler(req, res) {
    const cookies = parseCookies(req.headers.cookie || '');
    if (cookies[COOKIE_NAME]) {
        res.json({ authenticated: true });
        return;
    }
    res.json({ authenticated: false });
}
