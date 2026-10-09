/** Shared static metadata and card baseline. No ranking claims or invented business schema. */
const escape = (text) => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const socialCardDefaults = Object.freeze({ width: 1200, height: 630, type: 'image/png' });
export function canonical(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port)
        throw new Error('Use a clean HTTPS canonical URL');
    return url.href;
}
function validate(input) {
    if (!input.title.trim() || !input.description.trim())
        throw new Error('Describe the actual page');
    const url = canonical(input.url);
    if (input.language && !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(input.language))
        throw Error('Use a supported page language');
    if (input.dateModified && (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateModified) || new Date(input.dateModified).toISOString().slice(0, 10) !== input.dateModified))
        throw Error('Use an actual content revision date');
    if (input.pageType && !['WebPage', 'WebApplication'].includes(input.pageType))
        throw Error('Unsupported visible entity');
    const image = input.image;
    if (image) {
        if (new URL(canonical(image.url)).origin !== new URL(url).origin)
            throw Error('Baseline image must use the production origin');
        if (!image.alt.trim() || image.width !== 1200 || image.height !== 630 || !['image/png', 'image/jpeg'].includes(image.type))
            throw Error('Use a described 1200×630 PNG/JPEG card');
    }
    return url;
}
export function seoHead(input) {
    const url = validate(input), image = input.image;
    const tags = [`<title>${escape(input.title)}</title>`, `<meta name="description" content="${escape(input.description)}">`, `<link rel="canonical" href="${escape(url)}">`, `<meta property="og:type" content="website">`, `<meta property="og:title" content="${escape(input.title)}">`, `<meta property="og:description" content="${escape(input.description)}">`, `<meta property="og:url" content="${escape(url)}">`];
    if (input.siteName)
        tags.push(`<meta property="og:site_name" content="${escape(input.siteName)}">`);
    tags.push(`<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`, `<meta name="twitter:title" content="${escape(input.title)}">`, `<meta name="twitter:description" content="${escape(input.description)}">`);
    if (image)
        tags.push(`<meta property="og:image" content="${escape(image.url)}">`, `<meta property="og:image:secure_url" content="${escape(image.url)}">`, `<meta property="og:image:type" content="${image.type}">`, `<meta property="og:image:width" content="${image.width}">`, `<meta property="og:image:height" content="${image.height}">`, `<meta property="og:image:alt" content="${escape(image.alt)}">`, `<meta name="twitter:image" content="${escape(image.url)}">`, `<meta name="twitter:image:alt" content="${escape(image.alt)}">`);
    if (input.pageType) {
        const schema = { '@context': 'https://schema.org', '@type': input.pageType, name: input.title, description: input.description, url, inLanguage: input.language || 'en', ...(input.dateModified ? { dateModified: input.dateModified } : {}) };
        tags.push(`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')}</script>`);
    }
    return tags.join('\n');
}
export function sitemap(urls) {
    if (!urls.length)
        throw new Error('Missing production pages');
    const normalized = urls.map(canonical);
    if (new Set(normalized).size !== normalized.length || new Set(normalized.map(u => new URL(u).origin)).size !== 1)
        throw new Error('Use unique pages of one site');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${normalized.map(u => `<url><loc>${escape(u)}</loc></url>`).join('')}</urlset>`;
}
/** Only for already-public sites. Preserve reviewed agent-specific policies separately. */
export function publicRobots(sitemapUrl) { return `User-agent: *\nAllow: /\nSitemap: ${canonical(sitemapUrl)}\n`; }
/** Fail a build on absent/duplicate generated metadata or non-readable app shells. Not an indexing test. */
export function validateSeoPage(html, input) {
    validate(input);
    if (!input.image)
        throw Error('Public baseline requires a social card');
    if (!html.includes(seoHead(input)))
        throw Error('Generated metadata missing or changed');
    const head = (html.split(/<\/head\s*>/i)[0] || "");
    if ((head.match(/<title\b/gi) || []).length !== 1 || (head.match(/<link\b[^>]*rel=["']canonical["']/gi) || []).length !== 1)
        throw Error('Duplicate title/canonical');
    for (const name of ['description', 'twitter:card', 'twitter:image', 'og:image']) {
        const count = (head.match(new RegExp(`<meta\\b[^>]*(?:name|property)=["']${name}["']`, 'gi')) || []).length;
        if (count !== 1)
            throw Error('Missing or duplicate ' + name);
    }
    if (/<meta\b[^>]*(?:name=["']robots["'][^>]*content=["'][^"']*noindex|content=["'][^"']*noindex[^>]*name=["']robots["'])/i.test(head))
        throw Error('Public page contains noindex');
    const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    if (h1.length !== 1 || !(h1[0]?.[1] || "").replace(/<[^>]*>/g, '').trim() || !/<main\b/i.test(html))
        throw Error('Render one readable H1 and semantic main before JavaScript');
    if (!new RegExp(`<html\\b[^>]*lang=["']${input.language || 'en'}["']`, 'i').test(html))
        throw Error('Missing/mismatched document language');
}
/** Check actual bytes and dimensions, not just an extension or declared metadata. */
export function validateSocialImage(bytes, image) {
    if (bytes.length < 24 || bytes.length > 5_000_000)
        throw Error('Social image missing or over 5 MB');
    let width = 0, height = 0, type = '';
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) {
        if (String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR')
            throw Error('Invalid PNG');
        width = view.getUint32(16);
        height = view.getUint32(20);
        type = 'image/png';
    }
    else if (bytes[0] === 255 && bytes[1] === 216) {
        type = 'image/jpeg';
        let offset = 2;
        while (offset + 4 <= bytes.length) {
            if (bytes[offset++] !== 255)
                throw Error('Invalid JPEG marker');
            let marker = bytes[offset++];
            while (marker === 255 && offset < bytes.length)
                marker = bytes[offset++];
            if (marker === 217 || marker === 218)
                break;
            const length = view.getUint16(offset);
            if (length < 2 || offset + length > bytes.length)
                throw Error('Invalid JPEG segment');
            if ([192, 193, 194].includes(marker ?? -1)) {
                if (length < 7)
                    throw Error('Invalid JPEG frame');
                height = view.getUint16(offset + 3);
                width = view.getUint16(offset + 5);
                break;
            }
            offset += length;
        }
    }
    if (type !== image.type || width !== image.width || height !== image.height)
        throw Error('Social image MIME/dimensions differ from metadata');
}
/** Editable vector source; rasterize and inspect before publishing PNG/JPEG to social crawlers. */
export function socialCardSvg(input) {
    const ink = input.ink || '#163d37', accent = input.accent || '#d7f47a';
    if (!/^#[a-f0-9]{6}$/i.test(ink) || !/^#[a-f0-9]{6}$/i.test(accent))
        throw Error('Use six-digit theme colors');
    if (!input.siteName.trim() || input.siteName.length > 28 || input.headline.some(s => !s.trim() || s.length > 30) || input.subtitle.length > 62 || !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(input.domain))
        throw Error('Card copy exceeds its layout or domain is invalid');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img"><title>${escape(input.siteName)}</title><desc>${escape(input.headline.join(' '))}</desc><rect width="1200" height="630" fill="${ink}"/><circle cx="1120" cy="310" r="330" fill="none" stroke="#41665a" stroke-width="1"/><circle cx="1120" cy="310" r="240" fill="none" stroke="#41665a" stroke-width="1"/><rect x="64" y="56" width="48" height="48" rx="12" fill="${accent}"/><g fill="${ink}"><rect x="75" y="75" width="5" height="12" rx="2.5"/><rect x="84" y="66" width="5" height="30" rx="2.5"/><rect x="93" y="71" width="5" height="20" rx="2.5"/></g><text x="128" y="90" fill="#fffef9" font-family="Arial,sans-serif" font-size="32" font-weight="600">${escape(input.siteName)}</text><text x="64" y="247" fill="#fffef9" font-family="Arial,sans-serif" font-size="66" letter-spacing="-2">${escape(input.headline[0])}</text><text x="64" y="328" fill="${accent}" font-family="Georgia,serif" font-style="italic" font-size="70" letter-spacing="-2">${escape(input.headline[1])}</text><text x="68" y="395" fill="#d7e0d4" font-family="Arial,sans-serif" font-size="23">${escape(input.subtitle)}</text><g fill="${accent}"><rect x="904" y="246" width="20" height="96" rx="10"/><rect x="940" y="200" width="20" height="188" rx="10"/><rect x="976" y="155" width="20" height="278" rx="10"/><rect x="1012" y="218" width="20" height="152" rx="10"/><rect x="1048" y="257" width="20" height="74" rx="10"/></g><path d="M64 507H1136" stroke="#557368"/><text x="64" y="561" fill="#fffef9" font-family="Arial,sans-serif" font-size="22">${escape(input.domain)}</text><text x="1136" y="561" text-anchor="end" fill="#bdcebd" font-family="Arial,sans-serif" font-size="16" letter-spacing="2">GOOD MEASURE LABS</text></svg>`;
}
