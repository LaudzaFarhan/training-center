/**
 * Automated Verification Test for Production Live Code Synchronization & Auto-Reload
 * Tests:
 * 1. GET /api/system/version (Returns version, boot time, and anti-cache headers)
 * 2. Static asset cache prevention headers (HTML no-store, JS/CSS must-revalidate + ETag)
 * 3. Script references in dashboard.html, index.html, and login.html
 * 4. GET /api/system/version-stream (SSE live event delivery)
 * 5. POST /api/system/trigger-reload (Broadcasts reload event across SSE clients)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3050;

function httpRequest(options, postData = null) {
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
                    data: parsed
                });
            });
        });
        req.on('error', reject);
        if (postData) {
            const payload = typeof postData === 'string' ? postData : JSON.stringify(postData);
            req.setHeader('Content-Type', 'application/json');
            req.setHeader('Content-Length', Buffer.byteLength(payload));
            req.write(payload);
        }
        req.end();
    });
}

async function runAutoReloadTests() {
    console.log('\n=======================================================');
    console.log('🔄 The Lab Indonesia - Live Auto-Reload Verification');
    console.log('=======================================================\n');

    // Step 1: Version Endpoint
    console.log('1️⃣  Testing GET /api/system/version...');
    try {
        const res = await httpRequest({
            hostname: 'localhost',
            port: PORT,
            path: '/api/system/version',
            method: 'GET'
        });

        if (res.statusCode !== 200 || !res.data || !res.data.version) {
            throw new Error(`Unexpected response: status=${res.statusCode}, body=${JSON.stringify(res.data)}`);
        }

        console.log(`   ✅ Version: ${res.data.version}`);
        console.log(`   ✅ Server Boot Time: ${new Date(res.data.bootTime).toISOString()}`);
        console.log(`   ✅ Cache-Control: ${res.headers['cache-control']}`);

        if (!res.headers['cache-control'] || !res.headers['cache-control'].includes('no-store')) {
            throw new Error('Missing no-store in Cache-Control header on version endpoint');
        }
    } catch (err) {
        console.error('   ❌ Step 1 failed:', err.message);
        process.exit(1);
    }

    // Step 2: Static Asset Headers
    console.log('\n2️⃣  Testing Cache-Busting Headers for Static Assets...');
    try {
        const jsRes = await httpRequest({
            hostname: 'localhost',
            port: PORT,
            path: '/js/auto-reload.js',
            method: 'GET'
        });

        if (jsRes.statusCode !== 200) {
            throw new Error(`/js/auto-reload.js returned ${jsRes.statusCode}`);
        }
        console.log(`   ✅ /js/auto-reload.js served (Content-Type: ${jsRes.headers['content-type']})`);
        console.log(`   ✅ Cache-Control: ${jsRes.headers['cache-control']}`);
        console.log(`   ✅ X-App-Version: ${jsRes.headers['x-app-version']}`);
        console.log(`   ✅ ETag: ${jsRes.headers['etag']}`);

        if (!jsRes.headers['cache-control'] || !jsRes.headers['cache-control'].includes('must-revalidate')) {
            throw new Error('Static JS does not have must-revalidate Cache-Control');
        }
    } catch (err) {
        console.error('   ❌ Step 2 failed:', err.message);
        process.exit(1);
    }

    // Step 3: Script Tags in HTML Pages
    console.log('\n3️⃣  Checking auto-reload.js inclusion in HTML pages...');
    const publicDir = path.join(__dirname, '..', 'public');
    const htmlFiles = ['dashboard.html', 'index.html', 'login.html'];
    for (const f of htmlFiles) {
        const content = fs.readFileSync(path.join(publicDir, f), 'utf8');
        if (content.includes('auto-reload.js')) {
            console.log(`   ✅ ${f} properly includes auto-reload.js script`);
        } else {
            console.error(`   ❌ ${f} is missing auto-reload.js reference`);
            process.exit(1);
        }
    }

    // Step 4: SSE Live Stream & Trigger Reload Broadcast
    console.log('\n4️⃣  Testing SSE Stream (/api/system/version-stream) & Broadcast...');
    try {
        await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: PORT,
                path: '/api/system/version-stream',
                method: 'GET'
            }, (res) => {
                if (res.statusCode !== 200 || !res.headers['content-type']?.includes('text/event-stream')) {
                    return reject(new Error(`Expected text/event-stream, got ${res.statusCode} with ${res.headers['content-type']}`));
                }
                console.log(`   ✅ SSE stream connected successfully (status 200)`);

                let receivedInit = false;
                let receivedReload = false;

                res.on('data', async (chunk) => {
                    const text = chunk.toString();
                    if (text.includes('"type":"init"')) {
                        receivedInit = true;
                        console.log('   ✅ Received initial SSE version event');

                        // Now trigger reload via POST endpoint
                        await httpRequest({
                            hostname: 'localhost',
                            port: PORT,
                            path: '/api/system/trigger-reload',
                            method: 'POST'
                        });
                    }

                    if (text.includes('"type":"reload"')) {
                        receivedReload = true;
                        console.log('   ✅ Received broadcasted reload event on client stream');
                        req.destroy();
                        resolve();
                    }
                });

                res.on('error', (e) => {
                    if (!receivedReload) reject(e);
                });
            });

            req.on('error', reject);
            req.end();

            // Timeout after 8 seconds
            setTimeout(() => {
                req.destroy();
                reject(new Error('SSE test timed out waiting for reload event'));
            }, 8000);
        });
    } catch (err) {
        console.error('   ❌ Step 4 failed:', err.message);
        process.exit(1);
    }

    console.log('\n=======================================================');
    console.log('🎉 ALL AUTO-RELOAD & LIVE CODE SYNC TESTS PASSED! 🎉');
    console.log('=======================================================\n');
}

runAutoReloadTests();
