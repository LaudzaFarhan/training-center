/**
 * The Lab Indonesia - Training Center Server
 * Serves the Instructor Dashboard & Operational REST APIs.
 * Supports zero-dependency fallback (native Node.js http) or Express.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// In-Memory Data Store (Can be easily hooked to SQLite, Postgres, or MongoDB)
const db = {
    stats: {
        activeCohorts: 4,
        totalTrainees: 48,
        averageAttendance: '94.2%',
        completedSessions: 32,
        upcomingSessions: 8,
        activeInstructors: 6
    },
    cohorts: [
        {
            id: 'TL-2026-B1',
            name: 'Cohort #1 - Advanced AI & Agentic Workflows',
            leadInstructor: 'Farhan Laudza',
            room: 'Lab Alpha (Workstation Room 101)',
            startDate: '2026-02-01',
            status: 'In Progress',
            progress: 68,
            schedule: 'Mon, Wed, Fri (19:00 - 21:30 WIB)',
            totalStudents: 14
        },
        {
            id: 'TL-2026-B2',
            name: 'Cohort #2 - Fullstack Cloud & DevOps Engineering',
            leadInstructor: 'Senior Lab Mentor',
            room: 'Lab Beta (Cloud Terminal)',
            startDate: '2026-02-15',
            status: 'In Progress',
            progress: 45,
            schedule: 'Tue, Thu, Sat (09:00 - 12:00 WIB)',
            totalStudents: 16
        },
        {
            id: 'TL-2026-B3',
            name: 'Cohort #3 - Data Intelligence & Machine Learning',
            leadInstructor: 'AI Research Lead',
            room: 'Lab Gamma (GPU Cluster)',
            startDate: '2026-03-01',
            status: 'Upcoming',
            progress: 0,
            schedule: 'Sat & Sun (13:00 - 17:00 WIB)',
            totalStudents: 18
        }
    ],
    students: [
        { id: 'STU-01', cohortId: 'TL-2026-B1', name: 'Rian Pratama', email: 'rian@thelab.id', attendance: 95, score: 88, status: 'Active', labStatus: 'Verified' },
        { id: 'STU-02', cohortId: 'TL-2026-B1', name: 'Siti Nurhaliza', email: 'siti@thelab.id', attendance: 100, score: 94, status: 'Active', labStatus: 'Verified' },
        { id: 'STU-03', cohortId: 'TL-2026-B1', name: 'Budi Santoso', email: 'budi@thelab.id', attendance: 88, score: 79, status: 'Active', labStatus: 'Pending Review' },
        { id: 'STU-04', cohortId: 'TL-2026-B1', name: 'Nadia Safitri', email: 'nadia@thelab.id', attendance: 92, score: 91, status: 'Active', labStatus: 'Verified' },
        { id: 'STU-05', cohortId: 'TL-2026-B1', name: 'Dimas Wicaksono', email: 'dimas@thelab.id', attendance: 85, score: 82, status: 'Active', labStatus: 'Verified' },
        { id: 'STU-06', cohortId: 'TL-2026-B1', name: 'Aisyah Putri', email: 'aisyah@thelab.id', attendance: 100, score: 96, status: 'Active', labStatus: 'Verified' },
        { id: 'STU-07', cohortId: 'TL-2026-B2', name: 'Kevin Jonathan', email: 'kevin@thelab.id', attendance: 90, score: 85, status: 'Active', labStatus: 'Verified' },
        { id: 'STU-08', cohortId: 'TL-2026-B2', name: 'Maya Anggraini', email: 'maya@thelab.id', attendance: 95, score: 89, status: 'Active', labStatus: 'Verified' }
    ],
    modules: [
        { id: 'MOD-01', title: 'Module 1: Foundations & Architecture Setup', hours: 8, status: 'Completed', completionRate: '100%' },
        { id: 'MOD-02', title: 'Module 2: Agent Tooling, Multi-Agent & Orchestration', hours: 12, status: 'In Progress', completionRate: '75%' },
        { id: 'MOD-03', title: 'Module 3: Cloud Deployment, VPS & Production Pipeline', hours: 10, status: 'Next Up', completionRate: '0%' },
        { id: 'MOD-04', title: 'Module 4: Capstone Project & Industry Lab Evaluation', hours: 16, status: 'Scheduled', completionRate: '0%' }
    ]
};

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

const server = http.createServer((req, res) => {
    // CORS headers for development flexibility
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    // REST API Routes
    if (url.pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');

        if (url.pathname === '/api/stats') {
            res.writeHead(200);
            res.end(JSON.stringify(db.stats));
            return;
        }

        if (url.pathname === '/api/cohorts') {
            res.writeHead(200);
            res.end(JSON.stringify(db.cohorts));
            return;
        }

        if (url.pathname === '/api/students') {
            const cohortId = url.searchParams.get('cohortId');
            const data = cohortId ? db.students.filter(s => s.cohortId === cohortId) : db.students;
            res.writeHead(200);
            res.end(JSON.stringify(data));
            return;
        }

        if (url.pathname === '/api/modules') {
            res.writeHead(200);
            res.end(JSON.stringify(db.modules));
            return;
        }

        if (url.pathname === '/api/attendance' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    const student = db.students.find(s => s.id === parsed.studentId);
                    if (student) {
                        student.attendance = parsed.attendance ?? student.attendance;
                        student.status = parsed.status ?? student.status;
                    }
                    res.writeHead(200);
                    res.end(JSON.stringify({ success: true, student }));
                } catch (err) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                }
            });
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Endpoint not found' }));
        return;
    }

    // Static Files & Page Routing
    let targetPath = url.pathname;
    if (targetPath === '/' || targetPath === '') {
        targetPath = 'index.html';
    } else if (targetPath === '/dashboard' || targetPath === '/dashboard/' || targetPath === '/instructor') {
        targetPath = 'dashboard.html';
    }

    let filePath = path.join(PUBLIC_DIR, targetPath);

    // Normalize path to prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403);
        res.end('Access Denied');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Fallback to index.html for SPA routing
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

server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 The Lab Indonesia - Training Center Instructor Portal`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`🎯 Subdomain target: https://training.thelabindonesia.my.id`);
    console.log(`=======================================================`);
});
