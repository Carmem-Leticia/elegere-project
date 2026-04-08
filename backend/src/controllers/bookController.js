const pool = require('../config/db');

const bookController = {
   
    async create(req, res) {
        try {
            const { title, author, difficulty_level, cover_url } = req.body;
            const result = await pool.query(
                'INSERT INTO books (title, author, difficulty_level, cover_url) VALUES ($1, $2, $3, $4) RETURNING *',
                [title, author, difficulty_level, cover_url]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: "Erro ao criar livro." });
        }
    },
  
    async listAll(req, res) {
        try {
            const result = await pool.query('SELECT * FROM books');
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: "Erro ao listar livros." });
        }
    },
   
    async update(req, res) {
        try {
            const { id } = req.params;
            const { title, author, difficulty_level } = req.body;
            const result = await pool.query(
                'UPDATE books SET title = $1, author = $2, difficulty_level = $3 WHERE id = $4 RETURNING *',
                [title, author, difficulty_level, id]
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
            res.json({ message: "Livro deletado com sucesso!" });
        } catch (err) {
            res.status(500).json({ error: "Erro ao deletar livro." });
        }
    }
};

module.exports = bookController;