const COOKIE_NAME = 'ciu265_admin_session';

export function parseCookies(header = '') {
    return Object.fromEntries(
        header
            .split(';')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((pair) => {
                const index = pair.indexOf('=');
                const key = index >= 0 ? pair.slice(0, index) : pair;
                const value = index >= 0 ? pair.slice(index + 1) : '';
                return [key, decodeURIComponent(value)];
            })
    );
}

export function hasAdminCookie(req) {
    const cookies = parseCookies(req.headers.cookie || '');
    return Boolean(cookies[COOKIE_NAME]);
}

export function cookieName() {
    return COOKIE_NAME;
}
