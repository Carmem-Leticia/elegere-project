const SUPPORTED_TAGS = [
    'fantasia', 'romance', 'aventura', 'terror', 'misterio',
    'ficcao-cientifica', 'classicos', 'poesia', 'filosofia',
    'animais', 'drama', 'humor'
];

const DIFFICULTY_WEIGHT = {
    'A1': 0.8, 'A2': 0.9, 'B1': 1.0, 'B2': 1.0,
    'C1': 0.85, 'PT-BR': 1.0
};

function parseTagsField(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map(t => t.trim().toLowerCase()).filter(Boolean);
    if (typeof tags === 'string') {
        return tags
            .replace(/^\{|\}$/g, '')
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);
    }
    return [];
}

function buildUserVector(preferences) {
    const vec = new Map();
    for (const p of preferences) {
        const tag = String(p.tag).toLowerCase().trim();
        vec.set(tag, Number(p.weight) || 1.0);
    }
    return vec;
}
function buildBookVector(tags) {
    const vec = new Map();
    for (const t of parseTagsField(tags)) {
        vec.set(t, 1.0);
    }
    return vec;
}

function cosineSimilarity(vecA, vecB) {
    if (vecA.size === 0 || vecB.size === 0) return 0;

    let dot = 0;
    for (const [key, wA] of vecA) {
        const wB = vecB.get(key);
        if (wB !== undefined) dot += wA * wB;
    }

    const normA = Math.sqrt([...vecA.values()].reduce((s, w) => s + w * w, 0));
    const normB = Math.sqrt([...vecB.values()].reduce((s, w) => s + w * w, 0));

    if (normA === 0 || normB === 0) return 0;
    return dot / (normA * normB);
}

function diversify(scoredBooks, limit) {
    const result = [];
    const categoryCount = new Map();
    const MAX_PER_CATEGORY = 3;

    for (const book of scoredBooks) {
        if (result.length >= limit) break;
        const catId = book.category_id || 0;
        const count = categoryCount.get(catId) || 0;
        if (count < MAX_PER_CATEGORY) {
            result.push(book);
            categoryCount.set(catId, count + 1);
        }
    }

    if (result.length < limit) {
        const resultIds = new Set(result.map(b => b.id));
        for (const book of scoredBooks) {
            if (result.length >= limit) break;
            if (!resultIds.has(book.id)) result.push(book);
        }
    }

    return result;
}

function recommendBooks(preferences, books, limit = 10) {
    const userVec = buildUserVector(preferences);
    if (userVec.size === 0) return [];

    const scored = books
        .map(book => {
            const bookVec = buildBookVector(book.tags);
            let score = cosineSimilarity(userVec, bookVec);

            // Boost por dificuldade
            const diffWeight = DIFFICULTY_WEIGHT[book.difficulty_level] || 1.0;
            score *= diffWeight;

            if (book.gutenberg_id) score *= 1.05;

            return {
                ...book,
                match_score: Math.min(Math.round(score * 100), 99),
            };
        })
        .filter(b => b.match_score > 0)
        .sort((a, b) => b.match_score - a.match_score);

    return diversify(scored, limit);
}

module.exports = {
    recommendBooks,
    cosineSimilarity,
    buildUserVector,
    buildBookVector,
    parseTagsField,
    SUPPORTED_TAGS,
};