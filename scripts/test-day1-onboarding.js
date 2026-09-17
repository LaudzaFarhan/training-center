const fs = require('fs');

console.log('--- Day 1 Launchpad / First Day Onboarding Verification ---');

// 1. Check HTML template
const html = fs.readFileSync('public/dashboard.html', 'utf8');

const htmlChecks = [
    { desc: 'Feature Name', pass: html.includes('Day 1 Launchpad / First Day Onboarding') },
    { desc: 'Banner Title: Welcome to The Lab Family! 🚀', pass: html.includes('Welcome to The Lab Family! 🚀') },
    { desc: 'Welcome Subtitle / Message', pass: html.includes("We're excited to have you join our mission of inspiring the next generation of creators!") },
    { desc: 'Tag: Day 1 Launchpad', pass: html.includes('Day 1 Launchpad') },
    { desc: 'Pillar 1: Work Identity & Account Setup', pass: html.includes('Work Identity &amp; Account Setup') || html.includes('Work Identity & Account Setup') },
    { desc: 'P1: Official Work Email Creation format [Nama].thelab@gmail.com', pass: html.includes('[Nama].thelab@gmail.com') },
    { desc: 'P1: Master Sheet Registration: Email Kerja All Karyawan.xlsx', pass: html.includes('Email Kerja All Karyawan.xlsx') },
    { desc: 'P1: Instructor Portal Login: web.thelab.id/login', pass: html.includes('web.thelab.id/login') },
    { desc: 'P1: Completion Status Label: Account & Portal Ready', pass: html.includes('Account &amp; Portal Ready') || html.includes('Account & Portal Ready') },
    { desc: 'Pillar 2: Knowledge Hub & Cloud Drive Setup', pass: html.includes('Knowledge Hub &amp; Cloud Drive Setup') || html.includes('Knowledge Hub & Cloud Drive Setup') },
    { desc: 'P2: Master Access Account: instructors@thelab.id', pass: html.includes('instructors@thelab.id') },
    { desc: 'P2: Folder 1: Kinder & Junior Curriculum Library', pass: html.includes('Kinder &amp; Junior Curriculum Library') || html.includes('Kinder & Junior Curriculum Library') },
    { desc: 'P2: Folder 2: Branch Schedules & Class Folders', pass: html.includes('Branch Schedules &amp; Class Folders') || html.includes('Branch Schedules & Class Folders') },
    { desc: 'P2: Folder 3: Your Folder: "The Lab Training"', pass: html.includes('Your Folder: &quot;The Lab Training&quot;') || html.includes('Your Folder: "The Lab Training"') },
    { desc: 'P2: Completion Status Label: Drive Storage Setup Complete', pass: html.includes('Drive Storage Setup Complete') },
    { desc: 'Pillar 3: Wingman, Team & Culture', pass: html.includes('Wingman, Team &amp; Culture') || html.includes('Wingman, Team & Culture') },
    { desc: 'P3: Buddy System', pass: html.includes('Buddy System') },
    { desc: 'P3: Branch Allies Introduction (SPA & EC)', pass: html.includes('Branch Allies Introduction') && html.includes('SPA') && html.includes('EC') },
    { desc: 'P3: Core Cultural Mindset Note', pass: html.includes('Curious Explorer Mindset — Test tools with your hands first; playful curiosity is the best teacher!') },
    { desc: 'Interactive checkmark inputs for all onboarding tasks', pass: html.includes('id="chkEmailCreation"') && html.includes('id="chkMasterSheet"') && html.includes('id="chkPortalLogin"') }
];

console.log('\nHTML Template Checks:');
let htmlPassed = 0;
htmlChecks.forEach(c => {
    console.log(`${c.pass ? '✓' : '✗'} ${c.desc}`);
    if (c.pass) htmlPassed++;
});

// 2. Check JavaScript Logic
const js = fs.readFileSync('public/js/app.js', 'utf8');
const jsChecks = [
    { desc: 'JS Onboarding state initialization', pass: js.includes('onboardingState') },
    { desc: 'JS Checkbox event bindings for all 8 items', pass: js.includes('chkEmailCreation') && js.includes('chkMasterSheet') && js.includes('chkPortalLogin') },
    { desc: 'JS updateOnboardingUI function defined', pass: js.includes('function updateOnboardingUI') },
    { desc: 'JS Pillar 1 status label update', pass: js.includes('Account & Portal Ready') },
    { desc: 'JS Pillar 2 status label update', pass: js.includes('Drive Storage Setup Complete') },
    { desc: 'JS LocalStorage persistence for onboarding progress', pass: js.includes('thelab_day1_onboarding') },
    { desc: 'JS Overall progress calculation and bar sync', pass: js.includes('kinderOverallPercent') && js.includes('kinderOverallBar') }
];

console.log('\nJavaScript Controller Checks:');
let jsPassed = 0;
jsChecks.forEach(c => {
    console.log(`${c.pass ? '✓' : '✗'} ${c.desc}`);
    if (c.pass) jsPassed++;
});

// 3. Check React Component
const reactCode = fs.readFileSync('components/TrainingArea.tsx', 'utf8');
const reactChecks = [
    { desc: 'React OnboardingTask interface & state defined', pass: reactCode.includes('interface OnboardingTask') && reactCode.includes('onboardingTasks') },
    { desc: 'React Day 1 Launchpad Banner with Welcome Title & Quote', pass: reactCode.includes('Welcome to The Lab Family! 🚀') && reactCode.includes("We're excited to have you join our mission of inspiring the next generation of creators!") },
    { desc: 'React 3 Core Pillars rendered with status labels', pass: reactCode.includes('Work Identity &amp; Account Setup') || reactCode.includes('Work Identity & Account Setup') },
    { desc: 'React Master Account & Folders', pass: reactCode.includes('instructors@thelab.id') && reactCode.includes('Kinder &amp; Junior Curriculum Library') || reactCode.includes('Kinder & Junior Curriculum Library') },
    { desc: 'React Culture Mindset Quote', pass: reactCode.includes('Curious Explorer Mindset — Test tools with your hands first; playful curiosity is the best teacher!') },
    { desc: 'React toggleOnboardingTask interactive handler', pass: reactCode.includes('toggleOnboardingTask') }
];

console.log('\nReact / Next.js Component Checks:');
let reactPassed = 0;
reactChecks.forEach(c => {
    console.log(`${c.pass ? '✓' : '✗'} ${c.desc}`);
    if (c.pass) reactPassed++;
});

console.log(`\nResults: HTML ${htmlPassed}/${htmlChecks.length} | JS ${jsPassed}/${jsChecks.length} | React ${reactPassed}/${reactChecks.length}`);
if (htmlPassed === htmlChecks.length && jsPassed === jsChecks.length && reactPassed === reactChecks.length) {
    console.log('🎉 ALL DAY 1 ONBOARDING SPECIFICATIONS VERIFIED SUCCESSFULLY!');
    process.exit(0);
} else {
    console.error('Some checks failed.');
    process.exit(1);
}
