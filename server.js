/**
 * The Lab Indonesia - Training Center Server
 * Serves Public Landing Page, Instructor Dashboard, REST APIs, and Authentication.
 * Integrated with PostgreSQL & Environment Configurations.
 */

try {
    require('dotenv').config();
} catch (e) {
    // optional dotenv
}

const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const PORT = process.env.PORT || 3050;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types dictionary
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
};

// Helper to parse cookies
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(pair => {
        const [k, v] = pair.trim().split('=');
        if (k && v) cookies[k] = decodeURIComponent(v);
    });
    return cookies;
}

// Helper to parse JSON request bodies
function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url, `http://${host}`);
    const cookies = parseCookies(req.headers.cookie);
    const authHeader = req.headers.authorization;

    // Check token from Authorization header (Bearer ...) or session_token cookie
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else if (cookies.session_token) {
        token = cookies.session_token;
    }

    const sessionUser = db.validateSession(token);

    // ==========================================
    // Authentication Endpoints (/api/auth/*)
    // ==========================================
    if (url.pathname.startsWith('/api/auth/')) {
        res.setHeader('Content-Type', 'application/json');

        if (url.pathname === '/api/auth/login' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const { email, password } = body;

                if (!email || !password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Email and password are required' }));
                    return;
                }

                const user = await db.findUserByEmail(email);
                if (!user || !db.verifyPassword(password, user.password_hash)) {
                    res.writeHead(401);
                    res.end(JSON.stringify({ error: 'Invalid email or password' }));
                    return;
                }

                const sessionToken = db.generateSessionToken(user);

                // Set HttpOnly cookie for web security
                res.setHeader('Set-Cookie', `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    token: sessionToken,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Login error: ' + err.message }));
            }
            return;
        }

        if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
            if (token) db.revokeSession(token);
            res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; Max-Age=0');
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: 'Logged out successfully' }));
            return;
        }

        if (url.pathname === '/api/auth/me' && req.method === 'GET') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ authenticated: false, user: null }));
                return;
            }
            res.writeHead(200);
            res.end(JSON.stringify({ authenticated: true, user: sessionUser }));
            return;
        }
    }

    // ==========================================
    // REST API Routes
    // ==========================================
    if (url.pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');

        if (url.pathname === '/api/stats') {
            const stats = await db.getStats();
            res.writeHead(200);
            res.end(JSON.stringify(stats));
            return;
        }

        if (url.pathname === '/api/cohorts') {
            const cohorts = await db.getCohorts();
            res.writeHead(200);
            res.end(JSON.stringify(cohorts));
            return;
        }

        if (url.pathname === '/api/students') {
            const cohortId = url.searchParams.get('cohortId');
            const data = await db.getStudents(cohortId);
            res.writeHead(200);
            res.end(JSON.stringify(data));
            return;
        }

        if (url.pathname === '/api/modules') {
            const modules = await db.getModules();
            res.writeHead(200);
            res.end(JSON.stringify(modules));
            return;
        }

        if (url.pathname === '/api/attendance' && req.method === 'POST') {
            try {
                const body = await readJsonBody(req);
                const updated = await db.updateStudent(body.studentId, body);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, student: updated }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Invalid payload' }));
            }
            return;
        }

        // ==========================================
        // User & Role Management APIs
        // ==========================================
        if (url.pathname === '/api/users' && req.method === 'GET') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            const users = await db.getAllUsers();
            res.writeHead(200);
            res.end(JSON.stringify(users));
            return;
        }

        if (url.pathname === '/api/users' && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            try {
                const body = await readJsonBody(req);
                const { name, email, password, role } = body;
                if (!name || !email || !password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Name, email, and password are required' }));
                    return;
                }
                const newUser = await db.createUser({ name, email, password, role });
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, user: newUser }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        if (url.pathname === '/api/users/delete' && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            try {
                const body = await readJsonBody(req);
                if (String(body.userId) === String(sessionUser.userId)) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'You cannot delete your own logged-in account' }));
                    return;
                }
                await db.deleteUser(body.userId);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: 'User deleted successfully' }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        if (url.pathname === '/api/users/update-role' && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            try {
                const body = await readJsonBody(req);
                const updated = await db.updateUserRole(body.userId, body.role);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, user: updated }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
        return;
    }

    // ==========================================
    // Static Files & Page Routing
    // ==========================================
    let targetPath = url.pathname;

    // Route: Root (Landing Page)
    if (targetPath === '/' || targetPath === '') {
        targetPath = 'index.html';
    }
    // Route: Login Page
    else if (targetPath === '/login' || targetPath === '/login/') {
        // If already logged in, redirect to dashboard
        if (sessionUser) {
            res.writeHead(302, { 'Location': '/dashboard' });
            res.end();
            return;
        }
        targetPath = 'login.html';
    }
    // Route: Protected Dashboard
    else if (targetPath === '/dashboard' || targetPath === '/dashboard/' || targetPath === '/dashboard.html' || targetPath === '/instructor') {
        // Enforce Authentication: redirect unauthenticated users to /login
        if (!sessionUser) {
            res.writeHead(302, { 'Location': '/login?redirect=/dashboard' });
            res.end();
            return;
        }
        targetPath = 'dashboard.html';
    }

    let filePath = path.join(PUBLIC_DIR, targetPath);

    // Prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Access Denied');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            filePath = path.join(PUBLIC_DIR, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(500);
                res.end('Server Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        });
    });
});

// Initialize database then start server
db.initDatabase().then(() => {
    server.listen(PORT, () => {
        console.log(`=======================================================`);
        console.log(`🚀 The Lab Indonesia - Training Center Operational Core`);
        console.log(`🌐 Server running at: http://localhost:${PORT}`);
        console.log(`🔐 Admin Account: ${process.env.ADMIN_EMAIL || 'admin@thelabindonesia.my.id'}`);
        console.log(`🎯 Target URL: https://training.thelabindonesia.my.id`);
        console.log(`=======================================================`);
    });
});
