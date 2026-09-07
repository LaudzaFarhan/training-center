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
const crypto = require('crypto');
const db = require('./db');

const PORT = process.env.PORT || 3050;
const PUBLIC_DIR = path.join(__dirname, 'public');

// ==========================================
// Live Code Synchronization & Versioning
// ==========================================
const SERVER_BOOT_TIME = Date.now();
const sseReloadClients = new Set();

function computeAppVersion() {
    try {
        const hash = crypto.createHash('md5');
        hash.update(String(SERVER_BOOT_TIME));

        const filesToCheck = [
            path.join(__dirname, 'server.js'),
            path.join(__dirname, 'db.js'),
            path.join(PUBLIC_DIR, 'dashboard.html'),
            path.join(PUBLIC_DIR, 'index.html'),
            path.join(PUBLIC_DIR, 'login.html'),
            path.join(PUBLIC_DIR, 'js', 'app.js'),
            path.join(PUBLIC_DIR, 'js', 'auto-reload.js'),
            path.join(PUBLIC_DIR, 'css', 'styles.css')
        ];
        for (const file of filesToCheck) {
            if (fs.existsSync(file)) {
                const stat = fs.statSync(file);
                hash.update(`${file}-${stat.mtimeMs}-${stat.size}`);
            }
        }
        return hash.digest('hex').slice(0, 12);
    } catch (e) {
        return String(SERVER_BOOT_TIME);
    }
}

let currentAppVersion = computeAppVersion();

function broadcastCodeReload(reason = 'code_update') {
    currentAppVersion = computeAppVersion();
    console.log(`📡 [Live Reload] Code update detected (${reason})! Broadcasting version ${currentAppVersion} to ${sseReloadClients.size} active client(s)...`);
    const payload = JSON.stringify({ type: 'reload', version: currentAppVersion, reason, timestamp: Date.now() });
    for (const client of sseReloadClients) {
        try {
            client.write(`data: ${payload}\n\n`);
        } catch (e) {
            sseReloadClients.delete(client);
        }
    }
}

// Watch public directory and server source files for changes
let fileWatchDebounceTimer = null;
function onSourceFileChanged(eventType, filename) {
    if (fileWatchDebounceTimer) clearTimeout(fileWatchDebounceTimer);
    fileWatchDebounceTimer = setTimeout(() => {
        broadcastCodeReload(`file changed: ${filename || 'unknown'}`);
    }, 250);
}

try {
    fs.watch(PUBLIC_DIR, { recursive: true }, onSourceFileChanged);
    fs.watch(path.join(__dirname, 'server.js'), onSourceFileChanged);
    fs.watch(path.join(__dirname, 'db.js'), onSourceFileChanged);
} catch (e) {
    // Non-fatal if recursive fs.watch is limited on current OS
}

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

// Helper to parse JSON request bodies (supports up to 15MB for screenshots)
function readJsonBody(req, maxBytes = 15 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
        let body = '';
        let received = 0;
        req.on('data', chunk => {
            received += chunk.length;
            if (received > maxBytes) {
                req.destroy(new Error('Payload Too Large (15MB Limit)'));
                return;
            }
            body += chunk;
        });
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
            res.end(JSON.stringify({
                authenticated: true,
                user: {
                    ...sessionUser,
                    mustChangePassword: Boolean(sessionUser.mustChangePassword)
                },
                permissions
            }));
            return;
        }

        if (url.pathname === '/api/auth/change-password' && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            try {
                const body = await readJsonBody(req);
                const { newPassword } = body;
                if (!newPassword || newPassword.trim().length < 6) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'New password must be at least 6 characters' }));
                    return;
                }
                await db.changeOwnPassword(sessionUser.userId, newPassword);
                sessionUser.mustChangePassword = false;
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    message: 'Password updated successfully',
                    mustChangePassword: false
                }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
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

        // Auto-Reload: Current Version Check
        if (url.pathname === '/api/system/version' && req.method === 'GET') {
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(JSON.stringify({
                version: currentAppVersion,
                bootTime: SERVER_BOOT_TIME,
                now: Date.now()
            }));
            return;
        }

        // Auto-Reload: Server-Sent Events (SSE) Live Stream
        if (url.pathname === '/api/system/version-stream' && req.method === 'GET') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            });

            // Initial version message
            res.write(`data: ${JSON.stringify({ type: 'init', version: currentAppVersion })}\n\n`);
            sseReloadClients.add(res);

            // Periodic heartbeat ping to keep connection alive
            const pingInterval = setInterval(() => {
                try {
                    res.write(': ping\n\n');
                } catch (e) {
                    clearInterval(pingInterval);
                    sseReloadClients.delete(res);
                }
            }, 20000);

            req.on('close', () => {
                clearInterval(pingInterval);
                sseReloadClients.delete(res);
            });
            return;
        }

        // Auto-Reload: Manual Trigger (Admin / CI/CD)
        if (url.pathname === '/api/system/trigger-reload' && req.method === 'POST') {
            broadcastCodeReload('manual_trigger');
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, version: currentAppVersion, clientsNotified: sseReloadClients.size }));
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

        // ==========================================
        // QA & Bug Tracker Endpoints (/api/qa/*)
        // ==========================================
        if (url.pathname === '/api/qa/stats' && req.method === 'GET') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            const stats = await db.getQaStats();
            res.writeHead(200);
            res.end(JSON.stringify(stats));
            return;
        }

        if (url.pathname === '/api/qa/notifications' && req.method === 'GET') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            const sinceParam = url.searchParams.get('since');
            const sinceMs = sinceParam ? parseInt(sinceParam, 10) : 900000;
            const alerts = await db.getRecentCriticalAlerts(sinceMs);
            res.writeHead(200);
            res.end(JSON.stringify({ alerts }));
            return;
        }

        if (url.pathname === '/api/qa/issues' && req.method === 'GET') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            const filters = {
                status: url.searchParams.get('status') || '',
                type: url.searchParams.get('type') || '',
                priority: url.searchParams.get('priority') || '',
                module: url.searchParams.get('module') || '',
                q: url.searchParams.get('q') || ''
            };
            const issues = await db.getQaIssues(filters);
            res.writeHead(200);
            res.end(JSON.stringify(issues));
            return;
        }

        if (url.pathname === '/api/qa/issues' && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            try {
                const body = await readJsonBody(req);
                const { title, description, type, priority, status, module, envBrowser, envOs, envResolution, envViewport, envUrl, attachments } = body;
                if (!title || !title.trim()) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Issue title is required' }));
                    return;
                }
                const newIssue = await db.createQaIssue({
                    title: title.trim(),
                    description: description || '',
                    type: type || 'Bug',
                    priority: priority || 'Medium',
                    status: status || 'Open',
                    module: module || 'General',
                    reporterId: sessionUser.userId,
                    reporterName: sessionUser.name,
                    reporterEmail: sessionUser.email,
                    envBrowser,
                    envOs,
                    envResolution,
                    envViewport,
                    envUrl,
                    attachments: attachments || []
                });
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, issue: newIssue }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        const qaIssueMatch = url.pathname.match(/^\/api\/qa\/issues\/(\d+)$/);
        if (qaIssueMatch && req.method === 'GET') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            const issueId = qaIssueMatch[1];
            const issue = await db.getQaIssueById(issueId);
            if (!issue) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Issue not found' }));
                return;
            }
            res.writeHead(200);
            res.end(JSON.stringify(issue));
            return;
        }

        if (qaIssueMatch && req.method === 'DELETE') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            try {
                const issueId = qaIssueMatch[1];
                const existing = await db.getQaIssueById(issueId);
                if (!existing) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Issue ticket not found' }));
                    return;
                }

                // Authorization: Admin, SPV, Trainer, or the reporter can delete
                const isPrivileged = ['Admin', 'SPV', 'Trainer'].includes(sessionUser.role);
                const isReporter = (existing.reporterEmail && sessionUser.email && existing.reporterEmail.toLowerCase() === sessionUser.email.toLowerCase())
                    || (existing.reporterId && sessionUser.userId && String(existing.reporterId) === String(sessionUser.userId));

                if (!isPrivileged && !isReporter) {
                    res.writeHead(403);
                    res.end(JSON.stringify({ error: 'Forbidden: You do not have permission to delete this QA ticket' }));
                    return;
                }

                const deleted = await db.deleteQaIssue(issueId);
                if (!deleted) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Failed to delete issue: not found' }));
                    return;
                }

                res.writeHead(200);
                res.end(JSON.stringify({ success: true, message: `Issue #QA-${issueId} deleted successfully` }));
            } catch (err) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        const qaStatusMatch = url.pathname.match(/^\/api\/qa\/issues\/(\d+)\/status$/);
        if (qaStatusMatch && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            try {
                const issueId = qaStatusMatch[1];
                const body = await readJsonBody(req);
                const { status } = body;
                if (!status) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Status is required' }));
                    return;
                }
                const updated = await db.updateQaIssueStatus(issueId, status);
                if (!updated) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Issue not found' }));
                    return;
                }
                await db.addQaComment(issueId, {
                    authorName: sessionUser.name,
                    authorRole: sessionUser.role,
                    authorEmail: sessionUser.email,
                    comment: `🔄 Status changed to **${status}** by ${sessionUser.name} (${sessionUser.role})`
                });
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, issue: updated }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        const qaAssignMatch = url.pathname.match(/^\/api\/qa\/issues\/(\d+)\/assign$/);
        if (qaAssignMatch && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            try {
                const issueId = qaAssignMatch[1];
                const body = await readJsonBody(req);
                const { assigneeName, assigneeEmail, assigneeId } = body;
                const updated = await db.updateQaIssueAssignee(issueId, assigneeName, assigneeEmail, assigneeId);
                if (!updated) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'Issue not found' }));
                    return;
                }
                await db.addQaComment(issueId, {
                    authorName: sessionUser.name,
                    authorRole: sessionUser.role,
                    authorEmail: sessionUser.email,
                    comment: `👤 Assigned to **${assigneeName || 'Unassigned'}**`
                });
                res.writeHead(200);
                res.end(JSON.stringify({ success: true, issue: updated }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
            return;
        }

        const qaCommentMatch = url.pathname.match(/^\/api\/qa\/issues\/(\d+)\/comments$/);
        if (qaCommentMatch && req.method === 'POST') {
            if (!sessionUser) {
                res.writeHead(401);
                res.end(JSON.stringify({ error: 'Unauthorized' }));
                return;
            }
            try {
                const issueId = qaCommentMatch[1];
                const body = await readJsonBody(req);
                const { comment, attachments } = body;
                if (!comment || !comment.trim()) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Comment text cannot be empty' }));
                    return;
                }
                const newComment = await db.addQaComment(issueId, {
                    authorName: sessionUser.name,
                    authorRole: sessionUser.role,
                    authorEmail: sessionUser.email,
                    comment: comment.trim(),
                    attachments: attachments || []
                });
                res.writeHead(201);
                res.end(JSON.stringify({ success: true, comment: newComment }));
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
    // Route: Protected Dashboard & QA Tracker
    else if (
        targetPath === '/dashboard' || targetPath === '/dashboard/' || targetPath === '/dashboard.html' ||
        targetPath === '/instructor' || targetPath === '/new/qa-tracker' || targetPath === '/new/qa-tracker/' ||
        targetPath === '/qa-tracker' || targetPath === '/qa-tracker/'
    ) {
        // Enforce Authentication: redirect unauthenticated users to /login
        if (!sessionUser) {
            res.writeHead(302, { 'Location': `/login?redirect=${encodeURIComponent(url.pathname)}` });
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

            const headers = { 'Content-Type': contentType };

            // Cache prevention: ensure clients never serve stale HTML, JS, or CSS
            if (ext === '.html') {
                headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
                headers['Pragma'] = 'no-cache';
                headers['Expires'] = '0';
                headers['X-App-Version'] = currentAppVersion;
            } else if (ext === '.js' || ext === '.css') {
                headers['Cache-Control'] = 'no-cache, must-revalidate';
                headers['ETag'] = `"${currentAppVersion}-${path.basename(filePath)}"`;
                headers['X-App-Version'] = currentAppVersion;
            }

            res.writeHead(200, headers);
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

