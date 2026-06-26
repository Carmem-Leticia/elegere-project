const STOPWORDS = new Set([
    // PT
    'a','o','as','os','de','do','da','dos','das','em','no','na','nos','nas',
    'um','uma','uns','umas','e','ou','que','para','por','com','sem','se',
    'como','quando','onde','quem','qual','quais','sobre','é','foi','era',
    'ele','ela','eles','elas','isso','este','esta','esse','essa','aquilo',
    'mas','mais','muito','bem','já','ainda','então','também','só','todo',
    'toda','isso','isto','aquele','aquela','meu','minha','seu','sua','nos',
    // EN
    'a','an','the','of','in','on','at','to','for','with','without','if',
    'and','or','that','what','when','where','who','which','is','was','were',
    'he','she','they','it','this','those','about','be','have','has','had',
    'are','but','not','from','by','as','do','did','will','would','could',
    'should','may','might','its','my','your','our','their','his','her','been',
    'being','into','through','during','before','after','above','below','up',
    'down','out','off','over','under','again','then','once','here','there',
    'all','both','each','few','more','most','other','some','such','no','nor',
    'same','so','than','too','very','just','because','while','although','though'
]);

function tokenize(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')   // remove acentos
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function stem(word) {
    return word
        .replace(/ing$/, '')
        .replace(/tion$/, '')
        .replace(/ness$/, '')
        .replace(/mente$/, '')
        .replace(/ando$|endo$/, '')
        .replace(/ção$|cao$/, '')
        .replace(/ões$|oes$/, '')
        .replace(/s$/, '');
}

function tokenizeAndStem(text) {
    return tokenize(text).map(stem);
}

function segmentText(fullText) {
    // Divide em parágrafos e janelas deslizantes para mais contexto
    const raw = fullText
        .split(/\n\s*\n/)
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(p => p.length > 80 && p.length < 3000);

    const segments = [];
    for (let i = 0; i < raw.length; i++) {
        segments.push({
            text: raw[i],
            index: i,
            context: [raw[i - 1] || '', raw[i], raw[i + 1] || ''].join(' ').trim()
        });
    }
    return segments;
}

function computeTF(tokens) {
    const freq = new Map();
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
    const max = Math.max(...freq.values(), 1);
    const tf = new Map();
    for (const [t, c] of freq) tf.set(t, c / max);
    return tf;
}

function buildIDF(segmentTokens) {
    const N = segmentTokens.length;
    const df = new Map();
    for (const tokens of segmentTokens) {
        for (const t of new Set(tokens)) df.set(t, (df.get(t) || 0) + 1);
    }
    const idf = new Map();
    for (const [t, d] of df) idf.set(t, Math.log((N + 1) / (d + 1)) + 1);
    return idf;
}

const BM25_K1 = 1.5;
const BM25_B  = 0.75;

function bm25Score(queryTokens, docTokens, idf, avgDocLen) {
    const docLen = docTokens.length;
    const freq = new Map();
    for (const t of docTokens) freq.set(t, (freq.get(t) || 0) + 1);

    let score = 0;
    for (const qt of queryTokens) {
        const f = freq.get(qt) || 0;
        if (f === 0) continue;
        const idfVal = idf.get(qt) || 0;
        const numerator = f * (BM25_K1 + 1);
        const denominator = f + BM25_K1 * (1 - BM25_B + BM25_B * (docLen / avgDocLen));
        score += idfVal * (numerator / denominator);
    }
    return score;
}

function extractEntities(text) {
    const words = text.split(/\s+/);
    const entities = new Set();
    for (let i = 1; i < words.length; i++) {
        const w = words[i].replace(/[^a-zA-ZÀ-ú]/g, '');
        if (w.length > 2 && /^[A-ZÀ-Ú]/.test(w)) {
            entities.add(w);
        }
    }
    return [...entities].slice(0, 6);
}

function detectIntent(question) {
    const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return {
        isWho:     /quem|who|personagem|character|nome|name/.test(q),
        isWhat:    /o que|what|qual|como|acontece|happen|ocorre/.test(q),
        isWhere:   /onde|where|lugar|local|place|cidade|city/.test(q),
        isWhen:    /quando|when|momento|time|epoca|century|seculo/.test(q),
        isWhy:     /por que|porque|why|motivo|reason|causa/.test(q),
        isHow:     /como|how|de que forma|maneira/.test(q),
        isSummary: /resumo|summary|resume|sobre o que|about|sinopse/.test(q),
    };
}

function synthesizeAnswer(question, matches, bookTitle, intent) {
    if (!matches.length) return null;

    const best = matches[0].text;
    const entities = extractEntities(best);
    const entityStr = entities.length > 0 ? entities.join(', ') : null;

    const sentences = best
        .split(/(?<=[.!?])\s+/)
        .filter(s => s.length > 30)
        .slice(0, 3)
        .join(' ');

    if (intent.isWho && entityStr) {
        return `Em "${bookTitle}", os personagens relacionados à sua pergunta incluem: ${entityStr}. Contexto encontrado: "${sentences}"`;
    }
    if (intent.isWhere) {
        return `O cenário descrito em "${bookTitle}" para sua pergunta: "${sentences}"`;
    }
    if (intent.isWhen) {
        return `Quanto ao momento em "${bookTitle}": "${sentences}"`;
    }
    if (intent.isWhy) {
        return `A motivação/razão encontrada em "${bookTitle}": "${sentences}"`;
    }
    if (intent.isSummary) {
        return `Trecho relevante de "${bookTitle}": "${sentences}"`;
    }

    return `Com base no texto de "${bookTitle}": "${sentences}"`;
}

function askAboutBook(question, fullText, topN = 4, bookTitle = 'este livro') {
    const qTokens = tokenizeAndStem(question);

    if (qTokens.length === 0) {
        return {
            matches: [],
            answer: null,
            message: 'Não foi possível identificar palavras-chave na pergunta. Tente ser mais específico.'
        };
    }

    const segments = segmentText(fullText);

    if (segments.length === 0) {
        return {
            matches: [],
            answer: null,
            message: 'Conteúdo do livro indisponível para análise.'
        };
    }

    const segTokens = segments.map(s => tokenizeAndStem(s.context));
    const idf = buildIDF(segTokens);
    const avgLen = segTokens.reduce((s, t) => s + t.length, 0) / segTokens.length;

    const scored = segments.map((seg, i) => ({
        text: seg.text,
        score: bm25Score(qTokens, segTokens[i], idf, avgLen),
        index: seg.index,
    }));

    const sorted = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);

    const selected = [];
    const usedIndices = new Set();

    for (const s of sorted) {
        if (selected.length >= topN) break;
        const isTooClose = [...usedIndices].some(idx => Math.abs(idx - s.index) < 2);
        if (!isTooClose) {
            selected.push(s);
            usedIndices.add(s.index);
        }
    }

    if (selected.length === 0) {
        return {
            matches: [],
            answer: null,
            message: 'Não encontrei trechos relacionados a essa pergunta no livro. Tente reformular com outras palavras-chave.'
        };
    }

    const maxScore = selected[0].score;
    const matches = selected.map(s => ({
        text: s.text,
        excerpt: s.text.length > 600 ? s.text.slice(0, 600) + '…' : s.text,
        relevance: Math.min(Math.round((s.score / maxScore) * 100), 99),
    }));

    const intent = detectIntent(question);
    const answer = synthesizeAnswer(question, matches, bookTitle, intent);

    return { matches, answer, message: null };
}

module.exports = { askAboutBook, tokenize, tokenizeAndStem };