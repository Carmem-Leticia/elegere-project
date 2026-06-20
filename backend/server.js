require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes     = require('./src/routes/authRoutes');
const bookRoutes     = require('./src/routes/bookRoutes');
const progressRoutes = require('./src/routes/progressRoutes');
const categoryRoutes = require('./src/routes/categoryRoutes');
const reviewRoutes   = require('./src/routes/reviewRoutes');
const userRoutes     = require('./src/routes/userRoutes');
const libraryRoutes  = require('./src/routes/libraryRoutes');
const goalRoutes     = require('./src/routes/goalRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',      authRoutes);
app.use('/api/books',     bookRoutes);
app.use('/api/progress',  progressRoutes);
app.use('/api/categories',categoryRoutes);
app.use('/api/reviews',   reviewRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/library',   libraryRoutes);
app.use('/api/goals',     goalRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Elegere rodando em http://localhost:${PORT}`));