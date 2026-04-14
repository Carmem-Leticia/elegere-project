const pool = require('../config/db');
const goalController = {
    
    async create(req, res) {
        try {
            const { year_goal, target_books } = req.body;
            const user_id = req.user.id;
            const result = await pool.query(
                'INSERT INTO reading_goals (user_id, year_goal, target_books) VALUES ($1, $2, $3) RETURNING *',
                [user_id, year_goal, target_books]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: "Erro ao criar meta." });
        }
    },
  
    async getMyGoal(req, res) {
        try {
            const user_id = req.user.id;
            const result = await pool.query('SELECT * FROM reading_goals WHERE user_id = $1', [user_id]);
            res.json(result.rows);
        } catch (err) {
            res.status(500).json({ error: "Erro ao buscar metas." });
        }
    },
    
    async update(req, res) {
        try {
            const { id } = req.params;
            const { target_books, completed_books } = req.body;
            const user_id = req.user.id;
            const result = await pool.query(
                'UPDATE reading_goals SET target_books = $1, completed_books = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
                [target_books, completed_books, id, user_id]
            );
            res.json(result.rows[0]);
        } catch (err) {
            res.status(500).json({ error: "Erro ao atualizar meta." });
        }
    },
   
    async delete(req, res) {
        try {
            const { id } = req.params;
            const user_id = req.user.id;
            await pool.query('DELETE FROM reading_goals WHERE id = $1 AND user_id = $2', [id, user_id]);
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ error: "Erro ao deletar meta." });
        }
    }
};

module.exports = goalController;