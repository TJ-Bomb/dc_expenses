# DC Expenses v2 — Vercel + Neon PostgreSQL

A full-stack Next.js finance tracker with a flat, premium dark interface, individual logins, shared PostgreSQL records, reports, Excel import/export, user administration, and editable global Accounting Titles.

## Included

- Dashboard filtered by month and year
- Income and expense transactions in PHP
- Shared ledger visible to all authenticated users
- Individual username/password accounts (bcrypt password hashes)
- First registered account becomes Administrator; later self-registrations become Members
- Admin can create users, assign roles, and activate/deactivate accounts
- Members can edit/delete only transactions they created; admins can manage all transactions
- Global Settings for Accounting Titles: add, edit, activate/deactivate, and delete unused titles
- Excel `.xlsx`, `.xls`, and `.csv` import; `.xlsx` export
- SQL schema and starter Accounting Titles

## 1. Create a Neon PostgreSQL database

Recommended: create the database from the Vercel Marketplace Neon integration so Vercel can inject the database environment variables.

1. Sign in to Vercel.
2. Open the Neon integration: https://vercel.com/marketplace/neon
3. Install it and connect it to your Vercel account/project, or choose the option to create a new Neon account/database.
4. Create a database/project named `dc-expenses` and choose a region close to your users.
5. In the Neon console, open **SQL Editor**.
6. Open `sql/schema.sql` from this project, copy the entire contents, paste it into the Neon SQL Editor, and run it once.
7. Confirm that these tables exist: `app_users`, `accounting_titles`, and `transactions`.

The schema inserts the initial Accounting Titles: Food, Grocery, Medicine, HMO, Cloths, Hclick, Car, and Others. It does **not** insert sample transactions or sample users.

Important: run the schema against the intended empty production database before creating the first account. The first account registered after the schema is installed becomes the administrator.

## 2. Configure environment variables

The app requires:

- `DATABASE_URL`: Neon PostgreSQL pooled connection string. When using the Vercel-managed Neon integration, this is normally added to the Vercel project automatically. Use the pooled connection string (hostname usually contains `-pooler`) when manually copying it from Neon.
- `SESSION_SECRET`: a private random secret of at least 32 characters.

Generate a secret on Windows with Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Or on macOS/Linux:

```bash
openssl rand -base64 48
```

Never put real credentials in source code, commit them to GitHub, or use a `NEXT_PUBLIC_` prefix for secrets.

## 3. Upload the project to GitHub

1. Extract the ZIP file.
2. Create a **private** GitHub repository named `dc-expenses`.
3. Upload the contents of this folder to the repository root (the root should contain `package.json`, `app/`, `components/`, `lib/`, and `sql/`).
4. Do not upload `.env.local` or any real database credentials.

## 4. Deploy on Vercel

1. Open https://vercel.com/new.
2. Import the `dc-expenses` GitHub repository.
3. Vercel should detect Next.js automatically.
4. Keep the default build command (`next build`) and output settings.
5. Open **Project Settings → Environment Variables**.
6. Add `DATABASE_URL` if the Neon integration did not add it automatically.
7. Add `SESSION_SECRET` using the random value generated above.
8. Apply the variables to **Production**. Add them to Preview/Development only if you intend to use those environments and have a separate safe database for them.
9. Click **Deploy**. If variables were added after the first deployment, redeploy so the new deployment receives them.

Vercel's Next.js deployment is generally zero-configuration. See https://vercel.com/docs/frameworks/full-stack/nextjs and https://vercel.com/docs/environment-variables.

## 5. First login and user setup

1. Open the deployed Vercel URL.
2. Choose **Create an account**.
3. Register the administrator's name, username, and a strong password (10+ characters).
4. The first registered account becomes `admin`.
5. Sign in and open **Users** to create additional accounts. New accounts created by the administrator are Members by default; you can select Administrator if needed.
6. Additional public self-registrations are assigned the Member role. For a closed/private system, disable public registration in a future release and use administrator-created accounts only.

## 6. Use Global Settings → Accounting Titles

Administrators can:

- Add a title and choose whether it applies to Income, Expense, or Both.
- Edit a title.
- Deactivate a title so it no longer appears in new transaction forms while preserving historical transactions.
- Permanently delete a title only when no transaction references it. The app blocks deletion if it is in use.

## 7. Excel import format

The first worksheet should contain these columns (case-insensitive field matching is supported for the listed alternatives):

| Column | Example |
|---|---|
| Date | 2026-11-21 |
| Type | expense or income |
| Amount | 1250.00 |
| User | TJ |
| Particulars | Grocery shopping |
| Accounting Title | Grocery |

The Accounting Title must already exist and be active. Imported rows are sent through the same transaction validation as manually entered records. Invalid rows are skipped and the import summary reports how many were accepted.

A starter template is provided at `public/dc-expenses-import-template.csv`.

## 8. Local development (optional)

Requires Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local
# edit .env.local and enter DATABASE_URL and SESSION_SECRET
npm run dev
```

Open http://localhost:3000. Run `sql/schema.sql` against your development database before registering.

## Database and security notes

- PostgreSQL is accessed only in server-side route handlers; the database URL is never sent to browser code.
- Passwords are stored as bcrypt hashes, not plaintext.
- Session cookies are HTTP-only, SameSite=Lax, and Secure in production.
- SQL values are parameterized through the Neon SQL tagged-template driver.
- All users can view the shared transaction list. Members can change only their own transactions; administrators can change all transactions.
- The first-account promotion is serialized with a PostgreSQL advisory transaction lock.
- The initial release does not include password reset/email verification, MFA, invitation-only registration, audit log UI, or scheduled backups. Configure database backups/retention in Neon and consider adding these before storing highly sensitive financial data.
- Do not expose the database connection string or session secret in screenshots, chat, source control, or browser code.
