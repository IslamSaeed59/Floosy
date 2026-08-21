const fs = require('fs');
const path = require('path');

const dir = 'f:/webdeveloper/New 2026/Money/src';

// Create utils.js
const utilsPath = path.join(dir, 'lib', 'utils.js');
fs.writeFileSync(utilsPath, `export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0.00';
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
`);

// 1. Dashboard
const dashPath = path.join(dir, 'pages', 'Dashboard.jsx');
let dash = fs.readFileSync(dashPath, 'utf8');
if (!dash.includes('formatCurrency')) {
  dash = dash.replace("import { Plus } from 'lucide-react';", "import { Plus } from 'lucide-react';\nimport { formatCurrency } from '../lib/utils';");
  dash = dash.replace(/\$?\s*\{totalBalance\.toLocaleString\(\)\}/g, '{formatCurrency(totalBalance)}');
  dash = dash.replace(/\{tx\.amount\}/g, '{formatCurrency(tx.amount)}');
  fs.writeFileSync(dashPath, dash);
}

// 2. Wallets
const walletsPath = path.join(dir, 'pages', 'Wallets.jsx');
let wallets = fs.readFileSync(walletsPath, 'utf8');
if (!wallets.includes('formatCurrency')) {
  wallets = wallets.replace("import { Edit2 } from 'lucide-react';", "import { Edit2 } from 'lucide-react';\nimport { formatCurrency } from '../lib/utils';");
  wallets = wallets.replace(/\{wallet\.balance\.toLocaleString\([\s\S]*?\)\}/g, '{formatCurrency(wallet.balance)}');
  wallets = wallets.replace(/\{w\.balance\}/g, '{formatCurrency(w.balance)}');
  fs.writeFileSync(walletsPath, wallets);
}

// 3. Transactions
const txPath = path.join(dir, 'pages', 'Transactions.jsx');
let tx = fs.readFileSync(txPath, 'utf8');
if (!tx.includes('formatCurrency')) {
  tx = tx.replace("import { Trash2 } from 'lucide-react';", "import { Trash2 } from 'lucide-react';\nimport { formatCurrency } from '../lib/utils';");
  tx = tx.replace(/\{tx\.amount\.toLocaleString\([\s\S]*?\)\}/g, '{formatCurrency(tx.amount)}');
  fs.writeFileSync(txPath, tx);
}

// 4. Debts
const debtsPath = path.join(dir, 'pages', 'Debts.jsx');
let debts = fs.readFileSync(debtsPath, 'utf8');
if (!debts.includes('formatCurrency')) {
  debts = debts.replace("import { Calendar } from 'lucide-react';", "import { Calendar } from 'lucide-react';\nimport { formatCurrency } from '../lib/utils';");
  debts = debts.replace(/\{debt\.remainingAmount\.toLocaleString\(\)\}/g, '{formatCurrency(debt.remainingAmount)}');
  debts = debts.replace(/\{debt\.remainingAmount\}/g, '{formatCurrency(debt.remainingAmount)}');
  debts = debts.replace(/\{repayingDebt\.remainingAmount\}/g, '{formatCurrency(repayingDebt.remainingAmount)}');
  debts = debts.replace(/\{debt\.totalAmount\}/g, '{formatCurrency(debt.totalAmount)}');
  fs.writeFileSync(debtsPath, debts);
}

// 5. Reports (Optional, but let's check if it has amounts)
const repPath = path.join(dir, 'pages', 'Reports.jsx');
let rep = fs.readFileSync(repPath, 'utf8');
if (!rep.includes('formatCurrency') && (rep.includes('payload[0].value') || rep.includes('payload[0].payload'))) {
  // It's using Recharts, maybe we don't touch charts for now unless they specifically ask, charts format automatically or via formatter
  // But let's check if there are raw values.
}

console.log("Formatting Applied!");
