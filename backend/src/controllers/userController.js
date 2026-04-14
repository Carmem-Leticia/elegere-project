const pool = require('../config/db');

const userController = {
    async getProfile(req, res) {
        try {
            const user_id = req.user.id;
            const result = await pool.query(
                'SELECT id, name, email, created_at FROM users WHERE id = $1',
                [user_id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Usuário não encontrado." });
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Erro ao buscar perfil." });
        }
    },

    async updateProfile(req, res) {
        try {
            const user_id = req.user.id;
            const { name, email } = req.body;
            
            const result = await pool.query(
                'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, created_at',
                [name, email, user_id]
            );
            res.json(result.rows[0]);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Erro ao atualizar perfil. Verifique se o email já está em uso." });
        }
    },

    async listAll(req, res) {
        try {
            const result = await pool.query(
                'SELECT id, name, email, created_at FROM users ORDER BY id ASC'
            );
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Erro ao listar usuários." });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            await pool.query('DELETE FROM users WHERE id = $1', [id]);
            res.status(204).send(); 
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Erro ao deletar usuário." });
        }
    }
};

module.exports = userController;