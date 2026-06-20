# Sprint — Análise de Boas Práticas de Software
**Projeto:** Elegere — Plataforma de Leitura Digital  
**Stack:** Node.js + Express (backend) · React (frontend) · PostgreSQL  
**Data:** Junho de 2026

---

## 1. Requisitos da Aplicação

### 1.1 Requisitos Funcionais Implementados

| ID | Requisito | Status |
|----|-----------|--------|
| RF01 | Cadastro e autenticação de usuários | ✅ Implementado |
| RF02 | Catálogo de obras via APIs externas | ✅ Implementado |
| RF04 | Metas de leitura e acompanhamento de progresso | ✅ Implementado |
| RF06 | Dicionário contextual durante a leitura | ✅ Implementado |
| RF07 | Visualizador interno e download de obras | ⚠️ Parcial |

**Detalhes:**

- **RF01** — Registro com `bcrypt` (salt 10) e login via JWT (expiração em 1 dia). Middleware `verifyToken` protege as rotas autenticadas. Tratamento explícito de e-mail duplicado via código PostgreSQL `23505`.
- **RF02** — Integração com Project Gutenberg (via Gutendex API) e Standard Ebooks (parsing OPDS/XML). Importação local com deduplicação por título e autor. Suporte a múltiplos idiomas na busca do Gutenberg.
- **RF04** — CRUD completo de metas (`goalController`) com upsert por `(user_id, year_goal)`. Frontend exibe barra de progresso, dias restantes, ritmo necessário e histórico de anos anteriores.
- **RF06** — Seleção de palavra no leitor abre `DictionaryPopup` com fonética, áudio, definições, exemplos e sinônimos via Free Dictionary API. Endpoint `/library/dictionary/:word` com timeout e limpeza de caracteres especiais.
- **RF07 (parcial)** — Leitor integrado (`BookReader`) com ajuste de fonte, cache de conteúdo e fallback para Gutenberg. Download de EPUB disponível via link externo. **Download em PDF não implementado.**

---

### 1.2 Requisitos Funcionais Não Implementados

| ID | Requisito | Observação |
|----|-----------|------------|
| RF03 | Motor de recomendação por IA (scikit-learn) | ❌ Ausente |
| RF05 | Rankings mensais por engajamento | ❌ Ausente |

**Detalhes:**

- **RF03** — Nenhum endpoint de ML, integração com Python/scikit-learn ou lógica de recomendação personalizada foi encontrado no código. O motor de recomendação baseado em histórico de leitura e preferências de gênero está completamente ausente.
- **RF05** — Nenhuma query de ranking, endpoint de leaderboard ou tabela de pontuação existe. A gamificação planejada não foi desenvolvida nesta sprint.

---

### 1.3 Requisitos Não Funcionais

| ID | Requisito | Status |
|----|-----------|--------|
| RNF01 | Interface Mobile-First | ✅ Atendido |
| RNF02 | Segurança (BCrypt + HTTPS) | ✅ Atendido |
| RNF03 | Performance ≤ 5s nas recomendações | ⚠️ Parcial |
| RNF04 | Conformidade LGPD | ⚠️ Parcial |

- **RNF01** — Layout com `maxWidth: 450px`, navegação inferior fixa, scroll horizontal no carrossel e tipografia responsiva.
- **RNF02** — BCrypt salt 10 para senhas. JWT com expiração de 1 dia. Senhas nunca retornadas nas respostas JSON. HTTPS provido pela infraestrutura (Render).
- **RNF03 (parcial)** — Cache em memória com TTL de 1h evita repetir downloads do Gutenberg. Retry com backoff progressivo em `fetchWithTimeout`. Sem monitoramento formal de latência.
- **RNF04 (parcial)** — Coleta de dados mínima (nome, e-mail). Sem política de privacidade explícita, sem endpoint de exclusão de conta por solicitação do usuário, sem registro de consentimento.

---

## 2. Análise de Código

### 2.1 Boas Práticas de POO

#### Backend (Node.js)

**Pontos positivos:**
- **Encapsulamento funcional** — Controllers exportados como objetos literais (`module.exports`) agrupam métodos relacionados sob um namespace coeso. Dados internos (pool, cache) não vazam para o exterior.
- **Alta coesão por módulo** — Cada controller trata de um único conceito de domínio: `reviewController` lida apenas com avaliações, `progressController` apenas com progresso de leitura.

**Pontos a melhorar:**
- **Ausência de herança e polimorfismo** — POO aplicada de forma essencialmente procedimental. Uma classe base `BaseController` com métodos `handleError(res, err)` e `notFound(res)` eliminaria código duplicado entre controllers.
- **Sem entidades de domínio** — Classes como `User`, `Book` e `Goal` não existem como objetos — são apenas linhas de banco retornadas como objetos plain. Falta a camada de modelo que daria comportamento às entidades.

#### Frontend (React)

**Pontos positivos:**
- **Componentização bem definida** — `BookReader`, `DictionaryPopup`, `GoalsTab`, `CatalogTab` e `ExternalSearch` têm responsabilidades claras e são componentes independentes.
- **Uso correto de hooks** — `useState`, `useEffect` e `useCallback` aplicados adequadamente. `useCallback` em `carregarDados` evita recriação desnecessária da função.

**Pontos a melhorar:**
- **`App.jsx` como God Component** — Estado global, funções de API, lógica de autenticação e renderização das 5 abas concentrados em ~700 linhas num único arquivo.
- **Props drilling sem Context** — Funções como `abrirLeitor`, `adicionarAEstante` e `carregarDados` passadas por vários níveis de props. Context API ou Zustand organizaria melhor o estado global.

---

### 2.2 Princípios SOLID

#### S — Single Responsibility ✅ Bom
Cada controller tem responsabilidade única e bem delimitada. Rotas separadas por domínio reforçam a separação. **Violação:** `libraryController` acumula busca externa, importação, dicionário e leitura de texto — deveria ser dividido em pelo menos dois módulos.

#### O — Open/Closed ⚠️ Parcial
`fetchWithTimeout` é extensível via parâmetros. Porém `getTxtUrls` e o loop de URLs em `readBook` exigem edição direta do código para adicionar novos provedores de conteúdo. A solução ideal seria um array de "estratégias de fonte" configurável externamente.

#### L — Liskov Substitution — N/A
JavaScript sem hierarquias de herança explícitas. Os controllers seguem contrato implícito consistente `(req, res) → void`, equivalente funcional de polimorfismo por interface.

#### I — Interface Segregation ✅ Bom
Rotas expostas de forma granular por domínio. Nenhum cliente é forçado a consumir endpoints desnecessários. `progressRoutes`, `goalRoutes` e os demais são completamente independentes entre si.

#### D — Dependency Inversion ❌ Fraco
Todos os controllers importam `pool` diretamente com `require('../config/db')` — acoplamento forte ao PostgreSQL. Sem camada de repositório ou abstração de dados, é impossível testar unitariamente sem conexão real com o banco, e trocar de banco exigiria alterar todos os controllers.

---

### 2.3 Conceitos de Clean Code

#### Pontos positivos

- **Nomenclatura descritiva e consistente** — Funções como `startReading`, `getMyLibrary`, `lookupWord` e `fetchWithTimeout` comunicam intenção sem necessidade de comentários. Convenção camelCase aplicada uniformemente.
- **Funções pequenas e focadas** — `getCached`, `setCache` e `getTxtUrls` fazem uma coisa só. `fetchWithTimeout` encapsula retry + timeout de forma reutilizável.
- **Tratamento de erros semântico** — Respostas HTTP corretas: 400 para validação, 401 para autenticação, 404 para não encontrado, 409 para conflito, 500 para erros internos. Códigos PostgreSQL (`23505`, `23503`) tratados explicitamente.
- **Interceptor Axios centralizado** — `api.js` trata sessão expirada em um único lugar com flag `sessionAlertShown` para evitar alertas duplicados, eliminando duplicação no frontend.
- **Logs contextuais** — Prefixos como `[startReading]`, `[cache hit]` e `[readBook] tentando:` facilitam debugging em produção.

#### Pontos a melhorar

- **`App.jsx` monolítico** — ~700 linhas com UI, estado e chamadas de API misturadas. Extrair hooks customizados (`useBooks`, `useGoals`, `useAuth`) e separar cada aba em arquivo próprio.
- **Magic strings hardcoded** — URLs do Gutenberg espalhadas em múltiplas funções (`readBook`, `getTxtUrls`, frontend). Extrair para um arquivo de constantes `config/sources.js`.
- **`alert()` e `prompt()` nativos** — Usados para criar livros, avaliar e confirmar exclusões. Bloqueantes, não estilizáveis e péssimos em mobile. Substituir por modais ou sistema de toasts.
- **Objeto de estilos `S` global** — ~30 entradas de estilo inline no final de `App.jsx`. Migrar para CSS Modules ou Tailwind.
- **Ausência total de testes** — Nenhum arquivo de teste identificado. Qualquer refatoração futura representa risco. Prioridade: testes unitários nos controllers e testes de integração nas rotas principais.

---

### 2.4 Padrões de Projeto

#### Padrões identificados

| Padrão | Onde está no código | Avaliação |
|--------|---------------------|-----------|
| **Module Pattern** | Controllers exportados com `module.exports` | ✅ Aplicado corretamente |
| **Chain of Responsibility** | Middleware `verifyToken` no pipeline Express | ✅ Aplicado corretamente |
| **Facade** | `api.js` encapsula Axios com injeção de token e tratamento de sessão | ✅ Aplicado corretamente |
| **Cache com TTL** | `bookCache` (Map) com verificação de `Date.now()` e TTL de 1h | ✅ Aplicado corretamente |
| **Retry com Backoff** | `fetchWithTimeout` com `500ms × attempt` | ✅ Aplicado corretamente |
| **Strategy (implícito)** | `readBook` tenta múltiplas URLs em sequência | ⚠️ Sem abstração formal |

#### Padrões ausentes — oportunidades

- **Repository Pattern** — SQL diretamente nos controllers mistura acesso a dados com lógica de negócio. Criar `BookRepository`, `GoalRepository` etc. desacoplaria o banco e permitiria testes com mocks.
- **Service Layer** — Regras de negócio (validar meta, calcular progresso) misturadas com SQL. Uma camada de serviço separaria essas responsabilidades claramente.
- **Observer / Event Emitter** — Quando um livro é marcado como lido, a meta deveria ser atualizada automaticamente. Um sistema de eventos desacoplaria essas ações.

---

### 2.5 Padrões Arquiteturais

#### Padrão adotado: Layered Architecture (Routes → Controllers → DB)

O backend segue uma arquitetura em camadas sem a camada Model explícita — as queries SQL estão diretamente nos controllers. É um MVC simplificado, adequado para o estágio atual do projeto, mas que apresenta limitações de escalabilidade.

```
[Cliente React]
      │  HTTP
      ▼
[Routes]          ← entrada, validação de rota
      │
[Middleware]      ← autenticação, cross-cutting concerns
      │
[Controllers]     ← lógica de negócio + acesso a dados (SQL inline)
      │
[PostgreSQL]      ← persistência
```

#### Qualidade por dimensão

| Dimensão | Avaliação |
|----------|-----------|
| Separação routes / controllers | ✅ Ótimo |
| Autenticação e autorização | ✅ Bom |
| Separação controller / modelo | ❌ Fraco |
| Testabilidade | ❌ Crítico |
| Componentização frontend | ⚠️ Médio |
| Segurança das rotas | ⚠️ Médio |

#### Problemas críticos

1. **Rotas sem autenticação** — `bookRoutes` e `categoryRoutes` não usam `verifyToken`. Qualquer usuário anônimo pode criar, editar ou excluir livros e categorias do catálogo.

2. **CORS completamente aberto** — `app.use(cors())` sem restrição de origem permite que qualquer domínio faça requisições à API em produção.

3. **Sem validação de entrada** — Nenhuma biblioteca de validação (Joi, Zod, express-validator). Inputs chegam diretamente ao SQL sem sanitização.

4. **Cache em memória sem limite** — `bookCache` pode crescer indefinidamente. Implementar LRU ou limite máximo de entradas.

---

## 3. Resumo Executivo

### O que está bem
- Arquitetura em camadas clara e consistente
- Autenticação segura com BCrypt + JWT
- Componentização React com responsabilidades bem definidas
- Cache, retry e backoff implementados de forma eficaz
- Tratamento de erros semântico e logs contextuais

### Principais débitos técnicos
- RF03 (IA) e RF05 (rankings) não implementados
- `App.jsx` monolítico precisa ser decomposto
- Ausência de Repository/Service Layer viola DIP e impede testes
- Rotas de catálogo sem autenticação representam risco de segurança
- CORS aberto e ausência de validação de entrada em produção

### Próximos passos sugeridos
1. Adicionar `verifyToken` em `bookRoutes` e `categoryRoutes`
2. Configurar `cors({ origin: process.env.ALLOWED_ORIGIN })`
3. Introduzir Zod ou express-validator nas rotas de entrada
4. Extrair hooks customizados no frontend (`useAuth`, `useBooks`, `useGoals`)
5. Criar camada de repositório para desacoplar SQL dos controllers
6. Escrever testes unitários para os controllers principais