const fs = require('fs');
const path = require('path');

const dir = 'f:/webdeveloper/New 2026/Money/src';

// 1. Overwrite constants.js
const constantsPath = path.join(dir, 'lib', 'constants.js');
fs.writeFileSync(constantsPath, `import { 
  Coffee, Car, ReceiptText, HeartPulse, ShoppingBag, 
  Clapperboard, BookOpen, Home, RefreshCw, Box, 
  Banknote, Briefcase, Gift, TrendingUp, Wallet 
} from 'lucide-react';

export const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food & Drinks', type: 'expense', icon: Coffee, color: '#F59E0B' },
  { id: 'transport', name: 'Transport', type: 'expense', icon: Car, color: '#3B82F6' },
  { id: 'bills', name: 'Bills & Utilities', type: 'expense', icon: ReceiptText, color: '#EF4444' },
  { id: 'health', name: 'Health', type: 'expense', icon: HeartPulse, color: '#EC4899' },
  { id: 'shopping', name: 'Shopping', type: 'expense', icon: ShoppingBag, color: '#8B5CF6' },
  { id: 'entertainment', name: 'Entertainment', type: 'expense', icon: Clapperboard, color: '#F97316' },
  { id: 'education', name: 'Education', type: 'expense', icon: BookOpen, color: '#06B6D4' },
  { id: 'rent', name: 'Rent', type: 'expense', icon: Home, color: '#14B8A6' },
  { id: 'subscriptions', name: 'Subscriptions', type: 'expense', icon: RefreshCw, color: '#6366F1' },
  { id: 'other_expense', name: 'Other', type: 'expense', icon: Box, color: '#64748B' },
  
  { id: 'salary', name: 'Salary', type: 'income', icon: Banknote, color: '#10B981' },
  { id: 'freelance', name: 'Freelance', type: 'income', icon: Briefcase, color: '#3B82F6' },
  { id: 'gift', name: 'Gift', type: 'income', icon: Gift, color: '#F43F5E' },
  { id: 'investment', name: 'Investment', type: 'income', icon: TrendingUp, color: '#F59E0B' },
  { id: 'other_income', name: 'Other', type: 'income', icon: Wallet, color: '#64748B' },
];

export const WALLET_COLORS = [
  { name: 'Vodafone Cash', hex: '#E60000' },
  { name: 'InstaPay', hex: '#6C00FF' },
  { name: 'Green', hex: '#00B85C' },
  { name: 'Black', hex: '#1A1A1A' },
  { name: 'Gold', hex: '#F5A623' },
  { name: 'Deep Blue', hex: '#003366' },
];
`);

// delete constants.jsx if it exists
if (fs.existsSync(path.join(dir, 'lib', 'constants.jsx'))) {
  fs.unlinkSync(path.join(dir, 'lib', 'constants.jsx'));
}

// 2. Wallets.jsx Update
const walletsPath = path.join(dir, 'pages', 'Wallets.jsx');
let wCode = fs.readFileSync(walletsPath, 'utf8');
if (!wCode.includes('WALLET_COLORS')) {
  wCode = wCode.replace("import { Plus", "import { Plus, Check");
  wCode = wCode.replace("import { DEFAULT_CATEGORIES } from '../lib/constants';", "import { DEFAULT_CATEGORIES, WALLET_COLORS } from '../lib/constants';");
  if (!wCode.includes('WALLET_COLORS')) {
    wCode = wCode.replace("import { db, auth } from '../lib/firebase';", "import { db, auth } from '../lib/firebase';\nimport { WALLET_COLORS } from '../lib/constants';");
  }
  wCode = wCode.replace("const [color, setColor] = useState('#006d77');", "const [color, setColor] = useState(WALLET_COLORS[0].hex);");
  wCode = wCode.replace(/<input\s+type="color"[\s\S]*?\/>/, 
  `<div className="flex flex-wrap gap-3">
                {WALLET_COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm"
                    style={{ backgroundColor: c.hex }}
                  >
                    {color === c.hex && <Check className="h-5 w-5 text-white" />}
                  </button>
                ))}
              </div>`);
  wCode = wCode.replace("import { useOutletContext } from 'react-router-dom';", "import { useOutletContext, useSearchParams } from 'react-router-dom';");
  if (!wCode.includes('useSearchParams')) wCode = wCode.replace("import { OutletContext", "import { useOutletContext, useSearchParams ");
  
  wCode = wCode.replace("const [showForm, setShowForm] = useState(false);", "const [searchParams] = useSearchParams();\n  const [showForm, setShowForm] = useState(searchParams.get('add') === 'true');");
  fs.writeFileSync(walletsPath, wCode);
}

// 3. Transactions.jsx Update
const txPath = path.join(dir, 'pages', 'Transactions.jsx');
let txCode = fs.readFileSync(txPath, 'utf8');
txCode = txCode.replace("{c.icon} {c.name}", "{c.name}"); // fix option tag
txCode = txCode.replace("import { useOutletContext } from 'react-router-dom';", "import { useOutletContext, useSearchParams } from 'react-router-dom';");
txCode = txCode.replace("const [showForm, setShowForm] = useState(false);", "const [searchParams] = useSearchParams();\n  const [showForm, setShowForm] = useState(searchParams.get('add') === 'true');");

// update the rendering of the icon in the list
// txCode has: tx.type === 'expense' && getCategoryDetails(tx.categoryId).name
// We want to render the Icon component
txCode = txCode.replace(
  /<div className={`p-3 rounded-full.*?<\/div>/s, 
  `{(() => {
                    const isExpense = tx.type === 'expense';
                    const cat = isExpense ? getCategoryDetails(tx.categoryId) : null;
                    const IconComp = isExpense ? cat.icon : (tx.type === 'income' ? ArrowUpCircle : ArrowRightLeft);
                    return (
                      <div className={\`p-3 rounded-full \${
                        isExpense ? 'bg-orange-50 text-orange-500' :
                        tx.type === 'income' ? 'bg-[#d3f9d8] text-[#2b8a3e]' : 'bg-gray-100 text-gray-700'
                      }\`} style={isExpense ? { backgroundColor: \`\${cat.color}20\`, color: cat.color } : {}}>
                        <IconComp className="h-6 w-6" />
                      </div>
                    );
                  })()}`
);
fs.writeFileSync(txPath, txCode);

// 4. Debts.jsx Update
const debtsPath = path.join(dir, 'pages', 'Debts.jsx');
let dCode = fs.readFileSync(debtsPath, 'utf8');
dCode = dCode.replace("import { useOutletContext } from 'react-router-dom';", "import { useOutletContext, useSearchParams } from 'react-router-dom';");
dCode = dCode.replace("const [showForm, setShowForm] = useState(false);", "const [searchParams] = useSearchParams();\n  const [showForm, setShowForm] = useState(searchParams.get('add') === 'true');");
fs.writeFileSync(debtsPath, dCode);

// 5. Dashboard Quick Actions
const dashPath = path.join(dir, 'pages', 'Dashboard.jsx');
let dashCode = fs.readFileSync(dashPath, 'utf8');
dashCode = dashCode.replace("import { Link, useOutletContext } from 'react-router-dom';", "import { Link, useOutletContext, useNavigate } from 'react-router-dom';\nimport { Plus } from 'lucide-react';");

if (!dashCode.includes('Quick Actions')) {
  dashCode = dashCode.replace(
    "{/* Top Stats */}",
    `{/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <button onClick={() => navigate('/transactions?add=true')} className="flex items-center px-5 py-2.5 bg-primary text-white font-semibold rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:opacity-90 hover:-translate-y-0.5 transition-all">
          <Plus className="h-5 w-5 mr-2" /> Add Transaction
        </button>
        <button onClick={() => navigate('/wallets?add=true')} className="flex items-center px-5 py-2.5 bg-white text-gray-900 border border-gray-100 font-semibold rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-gray-50 hover:-translate-y-0.5 transition-all">
          <Plus className="h-5 w-5 mr-2 text-primary" /> Add Wallet
        </button>
        <button onClick={() => navigate('/debts?add=true')} className="flex items-center px-5 py-2.5 bg-white text-gray-900 border border-gray-100 font-semibold rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-gray-50 hover:-translate-y-0.5 transition-all">
          <Plus className="h-5 w-5 mr-2 text-primary" /> Add Debt
        </button>
      </div>

      {/* Top Stats */}`
  );
  dashCode = dashCode.replace("export default function Dashboard() {", "export default function Dashboard() {\n  const navigate = useNavigate();");
  
  // Also update recent transactions icons
  dashCode = dashCode.replace(
  /<div className={`p-2 rounded-full.*?<\/div>/s, 
  `{(() => {
                      const isExpense = tx.type === 'expense';
                      const cat = isExpense ? getCategoryDetails(tx.categoryId) : null;
                      const IconComp = isExpense ? cat.icon : (tx.type === 'income' ? ArrowUpCircle : ArrowRight);
                      return (
                        <div className={\`p-2 rounded-full \${
                          isExpense ? 'bg-orange-50 text-orange-500' :
                          tx.type === 'income' ? 'bg-[#d3f9d8] text-[#2b8a3e]' : 'bg-gray-100 text-gray-700'
                        }\`} style={isExpense ? { backgroundColor: \`\${cat.color}20\`, color: cat.color } : {}}>
                          <IconComp className="h-5 w-5" />
                        </div>
                      );
                    })()}`
);
  fs.writeFileSync(dashPath, dashCode);
}

// 6. Fix Layout.jsx (minor missing import)
const layoutPath = path.join(dir, 'components', 'Layout.jsx');
let layoutCode = fs.readFileSync(layoutPath, 'utf8');
if (!layoutCode.includes("import { Outlet, NavLink, useNavigate } from 'react-router-dom';")) {
  layoutCode = layoutCode.replace("import { Outlet,", "import { Outlet, NavLink, useNavigate } from 'react-router-dom';\nimport { Outlet,");
}
fs.writeFileSync(layoutPath, layoutCode);

console.log("UI Update Complete!");
