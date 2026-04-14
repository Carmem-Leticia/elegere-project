DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS reading_goals CASCADE;
DROP TABLE IF EXISTS user_books CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255) DEFAULT 'Gênero literário' 
);

CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(150),
    difficulty_level VARCHAR(10),
    cover_url TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE user_books (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    current_chapter INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'lendo',
    UNIQUE(user_id, book_id)
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reading_goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    year_goal INTEGER NOT NULL,
    target_books INTEGER NOT NULL,
    completed_books INTEGER DEFAULT 0
);

INSERT INTO categories (name, description) VALUES 
('Ficção Clássica', 'Obras consagradas da literatura mundial.'), 
('Romance Brasileiro', 'Histórias de romance ambientadas no Brasil.'), 
('Terror Literário', 'Livros focados em suspense e terror psicológico.');

INSERT INTO books (title, author, difficulty_level, category_id) VALUES 
('The Great Gatsby', 'F. Scott Fitzgerald', 'B2', 1),
('Dom Casmurro', 'Machado de Assis', 'PT-BR', 2),
('Frankenstein', 'Mary Shelley', 'B1', 3);
