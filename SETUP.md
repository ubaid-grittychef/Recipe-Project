# One-Time Setup — 4 Steps

Everything in the code is ready. You just need to do these 4 things in your Supabase dashboard once.

---

## Step 1 — Run the database SQL

1. Go to your Supabase project → **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the entire contents of `supabase/factory-schema.sql` and paste it in
4. Click **Run**

Done — this creates all the tables, auth triggers, and security rules.

---

## Step 2 — Register the JWT hook

This makes your role (admin/user) and subscription status get embedded in login tokens.

1. In Supabase, go to **Authentication** → **Hooks** (left sidebar)
2. Find **"Custom Access Token"** and click **Enable**
3. Set:
   - **Hook type:** `postgres function`
   - **Schema:** `public`
   - **Function:** `custom_jwt_claims`
4. Click **Save**

---

## Step 3 — Enable Google + Microsoft login

**Google:**
1. In Supabase go to **Authentication** → **Providers**
2. Click **Google** → toggle **Enable**
3. You need a Google OAuth Client ID and Secret — get them free at [console.cloud.google.com](https://console.cloud.google.com)
   - Create a project → APIs & Services → Credentials → Create OAuth Client → Web application
   - Add `https://gpycllipjqynvinxzeih.supabase.co/auth/v1/callback` as an **Authorized redirect URI**
   - Copy Client ID and Client Secret into Supabase

**Microsoft:**
1. Back in Supabase → **Providers** → click **Azure**
2. Follow the same process at [portal.azure.com](https://portal.azure.com) → App registrations → New registration
   - Add `https://gpycllipjqynvinxzeih.supabase.co/auth/v1/callback` as the redirect URI
   - Copy the Application (client) ID and a client secret into Supabase

---

## Step 4 — Set yourself as admin

1. Create your account by going to your app and signing up normally
2. Then go to Supabase → **SQL Editor** → **New query** and run:

```sql
UPDATE profiles
SET role = 'admin', subscription_status = 'active'
WHERE email = 'YOUR_EMAIL_HERE';
```

Replace `YOUR_EMAIL_HERE` with the email you signed up with.

---

## Also update your .env.local

Open `.env.local` and change these two lines:

```
NEXT_PUBLIC_SITE_URL=http://localhost:3000        ← change to your live domain when deploying
NEXT_PUBLIC_CONTACT_EMAIL=your@email.com          ← change to your real email
```

---

## Quick test

Run `npm run dev`, go to `http://localhost:3000` and you should see the login page.
Sign up → check email → confirm → you'll be redirected and can then run Step 4 to make yourself admin.
