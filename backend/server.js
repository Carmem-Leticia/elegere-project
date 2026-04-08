require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const bookRoutes = require('./src/routes/bookRoutes');
const progressRoutes = require('./src/routes/progressRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Conectando as rotas no "carro"
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/progress', progressRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
    console.log( `Servidor Elegere rodando em: http://localhost:${PORT}`);
});