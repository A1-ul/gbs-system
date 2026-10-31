import fs from 'fs';
import path from 'path';

const dashboardsDir = 'frontend/src/modules/portal/pages/dashboards';
const roles = ['admin', 'teacher', 'student', 'parent', 'accountant', 'hr', 'staff'];

const results = {};

for (const role of roles) {
  const dir = path.join(dashboardsDir, role);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));
  for (const f of files) {
    const full = path.join(dir, f);
    const text = fs.readFileSync(full, 'utf8');
    const tabs = [...text.matchAll(/activeTab\s*===?\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
    const setTabCalls = [...text.matchAll(/setActiveTab\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
    const buttons = [...text.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1].trim()).filter(Boolean);
    results[`${role}/${f}`] = {
      tabs: [...new Set([...tabs, ...setTabCalls])],
      sampleButtons: [...new Set(buttons)].slice(0, 15)
    };
  }
}

// Developer dashboard
const devPath = 'frontend/src/modules/developer-platform/pages/DeveloperDashboard.jsx';
if (fs.existsSync(devPath)) {
  const text = fs.readFileSync(devPath, 'utf8');
  const tabs = [...text.matchAll(/activeTab\s*===?\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
  const setTabCalls = [...text.matchAll(/setActiveTab\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
  results['developer/DeveloperDashboard.jsx'] = {
    tabs: [...new Set([...tabs, ...setTabCalls])],
    sampleButtons: [...new Set([...text.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1].trim()))].slice(0, 15)
  };
}

console.log(JSON.stringify(results, null, 2));
