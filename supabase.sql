-- ============================================
-- YuuTracker — Setup do banco (Supabase)
-- Cole tudo isso no SQL Editor do Supabase e clique em RUN
-- ============================================

-- Tabela de apostas
create table public.apostas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null,
  hora text,
  casa text,
  titulo text,
  esporte text,
  estado text not null default 'pendente',
  cotacao numeric,
  valor numeric,
  retorno numeric,
  tipster text,
  comentario text,
  created_at timestamptz default now()
);

-- Tabela de configuração (banca)
create table public.config (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  banca_nome text,
  banca_inicial numeric,
  ocr_ignorar text
);

-- Segurança: cada usuário só vê e mexe nos próprios dados
alter table public.apostas enable row level security;
alter table public.config enable row level security;

create policy "donos_apostas" on public.apostas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "donos_config" on public.config
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
