import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Mail, Lock, ChevronRight, BookMarked,
  User, LogOut, Library, Star, Eye, EyeOff,
  Home, Play, Sparkles, Flame, Plus, Trash2, Edit2, Check, MessageSquare,
  Search, Globe, X, Volume2, ArrowLeft, BookOpenCheck, Loader2,
  Target, Trophy, TrendingUp, Calendar, ChevronDown, ChevronUp,
  Download, ExternalLink, Filter
} from 'lucide-react';
import api from './services/api';

// ─────────────────────────────────────────────────────────────────────────────
// ESTILOS GLOBAIS
// ─────────────────────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
    body,html,#root{margin:0;padding:0;width:100%;min-height:100vh;background:#0b1120;font-family:'Inter',sans-serif;color:#fff;box-sizing:border-box}
    *{box-sizing:border-box}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:#334155;border-radius:10px}
    .truncate{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .hide-scroll::-webkit-scrollbar{display:none}
    @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
    .spinner{animation:spin .7s linear infinite}
    .pulse{animation:pulse 1.5s ease infinite}
    .page-anim{animation:fadeIn .25s ease}
    .dict-popup{
      position:fixed;z-index:9999;background:#1a2540;border:1px solid rgba(99,102,241,.35);
      border-radius:18px;padding:18px;width:296px;
      box-shadow:0 24px 64px rgba(0,0,0,.7);animation:slideUp .18s ease
    }
    .reader-text{font-family:'Lora',Georgia,serif;font-size:17px;line-height:1.95;color:#dde6f3;white-space:pre-wrap;word-break:break-word}
    input::placeholder{color:#475569}
    button:active{transform:scale(.97)}
    .cat-tab{transition:background .15s,color .15s,border-color .15s}
    .progress-bar-fill{transition:width .6s cubic-bezier(.4,0,.2,1)}
  `}</style>
);

// ─────────────────────────────────────────────────────────────────────────────
// DICIONÁRIO POPUP
// ─────────────────────────────────────────────────────────────────────────────
function DictionaryPopup({ word, position, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const go = async () => {
      setLoading(true); setError(''); setData(null);
      try {
        const res = await api.get(`/library/dictionary/${encodeURIComponent(word)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setData(res.data);
      } catch (e) { setError(e.response?.data?.error || 'Não encontrada.'); }
      finally { setLoading(false); }
    };
    go();
  }, [word]);

  const top  = Math.min(position.y + 12, window.innerHeight - 350);
  const left = Math.min(Math.max(position.x - 148, 8), window.innerWidth - 310);

  return (
    <div className="dict-popup" style={{ top, left }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <span style={{ fontSize:20, fontWeight:800, color:'#818cf8' }}>{word}</span>
          {data?.phonetic && <span style={{ fontSize:12, color:'#64748b', marginLeft:8 }}>{data.phonetic}</span>}
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {data?.audio_url && (
            <button onClick={() => new Audio(data.audio_url).play().catch(()=>{})} style={S.iconBtn} title="Ouvir">
              <Volume2 size={14} color="#818cf8"/>
            </button>
          )}
          <button onClick={onClose} style={S.iconBtn}><X size={14} color="#94a3b8"/></button>
        </div>
      </div>
      {loading && <div style={{ textAlign:'center', padding:'16px 0', color:'#64748b' }}><Loader2 size={22} className="spinner" style={{ display:'inline' }}/></div>}
      {error   && <p style={{ fontSize:13, color:'#f87171', textAlign:'center', margin:0 }}>{error}</p>}
      {data && !loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:10, maxHeight:230, overflowY:'auto' }}>
          {data.definitions.map((d,i) => (
            <div key={i} style={{ borderLeft:'2px solid #4f46e5', paddingLeft:10 }}>
              <span style={{ fontSize:10, background:'rgba(99,102,241,.18)', color:'#818cf8', padding:'2px 7px', borderRadius:10, fontWeight:700 }}>{d.partOfSpeech}</span>
              <p style={{ margin:'5px 0 0', fontSize:13, color:'#cbd5e1', lineHeight:1.5 }}>{d.definition}</p>
              {d.example && <p style={{ margin:'3px 0 0', fontSize:11, color:'#64748b', fontStyle:'italic' }}>"{d.example}"</p>}
              {d.synonyms.length>0 && <p style={{ margin:'3px 0 0', fontSize:11, color:'#475569' }}>≈ {d.synonyms.join(', ')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEITOR DE LIVRO
// ─────────────────────────────────────────────────────────────────────────────
function BookReader({ book, onBack }) {
  const [content, setContent]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [fallbackUrl, setFallback]= useState('');
  const [fontSize, setFontSize]   = useState(17);
  const [dictWord, setDictWord]   = useState(null);
  const [dictPos, setDictPos]     = useState({ x:0, y:0 });

  function extractId(url) {
    const m = url?.match(/gutenberg\.org\/ebooks\/(\d+)/);
    return m ? m[1] : null;
  }

  const gutId  = book.gutenberg_id || extractId(book.cover_url);
  const txtUrl = book.txt_url || null;
  const txtFb  = book.txt_url_fallbacks || [];

  useEffect(() => {
    if (!gutId && !txtUrl) {
      setError('Este livro não possui versão de leitura online.\nImporte-o via Project Gutenberg no Catálogo.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const params = new URLSearchParams();
        if (txtUrl) params.set('txt_url', txtUrl);
        if (txtFb.length) params.set('txt_fallbacks', JSON.stringify(txtFb));
        const res = await api.get(`/library/read/${gutId || 0}?${params}`);
        setContent(res.data.content);
      } catch (e) {
        const d = e.response?.data;
        setError(d?.error || 'Não foi possível carregar.');
        if (d?.fallback_url) setFallback(d.fallback_url);
        else if (gutId) setFallback(`https://www.gutenberg.org/ebooks/${gutId}`);
      } finally { setLoading(false); }
    })();
  // eslint-disable-next-line
  }, []);

  const onSelect = (e) => {
    const sel = window.getSelection()?.toString().trim();
    if (sel && sel.length>1 && sel.length<40 && !/\n/.test(sel)) {
      const w = sel.replace(/[^a-zA-Z'-]/g,'').toLowerCase();
      if (w.length>1) {
        const r = window.getSelection().getRangeAt(0).getBoundingClientRect();
        setDictPos({ x: r.left+r.width/2, y: r.bottom+window.scrollY });
        setDictWord(w);
      }
    } else if (!e.target.closest?.('.dict-popup')) { setDictWord(null); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0b1120' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', background:'#0f172a', borderBottom:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
        <button onClick={onBack} style={{ ...S.iconBtn, padding:7 }}><ArrowLeft size={18} color="#818cf8"/></button>
        <div style={{ flex:1, overflow:'hidden' }}>
          <p style={{ margin:0, fontSize:14, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{book.title}</p>
          <p style={{ margin:0, fontSize:11, color:'#64748b' }}>{book.author}</p>
        </div>
        <button onClick={() => setFontSize(s=>Math.max(13,s-1))} style={{ ...S.iconBtn, fontSize:12, padding:'5px 9px', fontWeight:700 }}>A-</button>
        <button onClick={() => setFontSize(s=>Math.min(24,s+1))} style={{ ...S.iconBtn, fontSize:15, padding:'5px 9px', fontWeight:700 }}>A+</button>
      </div>

      {content && (
        <div style={{ background:'rgba(99,102,241,.07)', padding:'7px 18px', fontSize:11, color:'#818cf8', textAlign:'center', flexShrink:0 }}>
          💡 Selecione qualquer palavra em inglês para ver a definição
        </div>
      )}

      <div onMouseUp={onSelect} onTouchEnd={onSelect}
        style={{ flex:1, overflowY:'auto', padding:'28px 22px 80px' }}>
        {loading && (
          <div style={{ textAlign:'center', paddingTop:60, color:'#64748b' }}>
            <Loader2 size={32} className="spinner" style={{ display:'inline' }}/>
            <p style={{ marginTop:14, fontSize:13 }}>Carregando do Project Gutenberg…</p>
          </div>
        )}
        {error && !loading && (
          <div style={{ textAlign:'center', padding:'50px 20px 0' }}>
            <BookOpen size={40} color="#1e293b" style={{ marginBottom:18 }}/>
            <p style={{ color:'#f87171', fontSize:14, lineHeight:1.7, whiteSpace:'pre-line', marginBottom:20 }}>{error}</p>
            {fallbackUrl && (
              <a href={fallbackUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:6, color:'#818cf8', fontSize:13, fontWeight:600, background:'rgba(99,102,241,.12)', padding:'10px 16px', borderRadius:10, border:'1px solid rgba(99,102,241,.25)', textDecoration:'none' }}>
                <ExternalLink size={13}/> Abrir no Project Gutenberg
              </a>
            )}
            <div style={{ marginTop:18 }}>
              <button onClick={onBack} style={{ ...S.smallBtn, margin:'0 auto', padding:'9px 18px' }}>← Voltar</button>
            </div>
          </div>
        )}
        {content && !loading && (
          <div className="reader-text" style={{ fontSize }}>{content}</div>
        )}
      </div>

      {dictWord && <DictionaryPopup word={dictWord} position={dictPos} onClose={() => setDictWord(null)}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUSCA GUTENBERG + STANDARD EBOOKS
// ─────────────────────────────────────────────────────────────────────────────
function ExternalSearch({ onImport, onRead }) {
  const [source, setSource]     = useState('gutenberg'); // 'gutenberg' | 'standard'
  const [query, setQuery]       = useState('');
  const [lang, setLang]         = useState('en');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [importing, setImporting]= useState(null);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setSearched(true); setResults([]);
    try {
      const endpoint = source === 'standard'
        ? `/library/search/standard?q=${encodeURIComponent(query)}`
        : `/library/search?q=${encodeURIComponent(query)}&lang=${lang}`;
      const res = await api.get(endpoint);
      setResults(res.data.results || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  };

  const doImport = async (book) => {
    const key = book.gutenberg_id || book.title;
    setImporting(key);
    try {
      await api.post('/library/import',
        { title:book.title, author:book.author, cover_url:book.cover_url,
          read_online_url:book.read_online_url||book.source_url,
          gutenberg_id:book.gutenberg_id||null,
          difficulty_level: lang==='pt' ? 'PT-BR' : 'B1' },
        { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` } }
      );
      alert(`"${book.title}" adicionado ao catálogo!`);
      onImport?.();
    } catch(e) { alert(e.response?.data?.error||'Erro ao importar.'); }
    finally { setImporting(null); }
  };

  return (
    <div style={{ background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.2)', borderRadius:16, padding:16, marginBottom:22 }}>
      {/* Header fonte */}
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {[['gutenberg','📚 Project Gutenberg'],['standard','⭐ Standard Ebooks']].map(([k,label]) => (
          <button key={k} onClick={() => { setSource(k); setResults([]); setSearched(false); }}
            style={{ fontSize:11, padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:700,
              background: source===k ? '#4f46e5' : 'rgba(255,255,255,.07)',
              color: source===k ? '#fff' : '#94a3b8' }}>
            {label}
          </button>
        ))}
      </div>

      {source==='gutenberg' && (
        <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
          {[['en','🇺🇸 EN'],['pt','🇧🇷 PT'],['fr','🇫🇷 FR'],['es','🇪🇸 ES'],['de','🇩🇪 DE']].map(([c,l]) => (
            <button key={c} onClick={() => setLang(c)}
              style={{ fontSize:10, padding:'3px 9px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:700,
                background: lang===c ? 'rgba(99,102,241,.5)' : 'rgba(255,255,255,.07)',
                color: lang===c ? '#fff' : '#94a3b8' }}>{l}</button>
          ))}
        </div>
      )}

      <p style={{ fontSize:11, color:'#475569', margin:'0 0 10px' }}>
        {source==='gutenberg' ? 'Mais de 70.000 obras de domínio público.' : 'Obras curadas, tipografia profissional, sem DRM.'}
      </p>

      <div style={{ display:'flex', gap:8 }}>
        <div style={{ ...S.inputWrapper, flex:1, marginBottom:0 }}>
          <Search style={{ ...S.icon, color:'#64748b' }} size={15}/>
          <input placeholder="Título ou autor…" style={{ ...S.input, padding:'9px 9px 9px 36px', fontSize:13 }}
            value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()}/>
        </div>
        <button onClick={search} disabled={loading} style={{ ...S.actionBtn, flexShrink:0 }}>
          {loading ? <Loader2 size={15} className="spinner"/> : <Search size={15}/>}
        </button>
      </div>

      {loading && <div style={{ textAlign:'center', padding:'24px 0', color:'#64748b' }}><Loader2 size={26} className="spinner" style={{ display:'inline' }}/></div>}
      {!loading && searched && results.length===0 && <p style={{ color:'#64748b', fontSize:12, textAlign:'center', margin:'16px 0 0' }}>Nenhum resultado.</p>}

      <div style={{ marginTop: results.length ? 14 : 0 }}>
        {results.map((book, idx) => (
          <div key={book.gutenberg_id||idx} style={{ ...S.listCard, flexDirection:'column', gap:10, marginBottom:10 }}>
            <div style={{ display:'flex', gap:12 }}>
              <div style={{ width:48, height:66, borderRadius:8, flexShrink:0, background:'#1e293b', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {book.cover_url
                  ? <img src={book.cover_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}}/>
                  : <BookOpen size={20} color="#334155"/>}
              </div>
              <div style={{ flex:1, overflow:'hidden' }}>
                <p style={{ margin:'0 0 2px', fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{book.title}</p>
                <p style={{ margin:'0 0 5px', fontSize:11, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{book.author}</p>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {book.language && <span style={{ ...S.tag }}>{book.language?.toUpperCase()}</span>}
                  {book.subjects?.slice(0,2).map((s,i) => <span key={i} style={{ ...S.tag, background:'rgba(245,158,11,.12)', color:'#fbbf24' }}>{s.length>22?s.slice(0,22)+'…':s}</span>)}
                  {book.source==='Standard Ebooks' && <span style={{ ...S.tag, background:'rgba(16,185,129,.12)', color:'#10b981' }}>⭐ Curado</span>}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {!book.source && (
                <button onClick={() => onRead(book)}
                  style={{ ...S.smallBtn, flex:1, background:'rgba(99,102,241,.15)', color:'#818cf8', border:'1px solid rgba(99,102,241,.25)' }}>
                  <BookOpenCheck size={12} style={{ marginRight:4 }}/> Ler agora
                </button>
              )}
              {book.epub_url && (
                <a href={book.epub_url} target="_blank" rel="noopener noreferrer"
                  style={{ ...S.smallBtn, flex:1, background:'rgba(16,185,129,.12)', color:'#10b981', border:'1px solid rgba(16,185,129,.22)', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                  <Download size={12}/> Baixar EPUB
                </a>
              )}
              <button onClick={() => doImport(book)} disabled={importing===(book.gutenberg_id||book.title)}
                style={{ ...S.smallBtn, flex:1, background:'rgba(99,102,241,.12)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,.2)' }}>
                {importing===(book.gutenberg_id||book.title) ? <Loader2 size={12} className="spinner" style={{ marginRight:4 }}/> : <Plus size={12} style={{ marginRight:4 }}/>}
                {importing===(book.gutenberg_id||book.title) ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA CATEGORIAS  (nova, com grade de categorias e lista filtrada)
// ─────────────────────────────────────────────────────────────────────────────
function CatalogTab({ catalogo, categorias, abrirLeitor, adicionarAEstante, editarLivro, excluirLivro, criarLivro, carregarDados }) {
  const [catId, setCatId]   = useState(null);    // null = todas
  const [diff, setDiff]     = useState('');
  const [q, setQ]           = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const CAT_ICONS = {'Ficção Clássica':'🏛️','Romance Brasileiro':'🇧🇷','Terror e Gótico':'🦇','Aventura e Ação':'⚔️','Filosofia e Ensaio':'🧠','Ficção Científica':'🚀','Drama e Teatro':'🎭','Poesia':'✒️','Mistério e Detetive':'🔍','Literatura Infantil':'🧸'};
  const DIFF_COLOR = { A1:'#10b981', A2:'#34d399', B1:'#fbbf24', B2:'#f97316', C1:'#ef4444', 'PT-BR':'#818cf8' };

  const filtered = catalogo.filter(l => {
    const mc = catId===null || l.category_id===catId;
    const md = !diff   || l.difficulty_level===diff;
    const mq = !q      || l.title.toLowerCase().includes(q.toLowerCase()) || (l.author||'').toLowerCase().includes(q.toLowerCase());
    return mc && md && mq;
  });

  const catSel = categorias.find(c=>c.id===catId);

  return (
    <div className="page-anim">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>Catálogo</h2>
          <p style={{ margin:'2px 0 0', fontSize:12, color:'#64748b' }}>{catalogo.length} obras disponíveis</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setShowSearch(s=>!s)} style={{ ...S.iconBtn, padding:9 }}><Search size={16} color="#818cf8"/></button>
          <button onClick={criarLivro} style={{ ...S.actionBtn }}><Plus size={15}/> Novo</button>
        </div>
      </div>

      {/* Campo de busca */}
      {showSearch && (
        <div style={{ ...S.inputWrapper, marginBottom:14 }}>
          <Search style={{ ...S.icon, color:'#64748b' }} size={15}/>
          <input placeholder="Buscar título ou autor…" style={{ ...S.input, padding:'9px 9px 9px 36px', fontSize:13 }}
            value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
          {q && <div style={{ ...S.eyeIcon }} onClick={()=>setQ('')}><X size={14} color="#64748b"/></div>}
        </div>
      )}

      {/* Busca externa */}
      <ExternalSearch onImport={carregarDados} onRead={abrirLeitor}/>

      {/* ── Grade de categorias ── */}
      <h3 style={{ ...S.sectionTitle, margin:'0 0 12px' }}>
        <Filter size={13}/> NAVEGAR POR CATEGORIA
      </h3>

      {/* Botão "Todas" */}
      <button onClick={() => setCatId(null)}
        style={{
          display:'flex', alignItems:'center', gap:10, width:'100%',
          padding:'12px 14px', borderRadius:12, marginBottom:8,
          border: catId===null ? '1px solid #4f46e5' : '1px solid rgba(255,255,255,.07)',
          background: catId===null ? 'rgba(99,102,241,.18)' : '#111827',
          cursor:'pointer', textAlign:'left'
        }}>
        <span style={{ fontSize:20 }}>📚</span>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontSize:13, fontWeight:700, color: catId===null ? '#a5b4fc' : '#e2e8f0' }}>Todas as categorias</p>
          <p style={{ margin:0, fontSize:11, color:'#64748b' }}>{catalogo.length} livros</p>
        </div>
        {catId===null && <Check size={15} color="#818cf8"/>}
      </button>

      {/* Grade 2 colunas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
        {categorias.map(c => {
          const count = catalogo.filter(b=>b.category_id===c.id).length;
          const active = catId===c.id;
          const icon = CAT_ICONS[c.name] || c.icon || '📖';
          return (
            <button key={c.id} onClick={() => setCatId(active ? null : c.id)} className="cat-tab"
              style={{
                display:'flex', alignItems:'center', gap:10, padding:'12px 12px',
                borderRadius:12, border: active ? '1px solid #4f46e5' : '1px solid rgba(255,255,255,.07)',
                background: active ? 'rgba(99,102,241,.2)' : '#111827',
                cursor:'pointer', textAlign:'left'
              }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{icon}</span>
              <div style={{ overflow:'hidden' }}>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color: active ? '#a5b4fc' : '#e2e8f0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</p>
                <p style={{ margin:0, fontSize:10, color:'#64748b' }}>{count} livro{count!==1?'s':''}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Lista de livros filtrados ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <h3 style={{ ...S.sectionTitle, margin:0 }}>
          {catSel ? `${CAT_ICONS[catSel.name]||'📖'} ${catSel.name}` : '📚 Todos os livros'}
          <span style={{ color:'#475569', fontWeight:400, marginLeft:6 }}>({filtered.length})</span>
        </h3>
        {/* Filtro de dificuldade */}
        <div style={{ display:'flex', gap:4 }}>
          {['','B1','B2','C1','PT-BR'].map(d => (
            <button key={d} onClick={() => setDiff(diff===d?'':d)}
              style={{ fontSize:9, padding:'3px 7px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:700,
                background: diff===d ? (DIFF_COLOR[d]||'#4f46e5') : 'rgba(255,255,255,.07)',
                color: diff===d ? '#fff' : '#64748b' }}>
              {d||'All'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length===0 && (
        <div style={{ textAlign:'center', padding:'30px 0', color:'#475569' }}>
          <BookOpen size={32} color="#1e293b" style={{ marginBottom:10 }}/>
          <p style={{ fontSize:13 }}>Nenhum livro encontrado.</p>
        </div>
      )}

      {filtered.map(livro => {
        const dc = DIFF_COLOR[livro.difficulty_level] || '#818cf8';
        const temLeitura = !!(livro.gutenberg_id || (livro.cover_url&&livro.cover_url.includes('gutenberg')));
        return (
          <div key={livro.id} style={{ ...S.listCard, marginBottom:10 }}>
            {/* Capa */}
            <div style={{ width:50, height:68, borderRadius:8, flexShrink:0, background:'#1e293b', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', marginRight:12, border:'1px solid rgba(255,255,255,.06)' }}>
              {livro.cover_url && livro.cover_url.includes('gutenberg.org/cache')
                ? <img src={livro.cover_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}}/>
                : <BookOpen size={20} color="#334155"/>}
            </div>
            <div style={{ flex:1, overflow:'hidden' }}>
              <p style={{ margin:'0 0 2px', fontSize:13, fontWeight:700 }} className="truncate">{livro.title}</p>
              <p style={{ margin:'0 0 6px', fontSize:11, color:'#94a3b8' }} className="truncate">{livro.author}</p>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
                {livro.difficulty_level && <span style={{ ...S.tag, background:`${dc}22`, color:dc }}>{livro.difficulty_level}</span>}
                {temLeitura && <span style={{ ...S.tag, background:'rgba(16,185,129,.12)', color:'#10b981' }}>📖 Online</span>}
              </div>
              <div style={{ display:'flex', gap:5 }}>
                <button onClick={() => abrirLeitor({ title:livro.title, author:livro.author, cover_url:livro.cover_url, gutenberg_id:livro.gutenberg_id })}
                  style={{ fontSize:10, padding:'4px 9px', borderRadius:6, border:'none', cursor:'pointer', fontWeight:700,
                    background: temLeitura ? 'rgba(99,102,241,.18)' : 'rgba(255,255,255,.06)',
                    color: temLeitura ? '#818cf8' : '#475569',
                    display:'flex', alignItems:'center', gap:3 }}>
                  <BookOpenCheck size={11}/> Ler
                </button>
                <button onClick={() => adicionarAEstante(livro.id)} style={{ ...S.iconBtn, padding:'4px 6px' }} title="Estante"><Check size={11} color="#10b981"/></button>
                <button onClick={() => editarLivro(livro.id)} style={{ ...S.iconBtn, padding:'4px 6px' }} title="Editar"><Edit2 size={11} color="#3b82f6"/></button>
                <button onClick={() => excluirLivro(livro.id)} style={{ ...S.iconBtn, padding:'4px 6px' }} title="Excluir"><Trash2 size={11} color="#ef4444"/></button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABA METAS (RF04)
// ─────────────────────────────────────────────────────────────────────────────
function GoalsTab({ minhaLista }) {
  const [goals, setGoals]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [targetBooks, setTargetBooks] = useState(12);
  const [dailyPages, setDailyPages]   = useState(20);
  const [saving, setSaving]           = useState(false);

  const currentYear = new Date().getFullYear();
  const getConf = () => ({ headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` } });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/goals', getConf());
      setGoals(res.data || []);
    } catch { setGoals([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveGoal = async () => {
    if (targetBooks < 1) { alert('Meta deve ser de pelo menos 1 livro.'); return; }
    setSaving(true);
    try {
      await api.post('/goals',
        { year_goal: currentYear, target_books: targetBooks, daily_pages: dailyPages },
        getConf()
      );
      await load();
      setShowForm(false);
    } catch(e) {
      const data = e.response?.data;
      const status = e.response?.status;
      if (status === 401 || data?.code === 'SESSION_EXPIRED') {
        alert('Sua sessão expirou. Faça login novamente.');
        localStorage.clear();
        window.location.reload(); // força volta para tela de login
        return;
      }
      alert(data?.error || e.message || 'Erro ao salvar meta.');
    } finally { setSaving(false); }
  };

  const markRead = async (goal) => {
    const nova = Math.min(goal.completed_books + 1, goal.target_books);
    try {
      await api.put(`/goals/${goal.id}`, { target_books: goal.target_books, completed_books: nova }, getConf());
      await load();
    } catch { alert('Erro ao atualizar.'); }
  };

  const deleteGoal = async (id) => {
    if (!window.confirm('Excluir esta meta?')) return;
    try { await api.delete(`/goals/${id}`, getConf()); await load(); } catch { alert('Erro.'); }
  };

  // year_goal vem do banco como string em alguns drivers — força Number para comparação segura
  const goalYear = goals.find(g=>Number(g.year_goal)===currentYear);
  const pct = goalYear ? Math.round((goalYear.completed_books/goalYear.target_books)*100) : 0;
  const daysLeft = Math.ceil((new Date(currentYear,11,31) - new Date()) / 86400000);
  const booksLeft = goalYear ? goalYear.target_books - goalYear.completed_books : 0;
  const pace = daysLeft > 0 && booksLeft > 0 ? Math.ceil(daysLeft / Math.max(booksLeft, 1)) : null;

  return (
    <div className="page-anim">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>Metas de Leitura</h2>
          <p style={{ margin:'2px 0 0', fontSize:12, color:'#64748b' }}>Acompanhe seu progresso em {currentYear}</p>
        </div>
        <button onClick={()=>setShowForm(s=>!s)} style={{ ...S.actionBtn }}>
          {showForm ? <ChevronUp size={15}/> : <Plus size={15}/>}
          {goalYear ? 'Editar' : 'Nova'}
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div style={{ background:'#111827', border:'1px solid rgba(99,102,241,.25)', borderRadius:16, padding:20, marginBottom:20, animation:'slideUp .2s ease' }}>
          <h4 style={{ margin:'0 0 16px', fontSize:14, color:'#a5b4fc' }}>
            {goalYear ? `Editar meta de ${currentYear}` : `Nova meta para ${currentYear}`}
          </h4>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:6 }}>📚 Quantos livros você quer ler em {currentYear}?</label>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button onClick={()=>setTargetBooks(t=>Math.max(1,t-1))} style={{ ...S.iconBtn, padding:'6px 10px', fontSize:16 }}>−</button>
              <span style={{ fontSize:28, fontWeight:800, color:'#818cf8', minWidth:40, textAlign:'center' }}>{targetBooks}</span>
              <button onClick={()=>setTargetBooks(t=>t+1)} style={{ ...S.iconBtn, padding:'6px 10px', fontSize:16 }}>+</button>
              <span style={{ fontSize:12, color:'#64748b' }}>livros</span>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:'#94a3b8', display:'block', marginBottom:6 }}>📄 Meta de páginas por dia</label>
            <div style={{ display:'flex', gap:8 }}>
              {[10,20,30,50].map(p => (
                <button key={p} onClick={()=>setDailyPages(p)}
                  style={{ fontSize:12, padding:'5px 12px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:700,
                    background: dailyPages===p ? '#4f46e5' : 'rgba(255,255,255,.07)', color: dailyPages===p ? '#fff':'#94a3b8' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <button onClick={saveGoal} disabled={saving} style={{ ...S.button, width:'100%', padding:'11px' }}>
            {saving ? <Loader2 size={16} className="spinner"/> : <Check size={16}/>}
            {saving ? 'Salvando…' : 'Confirmar meta'}
          </button>
        </div>
      )}

      {loading && <div style={{ textAlign:'center', padding:'40px 0', color:'#64748b' }}><Loader2 size={28} className="spinner" style={{ display:'inline' }}/></div>}

      {/* Meta do ano atual */}
      {!loading && goalYear && (
        <div style={{ background:'linear-gradient(135deg,#1e1b4b,#2e1065)', borderRadius:20, padding:22, marginBottom:18, border:'1px solid rgba(99,102,241,.3)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
            <div>
              <p style={{ margin:0, fontSize:12, color:'#818cf8', fontWeight:700 }}>META {currentYear}</p>
              <p style={{ margin:'4px 0 0', fontSize:28, fontWeight:800 }}>{goalYear.completed_books}<span style={{ fontSize:16, color:'#94a3b8', fontWeight:500 }}>/{goalYear.target_books} livros</span></p>
            </div>
            <div style={{ background:'rgba(99,102,241,.2)', borderRadius:12, padding:'8px 14px', textAlign:'center' }}>
              <p style={{ margin:0, fontSize:22, fontWeight:800, color:'#a5b4fc' }}>{pct}%</p>
              <p style={{ margin:0, fontSize:10, color:'#64748b' }}>concluído</p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div style={{ background:'rgba(255,255,255,.08)', borderRadius:99, height:10, marginBottom:14, overflow:'hidden' }}>
            <div className="progress-bar-fill" style={{ height:'100%', borderRadius:99, width:`${pct}%`,
              background:'linear-gradient(to right,#6366f1,#a855f7)' }}/>
          </div>

          {/* Estatísticas */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              { label:'Lidos', val: goalYear.completed_books, icon:'✅' },
              { label:'Faltam', val: Math.max(0,booksLeft), icon:'📖' },
              { label:'Dias restantes', val: daysLeft, icon:'📅' },
            ].map(item => (
              <div key={item.label} style={{ background:'rgba(0,0,0,.25)', borderRadius:12, padding:'10px 8px', textAlign:'center' }}>
                <p style={{ margin:0, fontSize:16 }}>{item.icon}</p>
                <p style={{ margin:'4px 0 0', fontSize:18, fontWeight:800, color:'#e2e8f0' }}>{item.val}</p>
                <p style={{ margin:0, fontSize:10, color:'#64748b' }}>{item.label}</p>
              </div>
            ))}
          </div>

          {pace && booksLeft>0 && (
            <div style={{ background:'rgba(99,102,241,.12)', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
              <p style={{ margin:0, fontSize:12, color:'#a5b4fc' }}>
                📊 Para atingir a meta: termine <strong>1 livro a cada {pace} dias</strong>.
              </p>
            </div>
          )}

          {pct>=100 && (
            <div style={{ background:'rgba(16,185,129,.12)', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
              <p style={{ margin:0, fontSize:13, color:'#10b981', fontWeight:700 }}>🎉 Meta atingida! Parabéns!</p>
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => markRead(goalYear)}
              disabled={goalYear.completed_books>=goalYear.target_books}
              style={{ ...S.smallBtn, flex:1, background:'rgba(16,185,129,.15)', color:'#10b981', border:'1px solid rgba(16,185,129,.25)', opacity: goalYear.completed_books>=goalYear.target_books ? .5 : 1 }}>
              <Check size={13} style={{ marginRight:4 }}/> +1 livro lido
            </button>
            <button onClick={() => deleteGoal(goalYear.id)}
              style={{ ...S.smallBtn, padding:'8px 12px', background:'rgba(239,68,68,.1)', color:'#ef4444', border:'1px solid rgba(239,68,68,.2)' }}>
              <Trash2 size={13}/>
            </button>
          </div>
        </div>
      )}

      {/* Metas de outros anos */}
      {!loading && goals.filter(g=>g.year_goal!==currentYear).length > 0 && (
        <div>
          <h3 style={{ ...S.sectionTitle, marginBottom:12 }}>HISTÓRICO</h3>
          {goals.filter(g=>g.year_goal!==currentYear).map(g => {
            const p = Math.round((g.completed_books/g.target_books)*100);
            return (
              <div key={g.id} style={{ ...S.listCard, flexDirection:'column', gap:8, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ margin:0, fontSize:13, fontWeight:700 }}>{g.year_goal}</p>
                    <p style={{ margin:0, fontSize:11, color:'#64748b' }}>{g.completed_books}/{g.target_books} livros · {p}%</p>
                  </div>
                  {p>=100 ? <Trophy size={18} color="#fbbf24"/> : <TrendingUp size={18} color="#64748b"/>}
                </div>
                <div style={{ background:'rgba(255,255,255,.06)', borderRadius:99, height:6, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, width:`${Math.min(p,100)}%`, background: p>=100?'#10b981':'#4f46e5' }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && goals.length===0 && (
        <div style={{ textAlign:'center', padding:'50px 20px' }}>
          <Target size={48} color="#1e293b" style={{ marginBottom:16 }}/>
          <p style={{ color:'#64748b', fontSize:14, marginBottom:6 }}>Nenhuma meta definida ainda.</p>
          <p style={{ color:'#475569', fontSize:12 }}>Crie sua primeira meta de leitura para {currentYear}!</p>
          <button onClick={()=>setShowForm(true)} style={{ ...S.button, marginTop:20, padding:'10px 24px', width:'auto' }}>
            <Plus size={15}/> Criar meta
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser]             = useState(null);
  const [isLogin, setIsLogin]       = useState(true);
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState({ text:'', type:'' });
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPwd]  = useState(false);

  const [currentTab, setCurrentTab] = useState('inicio');
  const [catalogo, setCatalogo]     = useState([]);
  const [minhaLista, setMinhaLista] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [readingBook, setReadingBook]= useState(null);

  useEffect(() => {
    const u = localStorage.getItem('userName');
    const t = localStorage.getItem('token');
    if (u && t) setUser({ name:u, initials:u.substring(0,2).toUpperCase() });
  }, []);

  const carregarDados = useCallback(async () => {
    try {
      const cfg = { headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` } };
      const [rB,rL,rC] = await Promise.all([
        api.get('/books', cfg),
        api.get('/progress', cfg),
        api.get('/categories', cfg),
      ]);
      if (rB.data) setCatalogo(rB.data);
      if (rL.data) setMinhaLista(rL.data);
      if (rC.data) setCategorias(rC.data);
    } catch(e) { console.warn('carregarDados:', e.message); }
  }, []);

  useEffect(() => { if (user) carregarDados(); }, [user, carregarDados]);

  const handleAuth = async (e) => {
    e.preventDefault(); setLoading(true); setMessage({ text:'', type:'' });
    try {
      if (isLogin) {
        const r = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', r.data.token);
        localStorage.setItem('userName', r.data.user.name);
        setMessage({ text:'Bem-vindo!', type:'success' });
        setTimeout(() => setUser({ name:r.data.user.name, initials:r.data.user.name.substring(0,2).toUpperCase() }), 900);
      } else {
        await api.post('/auth/register', { name, email, password });
        setMessage({ text:'Conta criada! Faça login.', type:'success' }); setIsLogin(true);
      }
    } catch(e) { setMessage({ text:e.response?.data?.message||'Erro na conexão.', type:'error' }); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { localStorage.clear(); setUser(null); setCurrentTab('inicio'); setReadingBook(null); };
  const cfg = () => ({ headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` } });

  // Detecta sessão expirada em qualquer resposta de erro e faz logout automático
  const handleApiError = (e, msgFallback) => {
    const data = e.response?.data;
    if (e.response?.status === 401 || data?.code === 'SESSION_EXPIRED') {
      alert('Sua sessão expirou. Faça login novamente.');
      handleLogout();
      return;
    }
    alert(data?.error || msgFallback || e.message);
  };

  const criarLivro = async () => {
    const title = prompt('Título:'); const author = prompt('Autor:');
    if (!title||!author) return;
    try { await api.post('/books', { title, author }, cfg()); carregarDados(); } catch(e) { alert(e.message); }
  };
  const editarLivro = async (id) => {
    const t = prompt('Novo título:'); if (!t) return;
    try { await api.put(`/books/${id}`, { title:t }, cfg()); carregarDados(); } catch(e) { alert(e.message); }
  };
  const excluirLivro = async (id) => {
    if (!window.confirm('Excluir do catálogo?')) return;
    try { await api.delete(`/books/${id}`, cfg()); carregarDados(); } catch(e) { alert(e.message); }
  };
  const adicionarAEstante = async (bookId) => {
    try {
      await api.post('/progress', { book_id: bookId, current_chapter: 1 }, cfg());
      carregarDados();
    } catch(e) {
      if (e.response?.status === 409) {
        alert('Este livro já está na sua estante!');
      } else {
        handleApiError(e, 'Erro ao adicionar à estante.');
      }
    }
  };
  const atualizarCapitulo = async (bookId, cap) => {
    if (cap<0) return;
    try { await api.put(`/progress/${bookId}`, { current_chapter:cap }, cfg()); carregarDados(); } catch(e) { alert(e.message); }
  };
  const removerDaEstante = async (bookId) => {
    if (!window.confirm('Remover da estante?')) return;
    try { await api.delete(`/progress/${bookId}`, cfg()); carregarDados(); } catch(e) { alert(e.message); }
  };
  const criarAvaliacao = async (bookId) => {
    const r=prompt('Nota 1-5:'); const c=prompt('Comentário:'); if (!r) return;
    try { await api.post('/reviews', { book_id:bookId, rating:Number(r), review_text:c }, cfg()); alert('Avaliação salva!'); }
    catch(e) { alert(e.response?.data?.error||e.message); }
  };
  const verAvaliacoes = async (bookId) => {
    try {
      const res = await api.get(`/reviews/book/${bookId}`, cfg());
      if (!res.data?.length) { alert('Nenhuma avaliação ainda.'); return; }
      alert(res.data.map(r=>`${r.user_name||'Anônimo'}\n⭐ ${r.rating} — ${r.review_text}`).join('\n\n─\n\n'));
    } catch(e) { alert(e.message); }
  };

  const RenderStars = ({ rating }) => (
    <div style={{ display:'flex', gap:2 }}>
      {[...Array(5)].map((_,i)=>(
        <Star key={i} size={11} fill={i<rating?'#fbbf24':'transparent'} color={i<rating?'#fbbf24':'#334155'}/>
      ))}
    </div>
  );

  // Leitor tela cheia
  if (readingBook) return (
    <>
      <GlobalStyle/>
      <div style={{ ...S.appContainer, flexDirection:'column' }}>
        <BookReader book={readingBook} onBack={() => setReadingBook(null)}/>
      </div>
    </>
  );

  const renderTab = () => {
    switch (currentTab) {
      case 'inicio': return (
        <div className="page-anim">
          <header style={S.userHeader}>
            <div>
              <p style={S.greeting}>Boa leitura 👋</p>
              <h2 style={S.userName}>{user.name}</h2>
            </div>
            <div style={S.avatar}>{user.initials}</div>
          </header>

          {/* Streak */}
          <div style={S.streakCard}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <Flame size={28} color="#f97316" fill="#f97316"/>
              <div>
                <h3 style={{ margin:0, fontSize:17 }}>7 dias de streak!</h3>
                <p style={{ margin:0, fontSize:12, color:'rgba(255,255,255,.6)' }}>Leia hoje para manter.</p>
              </div>
            </div>
          </div>

          {/* Destaques */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h3 style={{ ...S.sectionTitle, marginBottom:0 }}><Sparkles size={13} color="#fbbf24"/> DESTAQUES</h3>
            <button onClick={()=>setCurrentTab('catalogo')} style={{ background:'none', border:'none', color:'#818cf8', fontSize:12, fontWeight:700, cursor:'pointer' }}>Ver tudo →</button>
          </div>
          <div style={S.horizontalScroll} className="hide-scroll">
            {catalogo.slice(0,6).map(l => (
              <div key={l.id} style={S.bookCardMini} onClick={()=>setCurrentTab('catalogo')}>
                <div style={{ width:110, height:150, borderRadius:14, background:'#1e293b', overflow:'hidden', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {l.cover_url && l.cover_url.includes('gutenberg')
                    ? <img src={l.cover_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e=>{e.target.style.display='none'}}/>
                    : <BookOpen size={28} color="#334155"/>}
                </div>
                <p style={{ margin:'0 0 4px', fontSize:12, fontWeight:700, maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.title}</p>
                <RenderStars rating={4}/>
              </div>
            ))}
          </div>

          {/* Continue lendo */}
          <h3 style={{ ...S.sectionTitle, marginTop:22 }}>CONTINUE LENDO</h3>
          {minhaLista.length===0
            ? <p style={{ color:'#475569', fontSize:13 }}>Adicione livros do catálogo para começar!</p>
            : minhaLista.slice(0,3).map(item => (
              <div key={item.book_id} style={S.continueCard}>
                <div style={{ width:56, height:76, borderRadius:10, background:'#1e293b', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <BookOpen size={22} color="#334155"/>
                </div>
                <div style={{ flex:1, marginLeft:14 }}>
                  <p style={{ margin:'0 0 3px', fontSize:14, fontWeight:700 }}>{item.title}</p>
                  <p style={{ margin:0, fontSize:11, color:'#64748b' }}>Capítulo {item.current_chapter||0}</p>
                </div>
                <button onClick={()=>setReadingBook({ ...item })} style={S.readButton}>
                  Ler <Play size={11} fill="#a5b4fc" style={{ marginLeft:3 }}/>
                </button>
              </div>
            ))
          }
        </div>
      );

      case 'catalogo': return (
        <CatalogTab
          catalogo={catalogo} categorias={categorias}
          abrirLeitor={setReadingBook}
          adicionarAEstante={adicionarAEstante}
          editarLivro={editarLivro} excluirLivro={excluirLivro}
          criarLivro={criarLivro} carregarDados={carregarDados}
        />
      );

      case 'estante': return (
        <div className="page-anim">
          <h2 style={{ margin:'0 0 18px', fontSize:20, fontWeight:800 }}>Minha Estante</h2>
          {minhaLista.length===0
            ? <div style={{ textAlign:'center', padding:'50px 20px', color:'#475569' }}>
                <BookOpen size={40} color="#1e293b" style={{ marginBottom:14 }}/>
                <p style={{ fontSize:14 }}>Sua estante está vazia.</p>
                <button onClick={()=>setCurrentTab('catalogo')} style={{ ...S.button, marginTop:16, padding:'10px 22px', width:'auto' }}>Ir ao catálogo</button>
              </div>
            : minhaLista.map(item => (
              <div key={item.book_id} style={{ ...S.continueCard, flexDirection:'column', alignItems:'stretch' }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:14 }}>
                  <div style={{ width:56, height:76, borderRadius:10, background:'#1e293b', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <BookOpen size={22} color="#334155"/>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:'0 0 3px', fontSize:14, fontWeight:700 }}>{item.title}</p>
                    <p style={{ margin:'0 0 8px', fontSize:11, color:'#64748b' }}>Capítulo {item.current_chapter||0}</p>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={()=>atualizarCapitulo(item.book_id,(item.current_chapter||1)-1)} style={S.smallBtn}>− Cap</button>
                      <button onClick={()=>atualizarCapitulo(item.book_id,(item.current_chapter||1)+1)} style={S.smallBtn}>+ Cap</button>
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:7, borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:12 }}>
                  <button onClick={()=>setReadingBook({ ...item })} style={{ ...S.smallBtn, flex:1, background:'rgba(99,102,241,.18)', color:'#818cf8' }}>
                    <BookOpenCheck size={12} style={{ marginRight:4 }}/> Ler
                  </button>
                  <button onClick={()=>criarAvaliacao(item.book_id)} style={{ ...S.smallBtn, flex:1, background:'rgba(202,138,4,.15)', color:'#fbbf24' }}>
                    <Star size={12} style={{ marginRight:4 }}/> Avaliar
                  </button>
                  <button onClick={()=>verAvaliacoes(item.book_id)} style={{ ...S.smallBtn, flex:1, background:'rgba(71,85,105,.3)', color:'#94a3b8' }}>
                    <MessageSquare size={12} style={{ marginRight:4 }}/> Ver
                  </button>
                  <button onClick={()=>removerDaEstante(item.book_id)} style={{ ...S.smallBtn, background:'rgba(153,27,27,.25)', color:'#f87171' }}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      );

      case 'metas': return <GoalsTab minhaLista={minhaLista}/>;

      case 'perfil': return (
        <div className="page-anim">
          <div style={{ textAlign:'center', marginTop:10, marginBottom:28 }}>
            <div style={{ ...S.avatar, width:72, height:72, fontSize:22, margin:'0 auto 14px' }}>{user.initials}</div>
            <h2 style={{ margin:0, fontSize:20 }}>{user.name}</h2>
            <p style={{ color:'#64748b', margin:'4px 0 0', fontSize:13 }}>Membro do Elegere</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:32 }}>
            {[
              { label:'Na estante', val:minhaLista.length, icon:'📚' },
              { label:'Categorias', val:categorias.length, icon:'🏷️' },
            ].map(item => (
              <div key={item.label} style={{ background:'#111827', borderRadius:14, padding:'16px 12px', textAlign:'center', border:'1px solid rgba(255,255,255,.05)' }}>
                <p style={{ margin:'0 0 4px', fontSize:22 }}>{item.icon}</p>
                <p style={{ margin:'0 0 2px', fontSize:22, fontWeight:800, color:'#818cf8' }}>{item.val}</p>
                <p style={{ margin:0, fontSize:11, color:'#64748b' }}>{item.label}</p>
              </div>
            ))}
          </div>
          <button onClick={handleLogout}
            style={{ ...S.button, width:'100%', background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.35)', color:'#ef4444' }}>
            <LogOut size={17}/> Sair da conta
          </button>
        </div>
      );
      default: return null;
    }
  };

  if (!user) return (
    <>
      <GlobalStyle/>
      <div style={S.authContainer}>
        <div style={S.bookmark}><BookMarked size={22} color="#fff"/></div>
        <main style={S.authCard}>
          <header style={{ textAlign:'center', marginBottom:28 }}>
            <div style={S.logoCircle}><BookOpen size={30} color="#818cf8"/></div>
            <h1 style={S.authTitle}>Elegere</h1>
            <p style={{ color:'#64748b', fontSize:13, marginTop:6 }}>
              {isLogin ? 'A sua jornada literária continua aqui.' : 'Abra a primeira página da sua história.'}
            </p>
          </header>
          <form onSubmit={handleAuth} style={{ display:'flex', flexDirection:'column', gap:13 }}>
            {!isLogin && (
              <div style={S.inputWrapper}>
                <User style={S.icon} size={19}/>
                <input type="text" placeholder="Nome" style={S.input} value={name} onChange={e=>setName(e.target.value)} required/>
              </div>
            )}
            <div style={S.inputWrapper}>
              <Mail style={S.icon} size={19}/>
              <input type="email" placeholder="E-mail" style={S.input} value={email} onChange={e=>setEmail(e.target.value)} required/>
            </div>
            <div style={S.inputWrapper}>
              <Lock style={S.icon} size={19}/>
              <input type={showPassword?'text':'password'} placeholder="Senha" style={{ ...S.input, paddingRight:45 }} value={password} onChange={e=>setPassword(e.target.value)} required/>
              <div style={S.eyeIcon} onClick={()=>setShowPwd(s=>!s)}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</div>
            </div>
            {message.text && (
              <div style={{ fontSize:13, textAlign:'center', padding:'10px 14px', borderRadius:10,
                color: message.type==='error'?'#f87171':'#34d399',
                background: message.type==='error'?'rgba(239,68,68,.1)':'rgba(16,185,129,.1)' }}>
                {message.text}
              </div>
            )}
            <button type="submit" style={S.button} disabled={loading}>
              {loading?'A processar…':(isLogin?'Entrar':'Criar conta')} <ChevronRight size={19}/>
            </button>
          </form>
          <footer style={{ marginTop:22, textAlign:'center', fontSize:13, color:'#64748b' }}>
            <p style={{ margin:0 }}>
              {isLogin?'Não tem conta? ':'Já é leitor? '}
              <span style={{ color:'#818cf8', fontWeight:700, cursor:'pointer' }} onClick={()=>{setIsLogin(s=>!s);setMessage({text:'',type:''});}}>
                {isLogin?'Registre-se':'Faça login'}
              </span>
            </p>
          </footer>
        </main>
      </div>
    </>
  );

  return (
    <>
      <GlobalStyle/>
      <div style={S.appContainer}>
        <div style={S.contentArea}>{renderTab()}</div>
        <nav style={S.bottomNav}>
          {[
            { id:'inicio',   icon:<Home size={21}/>,    label:'Início'   },
            { id:'catalogo', icon:<Library size={21}/>, label:'Catálogo' },
            { id:'estante',  icon:<BookOpen size={21}/>,label:'Estante'  },
            { id:'metas',    icon:<Target size={21}/>,  label:'Metas'    },
            { id:'perfil',   icon:<User size={21}/>,    label:'Perfil'   },
          ].map(tab => (
            <div key={tab.id} onClick={()=>setCurrentTab(tab.id)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer',
                color: currentTab===tab.id ? '#818cf8' : '#475569',
                fontSize:10, fontWeight: currentTab===tab.id ? 700 : 400,
                padding:'4px 8px', borderRadius:10,
                background: currentTab===tab.id ? 'rgba(99,102,241,.12)' : 'transparent',
                transition:'color .15s,background .15s' }}>
              {tab.icon}
              <span>{tab.label}</span>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}

const S = {
  appContainer:    { display:'flex', flexDirection:'column', height:'100vh', width:'100%', maxWidth:'450px', margin:'0 auto', background:'#0b1120', position:'relative' },
  contentArea:     { flex:1, overflowY:'auto', padding:'22px 20px', paddingBottom:88 },
  userHeader:      { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 },
  greeting:        { margin:0, color:'#64748b', fontSize:12 },
  userName:        { margin:'2px 0 0', fontSize:22, fontWeight:800 },
  avatar:          { width:46, height:46, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800 },
  streakCard:      { background:'linear-gradient(135deg,#2e1065,#4c1d95)', padding:'18px 20px', borderRadius:18, marginBottom:22, border:'1px solid rgba(99,102,241,.2)' },
  sectionTitle:    { fontSize:11, color:'#64748b', fontWeight:800, display:'flex', alignItems:'center', gap:5, letterSpacing:.5, marginBottom:12 },
  horizontalScroll:{ display:'flex', gap:14, overflowX:'auto', paddingBottom:12 },
  bookCardMini:    { minWidth:110, flexShrink:0, cursor:'pointer' },
  listCard:        { background:'#111827', padding:'13px 14px', borderRadius:14, display:'flex', alignItems:'center', border:'1px solid rgba(255,255,255,.05)' },
  continueCard:    { display:'flex', alignItems:'center', background:'#111827', padding:'15px', borderRadius:18, marginBottom:12, border:'1px solid rgba(255,255,255,.05)' },
  actionBtn:       { background:'#4f46e5', color:'#fff', border:'none', padding:'8px 13px', borderRadius:9, display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:13, fontWeight:600 },
  iconBtn:         { background:'rgba(255,255,255,.08)', border:'none', padding:8, borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  smallBtn:        { background:'#1e293b', color:'#e2e8f0', border:'none', padding:'7px 11px', borderRadius:7, fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 },
  button:          { padding:'13px', background:'linear-gradient(to right,#6366f1,#a855f7)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 },
  readButton:      { background:'rgba(99,102,241,.18)', color:'#a5b4fc', border:'none', padding:'6px 12px', borderRadius:20, cursor:'pointer', fontWeight:700, display:'flex', alignItems:'center', fontSize:12 },
  bottomNav:       { position:'absolute', bottom:0, left:0, right:0, height:72, background:'#0f172a', display:'flex', justifyContent:'space-around', alignItems:'center', borderTop:'1px solid rgba(255,255,255,.05)', padding:'0 4px' },
  authContainer:   { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e1b4b)', padding:20 },
  bookmark:        { width:46, height:64, background:'#6366f1', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'0 0 8px 8px', marginBottom:-18, zIndex:10 },
  authCard:        { background:'rgba(255,255,255,.03)', backdropFilter:'blur(12px)', padding:'36px 28px', borderRadius:26, border:'1px solid rgba(255,255,255,.09)', width:'100%', maxWidth:400 },
  logoCircle:      { width:60, height:60, background:'rgba(99,102,241,.12)', borderRadius:18, display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:14 },
  authTitle:       { fontSize:26, margin:'0 0 2px', fontWeight:800, background:'linear-gradient(to right,#818cf8,#c084fc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  inputWrapper:    { position:'relative', display:'flex', alignItems:'center' },
  icon:            { position:'absolute', left:14, color:'#475569' },
  eyeIcon:         { position:'absolute', right:14, color:'#475569', cursor:'pointer' },
  input:           { width:'100%', padding:'13px 14px 13px 42px', borderRadius:12, border:'1px solid rgba(255,255,255,.09)', fontSize:15, background:'rgba(255,255,255,.04)', color:'#fff', outline:'none' },
  tag:             { fontSize:10, background:'rgba(99,102,241,.15)', padding:'2px 8px', borderRadius:10, color:'#818cf8', fontWeight:700 },
  filterChip:      { fontSize:11, padding:'4px 12px', borderRadius:20, border:'1px solid rgba(255,255,255,.08)', cursor:'pointer', fontWeight:600, background:'rgba(255,255,255,.05)', color:'#94a3b8', whiteSpace:'nowrap', flexShrink:0 },
  filterChipActive:{ background:'rgba(99,102,241,.25)', borderColor:'rgba(99,102,241,.5)', color:'#a5b4fc' },
};

export default App;