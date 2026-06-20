const pool = require('../config/db');

const goalController = {

    async create(req, res) {
        try {
            const { year_goal, target_books, daily_pages } = req.body;
            const user_id = req.user?.id;

            console.log(`[goalController.create] user_id=${user_id} year=${year_goal} target=${target_books}`);

            if (!user_id) {
                return res.status(401).json({ error: 'Usuário não autenticado.' });
            }
            
            const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
            if (userCheck.rows.length === 0) {
                return res.status(401).json({ 
                    error: 'Sua sessão expirou. Faça login novamente.',
                    code: 'SESSION_EXPIRED'
                });
            }

            const result = await pool.query(
                `INSERT INTO reading_goals (user_id, year_goal, target_books, daily_pages)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (user_id, year_goal)
                 DO UPDATE SET
                     target_books = EXCLUDED.target_books,
                     daily_pages  = EXCLUDED.daily_pages
                 RETURNING *`,
                [user_id, Number(year_goal), Number(target_books), Number(daily_pages) || 20]
            );
            res.status(201).json(result.rows[0]);
        } catch(err) {
            console.error('[goalController.create] erro:', err.message, 'code:', err.code);
            if (err.code === '23503') {
                return res.status(401).json({ 
                    error: 'Sua sessão expirou. Faça login novamente.',
                    code: 'SESSION_EXPIRED'
                });
            }
            res.status(500).json({ error: 'Erro ao criar meta: ' + err.message });
        }
    },

    async getMyGoal(req, res) {
        try {
            const user_id = req.user?.id;
            const result = await pool.query(
                'SELECT * FROM reading_goals WHERE user_id = $1 ORDER BY year_goal DESC',
                [user_id]
            );
            res.json(result.rows);
        } catch(err) {
            console.error('[goalController.getMyGoal] erro:', err.message);
            res.status(500).json({ error: 'Erro ao buscar metas.' });
        }
    },

    async update(req, res) {
        try {
            const { id } = req.params;
            const { target_books, completed_books, daily_pages } = req.body;
            const user_id = req.user?.id;
            const result = await pool.query(
                `UPDATE reading_goals
                 SET target_books    = COALESCE($1, target_books),
                     completed_books = COALESCE($2, completed_books),
                     daily_pages     = COALESCE($3, daily_pages)
                 WHERE id = $4 AND user_id = $5 RETURNING *`,
                [
                    target_books    != null ? Number(target_books)    : null,
                    completed_books != null ? Number(completed_books) : null,
                    daily_pages     != null ? Number(daily_pages)     : null,
                    Number(id), user_id
                ]
            );
            if (!result.rows.length) return res.status(404).json({ error: 'Meta não encontrada.' });
            res.json(result.rows[0]);
        } catch(err) {
            console.error('[goalController.update] erro:', err.message);
            res.status(500).json({ error: 'Erro ao atualizar meta.' });
        }
    },

    async delete(req, res) {
        try {
            const { id } = req.params;
            const user_id = req.user?.id;
            await pool.query('DELETE FROM reading_goals WHERE id = $1 AND user_id = $2', [Number(id), user_id]);
            res.status(204).send();
        } catch(err) {
            console.error('[goalController.delete] erro:', err.message);
            res.status(500).json({ error: 'Erro ao deletar meta.' });
        }
    }
};

module.exports = goalController;