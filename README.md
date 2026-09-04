# 🎓 The Lab Indonesia - Training Center (Instructor Dashboard)

Operational & Instructor Management Dashboard for **The Lab Indonesia**, hosted on `https://training.thelabindonesia.my.id`.

---

## 📌 Architecture Overview

- **Domain**: `thelabindonesia.my.id` (Main website)
- **Subdomain**: `training.thelabindonesia.my.id` (Instructor Dashboard)
- **Application**: Node.js web server serving a responsive Instructor Portal with cohort management, live attendance, trainee assessment, and lab module tracking.
- **Server / VPS**: Linux (Ubuntu/Debian) with Nginx reverse proxy and Let's Encrypt SSL.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies & Run
```bash
npm install
npm start
```
Open your browser at **`http://localhost:3000`**.

---

## 📦 Push to Private GitHub Repository

Run these commands in this directory:

```bash
git init
git add .
git commit -m "feat: complete training instructor dashboard with operational tracking"
git branch -M main
git remote add origin https://github.com/LaudzaFarhan/training-center.git
git push -u origin main
```

*(Note: If you have already initialized Git, just run `git add .`, `git commit -m "update dashboard"`, and `git push origin main`)*

---

## 🌐 Deploy to VPS (Step-by-Step)

### Step 1: Connect to your VPS
```bash
ssh root@YOUR_VPS_IP
```

### Step 2: Install Node.js, Git, and Nginx
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager to keep app running in background)
sudo npm install -g pm2
```

### Step 3: Clone Repository on VPS
```bash
cd /var/www
# If using HTTPS with personal access token or SSH:
git clone https://github.com/LaudzaFarhan/training-center.git
cd training-center

# Install dependencies
npm install --production

# Start app with PM2
pm2 start server.js --name "thelab-training"
pm2 save
pm2 startup
```

### Step 4: Configure Nginx Reverse Proxy
Create the Nginx configuration file:
```bash
sudo nano /etc/nginx/sites-available/training.thelabindonesia.my.id
```

Paste the following configuration:
```nginx
server {
    listen 80;
    server_name training.thelabindonesia.my.id;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/training.thelabindonesia.my.id /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Install Free SSL Certificate (HTTPS)
```bash
sudo certbot --nginx -d training.thelabindonesia.my.id
```
Certbot will configure SSL automatically. Now access:
👉 **`https://training.thelabindonesia.my.id`**
