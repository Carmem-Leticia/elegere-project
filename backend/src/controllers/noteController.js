const pool = require('../config/db');

const noteController = {

    async create(req, res) {
        try {
            const user_id = req.user?.id;
            const { book_id, content, chapter_ref } = req.body;

            if (!user_id) return res.status(401).json({ error: 'Usuário não autenticado.' });
            if (!book_id || !content || !content.trim()) {
                return res.status(400).json({ error: 'book_id e content são obrigatórios.' });
            }

            const result = await pool.query(
                `INSERT INTO reading_notes (user_id, book_id, content, chapter_ref)
                 VALUES ($1, $2, $3, $4) RETURNING *`,
                [user_id, book_id, content.trim(), chapter_ref || null]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('[noteController.create] erro:', err.message);
            if (err.code === '23503') {
                return res.status(404).json({ error: 'Livro não encontrado.' });
            }
            res.status(500).json({ error: 'Erro ao criar nota.' });
        }
    },

    async listByBook(req, res) {
        try {
            const user_id = req.user?.id;
            const { bookId } = req.params;

            const result = await pool.query(
                `SELECT * FROM reading_notes
                 WHERE user_id = $1 AND book_id = $2
                 ORDER BY chapter_ref ASC NULLS LAST, created_at DESC`,
                [user_id, bookId]
            );
            res.json(result.rows);
        } catch (err) {
            console.error('[noteController.listByBook] erro:', err.message);
            res.status(500).json({ error: 'Erro ao buscar notas.' });
        }
    },

    async listAllMine(req, res) {
        try {
            const user_id = req.user?.id;
            const result = await pool.query(`
                SELECT rn.*, b.title as book_title, b.author as book_author
                FROM reading_notes rn
                JOIN books b ON rn.book_id = b.id
                WHERE rn.user_id = $1
                ORDER BY rn.updated_at DESC
            `, [user_id]);
            res.json(result.rows);
        } catch (err) {
            console.error('[noteController.listAllMine] erro:', err.message);
            res.status(500).json({ error: 'Erro ao buscar notas.' });
        }
    },
    async update(req, res) {
        try {
            const user_id = req.user?.id;
            const { id } = req.params;
            const { content, chapter_ref } = req.body;

            const result = await pool.query(
                `UPDATE reading_notes
                 SET content     = COALESCE($1, content),
                     chapter_ref = COALESCE($2, chapter_ref),
                     updated_at  = CURRENT_TIMESTAMP
                 WHERE id = $3 AND user_id = $4 RETURNING *`,
                [content?.trim() || null, chapter_ref ?? null, id, user_id]
            );
            if (!result.rows.length) return res.status(404).json({ error: 'Nota não encontrada.' });
            res.json(result.rows[0]);
        } catch (err) {
            console.error('[noteController.update] erro:', err.message);
            res.status(500).json({ error: 'Erro ao atualizar nota.' });
        }
    },

    async delete(req, res) {
        try {
            const user_id = req.user?.id;
            const { id } = req.params;
            const result = await pool.query(
                'DELETE FROM reading_notes WHERE id = $1 AND user_id = $2 RETURNING id',
                [id, user_id]
            );
            if (!result.rows.length) return res.status(404).json({ error: 'Nota não encontrada.' });
            res.json({ message: 'Nota removida.' });
        } catch (err) {
            console.error('[noteController.delete] erro:', err.message);
            res.status(500).json({ error: 'Erro ao remover nota.' });
        }
    },
};

module.exports = noteController;