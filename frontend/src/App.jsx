import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Mail, Lock, ChevronRight, BookMarked, 
  User, LogOut, Library, Star, Eye, EyeOff, Home, LayoutGrid, Trash2 
} from 'lucide-react';
import api from './services/api';

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
      setUser({ name: savedUser });
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.clear();
    setUser(null);
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
    setCurrentTab('inicio');
    setMessage({ text: 'Sessão encerrada.', type: 'success' });
  }, []);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        } 
      };
      
      const resBooks = await api.get('/books', config);
      if (resBooks.data) setCatalogo(resBooks.data);

      try {
        const resLib = await api.get('/progress', config);
        if (resLib.data) setMinhaLista(resLib.data);
      } catch (err) {
        console.warn("Nenhum livro na biblioteca ainda ou erro na rota /progress.", err);
        setMinhaLista([]);
      }

    } catch (error) {
      console.error("Erro ao buscar dados da API", error);
      if (error.response?.status === 401) {
        handleLogout(); 
      }
    } finally {
      setLoading(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    if (user) {
      carregarDados();
    }
  }, [user, carregarDados]);

  const adicionarLivro = async (bookId) => {
    try {
      const token = localStorage.getItem('token');
      await api.post('/progress', { book_id: bookId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Livro adicionado à sua biblioteca!');
      carregarDados(); 
      setCurrentTab('inicio'); 
    } catch (err) {
      console.error('Erro ao adicionar livro:', err);
      alert('Você já está lendo este livro ou ocorreu um erro.');
    }
  };

  // NOVA FUNÇÃO: Remover Livro da Estante
  const removerLivro = async (bookId) => {
    if (!window.confirm("Tem certeza que deseja remover este livro da sua estante? O progresso será perdido.")) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      await api.delete(`/progress/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Recarrega os dados após deletar para atualizar a tela
      await carregarDados(); 
      alert('Livro removido da sua estante!');
    } catch (err) {
      console.error('Erro ao remover livro:', err);
      alert('Erro ao tentar remover o livro.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isLogin) {
        const response = await api.post('/auth/login', { email, password });
        const { token, user: userData } = response.data;

        localStorage.setItem('token', token);
        localStorage.setItem('userName', userData.name);
        
        setMessage({ text: `Bem-vindo, ${userData.name}!`, type: 'success' });
        
        setTimeout(() => {
          setUser({ name: userData.name });
        }, 1000);

      } else {
        await api.post('/auth/register', { name, email, password });
        setMessage({ text: 'Conta criada com sucesso! Faça login.', type: 'success' });
        
        setName('');
        setPassword(''); 
        setIsLogin(true);
      }
    } catch (err) {
      setMessage({ 
        text: err.response?.data?.message || err.response?.data?.error || 'Erro na conexão com o servidor.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const GlobalStyle = () => (
    <style>
      {`
        body, html, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
          background-color: #0f172a;
          box-sizing: border-box;
          font-family: 'Inter', sans-serif;
          color: #fff;
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}
    </style>
  );

  if (user) {
    return (
      <>
        <GlobalStyle />
        <div style={styles.appContainer}>
          
          <div style={styles.contentArea}>
            
            {currentTab === 'inicio' && (
              <div style={styles.page}>
                <header style={styles.userHeader}>
                  <div>
                    <p style={styles.greeting}>Boa tarde 👋</p>
                    <h2 style={styles.userName}>{user.name}</h2>
                  </div>
                  <div style={styles.avatar}>{user.name.charAt(0).toUpperCase()}</div>
                </header>

                <div style={styles.streakCard}>
                  <h3 style={{margin: 0, fontSize: '18px'}}>🔥 7 dias de streak!</h3>
                  <p style={{margin: '5px 0 0', fontSize: '14px', color: '#cbd5e1'}}>Leia hoje para manter sua ofensiva.</p>
                </div>

                <h3 style={styles.sectionTitle}>✨ RECOMENDADOS</h3>
                <div style={styles.horizontalScroll}>
                  {catalogo.slice(0, 3).map(livro => (
                    <div key={livro.id} style={styles.bookCardMini}>
                      <div style={styles.coverPlaceholder}>{livro.title.charAt(0)}</div>
                      <p style={styles.bookTitleMini}>{livro.title}</p>
                      <p style={styles.bookAuthorMini}>{livro.author}</p>
                    </div>
                  ))}
                  {catalogo.length === 0 && <p style={{fontSize: '14px', color: '#64748b'}}>Nenhum livro cadastrado.</p>}
                </div>

                <h3 style={styles.sectionTitle}>CONTINUE LENDO</h3>
                {minhaLista.length > 0 ? (
                  minhaLista.map(item => (
                    <div key={item.progress_id} style={styles.continueCard}>
                      <div style={{flex: 1}}>
                        <h4 style={{margin: '0 0 5px 0'}}>{item.title}</h4>
                        <p style={{margin: 0, fontSize: '12px', color: '#94a3b8'}}>Capítulo {item.current_chapter}</p>
                      </div>
                      
                      {/* BOTOES DE AÇÃO: LER e REMOVER */}
                      <div style={{display: 'flex', gap: '8px'}}>
                        <button 
                          onClick={() => removerLivro(item.book_id)} 
                          style={styles.deleteButton}
                          title="Remover da estante"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button style={styles.readButton}>Ler ▶</button>
                      </div>

                    </div>
                  ))
                ) : (
                  <div style={styles.emptyState}>
                    <p>Sua biblioteca está vazia.</p>
                    <button onClick={() => setCurrentTab('catalogo')} style={styles.textButton}>Ir para o catálogo</button>
                  </div>
                )}
              </div>
            )}

            {currentTab === 'catalogo' && (
              <div style={styles.page}>
                <h2 style={{marginTop: 0}}>Catálogo</h2>
                <div style={styles.gridList}>
                  {catalogo.map(livro => (
                    <div key={livro.id} style={styles.catalogCard}>
                      <div>
                        <h3 style={{margin: '0 0 5px', fontSize: '16px'}}>{livro.title}</h3>
                        <p style={{margin: 0, fontSize: '14px', color: '#94a3b8'}}>{livro.author}</p>
                        <span style={styles.badge}>{livro.difficulty_level || 'Livre'}</span>
                      </div>
                      <button 
                        onClick={() => adicionarLivro(livro.id)} 
                        style={styles.addButton}
                      >
                        + Adicionar
                      </button>
                    </div>
                  ))}
                  {catalogo.length === 0 && (
                     <div style={styles.emptyState}>
                       <p>Nenhum livro cadastrado no banco ainda.</p>
                     </div>
                  )}
                </div>
              </div>
            )}

            {currentTab === 'perfil' && (
              <div style={styles.page}>
                <h2 style={{marginTop: 0}}>Perfil</h2>
                <div style={styles.profileInfo}>
                  <div style={{...styles.avatar, width: '80px', height: '80px', fontSize: '32px', margin: '0 auto 15px'}}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <h3 style={{textAlign: 'center', margin: '0 0 5px'}}>{user.name}</h3>
                  <p style={{textAlign: 'center', color: '#94a3b8', margin: '0 0 30px'}}>Leitor Nível 3</p>
                  
                  <button onClick={handleLogout} style={{...styles.button, backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444'}}>
                    <LogOut size={18} /> Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>

          <nav style={styles.bottomNav}>
            <div style={currentTab === 'inicio' ? styles.navItemActive : styles.navItem} onClick={() => setCurrentTab('inicio')}>
              <Home size={24} />
              <span>Início</span>
            </div>
            <div style={currentTab === 'catalogo' ? styles.navItemActive : styles.navItem} onClick={() => setCurrentTab('catalogo')}>
              <LayoutGrid size={24} />
              <span>Catálogo</span>
            </div>
            <div style={currentTab === 'perfil' ? styles.navItemActive : styles.navItem} onClick={() => setCurrentTab('perfil')}>
              <User size={24} />
              <span>Perfil</span>
            </div>
          </nav>

        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <div style={styles.container}>
        <div style={styles.bookmark}>
          <BookMarked size={24} color="#fff" />
        </div>

        <main style={styles.card}>
          <header style={styles.header}>
            <div style={styles.logoCircle}>
              <BookOpen size={32} color="#818cf8" />
            </div>
            <h1 style={styles.title}>Elegere</h1>
            <p style={styles.subtitle}>
              {isLogin ? 'A sua jornada literária continua aqui.' : 'Abra a primeira página da sua história.'}
            </p>
          </header>

          <form onSubmit={handleAuth} style={styles.form}>
            {!isLogin && (
              <div style={styles.inputWrapper}>
                <User style={styles.icon} size={20} />
                <input 
                  type="text" 
                  placeholder="Nome de utilizador" 
                  style={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div style={styles.inputWrapper}>
              <Mail style={styles.icon} size={20} />
              <input 
                type="email" 
                placeholder="E-mail" 
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={styles.inputWrapper}>
              <Lock style={styles.icon} size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Senha" 
                style={{...styles.input, paddingRight: '45px'}}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div style={styles.eyeIcon} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
            </div>

            {isLogin && (
              <span style={{...styles.link, fontSize: '12px', alignSelf: 'flex-end', marginTop: '-10px', marginBottom: '5px'}} 
                    onClick={() => alert('Em breve!')}>
                Esqueceu-se da senha?
              </span>
            )}

            {message.text && (
              <div style={{
                ...styles.message, 
                color: message.type === 'error' ? '#f87171' : '#34d399',
                backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'
              }}>
                {message.text}
              </div>
            )}

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'A processar...' : (isLogin ? 'Aceder à Biblioteca' : 'Criar Conta')}
              <ChevronRight size={20} />
            </button>
          </form>

          <footer style={styles.footer}>
            <p>
              {isLogin ? 'Não tem conta? ' : 'Já é um leitor? '}
              <span style={styles.link} onClick={() => {setIsLogin(!isLogin); setMessage({text:'', type:''}); setShowPassword(false)}}>
                {isLogin ? 'Registre-se' : 'Faça Login'}
              </span>
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', background: '#0f172a', padding: '20px' },
  bookmark: { width: '50px', height: '70px', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0 0 8px 8px', marginBottom: '-20px', zIndex: 10, boxShadow: '0 4px 20px rgba(99, 102, 241, 0.5)' },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: '40px 30px', borderRadius: '28px', border: '1px solid rgba(255, 255, 255, 0.1)', width: '100%', maxWidth: '400px' },
  header: { textAlign: 'center', marginBottom: '30px' },
  logoCircle: { width: '64px', height: '64px', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px', border: '1px solid rgba(99, 102, 241, 0.2)' },
  title: { fontSize: '28px', margin: '0', fontWeight: '800', color: '#fff' },
  subtitle: { color: '#94a3b8', fontSize: '14px', marginTop: '8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  icon: { position: 'absolute', left: '15px', color: '#64748b' },
  eyeIcon: { position: 'absolute', right: '15px', color: '#64748b', cursor: 'pointer' },
  input: { width: '100%', padding: '14px 15px 14px 45px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', outline: 'none' },
  button: { width: '100%', padding: '14px', background: 'linear-gradient(to right, #6366f1, #a855f7)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  message: { fontSize: '14px', textAlign: 'center', padding: '12px', borderRadius: '10px' },
  footer: { marginTop: '25px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' },
  link: { color: '#818cf8', fontWeight: '600', cursor: 'pointer' },
  
  appContainer: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', maxWidth: '500px', margin: '0 auto', background: '#0f172a', position: 'relative' },
  contentArea: { flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '90px' },
  page: { animation: 'fadeIn 0.3s ease-in-out' },
  userHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  greeting: { margin: 0, color: '#94a3b8', fontSize: '14px' },
  userName: { margin: 0, fontSize: '24px', fontWeight: 'bold' },
  avatar: { width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' },
  streakCard: { background: 'linear-gradient(to right, #312e81, #4c1d95)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(139, 92, 246, 0.3)', marginBottom: '30px' },
  sectionTitle: { fontSize: '12px', letterSpacing: '1px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '15px' },
  horizontalScroll: { display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '30px' },
  bookCardMini: { minWidth: '120px' },
  coverPlaceholder: { width: '120px', height: '160px', borderRadius: '12px', background: 'linear-gradient(to bottom, #1e293b, #0f172a)', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', color: '#475569', marginBottom: '10px' },
  bookTitleMini: { margin: 0, fontSize: '14px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  bookAuthorMini: { margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' },
  continueCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: '15px', borderRadius: '16px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.05)' },
  readButton: { background: '#4f46e5', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  
  /* ESTILO NOVO: BOTÃO DELETAR */
  deleteButton: { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  emptyState: { textAlign: 'center', padding: '30px', color: '#64748b', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' },
  textButton: { background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', marginTop: '10px' },
  gridList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  catalogCard: { background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' },
  badge: { display: 'inline-block', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', marginTop: '8px' },
  addButton: { background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' },
  profileInfo: { padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' },
  
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70px', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: '10px' },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#64748b', cursor: 'pointer', fontSize: '12px' },
  navItemActive: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#818cf8', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }
};

export default App;