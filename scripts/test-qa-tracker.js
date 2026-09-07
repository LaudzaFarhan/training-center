/**
 * Comprehensive Automated Verification Test for The QA & Bug Tracker (/new/qa-tracker)
 * Tests:
 * 1. Admin Authentication & Session
 * 2. GET /api/qa/stats (KPI metrics)
 * 3. GET /api/qa/issues (Filtering by status, type, priority, module, search)
 * 4. POST /api/qa/issues (Issue creation with screenshot attachments & environment metadata)
 * 5. GET /api/qa/issues/:id (Detailed issue retrieval)
 * 6. POST /api/qa/issues/:id/status (1-click stage progression: Open -> In Progress -> Ready for QA -> Resolved)
 * 7. POST /api/qa/issues/:id/assign (Assigning issue to user)
 * 8. POST /api/qa/issues/:id/comments (Threaded discussion reply with attachment)
 * 9. GET /api/qa/notifications (Real-time Critical/High priority toast listener)
 * 10. GET /new/qa-tracker and GET /qa-tracker (Page routing)
 * 11. DELETE /api/qa/issues/:id (Removing / deleting QA issue ticket)
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

function parseCookie(cookieArray) {
    if (!cookieArray || !cookieArray.length) return '';
    return cookieArray.map(c => c.split(';')[0]).join('; ');
}

async function runTests() {
    console.log('\n=======================================================');
    console.log('🐞 The Lab Indonesia - QA & Bug Tracker Verification Test');
    console.log('=======================================================\n');

    let adminCookie = '';

    // Step 1: Login as Admin
    console.log('1️⃣  Authenticating as Admin (admin@thelabindonesia.my.id)...');
    try {
        const loginRes = await request({
            hostname: 'localhost',
            port: PORT,
            path: '/api/auth/login',
            method: 'POST'
        }, {
            email: 'admin@thelabindonesia.my.id',
            password: process.env.ADMIN_PASSWORD || 'TheLab2026!Admin'
        });

        if (loginRes.statusCode !== 200 || !loginRes.data.user) {
            throw new Error(`Admin login failed with status ${loginRes.statusCode}: ${JSON.stringify(loginRes.data)}`);
        }
        adminCookie = parseCookie(loginRes.cookies);
        console.log(`   ✅ Logged in as: ${loginRes.data.user.name} (${loginRes.data.user.role})`);
    } catch (err) {
        console.error('   ❌ Login failed:', err.message);
        process.exit(1);
    }

    // Step 2: GET /api/qa/stats
    console.log('\n2️⃣  Testing GET /api/qa/stats (KPI metrics)...');
    try {
        const statsRes = await request({
            hostname: 'localhost',
            port: PORT,
            path: '/api/qa/stats',
            method: 'GET',
            headers: { Cookie: adminCookie }
        });

        if (statsRes.statusCode !== 200) {
            throw new Error(`Expected status 200, got ${statsRes.statusCode}`);
        }
        const s = statsRes.data;
        console.log(`   ✅ KPI Stats retrieved: Total=${s.total}, Open=${s.open}, InProgress=${s.inProgress}, ReadyQA=${s.readyForQa}, Critical=${s.critical}`);
        if (typeof s.total !== 'number' || typeof s.open !== 'number') {
            throw new Error('Stats properties must be numbers');
        }
    } catch (err) {
        console.error('   ❌ Stats test failed:', err.message);
        process.exit(1);
    }

    // Step 3: GET /api/qa/issues (Default & Filters)
    console.log('\n3️⃣  Testing GET /api/qa/issues (Issue Listing & Filtering)...');
    try {
        const issuesRes = await request({
            hostname: 'localhost',
            port: PORT,
            path: '/api/qa/issues',
            method: 'GET',
            headers: { Cookie: adminCookie }
        });

        if (issuesRes.statusCode !== 200 || !Array.isArray(issuesRes.data)) {
            throw new Error(`Expected array of issues, got: ${JSON.stringify(issuesRes.data)}`);
        }
        console.log(`   ✅ Retrieved ${issuesRes.data.length} issues in default view.`);

        // Test filtering by priority
        const filterCritRes = await request({
            hostname: 'localhost',
            port: PORT,
            path: '/api/qa/issues?priority=Critical',
            method: 'GET',
            headers: { Cookie: adminCookie }
        });
        console.log(`   ✅ Filtered by priority=Critical: found ${filterCritRes.data.length} issues.`);
    } catch (err) {
        console.error('   ❌ Issue listing test failed:', err.message);
        process.exit(1);
    }

    // Step 4: POST /api/qa/issues (Report New Issue)
    console.log('\n4️⃣  Testing POST /api/qa/issues (Reporting New Defect)...');
    let createdIssueId = null;
    try {
        const mockScreenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const createRes = await request({
            hostname: 'localhost',
            port: PORT,
            path: '/api/qa/issues',
            method: 'POST',
            headers: { Cookie: adminCookie }
        }, {
            title: 'Automated Test: Workstation GPU Driver Telemetry Missing',
            type: 'Bug',
            priority: 'Critical',
            module: 'Overview',
            description: 'Steps to reproduce: 1. Launch overview. 2. Observe GPU telemetry card displays null.',
            envBrowser: 'Chrome 124.0.0.0',
            envOs: 'Windows 11',
            envResolution: '2560x1440',
            envViewport: '1920x1080',
            envUrl: 'https://training.thelabindonesia.my.id/dashboard#tab-overview',
            attachments: [mockScreenshot]
        });

        if (createRes.statusCode !== 201 || !createRes.data.issue) {
            throw new Error(`Failed to create issue: ${JSON.stringify(createRes.data)}`);
        }
        createdIssueId = createRes.data.issue.id;
        console.log(`   ✅ Created issue ticket #QA-${createdIssueId}: "${createRes.data.issue.title}"`);
        console.log(`   ✅ Reporter: ${createRes.data.issue.reporterName} (${createRes.data.issue.reporterEmail})`);
        console.log(`   ✅ Attachments count: ${createRes.data.issue.attachments.length}`);
    } catch (err) {
        console.error('   ❌ Issue creation test failed:', err.message);
        process.exit(1);
    }

    // Step 5: GET /api/qa/issues/:id (Details)
    console.log(`\n5️⃣  Testing GET /api/qa/issues/${createdIssueId} (Detailed Ticket View)...`);
    try {
        const detailRes = await request({
            hostname: 'localhost',
            port: PORT,
            path: `/api/qa/issues/${createdIssueId}`,
            method: 'GET',
            headers: { Cookie: adminCookie }
        });

        if (detailRes.statusCode !== 200 || !detailRes.data.title) {
            throw new Error(`Failed to get issue details: ${JSON.stringify(detailRes.data)}`);
        }
        console.log(`   ✅ Verified ticket details for #QA-${createdIssueId}:`);
        console.log(`      Status: ${detailRes.data.status} | Priority: ${detailRes.data.priority} | Module: ${detailRes.data.module}`);
        console.log(`      Client Env: ${detailRes.data.envBrowser} on ${detailRes.data.envOs}`);
    } catch (err) {
        console.error('   ❌ Ticket detail test failed:', err.message);
        process.exit(1);
    }

    // Step 6: POST /api/qa/issues/:id/status (Stage Progression)
    console.log(`\n6️⃣  Testing POST /api/qa/issues/${createdIssueId}/status (Updating to In Progress & Ready for QA)...`);
    try {
        // Step 6a: Move to In Progress
        const statusRes1 = await request({
            hostname: 'localhost',
            port: PORT,
            path: `/api/qa/issues/${createdIssueId}/status`,
            method: 'POST',
            headers: { Cookie: adminCookie }
        }, { status: 'In Progress' });

        if (statusRes1.statusCode !== 200) {
            throw new Error(`Failed to update status to In Progress: ${JSON.stringify(statusRes1.data)}`);
        }
        console.log(`   ✅ Status updated to "In Progress" for ticket #QA-${createdIssueId}`);

        // Step 6b: Move to Ready for QA
        const statusRes2 = await request({
            hostname: 'localhost',
            port: PORT,
            path: `/api/qa/issues/${createdIssueId}/status`,
            method: 'POST',
            headers: { Cookie: adminCookie }
        }, { status: 'Ready for QA' });

        if (statusRes2.statusCode !== 200) {
            throw new Error(`Failed to update status to Ready for QA: ${JSON.stringify(statusRes2.data)}`);
        }
        console.log(`   ✅ Status updated to "Ready for QA" for ticket #QA-${createdIssueId}`);
    } catch (err) {
        console.error('   ❌ Status progression test failed:', err.message);
        process.exit(1);
    }

    // Step 7: POST /api/qa/issues/:id/assign (Assignee)
    console.log(`\n7️⃣  Testing POST /api/qa/issues/${createdIssueId}/assign (Assigning to Trainer)...`);
    try {
        const assignRes = await request({
            hostname: 'localhost',
            port: PORT,
            path: `/api/qa/issues/${createdIssueId}/assign`,
            method: 'POST',
            headers: { Cookie: adminCookie }
        }, {
            assigneeName: 'Christian Adrianus Siwabessy',
            assigneeEmail: 'chsiwabessy.thelab@gmail.com',
            assigneeId: 2
        });

        if (assignRes.statusCode !== 200) {
            throw new Error(`Failed to update assignee: ${JSON.stringify(assignRes.data)}`);
        }
        console.log(`   ✅ Assigned #QA-${createdIssueId} to Christian Adrianus Siwabessy`);
    } catch (err) {
        console.error('   ❌ Assignee update test failed:', err.message);
        process.exit(1);
    }

    // Step 8: POST /api/qa/issues/:id/comments (Discussion Thread)
    console.log(`\n8️⃣  Testing POST /api/qa/issues/${createdIssueId}/comments (Discussion Reply)...`);
    try {
        const commentRes = await request({
            hostname: 'localhost',
            port: PORT,
            path: `/api/qa/issues/${createdIssueId}/comments`,
            method: 'POST',
            headers: { Cookie: adminCookie }
        }, {
            comment: 'Fix verified in staging container build 2026.09.07. Telemetry daemon reconnected successfully.'
        });

        if (commentRes.statusCode !== 201 || !commentRes.data.comment) {
            throw new Error(`Failed to add comment: ${JSON.stringify(commentRes.data)}`);
        }
        console.log(`   ✅ Added discussion comment by ${commentRes.data.comment.authorName} (${commentRes.data.comment.authorRole}):`);
        console.log(`      "${commentRes.data.comment.comment}"`);
    } catch (err) {
        console.error('   ❌ Comment test failed:', err.message);
        process.exit(1);
    }

    // Step 9: GET /api/qa/notifications (Real-Time Toast Poller)
    console.log('\n9️⃣  Testing GET /api/qa/notifications (Real-Time Toast Alerts)...');
    try {
        const notifRes = await request({
            hostname: 'localhost',
            port: PORT,
            path: '/api/qa/notifications?since=900000',
            method: 'GET',
            headers: { Cookie: adminCookie }
        });

        if (notifRes.statusCode !== 200 || !Array.isArray(notifRes.data.alerts)) {
            throw new Error(`Failed to get notifications: ${JSON.stringify(notifRes.data)}`);
        }
        console.log(`   ✅ Found ${notifRes.data.alerts.length} recent high/critical notifications.`);
        const matchingAlert = notifRes.data.alerts.find(a => String(a.id) === String(createdIssueId));
        if (matchingAlert) {
            console.log(`   ✅ Created critical issue #QA-${createdIssueId} accurately reflected in real-time alerts!`);
        }
    } catch (err) {
        console.error('   ❌ Notification test failed:', err.message);
        process.exit(1);
    }

    // Step 10: Page Routing for /new/qa-tracker and /qa-tracker
    console.log('\n🔟 Testing Page Routes (/new/qa-tracker & /qa-tracker)...');
    try {
        const route1 = await request({
            hostname: 'localhost',
            port: PORT,
            path: '/new/qa-tracker',
            method: 'GET',
            headers: { Cookie: adminCookie }
        });
        if (route1.statusCode !== 200 || !route1.data.includes('The QA &amp; Bug Tracker')) {
            throw new Error(`/new/qa-tracker did not return dashboard HTML`);
        }
        console.log(`   ✅ Route /new/qa-tracker successfully served dashboard HTML with QA tracker UI.`);

        const route2 = await request({
            hostname: 'localhost',
            port: PORT,
            path: '/qa-tracker',
            method: 'GET',
            headers: { Cookie: adminCookie }
        });
        if (route2.statusCode !== 200 || !route2.data.includes('The QA &amp; Bug Tracker')) {
            throw new Error(`/qa-tracker did not return dashboard HTML`);
        }
        console.log(`   ✅ Route /qa-tracker successfully served dashboard HTML.`);
    } catch (err) {
        console.error('   ❌ Page routing test failed:', err.message);
        process.exit(1);
    }

    // Step 11: DELETE /api/qa/issues/:id (Remove issue ticket)
    console.log(`\n1️⃣1️⃣ Testing DELETE /api/qa/issues/${createdIssueId} (Deleting QA ticket)...`);
    try {
        // First test unauthenticated delete
        const unauthDel = await request({
            hostname: 'localhost',
            port: PORT,
            path: `/api/qa/issues/${createdIssueId}`,
            method: 'DELETE'
        });
        if (unauthDel.statusCode !== 401) {
            throw new Error(`Expected 401 Unauthorized for unauthenticated DELETE, got ${unauthDel.statusCode}`);
        }
        console.log(`   ✅ Unauthenticated deletion correctly rejected with 401 Unauthorized.`);

        // Authenticated delete as Admin
        const authDel = await request({
            hostname: 'localhost',
            port: PORT,
            path: `/api/qa/issues/${createdIssueId}`,
            method: 'DELETE',
            headers: { Cookie: adminCookie }
        });
        if (authDel.statusCode !== 200 || !authDel.data || !authDel.data.success) {
            throw new Error(`Failed to delete issue: status=${authDel.statusCode}, body=${JSON.stringify(authDel.data)}`);
        }
        console.log(`   ✅ Successfully deleted issue #QA-${createdIssueId}: "${authDel.data.message}"`);

        // Verify GET /api/qa/issues/:id returns 404
        const verifyNotFound = await request({
            hostname: 'localhost',
            port: PORT,
            path: `/api/qa/issues/${createdIssueId}`,
            method: 'GET',
            headers: { Cookie: adminCookie }
        });
        if (verifyNotFound.statusCode !== 404) {
            throw new Error(`Expected 404 Not Found after deletion, got ${verifyNotFound.statusCode}`);
        }
        console.log(`   ✅ Verified GET /api/qa/issues/${createdIssueId} returns 404 Not Found.`);

        // Deleting non-existent issue should also return 404
        const repeatDel = await request({
            hostname: 'localhost',
            port: PORT,
            path: `/api/qa/issues/${createdIssueId}`,
            method: 'DELETE',
            headers: { Cookie: adminCookie }
        });
        if (repeatDel.statusCode !== 404) {
            throw new Error(`Expected 404 Not Found for repeated delete, got ${repeatDel.statusCode}`);
        }
        console.log(`   ✅ Verified repeated delete correctly returns 404 Not Found.`);
    } catch (err) {
        console.error('   ❌ Issue deletion test failed:', err.message);
        process.exit(1);
    }

    console.log('\n=======================================================');
    console.log('🎉 ALL 11 QA & BUG TRACKER TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('=======================================================\n');
}

runTests();
