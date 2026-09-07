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
            const role = sessionUser.role || 'Trainer';
            const permissions = {
                isAdmin: role === 'Admin',
                isTrainer: role === 'Trainer' || role === 'Admin',
                isSPV: role === 'SPV' || role === 'Admin',
                isTrainee: role === 'Trainee',
                canManageUsers: role === 'Admin',
                canEvaluate: role === 'Admin' || role === 'Trainer',
                canConductLive: role === 'Admin' || role === 'Trainer'
            };
            res.writeHead(200);
            res.end(JSON.stringify({ authenticated: true, user: sessionUser, permissions }));
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

        if (url.pathname === '/api/system/db-status' && req.method === 'GET') {
            const dbStatus = await db.getDatabaseStatus();
            res.writeHead(200);
            res.end(JSON.stringify(dbStatus));
            return;
        }

        if (url.pathname === '/api/students' && req.method === 'GET') {
            const cohortId = url.searchParams.get('cohortId');
            const data = await db.getStudents(cohortId);
            res.writeHead(200);
            res.end(JSON.stringify(data));
            return;
        }

        if (url.pathname === '/api/students' && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            if (sessionUser.role !== 'Admin' && sessionUser.role !== 'Trainer') {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Permission denied: Only Trainer or Admin can enroll trainees' }));
                return;
            }
            try {
                const body = await readJsonBody(req);
                const { name, email } = body;
                if (!name || !email) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Name and email are required' }));
                    return;
                }
                const newStudent = await db.createStudent(body);
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, student: newStudent }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        if (url.pathname === '/api/students/delete' && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            if (sessionUser.role !== 'Admin' && sessionUser.role !== 'Trainer') {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Permission denied: Only Trainer or Admin can remove trainees' }));
                return;
            }
            try {
                const body = await readJsonBody(req);
                if (!body.studentId) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'studentId is required' }));
                    return;
                }
                await db.deleteStudent(body.studentId);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: 'Student removed successfully' }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        if (url.pathname === '/api/modules') {
            const modules = await db.getModules();
            res.writeHead(200);
            res.end(JSON.stringify(modules));
            return;
        }

        if (url.pathname === '/api/attendance' && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            if (sessionUser.role !== 'Admin' && sessionUser.role !== 'Trainer') {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Permission denied: Only Trainer or Admin can evaluate trainees' }));
                return;
            }
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
        // Trainee Personal Profile API
        // ==========================================
        if (url.pathname === '/api/trainee/my-profile' && req.method === 'GET') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            try {
                const profile = await db.getTraineeProfile(sessionUser.email);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, user: sessionUser, profile, ...(profile || {}) }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Failed to load profile: ' + err.message }));
            }
            return;
        }

        // ==========================================
        // User & Role Management APIs (Admin Only)
        // ==========================================
        if (url.pathname === '/api/users' && req.method === 'GET') {
            if (!sessionUser || sessionUser.role !== 'Admin') {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Permission denied: Admin privileges required' }));
                return;
            }
            const users = await db.getAllUsers();
            res.writeHead(200);
            res.end(JSON.stringify(users));
            return;
        }

        if (url.pathname === '/api/users' && req.method === 'POST') {
            if (!sessionUser || sessionUser.role !== 'Admin') {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Permission denied: Admin privileges required' }));
                return;
            }
            try {
                const body = await readJsonBody(req);
                const { name, email, password, role, cohortId } = body;
                if (!name || !email || !password) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Name, email, and password are required' }));
                    return;
                }
                const newUser = await db.createUser({ name, email, password, role, cohortId });
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, user: newUser }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        if (url.pathname === '/api/users/delete' && req.method === 'POST') {
            if (!sessionUser || sessionUser.role !== 'Admin') {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Permission denied: Admin privileges required' }));
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
            if (!sessionUser || sessionUser.role !== 'Admin') {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Permission denied: Admin privileges required' }));
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

        if (url.pathname === '/api/users/reset-password' && req.method === 'POST') {
            if (!sessionUser || sessionUser.role !== 'Admin') {
                res.writeHead(403);
                res.end(JSON.stringify({ error: 'Permission denied: Admin privileges required' }));
                return;
            }
            try {
                const body = await readJsonBody(req);
                const { userId, password } = body;
                if (!userId) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'userId is required' }));
                    return;
                }
                const result = await db.resetUserPassword(userId, password);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, ...result }));
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

// Error handling on HTTP server
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
        console.error(`👉 Run 'lsof -i :${PORT}' or set a different PORT in .env.`);
    } else {
        console.error('❌ Server HTTP error:', err.message);
    }
    process.exit(1);
});

// Initialize database then start server
db.initDatabase()
    .catch((err) => {
        console.warn('⚠️ [Database Notice]: Initial sync skipped or in memory mode:', err.message);
    })
    .finally(() => {
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`=======================================================`);
            console.log(`🚀 The Lab Indonesia - Training Center Operational Core`);
            console.log(`🌐 Server running at: http://0.0.0.0:${PORT}`);
            console.log(`🔐 Admin Account: ${process.env.ADMIN_EMAIL || 'admin@thelabindonesia.my.id'}`);
            console.log(`🎯 Target URL: https://training.thelabindonesia.my.id`);
            console.log(`=======================================================`);
        });
    });

