const pool                               = require('../config/db');
const { SUPPORTED_TAGS }                 = require('../services/recommendationEngine');
const { askAboutBook }                   = require('../services/bookAssistant');
const { getCachedBookText }              = require('../services/bookTextAccessor');

const TAG_EXPANSION = {
    'romance':           ['romance', 'drama', 'amor'],
    'drama':             ['drama', 'tragedia', 'teatro'],
    'aventura':          ['aventura', 'acao', 'exploracao', 'viagem'],
    'terror':            ['terror', 'horror', 'gotico', 'suspense', 'sobrenatural'],
    'misterio':          ['misterio', 'detetive', 'crime', 'investigacao', 'suspense'],
    'ficcao-cientifica': ['ficcao-cientifica', 'tecnologia', 'futuro', 'ciencia', 'especulativo'],
    'classicos':         ['classicos', 'literatura-europeia', 'literatura-brasileira'],
    'poesia':            ['poesia', 'versos', 'lirismo', 'arte'],
    'filosofia':         ['filosofia', 'ensaio', 'etica', 'pensamento', 'reflexao'],
    'animais':           ['animais', 'infantil'],
    'humor':             ['humor', 'infantil', 'magia'],
    'fantasia':          ['fantasia', 'magia', 'infantil', 'sobrenatural'],
};

function parseTagsField(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags.map(t => String(t).trim().toLowerCase()).filter(Boolean);
    if (typeof tags === 'string') {
        return tags.replace(/^\{|\}$/g, '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    }
    return [];
}

function normalizeVector(vec) {
    const norm = Math.sqrt([...vec.values()].reduce((s, w) => s + w * w, 0));
    if (norm === 0) return new Map(vec);
    const out = new Map();
    vec.forEach((v, k) => out.set(k, v / norm));
    return out;
}

function cosineSimilarity(vecA, vecB) {
    if (!vecA.size || !vecB.size) return 0;
    let dot = 0;
    for (const [k, wa] of vecA) {
        const wb = vecB.get(k);
        if (wb) dot += wa * wb;
    }
    const normB = Math.sqrt([...vecB.values()].reduce((s, w) => s + w * w, 0));
    return normB === 0 ? 0 : dot / normB;
}

async function generateRecommendations(userId, limit) {
    const [prefsRes, shelfRes, popRes, booksRes] = await Promise.all([
        pool.query('SELECT tag, weight FROM user_preferences WHERE user_id = $1', [userId]),
        pool.query(
            `SELECT b.tags, b.id AS book_id, ub.status
             FROM user_books ub
             JOIN books b ON ub.book_id = b.id
             WHERE ub.user_id = $1`,
            [userId]
        ),
        pool.query('SELECT book_id, COUNT(*) AS cnt FROM user_books GROUP BY book_id'),
        pool.query(
            `SELECT b.*, c.name AS category_name
             FROM books b LEFT JOIN categories c ON b.category_id = c.id`
        ),
    ]);

    const shelfIds   = new Set(shelfRes.rows.map(r => Number(r.book_id)));
    const candidates = booksRes.rows.filter(b => !shelfIds.has(Number(b.id)));
    if (candidates.length === 0) return [];

    const popMap  = new Map();
    let   maxPop  = 1;
    for (const r of popRes.rows) {
        const c = Number(r.cnt);
        popMap.set(Number(r.book_id), c);
        if (c > maxPop) maxPop = c;
    }

    const userVec = new Map();

    for (const p of prefsRes.rows) {
        const tag = String(p.tag).toLowerCase().trim();
        userVec.set(tag, (userVec.get(tag) || 0) + 1.0);

        const expansions = TAG_EXPANSION[tag] || [];
        for (const exp of expansions) {
            if (exp !== tag) {
                userVec.set(exp, (userVec.get(exp) || 0) + 0.6);
            }
        }
    }

    for (const row of shelfRes.rows) {
        const boost = row.status === 'concluido' ? 0.7 : 0.4;
        for (const tag of parseTagsField(row.tags)) {
            userVec.set(tag, (userVec.get(tag) || 0) + boost);
        }
    }

    if (userVec.size === 0) return [];

    const normUserVec = normalizeVector(userVec);

    const shelfSize     = shelfRes.rows.length;
    const personalWeight = Math.min(0.5 + shelfSize * 0.08, 0.9);
    const popularityWeight = 1 - personalWeight;

    const scored = candidates.map(book => {
        const bookTags = parseTagsField(book.tags);
        const bookVec  = new Map();
        bookTags.forEach(t => bookVec.set(t, 1));

        const cos      = cosineSimilarity(normUserVec, bookVec);
        const popScore = (popMap.get(Number(book.id)) || 0) / maxPop;
        const final    = cos * personalWeight + popScore * popularityWeight;

        return { ...book, match_score: Math.min(Math.round(final * 100), 99) };
    });

    return scored
        .filter(b => b.match_score > 0)
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, limit);
}

const aiController = {

    async listTags(req, res) {
        res.json({ tags: SUPPORTED_TAGS });
    },

    async savePreferences(req, res) {
        try {
            const user_id = req.user?.id;
            const { tags } = req.body;

            if (!user_id) return res.status(401).json({ error: 'Usuário não autenticado.' });
            if (!Array.isArray(tags) || tags.length === 0)
                return res.status(400).json({ error: 'Selecione ao menos uma preferência.' });

            const validTags = tags
                .filter(t => typeof t === 'string' && t.trim().length > 0)
                .map(t => t.toLowerCase().trim());

            if (validTags.length === 0)
                return res.status(400).json({ error: 'Nenhuma tag válida enviada.' });

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                await client.query('DELETE FROM user_preferences WHERE user_id = $1', [user_id]);
                for (const tag of validTags) {
                    await client.query(
                        `INSERT INTO user_preferences (user_id, tag, weight)
                         VALUES ($1, $2, 1.0)
                         ON CONFLICT (user_id, tag) DO UPDATE SET weight = 1.0`,
                        [user_id, tag]
                    );
                }
                await client.query('UPDATE users SET onboarding_done = TRUE WHERE id = $1', [user_id]);
                await client.query('COMMIT');
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }

            res.status(201).json({ message: 'Preferências salvas!', tags: validTags });
        } catch (err) {
            console.error('[savePreferences] ERRO:', err.message);
            res.status(500).json({ error: 'Erro ao salvar preferências: ' + err.message });
        }
    },

    async getPreferences(req, res) {
        try {
            const user_id = req.user?.id;
            const [prefs, userRow] = await Promise.all([
                pool.query('SELECT tag, weight FROM user_preferences WHERE user_id = $1', [user_id]),
                pool.query('SELECT onboarding_done FROM users WHERE id = $1', [user_id]),
            ]);
            res.json({
                preferences: prefs.rows,
                onboarding_done: userRow.rows[0]?.onboarding_done === true,
            });
        } catch (err) {
            console.error('[getPreferences] erro:', err.message);
            res.status(500).json({ error: 'Erro ao buscar preferências.' });
        }
    },

    async getRecommendations(req, res) {
        try {
            const user_id = req.user?.id;
            const limit   = Math.min(Number(req.query.limit) || 12, 30);

            const recommended = await generateRecommendations(user_id, limit);

            if (recommended.length === 0) {
                const pop = await pool.query(`
                    SELECT b.*, c.name AS category_name, COUNT(ub.id) AS shelf_count
                    FROM books b
                    LEFT JOIN categories c ON b.category_id = c.id
                    LEFT JOIN user_books ub ON ub.book_id = b.id
                    GROUP BY b.id, c.name
                    ORDER BY shelf_count DESC, b.id ASC
                    LIMIT $1
                `, [limit]);
                return res.json({
                    recommendations: pop.rows.map(b => ({ ...b, match_score: 0 })),
                    count: pop.rows.length,
                    mode: 'popular',
                    message: 'Configure suas preferências no Perfil para recomendações personalizadas.',
                });
            }

            res.json({ recommendations: recommended, count: recommended.length, mode: 'personalized' });
        } catch (err) {
            console.error('[getRecommendations] erro:', err.message);
            res.status(500).json({ error: 'Erro ao gerar recomendações.' });
        }
    },

    async askAboutBook(req, res) {
        try {
            const { book_id, question } = req.body;

            if (!book_id || !question?.trim())
                return res.status(400).json({ error: 'book_id e question são obrigatórios.' });
            if (question.trim().length < 3)
                return res.status(400).json({ error: 'Pergunta muito curta.' });

            const bookRes = await pool.query(
                `SELECT b.*, c.name AS category_name
                 FROM books b LEFT JOIN categories c ON b.category_id = c.id
                 WHERE b.id = $1`,
                [Number(book_id)]
            );
            const book = bookRes.rows[0];
            if (!book) return res.status(404).json({ error: 'Livro não encontrado.' });

            const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

            if (/\bautor\b|escritor|quem escreveu|who wrote|author/.test(q))
                return res.json({ question, matches: [], message: null,
                    answer: `"${book.title}" foi escrito por **${book.author || 'autor não registrado'}**.` });

            if (/\bgenero\b|\bcategoria\b|tipo de livro|genre/.test(q) && book.category_name)
                return res.json({ question, matches: [], message: null,
                    answer: `"${book.title}" pertence ao gênero **${book.category_name}**.` });

            if (/sinopse|sobre o que|de que trata|what.*about|synopsis|resumo/.test(q) && book.synopsis)
                return res.json({ question, matches: [], message: null,
                    answer: book.synopsis });

            if (/\bano\b|data|lancamento|publicado|published|quando foi|when was/.test(q))
                return res.json({ question, matches: [], message: null,
                    answer: `"${book.title}" de **${book.author}** é uma obra de domínio público disponível no Project Gutenberg — portanto publicada antes de 1928. A data exata não está nos metadados do catálogo.` });

            if (/\bidioma\b|\blíngua\b|\blingua\b|language/.test(q)) {
                const langMap = { en:'inglês', pt:'português', fr:'francês', es:'espanhol', de:'alemão' };
                return res.json({ question, matches: [], message: null,
                    answer: `"${book.title}" está disponível em **${langMap[book.language] || book.language || 'não informado'}**.` });
            }

            if (/dificuldade|nivel|level|dificil|facil|intermediario|avancado/.test(q)) {
                const lvlMap = { A1:'iniciante (A1)', A2:'básico (A2)', B1:'intermediário (B1)', B2:'intermediário avançado (B2)', C1:'avançado (C1)', 'PT-BR':'português brasileiro' };
                return res.json({ question, matches: [], message: null,
                    answer: `"${book.title}" tem nível **${lvlMap[book.difficulty_level] || book.difficulty_level || 'não classificado'}**.` });
            }

            if (/disponivel|gratuito|gutenberg|online|posso ler/.test(q))
                return res.json({ question, matches: [], message: null,
                    answer: book.gutenberg_id
                        ? `Sim! "${book.title}" está disponível gratuitamente no Project Gutenberg (ID ${book.gutenberg_id}). Clique em "Ler" no catálogo.`
                        : `"${book.title}" não possui texto vinculado ao Gutenberg neste catálogo.` });

            if (/vale a pena|devo ler|recomenda|worth reading|should i read/.test(q))
                return res.json({ question, matches: [], message: null,
                    answer: `"${book.title}" de ${book.author} é um clássico de **${book.category_name || 'literatura'}**. ${book.synopsis || ''} Disponível gratuitamente por ser domínio público.` });

            if (!book.gutenberg_id)
                return res.json({ question, matches: [], message: null,
                    answer: book.synopsis
                        ? `Sobre "${book.title}": ${book.synopsis}`
                        : `Não tenho o texto de "${book.title}" para análise. Pergunte sobre autor, gênero, sinopse, idioma ou nível.` });

            console.log(`[askAboutBook] gutenberg_id=${book.gutenberg_id}`);
            const fullText = await getCachedBookText(book.gutenberg_id);

            if (!fullText)
                return res.status(502).json({
                    error: 'Não foi possível carregar o texto. Verifique sua conexão e tente novamente.',
                });

            const result = askAboutBook(question, fullText, 4, book.title);

            if (!result.matches?.length) {
                result.message = result.message ||
                    `Não encontrei trechos específicos sobre isso em "${book.title}". Tente perguntar sobre personagens, eventos ou diálogos da obra.`;
            }

            res.json({ question, book_title: book.title, ...result });
        } catch (err) {
            console.error('[askAboutBook] erro:', err.message);
            res.status(500).json({ error: 'Erro interno ao processar a pergunta.' });
        }
    },
};

module.exports = aiController;