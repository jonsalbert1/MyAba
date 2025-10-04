create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

create type if not exists deck_type as enum ('flash','safmeds','quiz');

create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  name text not null,
  dtype deck_type not null,
  created_at timestamptz not null default now()
);

create table if not exists flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  term text not null,
  def text not null
);

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  domain text,
  question text not null,
  option_a text, option_b text, option_c text, option_d text,
  answer char(1) not null,
  rationale text
);

create table if not exists safmeds_sessions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references decks(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  duration_seconds int not null,
  correct int not null default 0,
  incorrect int not null default 0,
  started_at timestamptz not null default now()
);

create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  chosen char(1) not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);