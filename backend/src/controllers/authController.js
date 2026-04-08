const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db'); 

const authController = {
    async register(req, res) {
        try {
            const { name, email, password } = req.body;
            
            if (!name || !email || !password) {
                return res.status(400).json({ message: "Todos os campos são obrigatórios." });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            const newUser = await pool.query(
                'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
                [name, email, hashedPassword]
            );
            
            return res.status(201).json({ 
                message: "Usuário criado com sucesso!", 
                user: newUser.rows[0] 
            });

        } catch (err) {
            console.error(" ERRO NO CADASTRO:", err); 
            
            if (err.code === '23505') {
                return res.status(400).json({ message: "Este e-mail já está cadastrado em nosso sistema." });
            }
            
            return res.status(500).json({ message: "Erro interno no servidor ao cadastrar." });
        }
    },

    async login(req, res) {
        try {
            const { email, password } = req.body;

            const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            const user = userQuery.rows[0];

            if (!user) {
                return res.status(401).json({ message: "E-mail não encontrado." });
            }
            
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: "Senha incorreta." });
            }

            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });

            return res.status(200).json({ 
                token, 
                user: { id: user.id, name: user.name, email: user.email } 
            });

        } catch (err) {
            console.error(" ERRO NO LOGIN:", err);
            return res.status(500).json({ message: "Erro interno no servidor ao fazer login." });
        }
    }
};

module.exports = authController;