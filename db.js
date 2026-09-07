/**
 * The Lab Indonesia - Database & Authentication Layer
 * Supports PostgreSQL with automatic schema migration and seed initialization.
 * Gracefully falls back if Postgres is starting up or in local config mode.
 */

const crypto = require('crypto');

// Load environment variables if dotenv is present
try {
    require('dotenv').config();
} catch (e) {
    // dotenv optional fallback
}

let pgPool = null;
let isPostgresConnected = false;
let lastConnectionError = null;

function initPgPool() {
    try {
        const { Pool } = require('pg');
        const hasDbUrl = Boolean(process.env.DATABASE_URL);
        let connectionConfig;

        if (hasDbUrl) {
            const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
            const requiresSsl = !isLocal || process.env.DATABASE_URL.includes('sslmode=require') || process.env.PGSSL === 'true';

            connectionConfig = {
                connectionString: process.env.DATABASE_URL,
                ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
                connectionTimeoutMillis: 5000
            };
        } else {
            const isSsl = process.env.PGSSL === 'true' || process.env.PGSSL === 'require';
            connectionConfig = {
                host: process.env.PGHOST || 'localhost',
                port: parseInt(process.env.PGPORT, 10) || 5432,
                user: process.env.PGUSER || 'postgres',
                password: process.env.PGPASSWORD || 'postgres',
                database: process.env.PGDATABASE || 'thelab_training',
                ssl: isSsl ? { rejectUnauthorized: false } : undefined,
                connectionTimeoutMillis: 5000
            };
        }

        pgPool = new Pool(connectionConfig);

        // Suppress unhandled error crashes from pool
        pgPool.on('error', (err) => {
            console.warn('⚠️ [PostgreSQL Pool Notice]:', err.message);
            isPostgresConnected = false;
            lastConnectionError = err.message;
        });

        return pgPool;
    } catch (err) {
        console.warn('ℹ️ pg driver not loaded. Using resilient memory store:', err.message);
        lastConnectionError = err.message;
        return null;
    }
}

initPgPool();

// In-Memory Backup Store
const memoryStore = {
    users: [],
    stats: {
        activeCohorts: 3,
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
            lead_instructor: 'Farhan Laudza',
            room: 'Lab Alpha (Workstation Room 101)',
            start_date: '2026-02-01',
            status: 'In Progress',
            progress: 68,
            schedule: 'Mon, Wed, Fri (19:00 - 21:30 WIB)',
            total_students: 14
        },
        {
            id: 'TL-2026-B2',
            name: 'Cohort #2 - Fullstack Cloud & DevOps Engineering',
            lead_instructor: 'Senior Lab Mentor',
            room: 'Lab Beta (Cloud Terminal)',
            start_date: '2026-02-15',
            status: 'In Progress',
            progress: 45,
            schedule: 'Tue, Thu, Sat (09:00 - 12:00 WIB)',
            total_students: 16
        },
        {
            id: 'TL-2026-B3',
            name: 'Cohort #3 - Data Intelligence & Machine Learning',
            lead_instructor: 'AI Research Lead',
            room: 'Lab Gamma (GPU Cluster)',
            start_date: '2026-03-01',
            status: 'Upcoming',
            progress: 0,
            schedule: 'Sat & Sun (13:00 - 17:00 WIB)',
            total_students: 18
        }
    ],
    students: [
        { id: 'STU-01', cohort_id: 'TL-2026-B1', name: 'Rian Pratama', email: 'rian@thelab.id', attendance: 95, score: 88, status: 'Active', lab_status: 'Verified' },
        { id: 'STU-02', cohort_id: 'TL-2026-B1', name: 'Siti Nurhaliza', email: 'siti@thelab.id', attendance: 100, score: 94, status: 'Active', lab_status: 'Verified' },
        { id: 'STU-03', cohort_id: 'TL-2026-B1', name: 'Budi Santoso', email: 'budi@thelab.id', attendance: 88, score: 79, status: 'Active', lab_status: 'Pending Review' },
        { id: 'STU-04', cohort_id: 'TL-2026-B1', name: 'Nadia Safitri', email: 'nadia@thelab.id', attendance: 92, score: 91, status: 'Active', lab_status: 'Verified' },
        { id: 'STU-05', cohort_id: 'TL-2026-B1', name: 'Dimas Wicaksono', email: 'dimas@thelab.id', attendance: 85, score: 82, status: 'Active', lab_status: 'Verified' },
        { id: 'STU-06', cohort_id: 'TL-2026-B1', name: 'Aisyah Putri', email: 'aisyah@thelab.id', attendance: 100, score: 96, status: 'Active', lab_status: 'Verified' },
        { id: 'STU-07', cohort_id: 'TL-2026-B2', name: 'Kevin Jonathan', email: 'kevin@thelab.id', attendance: 90, score: 85, status: 'Active', lab_status: 'Verified' },
        { id: 'STU-08', cohort_id: 'TL-2026-B2', name: 'Maya Anggraini', email: 'maya@thelab.id', attendance: 95, score: 89, status: 'Active', lab_status: 'Verified' }
    ],
    modules: [
        { id: 'MOD-01', title: 'Module 1: Foundations & Architecture Setup', hours: 8, status: 'Completed', completion_rate: '100%' },
        { id: 'MOD-02', title: 'Module 2: Agent Tooling, Multi-Agent & Orchestration', hours: 12, status: 'In Progress', completion_rate: '75%' },
        { id: 'MOD-03', title: 'Module 3: Cloud Deployment, VPS & Production Pipeline', hours: 10, status: 'Next Up', completion_rate: '0%' },
        { id: 'MOD-04', title: 'Module 4: Capstone Project & Industry Lab Evaluation', hours: 16, status: 'Scheduled', completion_rate: '0%' }
    ]
};

// Cryptographic Password Hasher (PBKDF2 - standard, secure, built-in)
function hashPassword(password) {
    const salt = 'thelab_salt_2026';
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, hash) {
    return hashPassword(password) === hash;
}

// Session Tokens Store
const activeSessions = new Map();

function generateSessionToken(user) {
    const token = crypto.randomBytes(32).toString('hex');
    const mustChange = Boolean(user.must_change_password ?? user.mustChangePassword ?? false);
    activeSessions.set(token, {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: mustChange,
        createdAt: Date.now()
    });
    return token;
}

function validateSession(token) {
    if (!token) return null;
    return activeSessions.get(token) || null;
}

function revokeSession(token) {
    if (token) activeSessions.delete(token);
}

// Database Initialization & Migration
async function initDatabase() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@thelabindonesia.my.id';
    const adminPassword = process.env.ADMIN_PASSWORD || 'TheLab2026!Admin';
    const adminName = process.env.ADMIN_NAME || 'Farhan Laudza';
    const adminHash = hashPassword(adminPassword);

    // Always ensure in-memory admin exists
    memoryStore.users = [
        {
            id: 1,
            name: adminName,
            email: adminEmail,
            password_hash: adminHash,
            role: 'Admin',
            mustChangePassword: false,
            must_change_password: false
        }
    ];

    if (!pgPool) {
        console.log('📦 Running with internal resilient store (Admin:', adminEmail, ')');
        return;
    }

    let client = null;
    try {
        client = await pgPool.connect();
        isPostgresConnected = true;
        console.log('🐘 Connected to PostgreSQL successfully.');

        // Schema migrations
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(100) DEFAULT 'Trainer',
                must_change_password BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;

            CREATE TABLE IF NOT EXISTS cohorts (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                lead_instructor VARCHAR(255),
                room VARCHAR(255),
                start_date VARCHAR(50),
                status VARCHAR(50),
                progress INT DEFAULT 0,
                schedule VARCHAR(255),
                total_students INT DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS students (
                id VARCHAR(50) PRIMARY KEY,
                cohort_id VARCHAR(50) REFERENCES cohorts(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                attendance INT DEFAULT 100,
                score INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Active',
                lab_status VARCHAR(50) DEFAULT 'Verified'
            );

            CREATE TABLE IF NOT EXISTS modules (
                id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                hours INT DEFAULT 0,
                status VARCHAR(50) DEFAULT 'Scheduled',
                completion_rate VARCHAR(50) DEFAULT '0%'
            );
        `);

        // Seed Admin User
        const adminCheck = await client.query('SELECT * FROM users WHERE email = $1', [adminEmail]);
        if (adminCheck.rows.length === 0) {
            await client.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
                [adminName, adminEmail, adminHash, 'Admin']
            );
            console.log(`✅ Default admin seeded in PostgreSQL: ${adminEmail}`);
        } else if (adminCheck.rows[0].role !== 'Admin') {
            await client.query('UPDATE users SET role = $1 WHERE email = $2', ['Admin', adminEmail]);
        }

        // Seed Cohorts
        const cohortCheck = await client.query('SELECT COUNT(*) FROM cohorts');
        if (parseInt(cohortCheck.rows[0].count, 10) === 0) {
            for (const c of memoryStore.cohorts) {
                await client.query(
                    `INSERT INTO cohorts (id, name, lead_instructor, room, start_date, status, progress, schedule, total_students)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [c.id, c.name, c.lead_instructor, c.room, c.start_date, c.status, c.progress, c.schedule, c.total_students]
                );
            }
        }

        // Seed Students
        const studentCheck = await client.query('SELECT COUNT(*) FROM students');
        if (parseInt(studentCheck.rows[0].count, 10) === 0) {
            for (const s of memoryStore.students) {
                await client.query(
                    `INSERT INTO students (id, cohort_id, name, email, attendance, score, status, lab_status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [s.id, s.cohort_id, s.name, s.email, s.attendance, s.score, s.status, s.lab_status]
                );
            }
        }

        // Seed Modules
        const moduleCheck = await client.query('SELECT COUNT(*) FROM modules');
        if (parseInt(moduleCheck.rows[0].count, 10) === 0) {
            for (const m of memoryStore.modules) {
                await client.query(
                    `INSERT INTO modules (id, title, hours, status, completion_rate)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [m.id, m.title, m.hours, m.status, m.completion_rate]
                );
            }
        }
    } catch (err) {
        lastConnectionError = (err.errors && err.errors.length)
            ? err.errors.map(e => e.message || e.code || String(e)).join(' | ')
            : (err.message || String(err));
        console.warn('⚠️ [Postgres Note]: Could not connect to PostgreSQL server:', lastConnectionError);
        console.log('ℹ️ Server will operate using internal store until PostgreSQL connection is active.');
        isPostgresConnected = false;
    } finally {
        if (client) {
            try { client.release(); } catch (e) {}
        }
    }
}

// Data Access API
async function getStats() {
    if (isPostgresConnected && pgPool) {
        try {
            const cohortsRes = await pgPool.query('SELECT COUNT(*) FROM cohorts');
            const studentsRes = await pgPool.query('SELECT COUNT(*), AVG(attendance) as avg_att FROM students');
            const instructorsRes = await pgPool.query('SELECT COUNT(*) FROM users');

            const activeCohorts = parseInt(cohortsRes.rows[0].count, 10) || 0;
            const totalTrainees = parseInt(studentsRes.rows[0].count, 10) || 0;
            const avgAttendanceNum = studentsRes.rows[0].avg_att ? parseFloat(studentsRes.rows[0].avg_att) : 94.2;
            const activeInstructors = parseInt(instructorsRes.rows[0].count, 10) || 0;

            return {
                activeCohorts,
                totalTrainees,
                averageAttendance: `${avgAttendanceNum.toFixed(1)}%`,
                completedSessions: memoryStore.stats.completedSessions,
                upcomingSessions: memoryStore.stats.upcomingSessions,
                activeInstructors: activeInstructors > 0 ? activeInstructors : memoryStore.stats.activeInstructors
            };
        } catch (e) {
            console.warn('Postgres getStats error:', e.message);
        }
    }
    return memoryStore.stats;
}

// Data Access API
async function findUserByEmail(email) {
    if (isPostgresConnected && pgPool) {
        try {
            const res = await pgPool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
            return res.rows[0] || null;
        } catch (e) {
            console.warn('Postgres query error, falling back:', e.message);
        }
    }
    return memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

async function getCohorts() {
    if (isPostgresConnected && pgPool) {
        try {
            const res = await pgPool.query('SELECT id, name, lead_instructor AS "leadInstructor", room, start_date AS "startDate", status, progress, schedule, total_students AS "totalStudents" FROM cohorts ORDER BY id ASC');
            return res.rows;
        } catch (e) {
            console.warn('Fallback cohorts:', e.message);
        }
    }
    return memoryStore.cohorts.map(c => ({
        ...c,
        leadInstructor: c.lead_instructor,
        startDate: c.start_date,
        totalStudents: c.total_students
    }));
}

async function getStudents(cohortId) {
    if (isPostgresConnected && pgPool) {
        try {
            let query = 'SELECT id, cohort_id AS "cohortId", name, email, attendance, score, status, lab_status AS "labStatus" FROM students';
            let params = [];
            if (cohortId) {
                query += ' WHERE cohort_id = $1';
                params.push(cohortId);
            }
            query += ' ORDER BY id ASC';
            const res = await pgPool.query(query, params);
            return res.rows;
        } catch (e) {
            console.warn('Fallback students:', e.message);
        }
    }
    let list = memoryStore.students.map(s => ({
        ...s,
        cohortId: s.cohort_id,
        labStatus: s.lab_status
    }));
    if (cohortId) {
        list = list.filter(s => s.cohortId === cohortId);
    }
    return list;
}

async function updateStudent(id, data) {
    if (isPostgresConnected && pgPool) {
        try {
            const fields = [];
            const values = [];
            let idx = 1;

            if (data.score !== undefined) {
                fields.push(`score = $${idx++}`);
                values.push(data.score);
            }
            if (data.attendance !== undefined) {
                fields.push(`attendance = $${idx++}`);
                values.push(data.attendance);
            }
            if (data.status !== undefined) {
                fields.push(`status = $${idx++}`);
                values.push(data.status);
            }
            if (data.labStatus !== undefined) {
                fields.push(`lab_status = $${idx++}`);
                values.push(data.labStatus);
            }

            if (fields.length > 0) {
                values.push(id);
                const query = `UPDATE students SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
                const res = await pgPool.query(query, values);
                return res.rows[0];
            }
        } catch (e) {
            console.warn('Postgres update student error:', e.message);
        }
    }

    const s = memoryStore.students.find(stu => stu.id === id);
    if (s) {
        if (data.score !== undefined) s.score = data.score;
        if (data.attendance !== undefined) s.attendance = data.attendance;
        if (data.status !== undefined) s.status = data.status;
        if (data.labStatus !== undefined) s.lab_status = data.labStatus;
        return {
            ...s,
            cohortId: s.cohort_id,
            labStatus: s.lab_status
        };
    }
    return null;
}

async function getModules() {
    if (isPostgresConnected && pgPool) {
        try {
            const res = await pgPool.query('SELECT id, title, hours, status, completion_rate AS "completionRate" FROM modules ORDER BY id ASC');
            return res.rows;
        } catch (e) {
            console.warn('Fallback modules:', e.message);
        }
    }
    return memoryStore.modules.map(m => ({
        ...m,
        completionRate: m.completion_rate
    }));
}

async function getAllUsers() {
    if (isPostgresConnected && pgPool) {
        try {
            const res = await pgPool.query('SELECT id, name, email, role, must_change_password AS "mustChangePassword", created_at AS "createdAt" FROM users ORDER BY id ASC');
            return res.rows;
        } catch (e) {
            console.warn('Postgres getAllUsers error:', e.message);
        }
    }
    return memoryStore.users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        mustChangePassword: Boolean(u.mustChangePassword ?? u.must_change_password ?? false),
        createdAt: u.createdAt || new Date().toISOString()
    }));
}

const VALID_ROLES = ['Admin', 'Trainer', 'Trainee', 'SPV'];

function normalizeRole(role) {
    if (!role) return 'Trainer';
    const r = String(role).trim().toLowerCase();
    if (r === 'admin' || r.includes('admin') || r.includes('lead')) return 'Admin';
    if (r === 'spv' || r.includes('supervisor')) return 'SPV';
    if (r === 'trainee' || r.includes('student') || r.includes('learner')) return 'Trainee';
    if (r === 'trainer' || r === 'trainner' || r.includes('instructor') || r.includes('teacher') || r.includes('mentor')) return 'Trainer';
    return 'Trainer';
}

function getDefaultPasswordForRole(role) {
    const valid = normalizeRole(role);
    return `${valid.toLowerCase()}12345`;
}

async function createUser({ name, email, password, role, cohortId }) {
    const existing = await findUserByEmail(email);
    if (existing) {
        throw new Error('User with this email already exists');
    }

    const userRole = normalizeRole(role);
    const passwordToUse = (password && password.trim()) ? password.trim() : getDefaultPasswordForRole(userRole);
    const passwordHash = hashPassword(passwordToUse);
    let created = null;

    if (isPostgresConnected && pgPool) {
        try {
            const res = await pgPool.query(
                'INSERT INTO users (name, email, password_hash, role, must_change_password) VALUES ($1, $2, $3, $4, true) RETURNING id, name, email, role, must_change_password AS "mustChangePassword", created_at AS "createdAt"',
                [name, email.toLowerCase(), passwordHash, userRole]
            );
            created = res.rows[0];
        } catch (e) {
            console.warn('Postgres createUser error:', e.message);
            throw e;
        }
    } else {
        const newUser = {
            id: memoryStore.users.length + 1,
            name,
            email: email.toLowerCase(),
            password_hash: passwordHash,
            role: userRole,
            mustChangePassword: true,
            must_change_password: true,
            createdAt: new Date().toISOString()
        };
        memoryStore.users.push(newUser);
        created = {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            mustChangePassword: true,
            createdAt: newUser.createdAt
        };
    }

    // If account role is Trainee, automatically link or create matching student record
    if (userRole === 'Trainee') {
        try {
            const existingStudents = await getStudents();
            const exists = existingStudents.some(s => s.email.toLowerCase() === email.toLowerCase());
            if (!exists) {
                await createStudent({
                    name,
                    email: email.toLowerCase(),
                    cohortId: cohortId || 'TL-2026-B1',
                    attendance: 100,
                    score: 85,
                    status: 'Active',
                    labStatus: 'Verified'
                });
            }
        } catch (err) {
            console.warn('Notice: Student auto-link notice:', err.message);
        }
    }

    return created;
}

async function deleteUser(id) {
    if (isPostgresConnected && pgPool) {
        try {
            await pgPool.query('DELETE FROM users WHERE id = $1', [id]);
            return true;
        } catch (e) {
            console.warn('Postgres deleteUser error:', e.message);
            throw e;
        }
    }
    const idx = memoryStore.users.findIndex(u => String(u.id) === String(id));
    if (idx !== -1) {
        memoryStore.users.splice(idx, 1);
        return true;
    }
    return false;
}

async function updateUserRole(id, role) {
    const validRole = normalizeRole(role);
    if (isPostgresConnected && pgPool) {
        try {
            const res = await pgPool.query(
                'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
                [validRole, id]
            );
            return res.rows[0];
        } catch (e) {
            console.warn('Postgres updateUserRole error:', e.message);
            throw e;
        }
    }
    const user = memoryStore.users.find(u => String(u.id) === String(id));
    if (user) {
        user.role = validRole;
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        };
    }
    return null;
}

async function resetUserPassword(id, newPassword) {
    let user = null;
    if (isPostgresConnected && pgPool) {
        try {
            const uRes = await pgPool.query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
            user = uRes.rows[0];
        } catch (e) {
            console.warn('Postgres resetUserPassword lookup error:', e.message);
            throw e;
        }
    } else {
        user = memoryStore.users.find(u => String(u.id) === String(id));
    }

    if (!user) {
        throw new Error('User not found');
    }

    const defaultPwd = getDefaultPasswordForRole(user.role);
    const passwordToSet = (newPassword && newPassword.trim()) ? newPassword.trim() : defaultPwd;
    const hash = hashPassword(passwordToSet);

    if (isPostgresConnected && pgPool) {
        try {
            await pgPool.query('UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2', [hash, id]);
        } catch (e) {
            console.warn('Postgres resetUserPassword update error:', e.message);
            throw e;
        }
    } else {
        user.password_hash = hash;
        user.mustChangePassword = true;
        user.must_change_password = true;
    }

    // Force active sessions for this user to trigger password change prompt
    for (const [token, sess] of activeSessions.entries()) {
        if (String(sess.userId) === String(id)) {
            sess.mustChangePassword = true;
        }
    }

    return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        password: passwordToSet,
        defaultPassword: defaultPwd,
        isDefault: passwordToSet === defaultPwd,
        mustChangePassword: true
    };
}

async function changeOwnPassword(userId, newPassword) {
    if (!newPassword || newPassword.trim().length < 6) {
        throw new Error('New password must be at least 6 characters');
    }
    const cleanPwd = newPassword.trim();
    const hash = hashPassword(cleanPwd);

    if (isPostgresConnected && pgPool) {
        try {
            await pgPool.query(
                'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
                [hash, userId]
            );
        } catch (e) {
            console.warn('Postgres changeOwnPassword update error:', e.message);
            throw e;
        }
    }

    const memUser = memoryStore.users.find(u => String(u.id) === String(userId));
    if (memUser) {
        memUser.password_hash = hash;
        memUser.mustChangePassword = false;
        memUser.must_change_password = false;
    }

    // Update active sessions for this user
    for (const [token, sess] of activeSessions.entries()) {
        if (String(sess.userId) === String(userId)) {
            sess.mustChangePassword = false;
        }
    }

    return true;
}

async function getTraineeProfile(email) {
    if (!email) return null;
    let student = null;
    let cohort = null;
    const normEmail = email.toLowerCase();

    if (isPostgresConnected && pgPool) {
        try {
            const stuRes = await pgPool.query(
                'SELECT id, cohort_id AS "cohortId", name, email, attendance, score, status, lab_status AS "labStatus" FROM students WHERE LOWER(email) = LOWER($1)',
                [normEmail]
            );
            student = stuRes.rows[0] || null;

            if (student && student.cohortId) {
                const cohRes = await pgPool.query(
                    'SELECT id, name, lead_instructor AS "leadInstructor", room, start_date AS "startDate", status, progress, schedule, total_students AS "totalStudents" FROM cohorts WHERE id = $1',
                    [student.cohortId]
                );
                cohort = cohRes.rows[0] || null;
            }
        } catch (e) {
            console.warn('Postgres getTraineeProfile error:', e.message);
        }
    }

    if (!student) {
        student = memoryStore.students.find(s => s.email.toLowerCase() === normEmail) || null;
        if (student) {
            const cId = student.cohort_id || student.cohortId;
            cohort = memoryStore.cohorts.find(c => c.id === cId) || null;
        }
    }

    const modules = await getModules();

    return {
        student,
        cohort,
        modules
    };
}

async function createStudent({ id, cohortId, name, email, attendance, score, status, labStatus }) {
    const studentCohortId = cohortId || 'TL-2026-B1';
    const studentAttendance = attendance !== undefined ? parseInt(attendance, 10) : 100;
    const studentScore = score !== undefined ? parseInt(score, 10) : 85;
    const studentStatus = status || 'Active';
    const studentLabStatus = labStatus || 'Verified';

    if (isPostgresConnected && pgPool) {
        let studentId = id;
        if (!studentId) {
            const countRes = await pgPool.query('SELECT COUNT(*) FROM students');
            const nextNum = parseInt(countRes.rows[0].count, 10) + 1;
            studentId = `STU-${String(nextNum).padStart(2, '0')}`;
        }

        const query = `
            INSERT INTO students (id, cohort_id, name, email, attendance, score, status, lab_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, cohort_id AS "cohortId", name, email, attendance, score, status, lab_status AS "labStatus"
        `;
        const res = await pgPool.query(query, [
            studentId, studentCohortId, name, email, studentAttendance, studentScore, studentStatus, studentLabStatus
        ]);
        return res.rows[0];
    }

    const nextNum = memoryStore.students.length + 1;
    const studentId = id || `STU-${String(nextNum).padStart(2, '0')}`;
    const newStudent = {
        id: studentId,
        cohort_id: studentCohortId,
        cohortId: studentCohortId,
        name,
        email,
        attendance: studentAttendance,
        score: studentScore,
        status: studentStatus,
        lab_status: studentLabStatus,
        labStatus: studentLabStatus
    };
    memoryStore.students.push(newStudent);
    return newStudent;
}

async function deleteStudent(id) {
    if (isPostgresConnected && pgPool) {
        await pgPool.query('DELETE FROM students WHERE id = $1', [id]);
        return true;
    }
    const idx = memoryStore.students.findIndex(s => s.id === id);
    if (idx !== -1) {
        memoryStore.students.splice(idx, 1);
        return true;
    }
    return false;
}

async function getDatabaseStatus() {
    let host = 'localhost:5432';
    let dbName = process.env.PGDATABASE || 'thelab_training';

    if (process.env.DATABASE_URL) {
        try {
            const parsedUrl = new URL(process.env.DATABASE_URL);
            host = `${parsedUrl.hostname}${parsedUrl.port ? ':' + parsedUrl.port : ''}`;
            dbName = parsedUrl.pathname.replace(/^\//, '') || 'postgres';
        } catch (e) {
            host = 'DATABASE_URL (Custom)';
        }
    } else if (process.env.PGHOST) {
        host = `${process.env.PGHOST}:${process.env.PGPORT || 5432}`;
    }

    let isLive = false;
    let version = null;
    let latencyMs = null;
    let rowCounts = { users: 0, cohorts: 0, students: 0, modules: 0 };

    if (!pgPool) {
        initPgPool();
    }

    if (pgPool) {
        const start = Date.now();
        let client = null;
        try {
            client = await pgPool.connect();
            const res = await client.query('SELECT version()');
            version = res.rows[0]?.version || 'PostgreSQL';
            latencyMs = Date.now() - start;
            isLive = true;
            isPostgresConnected = true;
            lastConnectionError = null;

            const usersCount = await client.query('SELECT COUNT(*) FROM users');
            const cohortsCount = await client.query('SELECT COUNT(*) FROM cohorts');
            const studentsCount = await client.query('SELECT COUNT(*) FROM students');
            const modulesCount = await client.query('SELECT COUNT(*) FROM modules');

            rowCounts = {
                users: parseInt(usersCount.rows[0].count, 10),
                cohorts: parseInt(cohortsCount.rows[0].count, 10),
                students: parseInt(studentsCount.rows[0].count, 10),
                modules: parseInt(modulesCount.rows[0].count, 10)
            };
        } catch (err) {
            isPostgresConnected = false;
            lastConnectionError = (err.errors && err.errors.length)
                ? err.errors.map(e => e.message || e.code || String(e)).join(' | ')
                : (err.message || String(err));
        } finally {
            if (client) {
                try { client.release(); } catch (e) {}
            }
        }
    }

    if (!isLive) {
        rowCounts = {
            users: memoryStore.users.length,
            cohorts: memoryStore.cohorts.length,
            students: memoryStore.students.length,
            modules: memoryStore.modules.length
        };
    }

    return {
        connected: isLive,
        storageEngine: isLive ? 'PostgreSQL' : 'In-Memory Fallback',
        host,
        database: dbName,
        version: version ? version.split(' on ')[0] : null,
        latencyMs,
        counts: rowCounts,
        error: isLive ? null : (lastConnectionError || 'PostgreSQL connection not established')
    };
}

module.exports = {
    initDatabase,
    findUserByEmail,
    verifyPassword,
    hashPassword,
    generateSessionToken,
    validateSession,
    revokeSession,
    getCohorts,
    getStudents,
    createStudent,
    deleteStudent,
    updateStudent,
    getModules,
    getStats,
    getAllUsers,
    createUser,
    deleteUser,
    updateUserRole,
    resetUserPassword,
    changeOwnPassword,
    getDefaultPasswordForRole,
    getTraineeProfile,
    normalizeRole,
    VALID_ROLES,
    getDatabaseStatus,
    isPostgresActive: () => isPostgresConnected
};

