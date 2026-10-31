const fs = require('fs');
const path = require('path');

const srcFacility = 'C:/Users/GBS/.gemini/antigravity-ide/brain/a6fd029f-e7e1-494b-8acb-76d574d1c4cd/campus_facility_bg_1792171629294.jpg';
const srcTwin = 'C:/Users/GBS/.gemini/antigravity-ide/brain/a6fd029f-e7e1-494b-8acb-76d574d1c4cd/campus_twin_bg_1792171647623.jpg';
const srcCctv = 'C:/Users/GBS/.gemini/antigravity-ide/brain/a6fd029f-e7e1-494b-8acb-76d574d1c4cd/cctv_security_bg_1792171671842.jpg';

const destFacility = path.join(__dirname, '../../frontend/public/assets/facility-bg.jpg');
const destTwin = path.join(__dirname, '../../frontend/public/assets/digital-twin-bg.jpg');
const destCctv = path.join(__dirname, '../../frontend/public/assets/cctv-bg.jpg');

fs.copyFileSync(srcFacility, destFacility);
console.log('✅ Copied facility-bg.jpg ->', destFacility);

fs.copyFileSync(srcTwin, destTwin);
console.log('✅ Copied digital-twin-bg.jpg ->', destTwin);

fs.copyFileSync(srcCctv, destCctv);
console.log('✅ Copied cctv-bg.jpg ->', destCctv);
