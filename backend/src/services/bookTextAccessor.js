const textCache = new Map();
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 horas

function getCached(id) {
    const entry = textCache.get(id);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
        textCache.delete(id);
        return null;
    }
    return entry.content;
}

function setCache(id, content) {
    textCache.set(id, { content, ts: Date.now() });
}

async function fetchWithTimeout(url, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchGutenbergText(gutenbergId) {
    const id = Number(gutenbergId);
    const urlsToTry = [
        `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
        `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
        `https://www.gutenberg.org/files/${id}/${id}.txt`,
    ];

    for (const url of urlsToTry) {
        try {
            console.log(`[bookTextAccessor] tentando: ${url}`);
            const res = await fetchWithTimeout(url, 20000);
            if (res.ok) {
                const text = await res.text();
                if (text && text.length > 1000) {
                    console.log(`[bookTextAccessor] sucesso (${text.length} chars): ${url}`);
                    return text;
                }
            }
        } catch (err) {
            console.warn(`[bookTextAccessor] falhou ${url}: ${err.message}`);
        }
    }

    return null;
}

function cleanGutenbergText(rawText) {
    
    const startMarkers = [
        '*** START OF THE PROJECT GUTENBERG',
        '*** START OF THIS PROJECT GUTENBERG',
        '***START OF THE PROJECT GUTENBERG',
        '*END*THE SMALL PRINT',
    ];

    let startIndex = 0;
    for (const marker of startMarkers) {
        const idx = rawText.indexOf(marker);
        if (idx !== -1) {
            startIndex = rawText.indexOf('\n', idx) + 1;
            break;
        }
    }

    const endMarker = '*** END OF THE PROJECT GUTENBERG';
    let endIndex = rawText.indexOf(endMarker);
    if (endIndex === -1) endIndex = rawText.length;

    const MAX_CHARS = 200000;
    return rawText.substring(startIndex, Math.min(startIndex + MAX_CHARS, endIndex)).trim();
}

async function getCachedBookText(gutenbergId) {
    const id = Number(gutenbergId);
    if (!id) return null;

    const cached = getCached(id);
    if (cached) {
        console.log(`[bookTextAccessor] cache hit: book ${id}`);
        return cached;
    }

    const rawText = await fetchGutenbergText(id);
    if (!rawText) return null;

    const clean = cleanGutenbergText(rawText);
    if (clean.length < 500) return null;

    setCache(id, clean);
    return clean;
}

module.exports = { getCachedBookText };