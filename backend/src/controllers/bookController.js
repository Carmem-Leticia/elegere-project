const pool = require('../config/db');

const bookController = {
    async create(req, res) {
        try {
            const { title, author, difficulty_level, category_id, cover_url } = req.body;
            const result = await pool.query(
                'INSERT INTO books (title, author, difficulty_level, category_id, cover_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [title, author, difficulty_level, category_id, cover_url]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: "Erro ao cadastrar o livro." });
        }
    },

    async listAll(req, res) {
        try {
            const result = await pool.query(`
                SELECT b.*, c.name as category_name 
                FROM books b
                LEFT JOIN categories c ON b.category_id = c.id
                ORDER BY b.id ASC
            `);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: "Erro ao buscar catálogo de livros." });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const { title, author, difficulty_level, category_id, cover_url } = req.body;
            
        
            const result = await pool.query(
                `UPDATE books 
                 SET title = COALESCE($1, title), 
                     author = COALESCE($2, author), 
                     difficulty_level = COALESCE($3, difficulty_level), 
                     category_id = COALESCE($4, category_id), 
                     cover_url = COALESCE($5, cover_url) 
                 WHERE id = $6 RETURNING *`,
                [title, author, difficulty_level, category_id, cover_url, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Livro não encontrado." });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: "Erro ao atualizar o livro." });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Livro não encontrado." });
            }

            res.json({ message: "Livro deletado com sucesso do catálogo!" });
        } catch (err) {
            res.status(500).json({ error: "Erro ao deletar o livro." });
        }
    }
};

module.exports = bookController;