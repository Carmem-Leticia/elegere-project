const pool = require('../config/db');

const bookController = {
 
    async create(req, res) {
        try {
            const { title, author, difficulty_level, cover_url, category_id } = req.body;
            const result = await pool.query(
                'INSERT INTO books (title, author, difficulty_level, cover_url, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [title, author, difficulty_level, cover_url, category_id]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: "Erro ao criar livro." });
        }
    },

    async listAll(req, res) {
        try {
            const result = await pool.query(`
                SELECT b.*, c.name as category_name 
                FROM books b 
                LEFT JOIN categories c ON b.category_id = c.id
            `);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: "Erro ao listar livros." });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const { title, author, category_id } = req.body;
            const result = await pool.query(
                'UPDATE books SET title = $1, author = $2, category_id = $3 WHERE id = $4 RETURNING *',
                [title, author, category_id, id]
            );
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: "Erro ao atualizar livro." });
        }
    },
    
    async delete(req, res) {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM books WHERE id = $1', [id]);
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: "Erro ao deletar livro." });
        }
    }
};

module.exports = bookController;