DROP TABLE IF EXISTS reading_notes   CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS reviews          CASCADE;
DROP TABLE IF EXISTS reading_goals    CASCADE;
DROP TABLE IF EXISTS user_books       CASCADE;
DROP TABLE IF EXISTS books            CASCADE;
DROP TABLE IF EXISTS categories       CASCADE;
DROP TABLE IF EXISTS users            CASCADE;

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100)  NOT NULL,
    email           VARCHAR(100)  UNIQUE NOT NULL,
    password_hash   VARCHAR(255)  NOT NULL,
    onboarding_done BOOLEAN       DEFAULT FALSE,
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(80)   UNIQUE NOT NULL,
    description VARCHAR(255)  DEFAULT 'Gênero literário',
    icon        VARCHAR(10)   DEFAULT '📚'
);

CREATE TABLE books (
    id               SERIAL PRIMARY KEY,
    title            VARCHAR(255) NOT NULL,
    author           VARCHAR(200),
    difficulty_level VARCHAR(10),
    cover_url        TEXT,
    gutenberg_id     INTEGER,
    language         VARCHAR(10)  DEFAULT 'en',
    synopsis         TEXT,
    tags             TEXT[]       DEFAULT '{}',
    category_id      INTEGER REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE user_books (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id)  ON DELETE CASCADE,
    book_id         INTEGER REFERENCES books(id)  ON DELETE CASCADE,
    current_chapter INTEGER DEFAULT 1,
    status          VARCHAR(20) DEFAULT 'lendo',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id)
);

CREATE TABLE reviews (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id)  ON DELETE CASCADE,
    book_id     INTEGER REFERENCES books(id)  ON DELETE CASCADE,
    rating      INTEGER CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, book_id)
);

CREATE TABLE reading_goals (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
    year_goal       INTEGER NOT NULL,
    target_books    INTEGER NOT NULL,
    completed_books INTEGER DEFAULT 0,
    daily_pages     INTEGER DEFAULT 20,
    UNIQUE(user_id, year_goal)
);

CREATE TABLE reading_notes (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    book_id     INTEGER REFERENCES books(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    chapter_ref INTEGER,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_preferences (
    id      SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tag     VARCHAR(50) NOT NULL,
    weight  NUMERIC DEFAULT 1.0,
    UNIQUE(user_id, tag)
);

INSERT INTO categories (name, description, icon) VALUES
('Ficção Clássica',     'Os maiores romances e contos da literatura ocidental.',     '🏛️'),
('Romance Brasileiro',  'Obras de autores nacionais em domínio público.',            '🇧🇷'),
('Terror e Gótico',     'Horror, suspense e atmosfera sombria.',                     '🦇'),
('Aventura e Ação',     'Jornadas épicas, mar e exploração.',                        '⚔️'),
('Filosofia e Ensaio',  'Pensamento, ética e reflexão humana.',                      '🧠'),
('Ficção Científica',   'Ciência, tecnologia e futuros possíveis.',                  '🚀'),
('Drama e Teatro',      'Peças e obras dramáticas universais.',                      '🎭'),
('Poesia',              'Versos que atravessaram séculos.',                          '✒️'),
('Mistério e Detetive', 'Casos, crimes e raciocínio dedutivo.',                      '🔍'),
('Literatura Infantil', 'Clássicos para todas as idades.',                           '🧸');

INSERT INTO books (title, author, difficulty_level, language, gutenberg_id, synopsis, category_id) VALUES
('Pride and Prejudice',             'Jane Austen',           'B2','en',1342,  'Elizabeth Bennet e o orgulhoso Mr. Darcy navegam preconceitos sociais e mal-entendidos rumo a um amor improvável na Inglaterra Regência.', 1),
('Sense and Sensibility',           'Jane Austen',           'B2','en',161,   'Elinor e Marianne Dashwood personificam razão e emoção enquanto buscam o amor em uma sociedade rígida.', 1),
('Emma',                            'Jane Austen',           'B2','en',158,   'Emma Woodhouse, bela e inteligente, se mete na vida amorosa dos outros — com consequências inesperadas.', 1),
('The Great Gatsby',                'F. Scott Fitzgerald',   'B2','en',64317, 'Jay Gatsby joga festas luxuosas tentando reconquistar Daisy em Nova York nos anos 20, um mundo de excesso e vazio moral.', 1),
('Anna Karenina',                   'Leo Tolstoy',           'C1','en',1399,  'Uma aristocrata russa arrisca tudo por um caso de amor apaixonado e destrutivo na sociedade czarista.', 1),
('Crime and Punishment',            'Fyodor Dostoevsky',     'C1','en',2554,  'Um jovem estudante comete um assassinato acreditando estar acima da moral comum — e é consumido pela culpa.', 1),
('Jane Eyre',                       'Charlotte Brontë',      'B2','en',1260,  'Uma governanta órfã se apaixona pelo seu empregador misterioso, mas segredos sombrios ameaçam a felicidade deles.', 1),
('Wuthering Heights',               'Emily Brontë',          'B2','en',768,   'Uma história assombrosa de amor obsessivo e vingança nos ermos de Yorkshire entre Heathcliff e Cathy.', 1),
('Great Expectations',              'Charles Dickens',       'B2','en',1400,  'Pip, um órfão pobre, recebe uma fortuna misteriosa e descobre a verdadeira natureza da riqueza e da lealdade.', 1),
('A Tale of Two Cities',            'Charles Dickens',       'B2','en',98,    'Londres e Paris durante a Revolução Francesa: uma história de sacrifício, amor e o terror da guilhotina.', 1),
('The Picture of Dorian Gray',      'Oscar Wilde',           'B2','en',174,   'Um jovem belo troca a alma pela juventude eterna enquanto um retrato registra cada pecado em seu lugar.', 1),
('Madame Bovary',                   'Gustave Flaubert',      'B2','en',2413,  'Emma Bovary, entediada pela vida provincial, busca escapar pelo adultério e pelo luxo com consequências fatais.', 1),
('The Count of Monte Cristo',       'Alexandre Dumas',       'B1','en',1184,  'Edmond Dantès, preso injustamente, escapa, acumula fortuna e retorna como o misterioso Conde para se vingar.', 1),
('Les Misérables',                  'Victor Hugo',           'B2','en',135,   'Jean Valjean luta pela redenção na França pós-revolucionária, perseguido pelo implacável inspetor Javert.', 1),
('Don Quixote',                     'Miguel de Cervantes',   'C1','en',996,   'Um fidalgo enlouquece lendo romances de cavalaria e parte como cavaleiro-andante ao lado do fiel Sancho Pança.', 1),
('The Brothers Karamazov',          'Fyodor Dostoevsky',     'C1','en',28054, 'Um romance filosófico apaixonado sobre fé, dúvida, família e moralidade, centrado no assassinato de um pai cruel.', 1),
('Middlemarch',                     'George Eliot',          'C1','en',145,   'Um romance panorâmico da vida provincial inglesa examinando casamentos, ambições e escolhas morais complexas.', 1),
('David Copperfield',               'Charles Dickens',       'B2','en',766,   'Uma jornada semi-autobiográfica da infância difícil ao triunfo artístico, repleta de personagens memoráveis.', 1),
('The Hunchback of Notre-Dame',     'Victor Hugo',           'B2','en',2610,  'Quasimodo, o corcunda de Notre-Dame, ama a cigana Esmeralda em um conto de beleza, crueldade e destino.', 1),
('War and Peace',                   'Leo Tolstoy',           'C1','en',2600,  'Uma crônica épica da sociedade russa durante as Guerras Napoleônicas, traçando cinco famílias aristocráticas.', 1);

INSERT INTO books (title, author, difficulty_level, language, gutenberg_id, synopsis, category_id) VALUES
('Dom Casmurro',                       'Machado de Assis',         'PT-BR','pt',55752, 'Bentinho narra sua vida e o ciúme obsessivo por Capitu.', 2),
('Memórias Póstumas de Brás Cubas',    'Machado de Assis',         'PT-BR','pt',54829, 'Um defunto-autor narra sua própria vida com ironia e pessimismo.', 2),
('Quincas Borba',                      'Machado de Assis',         'PT-BR','pt',55682, 'Rubião herda uma fortuna e a filosofia do "Humanitismo" — e vai perdendo tudo gradualmente.', 2),
('Iracema',                            'José de Alencar',          'PT-BR','pt',37589, 'A virgem dos lábios de mel apaixona-se pelo guerreiro branco Martim numa história de amor e sacrifício.', 2),
('O Guarani',                          'José de Alencar',          'PT-BR','pt',29066, 'O índio Peri consagra sua vida à proteção de Ceci em aventuras no Brasil do século XVII.', 2),
('Ubirajara',                          'José de Alencar',          'PT-BR','pt',38396, 'Jaguarê conquista o título de Ubirajara numa saga épica do Brasil pré-colonial.', 2),
('A Moreninha',                        'Joaquim Manuel de Macedo', 'PT-BR','pt',33729, 'O primeiro romance brasileiro, narra o amor de Augusto pela encantadora Moreninha.', 2),
('O Cortiço',                          'Aluísio Azevedo',          'PT-BR','pt',36468, 'Retrato naturalista da vida coletiva em um cortiço carioca.', 2),
('Casa de Pensão',                     'Aluísio Azevedo',          'PT-BR','pt',37530, 'Amâncio chega ao Rio de Janeiro e se vê enredado em uma trama de sedução e tragédia.', 2),
('Til',                                'José de Alencar',          'PT-BR','pt',27925, 'Uma menina selvagem guarda um segredo que envolve crime e amor nos campos de São Paulo.', 2),
('Lucíola',                            'José de Alencar',          'PT-BR','pt',36590, 'O drama da cortesã Lúcia que busca redenção através do amor puro.', 2),
('Senhora',                            'José de Alencar',          'PT-BR','pt',28118, 'Aurélia Camargo compra o homem que ama como ato de vingança.', 2),
('A Escrava Isaura',                   'Bernardo Guimarães',       'PT-BR','pt',28066, 'A história da escrava Isaura que luta por liberdade. Ícone do abolicionismo literário.', 2),
('O Seminarista',                      'Bernardo Guimarães',       'PT-BR','pt',27871, 'Eugênio enfrenta o conflito entre vocação religiosa e o amor proibido por Margarida.', 2),
('Cenas da Vida Amazônica',            'José Veríssimo',           'PT-BR','pt',38799, 'Contos que retratam a vida ribeirinha na Amazônia do século XIX.', 2);

INSERT INTO books (title, author, difficulty_level, language, gutenberg_id, synopsis, category_id) VALUES
('Frankenstein',                   'Mary Shelley',    'B1','en',84,    'Victor Frankenstein cria vida e é horrorizado por sua criação.', 3),
('Dracula',                        'Bram Stoker',     'B2','en',345,   'Jonathan Harker torna-se prisioneiro do Conde Drácula na Transilvânia.', 3),
('Dr Jekyll and Mr Hyde',          'R. L. Stevenson', 'B1','en',43,    'Um advogado investiga a conexão entre o Dr. Jekyll e o aterrorizante Mr. Hyde.', 3),
('The Turn of the Screw',          'Henry James',     'B2','en',209,   'Uma governanta convicta de que as crianças são assombradas por fantasmas.', 3),
('The Call of Cthulhu',            'H.P. Lovecraft',  'B2','en',68236, 'Um homem descobre evidências de uma entidade cósmica adorada por cultos secretos.', 3),
('The Fall of the House of Usher', 'Edgar Allan Poe', 'B1','en',932,   'Um visitante testemunha o colapso mental de seu amigo na mansão Usher.', 3),
('The Masque of the Red Death',    'Edgar Allan Poe', 'A2','en',1064,  'O Príncipe Próspero reúne nobres para escapar da Morte Rubra — mas ela aparece como convidada.', 3),
('The Phantom of the Opera',       'Gaston Leroux',   'B1','en',175,   'Um músico desfigurado vive nos esgotos da Ópera de Paris, obcecado pela soprano Christine.', 3);

INSERT INTO books (title, author, difficulty_level, language, gutenberg_id, synopsis, category_id) VALUES
('The Adventures of Tom Sawyer',         'Mark Twain',      'A2','en',74,   'Tom Sawyer testemunha um assassinato e se envolve em caças ao tesouro no Mississippi.', 4),
('Adventures of Huckleberry Finn',       'Mark Twain',      'B1','en',76,   'Huck Finn desce o Mississippi com Jim numa jornada sobre liberdade e amizade.', 4),
('Treasure Island',                      'R. L. Stevenson', 'A2','en',120,  'Jim Hawkins parte com piratas em busca do ouro enterrado.', 4),
('Twenty Thousand Leagues Under the Sea','Jules Verne',     'B1','en',164,  'O Professor Aronnax viaja no submarino Nautilus com o Capitão Nemo.', 4),
('Around the World in Eighty Days',      'Jules Verne',     'A2','en',103,  'Phileas Fogg aposta que pode circum-navegar o globo em 80 dias.', 4),
('The Three Musketeers',                 'Alexandre Dumas', 'B1','en',1257, 'D''Artagnan se une a Athos, Porthos e Aramis para defender a honra da rainha.', 4),
('Robinson Crusoe',                      'Daniel Defoe',    'B1','en',521,  'Robinson Crusoe sobrevive 28 anos numa ilha deserta usando engenhosidade e fé.', 4),
('The Call of the Wild',                 'Jack London',     'A2','en',215,  'Buck, um cão doméstico, responde ao chamado da natureza selvagem no Klondike.', 4),
('White Fang',                           'Jack London',     'A2','en',910,  'Um lobo selvagem é gradualmente domesticado pela bondade humana.', 4),
('Gulliver''s Travels',                  'Jonathan Swift',  'B2','en',829,  'Lemuel Gulliver viaja a terras estranhas numa sátira do orgulho humano.', 4);

INSERT INTO books (title, author, difficulty_level, language, gutenberg_id, synopsis, category_id) VALUES
('Walden',                 'Henry David Thoreau', 'B2','en',205,   'Thoreau retira-se a uma cabana e reflete sobre simplicidade e vida deliberada.', 5),
('Civil Disobedience',     'Henry David Thoreau', 'B2','en',71,    'Ensaio que defende o dever moral de recusar leis injustas — influenciou Gandhi e MLK.', 5),
('Meditations',            'Marcus Aurelius',     'B2','en',2680,  'Guia estoico de um imperador romano para virtude e resiliência.', 5),
('On Liberty',             'John Stuart Mill',    'B2','en',34901, 'Defesa fundamental da liberdade individual contra o poder do Estado.', 5),
('The Republic',           'Plato',               'C1','en',1497,  'Sócrates discute justiça, o Estado ideal e a natureza da alma.', 5),
('Thus Spoke Zarathustra', 'Friedrich Nietzsche', 'C1','en',1998,  'Zaratustra compartilha a filosofia do Übermensch e da vontade de poder.', 5),
('Beyond Good and Evil',   'Friedrich Nietzsche', 'C1','en',4363,  'Crítica dos filósofos passados e exploração da moralidade.', 5);

INSERT INTO books (title, author, difficulty_level, language, gutenberg_id, synopsis, category_id) VALUES
('The Time Machine',                     'H.G. Wells',  'B1','en',35,   'Um inventor viaja até o ano 802.701 e descobre a humanidade dividida em duas espécies.', 6),
('The War of the Worlds',                'H.G. Wells',  'B1','en',36,   'Marcianos invadem a Inglaterra com raios de calor e máquinas trípodes.', 6),
('The Invisible Man',                    'H.G. Wells',  'B1','en',5230, 'Um cientista torna-se invisível e desce à loucura quando não consegue reverter o processo.', 6),
('The Island of Doctor Moreau',          'H.G. Wells',  'B1','en',159,  'Um náufrago descobre uma ilha onde um cientista cria criaturas meio-humanas.', 6),
('A Journey to the Center of the Earth', 'Jules Verne', 'B1','en',3748, 'Lidenbrock e seu sobrinho descobrem um mundo subterrâneo pré-histórico.', 6),
('The First Men in the Moon',            'H.G. Wells',  'B1','en',1013, 'Dois homens viajam à Lua e descobrem uma civilização de criaturas insectóides.', 6);

INSERT INTO books (title, author, difficulty_level, language, gutenberg_id, synopsis, category_id) VALUES
('Hamlet',                    'William Shakespeare', 'C1','en',1524, 'Hamlet jura vingar o assassinato de seu pai pelo próprio irmão.', 7),
('Othello',                   'William Shakespeare', 'C1','en',2265, 'Otelo é manipulado por Iago a acreditar que sua esposa foi infiel.', 7),
('Macbeth',                   'William Shakespeare', 'C1','en',1533, 'Instigado por sua esposa, Macbeth assassina o rei da Escócia.', 7),
('King Lear',                 'William Shakespeare', 'C1','en',1532, 'Um rei divide seu reino entre filhas com resultados catastróficos.', 7),
('Romeo and Juliet',          'William Shakespeare', 'B1','en',1112, 'Dois jovens de famílias rivais se apaixonam com consequências fatais.', 7),
('A Midsummer Night''s Dream','William Shakespeare', 'B2','en',1514, 'Amantes e atores atravessam uma floresta encantada onde Puck causa caos.', 7),
('A Doll''s House',           'Henrik Ibsen',        'B2','en',2542, 'Nora descobre que seu marido a vê como uma posse e decide partir.', 7),
('The Merchant of Venice',    'William Shakespeare', 'B2','en',2243, 'Shylock exige uma libra de carne num drama sobre misericórdia e justiça.', 7);

INSERT INTO books (title, author, difficulty_level, language, gutenberg_id, synopsis, category_id) VALUES
('Leaves of Grass',                     'Walt Whitman',    'B2','en',1322, 'Coleção revolucionária celebrando democracia e natureza em verso livre.', 8),
('Songs of Innocence and of Experience','William Blake',   'B2','en',574,  'Duas coleções explorando a natureza dual da alma humana.', 8),
('The Divine Comedy',                   'Dante Alighieri', 'C1','en',8800, 'Jornada épica pelo Inferno, Purgatório e Paraíso.', 8),
('Paradise Lost',                       'John Milton',     'C1','en',26,   'Poema épico sobre a queda de Satanás e a expulsão do Éden.', 8),
('The Raven and Other Poems',           'Edgar Allan Poe', 'B1','en',1065, 'Os poemas mais célebres de Poe: The Raven, Annabel Lee e outros.', 8);

INSERT INTO books (title, author, difficulty_level, language, gutenberg_id, synopsis, category_id) VALUES
('The Adventures of Sherlock Holmes', 'Arthur Conan Doyle', 'B1','en',1661, 'Doze histórias com Sherlock Holmes e Dr. Watson solucionando crimes em Londres.', 9),
('The Hound of the Baskervilles',     'Arthur Conan Doyle', 'B1','en',2852, 'Holmes investiga um lendário cão espectral nos pântanos de Dartmoor.', 9),
('A Study in Scarlet',                'Arthur Conan Doyle', 'B1','en',244,  'A primeira aparição de Sherlock Holmes: um assassinato em Londres.', 9),
('The Murders in the Rue Morgue',     'Edgar Allan Poe',    'B1','en',2148, 'Dupin — o primeiro detetive fictício — investiga um duplo assassinato impossível em Paris.', 9),
('The Mystery of the Yellow Room',    'Gaston Leroux',      'B2','en',1644, 'Uma mulher é atacada em um quarto trancado por dentro.', 9);

INSERT INTO books (title, author, difficulty_level, language, gutenberg_id, synopsis, category_id) VALUES
('Alice''s Adventures in Wonderland', 'Lewis Carroll',   'A2','en',11,  'Alice cai num buraco de coelho num mundo de criaturas fantásticas.', 10),
('Through the Looking-Glass',         'Lewis Carroll',   'A2','en',12,  'Alice entra em um mundo espelhado onde tudo é invertido.', 10),
('The Wonderful Wizard of Oz',        'L. Frank Baum',   'A1','en',55,  'Dorothy vai parar na terra de Oz e deve encontrar o Mágico para voltar.', 10),
('Peter Pan',                         'J.M. Barrie',     'A2','en',16,  'Peter Pan leva Wendy para a Terra do Nunca cheia de piratas e sereias.', 10),
('The Jungle Book',                   'Rudyard Kipling', 'A2','en',236, 'Mowgli é criado por lobos e enfrenta o temível tigre Shere Khan.', 10),
('Pinocchio',                         'Carlo Collodi',   'A1','en',500, 'Um boneco de madeira quer se tornar um menino de verdade.', 10);

UPDATE books
SET cover_url = 'https://www.gutenberg.org/cache/epub/' || gutenberg_id || '/pg' || gutenberg_id || '.cover.medium.jpg'
WHERE gutenberg_id IS NOT NULL;

UPDATE books SET tags = ARRAY['romance','drama','amor','classicos','literatura-europeia']
    WHERE category_id = 1;

UPDATE books SET tags = ARRAY['romance','drama','brasil','literatura-brasileira','classicos']
    WHERE category_id = 2;

UPDATE books SET tags = ARRAY['terror','horror','gotico','suspense','sobrenatural']
    WHERE category_id = 3;

UPDATE books SET tags = ARRAY['aventura','acao','exploracao','viagem','classicos']
    WHERE category_id = 4;

UPDATE books SET tags = ARRAY['filosofia','ensaio','etica','pensamento','reflexao']
    WHERE category_id = 5;

UPDATE books SET tags = ARRAY['ficcao-cientifica','tecnologia','futuro','ciencia','especulativo']
    WHERE category_id = 6;

UPDATE books SET tags = ARRAY['drama','teatro','tragedia','classicos','shakespeare']
    WHERE category_id = 7;

UPDATE books SET tags = ARRAY['poesia','versos','lirismo','literatura','arte']
    WHERE category_id = 8;

UPDATE books SET tags = ARRAY['misterio','detetive','crime','investigacao','suspense']
    WHERE category_id = 9;

UPDATE books SET tags = ARRAY['infantil','fantasia','animais','humor','magia']
    WHERE category_id = 10;