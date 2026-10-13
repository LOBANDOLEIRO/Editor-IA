-- Contas, plano, uso mensal e projetos salvos do Editor IA.
-- Regra geral: cada usuário só enxerga as próprias linhas (RLS).
-- O plano NÃO pode ser alterado pelo usuário: só pelo painel ou, depois,
-- pelo webhook de pagamento (que usa a chave de serviço).

-- Perfil com o plano de assinatura ------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'gratis' check (plan in ('gratis', 'criador', 'pro')),
  plan_renews_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "usuario le o proprio perfil"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Cria o perfil (plano grátis) assim que a conta é criada.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Uso por mês (vídeos renderizados e gerações com IA) -----------------------
create table public.usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  videos integer not null default 0,
  ai_generations integer not null default 0,
  primary key (user_id, month)
);

alter table public.usage enable row level security;

create policy "usuario le o proprio uso"
  on public.usage for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Só soma (nunca diminui) o uso do próprio usuário logado.
create function public.increment_usage(kind text)
returns public.usage
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.usage;
  current_month text := to_char(now() at time zone 'utc', 'YYYY-MM');
begin
  if (select auth.uid()) is null then
    raise exception 'não autenticado';
  end if;
  if kind not in ('videos', 'ai_generations') then
    raise exception 'tipo de uso inválido: %', kind;
  end if;

  insert into public.usage as u (user_id, month, videos, ai_generations)
  values (
    (select auth.uid()),
    current_month,
    case when kind = 'videos' then 1 else 0 end,
    case when kind = 'ai_generations' then 1 else 0 end
  )
  on conflict (user_id, month) do update
    set videos = u.videos + excluded.videos,
        ai_generations = u.ai_generations + excluded.ai_generations
  returning * into result;

  return result;
end;
$$;

revoke execute on function public.increment_usage(text) from public, anon;
grant execute on function public.increment_usage(text) to authenticated;

-- Projetos salvos ----------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default 'Sem título' check (char_length(name) between 1 and 120),
  html text not null check (octet_length(html) <= 15000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_updated_idx on public.projects (user_id, updated_at desc);

alter table public.projects enable row level security;

create policy "usuario le os proprios projetos"
  on public.projects for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "usuario cria os proprios projetos"
  on public.projects for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "usuario edita os proprios projetos"
  on public.projects for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "usuario apaga os proprios projetos"
  on public.projects for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();
