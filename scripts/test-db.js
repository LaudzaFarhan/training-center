#!/usr/bin/env node

/**
 * The Lab Indonesia - PostgreSQL Diagnostics & Migration Tool
 * Validates connection settings, tests handshake, verifies schemas, and seeds baseline data.
 * Run with: npm run test:db
 */

const path = require('path');
const fs = require('fs');

// Ensure environment variables are loaded
require('dotenv').config();

const { Pool } = require('pg');
const db = require('../db');

async function runDiagnostics() {
    console.log('\n===============================================================');
    console.log('🐘 The Lab Indonesia — PostgreSQL Diagnostic & Setup Core');
    console.log('===============================================================\n');

    const hasDbUrl = Boolean(process.env.DATABASE_URL);
    let connectionConfig;
    let displayHost = '';
    let displayDb = '';

    if (hasDbUrl) {
        try {
            const parsed = new URL(process.env.DATABASE_URL);
            displayHost = `${parsed.hostname}:${parsed.port || 5432}`;
            displayDb = parsed.pathname.replace(/^\//, '');
        } catch (e) {
            displayHost = 'Custom DATABASE_URL';
            displayDb = 'Unknown';
        }

        const isLocal = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
        const requiresSsl = !isLocal || process.env.DATABASE_URL.includes('sslmode=require') || process.env.PGSSL === 'true';

        connectionConfig = {
            connectionString: process.env.DATABASE_URL,
            ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis: 6000
        };

        console.log(`📡 Mode: Connection String (DATABASE_URL)`);
        console.log(`🌐 Target Host: ${displayHost}`);
        console.log(`🗄️  Target Database: ${displayDb}`);
        console.log(`🔒 SSL Enabled: ${requiresSsl ? 'Yes (rejectUnauthorized: false)' : 'No'}\n`);
    } else {
        displayHost = `${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}`;
        displayDb = process.env.PGDATABASE || 'thelab_training';
        const isSsl = process.env.PGSSL === 'true' || process.env.PGSSL === 'require';

        connectionConfig = {
            host: process.env.PGHOST || 'localhost',
            port: parseInt(process.env.PGPORT, 10) || 5432,
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || 'postgres',
            database: process.env.PGDATABASE || 'thelab_training',
            ssl: isSsl ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis: 6000
        };

        console.log(`📡 Mode: Individual Parameters`);
        console.log(`🌐 Target Host: ${displayHost}`);
        console.log(`👤 Database User: ${connectionConfig.user}`);
        console.log(`🗄️  Target Database: ${displayDb}`);
        console.log(`🔒 SSL Enabled: ${isSsl ? 'Yes' : 'No'}\n`);
    }

    process.stdout.write('⏳ Testing connection to PostgreSQL server... ');

    const pool = new Pool(connectionConfig);
    let client;

    try {
        const startTime = Date.now();
        client = await pool.connect();
        const latency = Date.now() - startTime;
        console.log(`\x1b[32mSUCCESS (${latency}ms)\x1b[0m`);

        // Check PostgreSQL version
        const verRes = await client.query('SELECT version()');
        const pgVersion = verRes.rows[0].version.split(' on ')[0];
        console.log(`✅ Engine: ${pgVersion}`);

        console.log('\n--- Checking Database Tables ---');
        const tables = ['users', 'cohorts', 'students', 'modules'];
        let missingTables = [];

        for (const t of tables) {
            const checkRes = await client.query(
                `SELECT to_regclass('public.${t}') AS tbl`
            );
            if (checkRes.rows[0].tbl) {
                const countRes = await client.query(`SELECT COUNT(*) FROM ${t}`);
                console.log(`  ✓ Table \x1b[36m${t}\x1b[0m exists (${countRes.rows[0].count} rows)`);
            } else {
                console.log(`  ✗ Table \x1b[33m${t}\x1b[0m is missing`);
                missingTables.push(t);
            }
        }

        if (missingTables.length > 0) {
            console.log(`\n⚙️ Initializing and migrating schemas via db.initDatabase()...`);
            await db.initDatabase();
            console.log(`✅ Schema migration and initial seed completed successfully.`);
        }

        // Verify Admin User
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@thelabindonesia.my.id';
        const adminUser = await client.query('SELECT id, name, email, role, created_at FROM users WHERE email = $1', [adminEmail]);
        if (adminUser.rows.length > 0) {
            console.log(`\n👤 Admin Account Verified: ${adminUser.rows[0].email} (${adminUser.rows[0].role})`);
        } else {
            console.log(`\n⚠️ Notice: Admin account "${adminEmail}" not found. Running seed...`);
            await db.initDatabase();
        }

        console.log('\n===============================================================');
        console.log('🎉 PostgreSQL is fully connected, healthy, and ready for use!');
        console.log('===============================================================\n');
        process.exit(0);
    } catch (err) {
        console.log(`\x1b[31mFAILED\x1b[0m\n`);
        const errDetails = (err.errors && err.errors.length)
            ? err.errors.map(e => e.message || e.code || String(e)).join(' | ')
            : (err.message || String(err));
        console.error(`❌ Connection Error: ${errDetails}\n`);

        console.log('---------------------------------------------------------------');
        console.log('💡 TROUBLESHOOTING & SETUP GUIDE');
        console.log('---------------------------------------------------------------');

        const errStr = String(errDetails) + ' ' + String(err);
        if (errStr.includes('ECONNREFUSED')) {
            console.log(`
👉 The PostgreSQL server at "${displayHost}" is NOT running or rejecting connections.

How to connect:
1. OPTION A (Fastest & Recommended — Cloud PostgreSQL):
   Create a free database on Supabase (https://supabase.com) or Neon (https://neon.tech).
   Add the connection string to your .env:
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?sslmode=require"

2. OPTION B (Ubuntu VPS PostgreSQL):
   SSH into your VPS (training.thelabindonesia.my.id) and verify PostgreSQL:
   sudo systemctl status postgresql
   sudo -u postgres psql -c "CREATE DATABASE thelab_training;"

3. OPTION C (Local Windows PostgreSQL):
   Install PostgreSQL for Windows and make sure the Windows service is running on port 5432.
`);
        } else if (errStr.includes('password authentication failed')) {
            console.log(`
👉 Authentication failed. The password in PGPASSWORD or DATABASE_URL does not match the database user.
Please check your credentials in .env.
`);
        } else if (errStr.includes('database') && errStr.includes('does not exist')) {
            console.log(`
👉 Database "${displayDb}" does not exist.
Create it using:
psql -U postgres -c "CREATE DATABASE ${displayDb};"
`);
        } else {
            console.log(`
👉 Check your network, firewall, and connection settings in .env.
Error details: ${errDetails}
`);
        }

        console.log('===============================================================\n');
        process.exit(1);
    } finally {
        if (client) {
            try { client.release(); } catch (e) {}
        }
        try { await pool.end(); } catch (e) {}
    }
}

runDiagnostics();
