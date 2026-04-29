# Supabase Email And Password Auth Setup

This project now uses standard Supabase email and password authentication in the mobile app.

The intended behavior is:

- Users can record and manage notes locally with no account.
- An account is only required when they want to sync notes to the server.
- Users can create an account with email and password.
- Users can sign in later with the same email and password.

## 1. Mobile app environment

Create `mobile/.env` from `mobile/.env.example` and fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

The app reads those variables from `mobile/src/lib/supabase.ts`.

## 2. Supabase dashboard setup

In the Supabase dashboard:

1. Open `Authentication`.
2. Open `Providers`.
3. Open `Email`.
4. Keep the Email provider enabled.

## 3. Important setting for development

If you want account creation to sign the user in immediately without email verification:

1. Open `Authentication` -> `Providers` -> `Email`.
2. Turn off `Confirm email`.

Why this matters:

- When `Confirm email` is on, `signUp()` may create the user but not return an active session.
- In that case the app will show a notice saying the account was created but confirmation is still required.
- For local development, disabling `Confirm email` is usually the fastest path.

For production, you may want to turn confirmation back on.

## 4. No callback required for normal login

The current login flow does not rely on magic links or OAuth redirects.

That means:

- no email callback is needed for normal sign-in
- no deep-link roundtrip is needed for normal sign-in
- SMTP is not required for the main login flow

The custom app scheme can remain in the native project for future password reset or email-link flows, but it is not required for normal login anymore.

## 5. Testing the flow

Recommended commands:

```bash
cd mobile
npx expo run:ios
```

```bash
cd mobile
npx expo run:android
```

Test sequence:

1. Open the `Account` tab in the app.
2. Enter an email address.
3. Enter a password with at least 6 characters.
4. Tap `Create account`.
5. Confirm the app shows the signed-in account.
6. Sign out.
7. Tap `Sign in` with the same credentials.
8. Go back to `Notes` and tap `Connect account` or `Check sync`.

At that point auth is working and the app is ready for the next step: attaching real upload and sync behavior to the authenticated user.

## 6. Recommended next backend step

Supabase Auth already creates a user in `auth.users`, which is enough to start.

The next practical improvement is a `public.profiles` table keyed by `auth.users.id`, so server-side note, transcript, and job records can reference a stable profile row.

Suggested SQL:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id);
```

If you want to auto-create profiles on signup, add a trigger from `auth.users` later. That is optional for this first auth slice.
