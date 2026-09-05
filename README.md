# 🎓 The Lab Indonesia - Training Center Core

Technology Training Center & Instructor Operational System for **The Lab Indonesia**, accessible at `https://training.thelabindonesia.my.id`.

---

## 📌 Architecture

- **Public Landing Page (`/`)**: Light theme brand website matching The Lab Indonesia's official logo colors (Golden Yellow, Deep Royal Navy, Vibrant Sky Teal).
- **Instructor Dashboard (`/dashboard`)**: Protected operational workspace with live session conductor, trainee attendance tracking, practical lab evaluation, and VPS telemetry (Theme matched with Light Brand Colors).
- **Authentication (`/login`)**: Protected session/cookie authentication with auto-migrated admin account.
- **Database**: PostgreSQL with automatic schema migration and seed data.
- **Subdomain Deployment**: Hosted on Ubuntu VPS with Nginx reverse proxy (Port 3050) and Let's Encrypt SSL.

---

## 🔑 Default Administrator Credentials

Auto-seeded into the database upon initial startup:
- **Email**: `admin@thelabindonesia.my.id`
- **Password**: `TheLab2026!Admin`
- **Role**: `Lead Instructor & Admin`

---

## ⚙️ Environment Variables (`.env`)

Configure your `.env` file (copied from `.env.example`):

```ini
PORT=3050

# PostgreSQL Configuration
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_secure_postgres_password
PGDATABASE=thelab_training

# Session Secret
SESSION_SECRET=thelab_indonesia_secret_key_2026_super_secure

# Admin Credentials
ADMIN_NAME=Farhan Laudza
ADMIN_EMAIL=admin@thelabindonesia.my.id
ADMIN_PASSWORD=TheLab2026!Admin
```

---

## 🐘 PostgreSQL Setup on VPS (Quick Guide)

If PostgreSQL is not yet installed on your Ubuntu VPS:

```bash
# 1. Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# 2. Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. Create database and user
sudo -u postgres psql -c "CREATE DATABASE thelab_training;"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
```

---

## 🚀 Deploying Updates to VPS

### 1. Push from Local Machine
```bash
git add .
git commit -m "feat: postgresql integration, auth login, and light theme dashboard"
git push origin main
```

### 2. Pull and Restart on VPS
```bash
cd /var/www/training-center
git pull
npm install --production
pm2 restart thelab-training
```

---

## 🌐 Verification

- **Landing Page**: 👉 `https://training.thelabindonesia.my.id`
- **Instructor Login**: 👉 `https://training.thelabindonesia.my.id/login`
- **Protected Dashboard**: 👉 `https://training.thelabindonesia.my.id/dashboard`