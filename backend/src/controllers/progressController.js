const pool = require('../config/db');

const progressController = {

    async startReading(req, res) {
        try {
            const { book_id } = req.body;
            const user_id = req.user?.id;

            console.log(`[startReading] user_id=${user_id} book_id=${book_id}`);

            if (!user_id) {
                return res.status(401).json({ error: 'Usuário não autenticado corretamente.' });
            }
            if (!book_id) {
                return res.status(400).json({ error: 'book_id é obrigatório.' });
            }

            const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
            if (userCheck.rows.length === 0) {
                return res.status(401).json({ 
                    error: 'Sua sessão expirou. Faça login novamente.',
                    code: 'SESSION_EXPIRED'
                });
            }

            const result = await pool.query(
                'INSERT INTO user_books (user_id, book_id) VALUES ($1, $2) RETURNING *',
                [user_id, book_id]
            );
            res.status(201).json(result.rows[0]);
        } catch(err) {
            console.error('[startReading] erro:', err.message, 'code:', err.code);
            if (err.code === '23505') {
                return res.status(409).json({ error: 'Este livro já está na sua estante.' });
            }
            if (err.code === '23503') {
                return res.status(401).json({ 
                    error: 'Sua sessão expirou. Faça login novamente.',
                    code: 'SESSION_EXPIRED'
                });
            }
            res.status(500).json({ error: 'Erro ao adicionar livro à estante: ' + err.message });
        }
    },

async getMyLibrary(req, res) {
    try {
        const user_id = req.user?.id;
        const result = await pool.query(`
            SELECT b.id as book_id, b.title, b.author, b.cover_url, 
                   b.gutenberg_id, b.language,
                   ub.current_chapter, ub.status, ub.id as progress_id
            FROM user_books ub
            JOIN books b ON ub.book_id = b.id
            WHERE ub.user_id = $1
            ORDER BY ub.id DESC
        `, [user_id]);
        res.json(result.rows);
    } catch(err) {
        console.error('[getMyLibrary] erro:', err.message);
        res.status(500).json({ error: 'Erro ao buscar biblioteca.' });
    }
},

    async updateProgress(req, res) {
        try {
            const { book_id } = req.params;
            const { current_chapter, status } = req.body;
            const user_id = req.user?.id;
            const result = await pool.query(
                `UPDATE user_books 
                 SET current_chapter = COALESCE($1, current_chapter),
                     status = COALESCE($2, status)
                 WHERE user_id = $3 AND book_id = $4 RETURNING *`,
                [current_chapter, status, user_id, book_id]
            );
            if (!result.rows.length) {
                return res.status(404).json({ error: 'Livro não encontrado na estante.' });
            }
            res.json(result.rows[0]);
        } catch(err) {
            console.error('[updateProgress] erro:', err.message);
            res.status(500).json({ error: 'Erro ao atualizar progresso.' });
        }
    },

    async removeBook(req, res) {
        try {
            const { book_id } = req.params;
            const user_id = req.user?.id;
            await pool.query(
                'DELETE FROM user_books WHERE user_id = $1 AND book_id = $2',
                [user_id, book_id]
            );
            res.json({ message: 'Livro removido da estante.' });
        } catch(err) {
            console.error('[removeBook] erro:', err.message);
            res.status(500).json({ error: 'Erro ao remover livro.' });
        }
    }
};

module.exports = progressController;