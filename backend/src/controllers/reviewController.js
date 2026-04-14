const pool = require('../config/db');

const reviewController = {
    async create(req, res) {
        try {
            const { book_id, rating, review_text } = req.body;
            const user_id = req.user.id; 
            
            const result = await pool.query(
                'INSERT INTO reviews (user_id, book_id, rating, review_text) VALUES ($1, $2, $3, $4) RETURNING *',
                [user_id, book_id, rating, review_text]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(400).json({ error: "Erro ao criar avaliação. Verifique se você já não avaliou este livro." });
        }
    },

    async getByBook(req, res) {
        try {
            const { bookId } = req.params;
            const result = await pool.query(
                'SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.book_id = $1 ORDER BY r.created_at DESC',
                [bookId]
            );
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: "Erro ao buscar avaliações." });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const { rating, review_text } = req.body;
            const user_id = req.user.id;

            const result = await pool.query(
                'UPDATE reviews SET rating = $1, review_text = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
                [rating, review_text, id, user_id]
            );
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: "Erro ao atualizar avaliação." });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const user_id = req.user.id;
            await pool.query('DELETE FROM reviews WHERE id = $1 AND user_id = $2', [id, user_id]);
            res.json({ message: "Avaliação deletada com sucesso!" });
        } catch (err) {
            res.status(500).json({ error: "Erro ao deletar avaliação." });
        }
    }
};

module.exports = reviewController;