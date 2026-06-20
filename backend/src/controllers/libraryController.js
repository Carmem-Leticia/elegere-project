const bookCache = new Map(); 
const CACHE_TTL = 60 * 60 * 1000; 

const getCached = (id) => {
    const entry = bookCache.get(id);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { bookCache.delete(id); return null; }
    return entry.content;
};
const setCache = (id, content) => bookCache.set(id, { content, ts: Date.now() });

const fetchWithTimeout = async (url, timeout = 10000, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            return res;
        } catch (err) {
            clearTimeout(id);
            if (attempt === retries) throw err;
            await new Promise(r => setTimeout(r, 500 * (attempt + 1))); // backoff
        }
    }
};

const getTxtUrls = (formats) => {
    const candidates = [
        formats['text/plain; charset=utf-8'],
        formats['text/plain; charset=us-ascii'],
        formats['text/plain'],
    ].filter(Boolean);
    return candidates.flatMap(url => {
        if (url.includes('aleph.gutenberg.org')) {
            const id = url.match(/\/(\d+)\//)?.[1];
            if (id) return [
                url,
                `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
                `https://www.gutenberg.org/files/${id}/${id}.txt`,
            ];
        }
        return [url];
    });
};

const libraryController = {

    async searchGutenberg(req, res) {
        try {
            const { q = '', lang = 'en', page = 1 } = req.query;
            const url = `https://gutendex.com/books/?search=${encodeURIComponent(q)}&languages=${lang}&page=${page}`;

            const response = await fetchWithTimeout(url, 12000);
            if (!response.ok) return res.status(502).json({ error: 'Falha ao contactar o Project Gutenberg.' });

            const data = await response.json();

            const books = data.results.map(book => {
                const txtUrls = getTxtUrls(book.formats);
                return {
                    gutenberg_id: book.id,
                    title: book.title,
                    author: book.authors.map(a => a.name).join(', ') || 'Desconhecido',
                    cover_url: book.formats['image/jpeg'] || null,
                    txt_url: txtUrls[0] || null,
                    txt_url_fallbacks: txtUrls.slice(1),
                    download_url_epub: book.formats['application/epub+zip'] || null,
                    read_online_url: `https://www.gutenberg.org/ebooks/${book.id}`,
                    language: book.languages[0] || 'en',
                    subjects: book.subjects.slice(0, 3),
                    download_count: book.download_count,
                    is_external: true,
                };
            });

            res.json({ count: data.count, next: data.next, previous: data.previous, results: books });

        } catch (err) {
            if (err.name === 'AbortError') return res.status(504).json({ error: 'Gutenberg demorou. Tente novamente.' });
            console.error('searchGutenberg:', err.message);
            res.status(500).json({ error: 'Erro ao buscar livros externos.' });
        }
    },

    async importToLocal(req, res) {
        const pool = require('../config/db');
        try {
            const { title, author, cover_url, difficulty_level, category_id, read_online_url, gutenberg_id } = req.body;
            if (!title) return res.status(400).json({ error: 'Título é obrigatório.' });

            const existing = await pool.query(
                'SELECT id FROM books WHERE title = $1 AND author = $2',
                [title, author || 'Desconhecido']
            );
            if (existing.rows.length > 0) {
                return res.status(409).json({ error: 'Livro já existe no catálogo.', book_id: existing.rows[0].id });
            }

            const result = await pool.query(
                `INSERT INTO books (title, author, difficulty_level, category_id, cover_url, gutenberg_id)
                 VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
                [title, author || 'Desconhecido', difficulty_level || 'B1', category_id || null,
                 cover_url || null, gutenberg_id || null]
            );

            res.status(201).json({ message: 'Livro importado!', book: result.rows[0] });
        } catch (err) {
            console.error('importToLocal:', err.message);
            res.status(500).json({ error: 'Erro ao importar livro.' });
        }
    },

    async lookupWord(req, res) {
        try {
            const cleanWord = req.params.word.trim().toLowerCase().replace(/[^a-z'-]/g, '');
            if (cleanWord.length < 2) return res.status(400).json({ error: 'Palavra inválida.' });

            const response = await fetchWithTimeout(
                `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`,
                6000
            );
            if (response.status === 404) return res.status(404).json({ error: 'Palavra não encontrada.', word: cleanWord });
            if (!response.ok) return res.status(502).json({ error: 'Dicionário indisponível.' });

            const data = await response.json();
            const entry = data[0];
            const phonetic = entry.phonetics?.find(p => p.text)?.text || '';
            const audioUrl = entry.phonetics?.find(p => p.audio?.startsWith('http'))?.audio || '';

            const definitions = [];
            for (const meaning of entry.meanings) {
                for (const def of meaning.definitions.slice(0, 2)) {
                    definitions.push({
                        partOfSpeech: meaning.partOfSpeech,
                        definition: def.definition,
                        example: def.example || null,
                        synonyms: def.synonyms?.slice(0, 3) || [],
                    });
                }
            }

            res.json({ word: entry.word, phonetic, audio_url: audioUrl, definitions: definitions.slice(0, 4) });
        } catch (err) {
            if (err.name === 'AbortError') return res.status(504).json({ error: 'Dicionário demorou para responder.' });
            console.error('lookupWord:', err.message);
            res.status(500).json({ error: 'Erro ao buscar definição.' });
        }
    },

    async readBook(req, res) {
        try {
            const { gutenberg_id } = req.params;
            const numId = parseInt(gutenberg_id);
            if (isNaN(numId)) return res.status(400).json({ error: 'ID inválido.' });

            const cached = getCached(numId);
            if (cached) {
                console.log(`[cache hit] book ${numId}`);
                return res.json(cached);
            }

            const txtUrlParam = req.query.txt_url;
            const fallbacksParam = req.query.txt_fallbacks;
            let urlsToTry = [];

            if (txtUrlParam) {
                urlsToTry.push(decodeURIComponent(txtUrlParam));
                if (fallbacksParam) {
                    try { urlsToTry.push(...JSON.parse(decodeURIComponent(fallbacksParam))); } catch {}
                }
            }

            if (urlsToTry.length === 0) {
                const metaRes = await fetchWithTimeout(`https://gutendex.com/books/${numId}`, 10000);
                if (!metaRes.ok) return res.status(404).json({
                    error: 'Livro não encontrado no Project Gutenberg.',
                    fallback_url: `https://www.gutenberg.org/ebooks/${numId}`
                });
                const meta = await metaRes.json();
                urlsToTry = getTxtUrls(meta.formats || {});
            }
            urlsToTry.push(
                `https://www.gutenberg.org/files/${numId}/${numId}-0.txt`,
                `https://www.gutenberg.org/files/${numId}/${numId}.txt`,
                `https://www.gutenberg.org/cache/epub/${numId}/pg${numId}.txt`
            );
            urlsToTry = [...new Set(urlsToTry)];

            let fullText = null;
            let lastError = '';
            for (const url of urlsToTry) {
                try {
                    console.log(`[readBook] tentando: ${url}`);
                    const textRes = await fetchWithTimeout(url, 18000, 1);
                    if (textRes.ok) {
                        fullText = await textRes.text();
                        console.log(`[readBook] sucesso: ${url}`);
                        break;
                    }
                    lastError = `HTTP ${textRes.status} em ${url}`;
                } catch (e) {
                    lastError = `${e.name}: ${e.message}`;
                    console.warn(`[readBook] falhou ${url}: ${lastError}`);
                }
            }

            if (!fullText) {
                return res.status(502).json({
                    error: 'Não foi possível baixar o conteúdo. Tente pelo link externo.',
                    fallback_url: `https://www.gutenberg.org/ebooks/${numId}`,
                    debug: lastError
                });
            }

            const startMarkers = [
                '*** START OF THE PROJECT GUTENBERG',
                '*** START OF THIS PROJECT GUTENBERG',
                '***START OF THE PROJECT GUTENBERG',
                '*END*THE SMALL PRINT',
                'END OF THE PROJECT GUTENBERG',
            ];
            let startIndex = 0;
            for (const marker of startMarkers) {
                const idx = fullText.indexOf(marker);
                if (idx !== -1) {
                    startIndex = fullText.indexOf('\n', idx) + 1;
                    break;
                }
            }
            const endMarker = '*** END OF THE PROJECT GUTENBERG';
            let endIndex = fullText.indexOf(endMarker);
            if (endIndex === -1) endIndex = fullText.length;

            const MAX_CHARS = 100000;
            const content = fullText.substring(startIndex, Math.min(startIndex + MAX_CHARS, endIndex)).trim();

            const result = { gutenberg_id: numId, content, is_truncated: (startIndex + MAX_CHARS) < endIndex };
            setCache(numId, result);
            res.json(result);

        } catch (err) {
            console.error('readBook:', err.message);
            res.status(500).json({
                error: 'Erro interno ao carregar o livro.',
                fallback_url: `https://www.gutenberg.org/ebooks/${req.params.gutenberg_id}`
            });
        }
    },

    async searchStandardEbooks(req, res) {
        try {
            const { q = '' } = req.query;
   
            const url = 'https://standardebooks.org/opds/all';
            const response = await fetchWithTimeout(url, 12000);
            if (!response.ok) return res.status(502).json({ error: 'Falha ao contactar Standard Ebooks.' });

            const xml = await response.text();
        
            const entries = [];
            const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
            let match;
            const qLower = q.toLowerCase();
            while ((match = entryRegex.exec(xml)) !== null) {
                const block = match[1];
                const title  = (block.match(/<title>(.*?)<\/title>/))?.[1]?.replace(/&amp;/g,'&') || '';
                const author = (block.match(/<name>(.*?)<\/name>/))?.[1]?.replace(/&amp;/g,'&') || '';
                const link   = (block.match(/<id>(.*?)<\/id>/))?.[1] || '';
                const epub   = (block.match(/href="(https:\/\/standardebooks\.org\/ebooks\/[^"]+\.epub)"/))?.[1] || '';
                const cover  = (block.match(/href="(https:\/\/standardebooks\.org\/images\/covers\/[^"]+)"/m))?.[1] || '';

                if (!title) continue;
                if (q && !title.toLowerCase().includes(qLower) && !author.toLowerCase().includes(qLower)) continue;

                entries.push({ title, author, epub_url: epub, cover_url: cover, source_url: link, source: 'Standard Ebooks' });
                if (entries.length >= 20) break;
            }

            res.json({ results: entries, count: entries.length });
        } catch (err) {
            console.error('searchStandardEbooks:', err.message);
            res.status(500).json({ error: 'Erro ao buscar em Standard Ebooks.' });
        }
    },
};

module.exports = libraryController;