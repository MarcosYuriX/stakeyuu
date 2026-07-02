# YuuTracker 🎯

Gestor de apostas esportivas — registre suas apostas, acompanhe lucro, ROI, taxa de acerto e a evolução da banca, com filtros por casa, tipster, esporte, estado e período.

Feito em HTML + CSS + JavaScript puro (sem backend). Os dados ficam salvos no navegador (localStorage), com exportação e importação de backup em JSON.

## Funcionalidades

- ✅ Registro de apostas (data, hora, casa, título, esporte, cotação, valor, tipster, comentário)
- ✅ Estados: Pendente, Ganha, Perdida, Anulada e Cashout (com valor de retorno)
- ✅ Gráfico de evolução do lucro acumulado
- ✅ Cards de estatísticas: apostas, lucro, ROI, progressão da banca e taxa de acerto
- ✅ Lista agrupada por dia com total diário
- ✅ Filtros por casa, tipster, esporte, estado e intervalo de datas
- ✅ Configuração de banca inicial
- ✅ Exportar / importar backup em JSON

## Como rodar no PC

1. Baixe/clone a pasta do projeto
2. Abra o arquivo `index.html` no navegador (duplo clique)

Pronto — não precisa instalar nada. Nesse modo os dados ficam no navegador (localStorage).

## Modo nuvem (login + banco de dados) — opcional e grátis

Com o Supabase, suas apostas ficam num banco PostgreSQL na nuvem, com login por e-mail/senha, e você acessa de qualquer dispositivo.

1. Crie uma conta grátis em https://supabase.com e crie um **New project**
2. No menu lateral, abra o **SQL Editor**, cole todo o conteúdo do arquivo `supabase.sql` e clique em **Run**
3. Em **Authentication → Sign In / Up → Email**, desative a opção **Confirm email** (senão cada conta precisa confirmar por e-mail)
4. Em **Settings → API**, copie a **Project URL** e a **anon public key**
5. Abra o `js/app.js` e cole os dois valores no topo do arquivo:
   ```js
   const SUPABASE_URL = 'https://xxxx.supabase.co';
   const SUPABASE_KEY = 'eyJhbGciOi...';
   ```
6. Abra o site — vai aparecer a tela de login. Crie sua conta e pronto!

Na primeira vez que você logar, o app oferece **migrar as apostas que já estavam salvas no navegador** pra sua conta.

> A anon key pode ficar pública no código sem problema — a segurança vem das políticas RLS do banco (criadas pelo `supabase.sql`), que garantem que cada usuário só acessa os próprios dados.

## Como hospedar de graça no GitHub Pages

1. Crie um repositório novo no GitHub (ex: `yuutracker`)
2. Pelo GitHub Desktop, adicione a pasta do projeto e faça o commit + push
3. No GitHub, vá em **Settings → Pages**
4. Em **Source**, escolha `Deploy from a branch`, branch `main`, pasta `/ (root)` e salve
5. Em 1–2 minutos o site fica no ar em `https://SEU-USUARIO.github.io/yuutracker/`

## Importante sobre os dados

Os dados ficam salvos **no navegador que você usar** (localStorage). Se limpar os dados do navegador ou trocar de dispositivo, eles não vão junto — por isso use o botão **Exportar** de vez em quando para guardar um backup `.json`, e o **Importar** para restaurar.

## Estrutura

```
yuutracker/
├── index.html      # Página principal
├── css/style.css   # Tema escuro
├── js/app.js       # Lógica (estado, gráfico, filtros, CRUD)
└── README.md
```
