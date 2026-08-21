const fs = require('fs');
const path = require('path');

const files = [
  'Dashboard.jsx',
  'Wallets.jsx',
  'Transactions.jsx',
  'Debts.jsx',
  'Reports.jsx',
  'Settings.jsx',
  'Login.jsx'
];

const dir = 'f:/webdeveloper/New 2026/Money/src/pages';

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace tokens in order to prevent sub-string bugs
  content = content.replace(/text-on-surface-variant/g, 'text-gray-500');
  content = content.replace(/text-on-surface/g, 'text-gray-900');
  
  content = content.replace(/bg-surface-container-lowest/g, 'bg-white');
  content = content.replace(/bg-surface-container-low/g, 'bg-gray-50');
  content = content.replace(/bg-surface-container/g, 'bg-gray-50');
  content = content.replace(/border-surface-container/g, 'border-gray-100');
  content = content.replace(/border-surface-variant/g, 'border-gray-100');
  content = content.replace(/divide-surface-variant/g, 'divide-gray-100');
  
  content = content.replace(/bg-surface-variant/g, 'bg-gray-200');
  content = content.replace(/bg-surface/g, 'bg-gray-50');
  
  content = content.replace(/border-outline-variant/g, 'border-gray-200');
  content = content.replace(/border-outline/g, 'border-gray-300');
  
  content = content.replace(/text-on-primary-container/g, 'text-primary');
  content = content.replace(/bg-primary-container/g, 'bg-primary/10');
  
  content = content.replace(/text-on-primary/g, 'text-white');
  
  content = content.replace(/bg-background/g, 'bg-[#f4f7f9]');
  content = content.replace(/text-on-background/g, 'text-gray-900');
  
  // Shadows and borders
  content = content.replace(/shadow-sm/g, 'shadow-[0_2px_10px_rgba(0,0,0,0.03)]');
  content = content.replace(/rounded-xl/g, 'rounded-2xl');
  content = content.replace(/rounded-lg/g, 'rounded-xl'); // upgrade buttons and inputs
  
  // Button enhancements
  content = content.replace(/hover:bg-surface-tint/g, 'hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
});
