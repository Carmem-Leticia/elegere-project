import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Mail, Lock, ChevronRight, BookMarked, 
  User, LogOut, Library, Star, Eye, EyeOff,
  Home, Play, Sparkles, Flame, Plus, Trash2, Edit2, Check, MessageSquare
} from 'lucide-react';
import api from './services/api';

const GlobalStyle = () => (
  <style>
    {`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
      body, html, #root { margin: 0; padding: 0; width: 100%; min-height: 100vh; background-color: #0b1120; font-family: 'Inter', sans-serif; color: #fff; box-sizing: border-box; }
      * { box-sizing: border-box; }
      /* Adicionando um scrollbar suave e visível apenas quando necessário */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .hide-scroll::-webkit-scrollbar { display: none; } /* Oculta a barra apenas nos destaques */
    `}
  </style>
);

function App() {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [currentTab, setCurrentTab] = useState('inicio');
  const [catalogo, setCatalogo] = useState([]);
  const [minhaLista, setMinhaLista] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('userName');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser({ name: savedUser, initials: savedUser.substring(0, 2).toUpperCase() });
    }
  }, []);

  const carregarDados = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
      
      const resBooks = await api.get('/books', config);
      if (resBooks.data) setCatalogo(resBooks.data);

      const resLib = await api.get('/progress', config);
      if (resLib.data) setMinhaLista(resLib.data);
    } catch (error) {
      console.warn("Erro ao carregar dados.", error);
    }
  }, []);

  useEffect(() => {
    if (user) carregarDados();
  }, [user, carregarDados]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      if (isLogin) {
        const response = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('userName', response.data.user.name);
        setMessage({ text: `Bem-vindo!`, type: 'success' });
        setTimeout(() => setUser({ name: response.data.user.name, initials: response.data.user.name.substring(0, 2).toUpperCase() }), 1000);
      } else {
        await api.post('/auth/register', { name, email, password });
        setMessage({ text: 'Conta criada! Faça login.', type: 'success' });
        setIsLogin(true);
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Erro na conexão.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setCurrentTab('inicio');
  };

  const getConfig = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const criarLivro = async () => {
    const title = prompt("Título do Livro:");
    const author = prompt("Autor do Livro:");
    if (!title || !author) return;
    try {
      await api.post('/books', { title, author, total_chapters: 20 }, getConfig());
      alert("Livro cadastrado!");
      carregarDados();
    } catch (err) { alert(`Erro ao cadastrar: ${err.response?.data?.message || err.message}`); }
  };

  const editarLivro = async (id) => {
    const newTitle = prompt("Novo título:");
    if (!newTitle) return;
    try {
      await api.put(`/books/${id}`, { title: newTitle }, getConfig());
      alert("Livro atualizado!");
      carregarDados();
    } catch (err) { alert(`Erro: ${err.response?.data?.message || err.message}`); }
  };

  const excluirLivro = async (id) => {
    if (!window.confirm("Excluir este livro do catálogo definitivamente?")) return;
    try {
      await api.delete(`/books/${id}`, getConfig());
      carregarDados();
    } catch (err) { alert(`Erro: ${err.response?.data?.message || err.message}`); }
  };

  const adicionarAEstante = async (bookId) => {
    try {
      await api.post('/progress', { book_id: bookId, current_chapter: 1 }, getConfig());
      alert('Livro adicionado à sua estante!');
      carregarDados();
    } catch (err) { alert(`Falha ao adicionar: ${err.response?.data?.message || err.message}`); }
  };

  const atualizarCapitulo = async (bookId, novoCapitulo) => {
    if (novoCapitulo < 0) return;
    try {
      await api.put(`/progress/${bookId}`, { current_chapter: novoCapitulo }, getConfig());
      carregarDados();
    } catch (err) { alert(`Erro ao atualizar capítulo: ${err.response?.data?.message || err.message}`); }
  };

  const removerDaEstante = async (bookId) => {
    if (!window.confirm("Remover da sua estante?")) return;
    try {
      await api.delete(`/progress/${bookId}`, getConfig());
      carregarDados();
    } catch (err) { alert(`Erro ao remover: ${err.response?.data?.message || err.message}`); }
  };

  const criarAvaliacao = async (bookId) => {
    const rating = prompt("Nota de 1 a 5:");
    const comment = prompt("Seu comentário:");
    if (!rating) return;
    try {
      await api.post('/reviews', { 
        book_id: bookId, 
        rating: Number(rating), 
        review_text: comment 
      }, getConfig());
      
      alert("Avaliação salva!");
    } catch (err) { 
      alert(`Erro: ${err.response?.data?.error || err.message}`); 
    }
  };

  const verAvaliacoes = async (bookId) => {
    try {
      const res = await api.get(`/reviews/book/${bookId}`, getConfig());
      
      const avaliacoesDoLivro = res.data;
      
      if (!avaliacoesDoLivro || avaliacoesDoLivro.length === 0) {
        alert("Ainda não há avaliações para este livro.");
        return;
      }

      const textoAvaliacoes = avaliacoesDoLivro.map(r => 
        `Nota: ${r.rating} ⭐\nComentário: ${r.review_text}`
      ).join('\n\n---\n\n');
      
      alert(`AVALIAÇÕES:\n\n${textoAvaliacoes}`);
    } catch (err) { 
      alert(`Erro ao buscar avaliações: ${err.response?.data?.error || err.message}`); 
    }
  };

  const RenderStars = ({ rating }) => (
    <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={12} fill={i < rating ? "#fbbf24" : "transparent"} color={i < rating ? "#fbbf24" : "#475569"} />
      ))}
    </div>
  );

  const renderTabContent = () => {
    switch (currentTab) {
      case 'inicio':
        return (
          <div style={styles.page}>
            <header style={styles.userHeader}>
              <div><p style={styles.greeting}>Boa tarde 👋</p><h2 style={styles.userName}>{user.name}</h2></div>
              <div style={styles.avatar}>{user.initials}</div>
            </header>
            
            <div style={styles.streakCard}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Flame size={28} color="#f97316" fill="#f97316" />
                <div><h3 style={{ margin: 0, fontSize: '18px' }}>7 dias de streak!</h3><p style={{ margin: '0', fontSize: '12px' }}>Leia hoje para manter.</p></div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{...styles.sectionTitle, marginBottom: 0}}><Sparkles size={14} color="#fbbf24" /> DESTAQUES</h3>
              <button onClick={() => setCurrentTab('catalogo')} style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                Ver tudo
              </button>
            </div>
            
            <div style={styles.horizontalScroll} className="hide-scroll">
              {catalogo.slice(0, 5).map(livro => (
                <div key={livro.id} style={styles.bookCardMini} onClick={() => setCurrentTab('catalogo')}>
                  <div style={styles.coverIcon}>📖</div>
                  <h4 style={styles.bookTitleMini} className="truncate">{livro.title}</h4>
                  <RenderStars rating={5} />
                </div>
              ))}
              <div style={{...styles.bookCardMini, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.7}} onClick={() => setCurrentTab('catalogo')}>
                 <div style={{...styles.coverIcon, backgroundColor: 'rgba(255,255,255,0.05)', fontSize: '16px', border: '1px dashed #475569'}}>+ Catálogo</div>
              </div>
            </div>

            <h3 style={{...styles.sectionTitle, marginTop: '25px'}}>CONTINUE LENDO</h3>
            {minhaLista.length === 0 ? <p style={{color: '#64748b', fontSize: '13px'}}>Adicione livros do catálogo para começar!</p> : null}
            {minhaLista.slice(0, 3).map(item => (
              <div key={item.id || item.book_id} style={styles.continueCard}>
                <div style={styles.continueCover}>📜</div>
                <div style={{ flex: 1, marginLeft: '15px' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{item.title || 'Livro ID: ' + item.book_id}</h4>
                  <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#94a3b8' }}>Capítulo {item.current_chapter || 0}</p>
                </div>
                <button onClick={() => setCurrentTab('leitor')} style={styles.readButton}>
                  Abrir <Play size={12} fill="#a5b4fc" style={{marginLeft: '2px'}}/>
                </button>
              </div>
            ))}
          </div>
        );

      case 'catalogo':
        return (
          <div style={styles.page}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{margin: 0}}>Catálogo</h2>
              <button onClick={criarLivro} style={styles.actionBtn}><Plus size={16}/> Novo</button>
            </div>
            {catalogo.length === 0 ? <p style={{color: '#64748b'}}>Nenhum livro no banco de dados.</p> : null}
            {catalogo.map(livro => (
              <div key={livro.id} style={styles.listCard}>
                <div style={{flex: 1}}>
                  <h4 style={{margin: '0 0 5px'}}>{livro.title}</h4>
                  <p style={{margin: 0, fontSize: '12px', color: '#94a3b8'}}>{livro.author}</p>
                </div>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button onClick={() => adicionarAEstante(livro.id)} style={styles.iconBtn} title="Add Estante"><Check size={18} color="#10b981"/></button>
                  <button onClick={() => editarLivro(livro.id)} style={styles.iconBtn} title="Editar"><Edit2 size={18} color="#3b82f6"/></button>
                  <button onClick={() => excluirLivro(livro.id)} style={styles.iconBtn} title="Excluir"><Trash2 size={18} color="#ef4444"/></button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'leitor':
        return (
          <div style={styles.page}>
            <h2 style={{marginBottom: '20px'}}>Minha Estante</h2>
            {minhaLista.length === 0 ? <p style={{color: '#64748b'}}>Sua estante está vazia. Adicione livros do catálogo!</p> : null}
            {minhaLista.map(item => (
              <div key={item.id || item.book_id} style={{...styles.continueCard, flexDirection: 'column', alignItems: 'flex-start'}}>
                <div style={{display: 'flex', width: '100%', alignItems: 'center'}}>
                  <div style={styles.continueCover}>📜</div>
                  <div style={{ flex: 1, marginLeft: '15px' }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{item.title || 'Livro ID: ' + item.book_id}</h4>
                    <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#64748b' }}>
                      Capítulo atual: {item.current_chapter || 0}
                    </p>
                    <div style={{display: 'flex', gap: '10px'}}>
                      <button onClick={() => atualizarCapitulo(item.book_id, (item.current_chapter || 1) - 1)} style={styles.smallBtn}>- Cap</button>
                      <button onClick={() => atualizarCapitulo(item.book_id, (item.current_chapter || 1) + 1)} style={styles.smallBtn}>+ Cap</button>
                    </div>
                  </div>
                </div>
                
                <div style={{display: 'flex', gap: '10px', marginTop: '15px', width: '100%', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px'}}>
                  <button onClick={() => criarAvaliacao(item.book_id)} style={{...styles.smallBtn, background: '#ca8a04', flex: 1}}>
                    <Star size={12} style={{marginRight: '4px'}}/> Avaliar
                  </button>
                  <button onClick={() => verAvaliacoes(item.book_id)} style={{...styles.smallBtn, background: '#4f46e5', flex: 1}}>
                    <MessageSquare size={12} style={{marginRight: '4px'}}/> Reviews
                  </button>
                  <button onClick={() => removerDaEstante(item.book_id)} style={{...styles.smallBtn, background: '#991b1b', flex: 1}}>
                    <Trash2 size={12} style={{marginRight: '4px'}}/> Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'perfil':
        return (
          <div style={styles.page}>
            <header style={{textAlign: 'center', marginBottom: '30px', marginTop: '20px'}}>
              <div style={{...styles.avatar, width: '80px', height: '80px', fontSize: '24px', margin: '0 auto 15px'}}>{user.initials}</div>
              <h2 style={{margin: '0'}}>{user.name}</h2>
              <p style={{color: '#94a3b8', margin: '5px 0 0'}}>Membro do Elegere</p>
            </header>
            <div style={{display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '40px'}}>
              <div style={{backgroundColor: '#1e293b', padding: '15px', borderRadius: '15px', textAlign: 'center', flex: 1}}>
                <h3 style={{margin: 0, color: '#818cf8'}}>{minhaLista.length}</h3>
                <p style={{margin: 0, fontSize: '12px', color: '#94a3b8'}}>Livros na Estante</p>
              </div>
            </div>
            <button onClick={handleLogout} style={{...styles.button, width: '100%', backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#ef4444'}}>
              <LogOut size={18} /> Sair da conta
            </button>
          </div>
        );
      default: return null;
    }
  };

  if (!user) {
    return (
      <>
        <GlobalStyle />
        <div style={styles.authContainer}>
          <div style={styles.bookmark}><BookMarked size={24} color="#fff" /></div>
          <main style={styles.authCard}>
            <header style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={styles.logoCircle}><BookOpen size={32} color="#818cf8" /></div>
              <h1 style={styles.authTitle}>Elegere</h1>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>
                {isLogin ? 'A sua jornada literária continua aqui.' : 'Abra a primeira página da sua história.'}
              </p>
            </header>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {!isLogin && (
                <div style={styles.inputWrapper}>
                  <User style={styles.icon} size={20} />
                  <input type="text" placeholder="Nome" style={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div style={styles.inputWrapper}>
                <Mail style={styles.icon} size={20} />
                <input type="email" placeholder="E-mail" style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div style={styles.inputWrapper}>
                <Lock style={styles.icon} size={20} />
                <input type={showPassword ? "text" : "password"} placeholder="Senha" style={{...styles.input, paddingRight: '45px'}} value={password} onChange={(e) => setPassword(e.target.value)} required />
                <div style={styles.eyeIcon} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</div>
              </div>
              {message.text && (
                <div style={{ fontSize: '14px', textAlign: 'center', padding: '12px', borderRadius: '10px', color: message.type === 'error' ? '#f87171' : '#34d399', backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}>
                  {message.text}
                </div>
              )}
              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? 'A processar...' : (isLogin ? 'Aceder à Biblioteca' : 'Criar Conta')} <ChevronRight size={20} />
              </button>
            </form>
            <footer style={{ marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>
              <p>{isLogin ? 'Não tem conta? ' : 'Já é um leitor? '} <span style={{ color: '#818cf8', fontWeight: '600', cursor: 'pointer' }} onClick={() => {setIsLogin(!isLogin); setMessage({text:'', type:''});}}> {isLogin ? 'Registre-se' : 'Faça Login'} </span></p>
            </footer>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <div style={styles.appContainer}>
        <div style={styles.contentArea}>
          {renderTabContent()}
        </div>
        <nav style={styles.bottomNav}>
          <div style={currentTab === 'inicio' ? styles.navItemActive : styles.navItem} onClick={() => setCurrentTab('inicio')}>
            <Home size={22} /><span>Início</span>
          </div>
          <div style={currentTab === 'catalogo' ? styles.navItemActive : styles.navItem} onClick={() => setCurrentTab('catalogo')}>
            <Library size={22} /><span>Catálogo</span>
          </div>
          <div style={currentTab === 'leitor' ? styles.navItemActive : styles.navItem} onClick={() => setCurrentTab('leitor')}>
            <BookOpen size={22} /><span>Estante</span>
          </div>
          <div style={currentTab === 'perfil' ? styles.navItemActive : styles.navItem} onClick={() => setCurrentTab('perfil')}>
            <User size={22} /><span>Perfil</span>
          </div>
        </nav>
      </div>
    </>
  );
}

const styles = {
  appContainer: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', maxWidth: '450px', margin: '0 auto', backgroundColor: '#0b1120', position: 'relative' },
  contentArea: { flex: 1, overflowY: 'auto', padding: '24px', paddingBottom: '90px' },
  page: { animation: 'fadeIn 0.3s ease-in-out' },
  userHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  greeting: { margin: 0, color: '#94a3b8', fontSize: '13px' },
  userName: { margin: '2px 0 0', fontSize: '22px', fontWeight: '800' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' },
  streakCard: { background: 'linear-gradient(135deg, #2e1065, #4c1d95)', padding: '20px', borderRadius: '20px', marginBottom: '20px' },
  sectionTitle: { fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' },
  horizontalScroll: { display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px', scrollBehavior: 'smooth' },
  bookCardMini: { minWidth: '130px', flexShrink: 0, cursor: 'pointer' },
  coverIcon: { width: '130px', height: '130px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4c1d95', fontSize: '30px', marginBottom: '10px' },
  bookTitleMini: { margin: 0, fontSize: '14px' },
  listCard: { backgroundColor: '#111827', padding: '15px', borderRadius: '15px', marginBottom: '10px', display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' },
  continueCard: { display: 'flex', alignItems: 'center', background: '#111827', padding: '16px', borderRadius: '20px', marginBottom: '15px', border: '1px solid rgba(255,255,255,0.05)' },
  continueCover: { width: '60px', height: '80px', borderRadius: '12px', background: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  actionBtn: { background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' },
  iconBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex' },
  smallBtn: { background: '#334155', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  button: { padding: '14px', background: 'linear-gradient(to right, #6366f1, #a855f7)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  readButton: { background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: 'none', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '75px', backgroundColor: '#0f172a', display: 'flex', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#64748b', cursor: 'pointer', fontSize: '11px' },
  navItemActive: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#818cf8', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  authContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', padding: '20px' },
  bookmark: { width: '50px', height: '70px', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 0 8px 8px', marginBottom: '-20px', zIndex: 10 },
  authCard: { backgroundColor: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(12px)', padding: '40px 30px', borderRadius: '28px', border: '1px solid rgba(255, 255, 255, 0.1)', width: '100%', maxWidth: '400px' },
  logoCircle: { width: '64px', height: '64px', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' },
  authTitle: { fontSize: '28px', margin: '0', fontWeight: '800', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  icon: { position: 'absolute', left: '15px', color: '#64748b' },
  eyeIcon: { position: 'absolute', right: '15px', color: '#64748b', cursor: 'pointer' },
  input: { width: '100%', padding: '14px 15px 14px 45px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', outline: 'none' }
};

export default App;