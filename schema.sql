-- مخطط مبدئي للمراجعة قبل الاستخدام، وليس إعدادًا جاهزًا للنشر.
-- فعّلي RLS واكتبي سياسات دقيقة قبل ربط التطبيق بقاعدة البيانات.

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  public_code text unique not null,
  nickname text,
  character_data jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table public.friend_submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  friend_nickname text,
  character_data jsonb not null,
  appearance_score integer check (appearance_score between 0 and 100),
  traits_score integer check (traits_score between 0 and 100),
  total_score integer check (total_score between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;
alter table public.friend_submissions enable row level security;

-- لا تضيفي سياسة عامة تسمح للجميع بقراءة كل السجلات.
-- يجب تصميم وصول خاص بصاحب التحدي وآلية تحقق آمنة قبل فتح القراءة والكتابة عبر API.
