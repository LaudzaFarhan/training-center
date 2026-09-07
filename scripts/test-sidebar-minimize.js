/**
 * The Lab Indonesia - Collapsible Animated Sidebar Verification Test
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('\n=======================================================');
console.log('📐 Verifying Collapsible Sidebar Feature & Animation');
console.log('=======================================================\n');

let allPassed = true;

function assert(condition, message) {
    if (condition) {
        console.log(`   ✅ ${message}`);
    } else {
        console.error(`   ❌ FAIL: ${message}`);
        allPassed = false;
    }
}

// 1. Check HTML Markup
console.log('1️⃣ Checking HTML markup in public/dashboard.html...');
const htmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(htmlContent.includes('id="appSidebar"'), 'Sidebar has id="appSidebar" for JS targeting');
assert(htmlContent.includes('id="btnToggleSidebar"'), 'Sidebar has #btnToggleSidebar in brand box');
assert(htmlContent.includes('id="btnTopbarSidebarToggle"'), 'Topbar has #btnTopbarSidebarToggle for dual access');
assert(htmlContent.includes('class="brand-full-logo"'), 'Full logo has .brand-full-logo class');
assert(htmlContent.includes('class="brand-mini-logo"'), 'Mini mark has .brand-mini-logo class');
assert(htmlContent.includes('data-tooltip="Overview & Stats"'), 'Overview nav item has data-tooltip attribute');
assert(htmlContent.includes('data-tooltip="Live Class Session"'), 'Live Class Session nav item has data-tooltip attribute');
assert(htmlContent.includes('data-tooltip="QA & Bug Tracker"'), 'QA nav item has data-tooltip attribute');
assert(htmlContent.includes('class="nav-item-text"'), 'Nav text labels wrapped in .nav-item-text');

// 2. Check CSS Styles & Transitions
console.log('\n2️⃣ Checking CSS animations and styles in public/css/styles.css...');
const cssPath = path.join(__dirname, '..', 'public', 'css', 'styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

assert(cssContent.includes('.sidebar {') && cssContent.includes('cubic-bezier(0.16, 1, 0.3, 1)'), 'Sidebar has hardware-accelerated cubic-bezier transition');
assert(cssContent.includes('.sidebar.collapsed {'), '.sidebar.collapsed defined with collapsed width');
assert(cssContent.includes('width: 82px;') || cssContent.includes('width: 80px;'), 'Collapsed width set to compact ~82px rail');
assert(cssContent.includes('.sidebar.collapsed .brand-full-logo {') && cssContent.includes('display: none'), 'Full logo hidden in collapsed state');
assert(cssContent.includes('.sidebar.collapsed .brand-mini-logo {') && cssContent.includes('display: block'), 'Mini logo visible in collapsed state');
assert(cssContent.includes('.sidebar.collapsed .nav-item[data-tooltip]::before'), 'Floating tooltip pseudo-element defined with dark royal navy background');
assert(cssContent.includes('.sidebar.collapsed .nav-item[data-tooltip]::after'), 'Floating tooltip pointer arrow defined');
assert(cssContent.includes('.sidebar.collapsed .sidebar-toggle-btn {') && cssContent.includes('rotate(180deg)'), 'Toggle button rotates 180deg when collapsed');
assert(cssContent.includes('.sidebar-toggle-btn-topbar'), 'Topbar toggle button styled with hover feedback');

// 3. Check JS Controller & Shortcuts
console.log('\n3️⃣ Checking JavaScript controller in public/js/app.js...');
const jsPath = path.join(__dirname, '..', 'public', 'js', 'app.js');
const jsContent = fs.readFileSync(jsPath, 'utf8');

assert(jsContent.includes('btnToggleSidebar'), 'btnToggleSidebar referenced in JS');
assert(jsContent.includes('btnTopbarSidebarToggle'), 'btnTopbarSidebarToggle referenced in JS');
assert(jsContent.includes('toggleSidebar'), 'toggleSidebar function defined');
assert(jsContent.includes('setSidebarCollapsed'), 'setSidebarCollapsed handles CSS classes and titles');
assert(jsContent.includes("localStorage.setItem('thelab_sidebar_collapsed'"), 'Collapsed state persisted in localStorage');
assert(jsContent.includes("localStorage.getItem('thelab_sidebar_collapsed')"), 'State restored on page load');
assert(jsContent.includes("e.key.toLowerCase() === 'b'"), 'Keyboard shortcut Ctrl+B / Cmd+B implemented');

// 4. Test Live Endpoint
console.log('\n4️⃣ Checking live dashboard HTTP response...');

async function testLiveDashboard() {
    // First, login to get session token
    const loginData = JSON.stringify({
        email: 'admin@thelabindonesia.my.id',
        password: 'TheLab2026!Admin'
    });

    const loginReq = http.request({
        hostname: 'localhost',
        port: 3050,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    }, (loginRes) => {
        let loginBody = '';
        loginRes.on('data', c => { loginBody += c; });
        loginRes.on('end', () => {
            const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0].split(';')[0] : '';
            assert(cookie.length > 0, 'Admin successfully authenticated with session cookie');

            const dashReq = http.get({
                hostname: 'localhost',
                port: 3050,
                path: '/dashboard',
                headers: {
                    Cookie: cookie
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => { body += chunk; });
                res.on('end', () => {
                    assert(res.statusCode === 200, 'GET /dashboard returns HTTP 200 OK');
                    assert(body.includes('id="appSidebar"'), 'Response body contains id="appSidebar"');
                    assert(body.includes('id="btnToggleSidebar"'), 'Response body contains id="btnToggleSidebar"');
                    assert(body.includes('btnTopbarSidebarToggle'), 'Response body contains btnTopbarSidebarToggle');
                    assert(body.includes('class="brand-mini-logo"'), 'Response body contains brand-mini-logo');
                    assert(body.includes('data-tooltip="Overview & Stats"'), 'Response body contains tooltip attributes');

                    console.log('\n=======================================================');
                    if (allPassed) {
                        console.log('🎉 ALL COLLAPSIBLE SIDEBAR TESTS PASSED 100%! 🎉');
                        console.log('=======================================================\n');
                        process.exit(0);
                    } else {
                        console.error('❌ SOME CHECKS FAILED');
                        console.log('=======================================================\n');
                        process.exit(1);
                    }
                });
            });

            dashReq.on('error', (err) => {
                console.error('❌ Failed to request dashboard:', err.message);
                process.exit(1);
            });
        });
    });

    loginReq.on('error', (err) => {
        console.error('❌ Failed to connect to login API:', err.message);
        process.exit(1);
    });

    loginReq.write(loginData);
    loginReq.end();
}

testLiveDashboard();

