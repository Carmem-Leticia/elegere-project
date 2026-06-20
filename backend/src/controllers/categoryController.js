const pool = require('../config/db');

const categoryController = {
    
    async create(req, res) {
        try {
            const { name } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({ error: "Nome da categoria é obrigatório." });
            }

            const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: "Erro ao criar categoria." });
        }
    },
    
    async listAll(req, res) {
        try {
            const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: "Erro ao listar categorias." });
        }
    },
    
    async update(req, res) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({ error: "Nome da categoria é obrigatório." });
            }

            const result = await pool.query('UPDATE categories SET name = $1 WHERE id = $2 RETURNING *', [name, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Categoria não encontrada." });
            }

            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: "Erro ao atualizar categoria." });
        }
    },
    
    async delete(req, res) {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM categories WHERE id = $1', [id]);
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: "Erro ao deletar categoria." });
        }
    }
};

module.exports = categoryController;