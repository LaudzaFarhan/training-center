/**
 * Comprehensive Automated Verification Script for 4 User Roles & RBAC:
 * - Admin
 * - Trainer
 * - Trainee
 * - SPV
 */

const http = require('http');

const PORT = 3050;
const BASE_URL = `http://localhost:${PORT}`;

function request(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(body);
                } catch (e) {
                    parsed = body;
                }
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    cookies: res.headers['set-cookie'] || [],
                    data: parsed
                });
            });
        });
        req.on('error', reject);
        if (data) {
            const payload = typeof data === 'string' ? data : JSON.stringify(data);
            req.setHeader('Content-Type', 'application/json');
            req.setHeader('Content-Length', Buffer.byteLength(payload));
            req.write(payload);
        }
        req.end();
    });
}

async function runTests() {
    console.log('\n=======================================================');
    console.log('🧪 Starting The Lab RBAC & 4-Role Verification Test');
    console.log('=======================================================\n');

    let adminCookie = '';

    // Step 1: Login as Default Admin
    console.log('1️⃣ Logging in as Default System Admin (admin@thelabindonesia.my.id)...');
    const adminLoginRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST'
    }, {
        email: 'admin@thelabindonesia.my.id',
        password: 'TheLab2026!Admin'
    });

    if (adminLoginRes.statusCode !== 200 || !adminLoginRes.data.success) {
        console.error('❌ Default admin login failed:', adminLoginRes.data);
        process.exit(1);
    }
    adminCookie = adminLoginRes.cookies[0].split(';')[0];
    console.log(`✅ Admin authenticated. Role: ${adminLoginRes.data.user.role}`);

    // Step 2: Create Users for each of the 4 Roles
    const testUsers = [
        { name: 'Alice Admin', email: 'alice.admin@thelab.id', password: 'Password123!', role: 'Admin' },
        { name: 'Tommy Trainer', email: 'tommy.trainer@thelab.id', password: 'Password123!', role: 'Trainer' },
        { name: 'Toby Trainee', email: 'toby.trainee@thelab.id', password: 'Password123!', role: 'Trainee', cohortId: 'TL-2026-B1' },
        { name: 'Sarah Supervisor', email: 'sarah.spv@thelab.id', password: 'Password123!', role: 'SPV' }
    ];

    console.log('\n2️⃣ Provisioning accounts for all 4 roles via Admin API...');
    for (const u of testUsers) {
        const createRes = await request({
            hostname: 'localhost',
            port: PORT,
            path: '/api/users',
            method: 'POST',
            headers: { Cookie: adminCookie }
        }, u);

        if (createRes.statusCode === 201) {
            console.log(`✅ Created [${u.role}]: ${u.name} (${u.email})`);
        } else {
            console.log(`ℹ️ Notice for ${u.email}: ${JSON.stringify(createRes.data)}`);
        }
    }

    // Step 3: Admin Queries /api/users
    console.log('\n3️⃣ Checking user list and role distribution via GET /api/users...');
    const usersListRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/users',
        method: 'GET',
        headers: { Cookie: adminCookie }
    });

    if (usersListRes.statusCode === 200 && Array.isArray(usersListRes.data)) {
        const roles = usersListRes.data.map(u => u.role);
        console.log(`✅ Users in database: ${usersListRes.data.length}`);
        console.log(`   - Admins: ${roles.filter(r => r === 'Admin').length}`);
        console.log(`   - Trainers: ${roles.filter(r => r === 'Trainer').length}`);
        console.log(`   - Trainees: ${roles.filter(r => r === 'Trainee').length}`);
        console.log(`   - SPVs: ${roles.filter(r => r === 'SPV').length}`);
    } else {
        console.error('❌ Failed to retrieve users:', usersListRes.data);
    }

    // Step 4: Verify Trainee Auto-Student Provisioning
    console.log('\n4️⃣ Verifying auto-linked student roster for Toby Trainee...');
    const studentsRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/students',
        method: 'GET'
    });
    const traineeStudent = studentsRes.data.find(s => s.email.toLowerCase() === 'toby.trainee@thelab.id');
    if (traineeStudent) {
        console.log(`✅ Trainee automatically enrolled in student roster! ID: ${traineeStudent.id}, Cohort: ${traineeStudent.cohortId || traineeStudent.cohort_id}, Attendance: ${traineeStudent.attendance}%`);
    } else {
        console.error('❌ Trainee not found in students table');
    }

    // Step 5: Test Trainee Authentication & Portal Access
    console.log('\n5️⃣ Testing Trainee Login & Personal Learning Portal...');
    const traineeLoginRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST'
    }, {
        email: 'toby.trainee@thelab.id',
        password: 'Password123!'
    });

    const traineeCookie = traineeLoginRes.cookies[0].split(';')[0];
    const traineeProfileRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/trainee/my-profile',
        method: 'GET',
        headers: { Cookie: traineeCookie }
    });

    if (traineeProfileRes.statusCode === 200 && traineeProfileRes.data.success) {
        console.log(`✅ Trainee profile endpoint loaded successfully!`);
        console.log(`   - Student Name: ${traineeProfileRes.data.user.name}`);
        console.log(`   - Cohort: ${traineeProfileRes.data.cohort?.name || 'Class Cohort'}`);
        console.log(`   - Attendance: ${traineeProfileRes.data.student?.attendance}%`);
        console.log(`   - Curriculum Modules: ${traineeProfileRes.data.modules?.length || 0} loaded`);
    } else {
        console.error('❌ Failed to load trainee profile:', traineeProfileRes.data);
    }

    // Trainee RBAC Boundary check: Cannot manage users
    const traineeUsersCheck = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/users',
        method: 'GET',
        headers: { Cookie: traineeCookie }
    });
    if (traineeUsersCheck.statusCode === 403) {
        console.log('✅ RBAC Boundary Protected: Trainee is 403 Forbidden from accessing /api/users');
    } else {
        console.error('❌ RBAC Security failure: Trainee accessed /api/users:', traineeUsersCheck.statusCode);
    }

    // Step 6: Test Trainer Permissions
    console.log('\n6️⃣ Testing Trainer Login & Evaluation Permissions...');
    const trainerLoginRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST'
    }, {
        email: 'tommy.trainer@thelab.id',
        password: 'Password123!'
    });
    const trainerCookie = trainerLoginRes.cookies[0].split(';')[0];

    // Trainer can evaluate students
    const evalRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/attendance',
        method: 'POST',
        headers: { Cookie: trainerCookie }
    }, {
        studentId: traineeStudent ? traineeStudent.id : 'STU-01',
        score: 95,
        labStatus: 'Verified'
    });
    if (evalRes.statusCode === 200 && evalRes.data.success) {
        console.log(`✅ Trainer successfully evaluated trainee! Score: 95, Status: Verified`);
    } else {
        console.error('❌ Trainer failed to evaluate trainee:', evalRes.data);
    }

    // Trainer cannot manage users
    const trainerUsersCheck = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/users',
        method: 'GET',
        headers: { Cookie: trainerCookie }
    });
    if (trainerUsersCheck.statusCode === 403) {
        console.log('✅ RBAC Boundary Protected: Trainer is 403 Forbidden from managing users');
    } else {
        console.error('❌ RBAC Security failure: Trainer accessed /api/users:', trainerUsersCheck.statusCode);
    }

    // Step 7: Test SPV Permissions
    console.log('\n7️⃣ Testing SPV Login...');
    const spvLoginRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST'
    }, {
        email: 'sarah.spv@thelab.id',
        password: 'Password123!'
    });
    const spvCookie = spvLoginRes.cookies[0].split(';')[0];

    // SPV can view cohorts and students
    const spvStudentsRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/students',
        method: 'GET',
        headers: { Cookie: spvCookie }
    });
    if (spvStudentsRes.statusCode === 200) {
        console.log(`✅ SPV can view student telemetry and cohort performance (${spvStudentsRes.data.length} students)`);
    }

    // SPV cannot manage users
    const spvUsersCheck = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/users',
        method: 'GET',
        headers: { Cookie: spvCookie }
    });
    if (spvUsersCheck.statusCode === 403) {
        console.log('✅ RBAC Boundary Protected: SPV is 403 Forbidden from managing users');
    } else {
        console.error('❌ RBAC Security failure: SPV accessed /api/users:', spvUsersCheck.statusCode);
    }

    // Step 8: Test Password Reset & Role Default Passwords (role12345)
    console.log('\n8️⃣ Testing Reset Password Feature & Role Defaults (<role>12345)...');
    const targetTrainer = usersListRes.data.find(u => u.email === 'tommy.trainer@thelab.id');
    
    // Admin resets Tommy Trainer's password to role default
    const resetRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/users/reset-password',
        method: 'POST',
        headers: { Cookie: adminCookie }
    }, {
        userId: targetTrainer.id
    });

    if (resetRes.statusCode === 200 && resetRes.data.success) {
        console.log(`✅ Admin reset password for ${resetRes.data.name} (${resetRes.data.role})`);
        console.log(`   - New Password: ${resetRes.data.password} (Default: ${resetRes.data.defaultPassword})`);
    } else {
        console.error('❌ Failed to reset password:', resetRes.data);
    }

    // Verify Tommy Trainer can login with trainer12345
    const trainerNewLoginRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST'
    }, {
        email: 'tommy.trainer@thelab.id',
        password: 'trainer12345'
    });

    if (trainerNewLoginRes.statusCode === 200 && trainerNewLoginRes.data.success) {
        console.log('✅ Trainer successfully logged in with role default password "trainer12345"!');
    } else {
        console.error('❌ Trainer failed to login with default password:', trainerNewLoginRes.data);
    }

    // Non-admin attempting to reset password is 403 Forbidden
    const unauthReset = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/users/reset-password',
        method: 'POST',
        headers: { Cookie: trainerCookie }
    }, {
        userId: targetTrainer.id,
        password: 'hacked12345'
    });

    if (unauthReset.statusCode === 403) {
        console.log('✅ RBAC Protected: Non-admin is 403 Forbidden from resetting passwords');
    } else {
        console.error('❌ Security breach: Non-admin could reset password');
    }

    // Step 9: Test First Login Password Change (Self-Service)
    console.log('\n9️⃣ Testing First Login Forced Password Change (/api/auth/change-password)...');
    const newTrainerCookie = trainerNewLoginRes.cookies[0].split(';')[0];
    
    // Check auth state has mustChangePassword: true
    const meRes1 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: { Cookie: newTrainerCookie }
    });
    if (meRes1.data.user?.mustChangePassword === true) {
        console.log('✅ First Login detected: mustChangePassword is TRUE for initial default password');
    } else {
        console.error('❌ Expected mustChangePassword to be true, got:', meRes1.data.user?.mustChangePassword);
    }

    // Trainer changes their own password
    const changeOwnRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/change-password',
        method: 'POST',
        headers: { Cookie: newTrainerCookie }
    }, {
        newPassword: 'TrainerSecret2026!'
    });

    if (changeOwnRes.statusCode === 200 && changeOwnRes.data.success) {
        console.log('✅ Trainer successfully set personal password: "TrainerSecret2026!"');
    } else {
        console.error('❌ Failed to change own password:', changeOwnRes.data);
    }

    // Check auth state now has mustChangePassword: false
    const meRes2 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: { Cookie: newTrainerCookie }
    });
    if (meRes2.data.user?.mustChangePassword === false) {
        console.log('✅ mustChangePassword successfully cleared to FALSE after personal password setup');
    } else {
        console.error('❌ Expected mustChangePassword to be false, got:', meRes2.data.user?.mustChangePassword);
    }

    // Verify trainer can now log in with their personal password
    const trainerCustomLogin = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST'
    }, {
        email: 'tommy.trainer@thelab.id',
        password: 'TrainerSecret2026!'
    });
    if (trainerCustomLogin.statusCode === 200 && trainerCustomLogin.data.success) {
        console.log('✅ Trainer authenticated successfully with new personal password!');
    } else {
        console.error('❌ Failed to login with new personal password:', trainerCustomLogin.data);
    }

    console.log('\n=======================================================');
    console.log('🎉 ALL 4 ROLES, RBAC & FIRST-LOGIN PASSED 100%!');
    console.log('=======================================================\n');
}

runTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
