const fs = require('fs');
const html = fs.readFileSync('public/dashboard.html', 'utf8');

const qaIndex = html.indexOf('id="tab-qa"');
const qaCloseIndex = html.indexOf('</section>', qaIndex);
const trainingIndex = html.indexOf('id="tab-training-area"');
const trainingCloseIndex = html.indexOf('</section>', trainingIndex);

console.log('qaIndex:', qaIndex);
console.log('qaCloseIndex:', qaCloseIndex);
console.log('trainingIndex:', trainingIndex);
console.log('trainingCloseIndex:', trainingCloseIndex);

if (qaCloseIndex < trainingIndex && trainingCloseIndex > trainingIndex) {
    console.log('✅ PASS: tab-qa closes BEFORE tab-training-area begins!');
} else {
    console.log('❌ FAIL: Nested hierarchy detected!');
    process.exit(1);
}
