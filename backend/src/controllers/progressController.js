const pool = require('../config/db');

const progressController = {

    async startReading(req, res) {
        try {
            const { book_id } = req.body;
            
            const user_id = req.user.id || req.user.userId; 
            
            if (!user_id) {
                console.error("ERRO: ID do usuário não encontrado no token. Payload:", req.user);
                return res.status(400).json({ error: "Erro de autenticação: ID do usuário ausente." });
            }

            const result = await pool.query(
                'INSERT INTO user_books (user_id, book_id) VALUES ($1, $2) RETURNING *',
                [user_id, book_id]
            );
            res.status(201).json(result.rows[0]);
        } catch (e) { 
            console.error("=== ERRO REAL AO INSERIR NO BANCO (startReading) ===", e);
            res.status(400).json({ error: "Livro já está na sua estante ou erro no banco." }); 
        }
    },

    async getMyLibrary(req, res) {
        try {
            const user_id = req.user.id || req.user.userId;
            const result = await pool.query(`
                SELECT b.id as book_id, b.title, b.author, ub.current_chapter, ub.status, ub.id as progress_id
                FROM user_books ub
                JOIN books b ON ub.book_id = b.id
                WHERE ub.user_id = $1`, [user_id]);
            res.json(result.rows);
        } catch (err) {
            console.error("=== ERRO AO BUSCAR BIBLIOTECA ===", err);
            res.status(500).json({ error: "Erro ao buscar biblioteca." });
        }
    },

    async updateProgress(req, res) {
        try {
            const { book_id } = req.params;
            const { current_chapter, status } = req.body;
            const user_id = req.user.id || req.user.userId;
            const result = await pool.query(
                'UPDATE user_books SET current_chapter = $1, status = $2 WHERE user_id = $3 AND book_id = $4 RETURNING *',
                [current_chapter, status, user_id, book_id]
            );
            res.json(result.rows[0]);
        } catch (err) {
            console.error("=== ERRO AO ATUALIZAR PROGRESSO ===", err);
            res.status(500).json({ error: "Erro ao atualizar progresso." });
        }
    },
  
    async removeBook(req, res) {
        try {
            const { book_id } = req.params;
            const user_id = req.user.id || req.user.userId;
            await pool.query('DELETE FROM user_books WHERE user_id = $1 AND book_id = $2', [user_id, book_id]);
            res.json({ message: "Livro removido da sua estante!" });
        } catch (err) {
            console.error("=== ERRO AO REMOVER LIVRO ===", err);
            res.status(500).json({ error: "Erro ao remover livro." });
        }
    }
};

module.exports = progressController;