const fs = require('fs');
const path = require('path');

const dir = 'f:/webdeveloper/New 2026/Money/src';

// 1. Update Layout.jsx
const layoutPath = path.join(dir, 'components', 'Layout.jsx');
let layoutCode = fs.readFileSync(layoutPath, 'utf8');

if (!layoutCode.includes('useOutletContext')) {
  layoutCode = layoutCode.replace(
    "import { auth } from '../lib/firebase';",
    "import { auth, db } from '../lib/firebase';\nimport { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';"
  );
  layoutCode = layoutCode.replace(
    "const [mobileMenuOpen, setMobileMenuOpen] = useState(false);",
    `const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    let wLoaded = false, tLoaded = false, dLoaded = false;
    const checkLoad = () => { if(wLoaded && tLoaded && dLoaded) setLoading(false); };

    const unsubW = onSnapshot(query(collection(db, 'wallets'), where('ownerId', '==', auth.currentUser.uid)), (snap) => {
      setWallets(snap.docs.map(d => ({id: d.id, ...d.data()})));
      wLoaded = true; checkLoad();
    });
    const unsubT = onSnapshot(query(collection(db, 'transactions'), where('ownerId', '==', auth.currentUser.uid), orderBy('date', 'desc')), (snap) => {
      setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()})));
      tLoaded = true; checkLoad();
    });
    const unsubD = onSnapshot(query(collection(db, 'debts'), where('ownerId', '==', auth.currentUser.uid)), (snap) => {
      setDebts(snap.docs.map(d => ({id: d.id, ...d.data()})));
      dLoaded = true; checkLoad();
    });

    return () => { unsubW(); unsubT(); unsubD(); };
  }, []);`
  );

  layoutCode = layoutCode.replace(
    "<Outlet />",
    `{loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">Loading data...</div>
        ) : (
          <Outlet context={{ wallets, transactions, debts }} />
        )}`
  );
  fs.writeFileSync(layoutPath, layoutCode);
}

// 2. Update Dashboard
const dashPath = path.join(dir, 'pages', 'Dashboard.jsx');
let dash = fs.readFileSync(dashPath, 'utf8');
dash = dash.replace("import { Link } from 'react-router-dom';", "import { Link, useOutletContext } from 'react-router-dom';");
dash = dash.replace(/const \[loading, setLoading.*(?=return \()/s, 
`const { wallets, transactions, debts } = useOutletContext();
  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const recentTxs = transactions.slice(0, 5);
  const debtStats = debts.filter(d => d.status !== 'settled').reduce((acc, d) => {
    if (d.direction === 'lent') acc.lent += d.remainingAmount;
    else acc.borrowed += d.remainingAmount;
    return acc;
  }, { lent: 0, borrowed: 0 });

  const getCategoryDetails = (catId) => DEFAULT_CATEGORIES.find(c => c.id === catId) || { name: 'Unknown', icon: '❓' };
  const getWalletName = (wId) => wallets.find(w => w.id === wId)?.name || 'Unknown';

  `);
fs.writeFileSync(dashPath, dash);

// 3. Update Wallets
const walletsPath = path.join(dir, 'pages', 'Wallets.jsx');
let wCode = fs.readFileSync(walletsPath, 'utf8');
wCode = wCode.replace(/import \{ db, auth \}.*?;/, "import { db, auth } from '../lib/firebase';\nimport { useOutletContext } from 'react-router-dom';");
wCode = wCode.replace(/const \[wallets, setWallets\].*(?=const handleAddWallet)/s, 
`const { wallets } = useOutletContext();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState('#006d77');

  `);
wCode = wCode.replace(/fetchWallets\(\);/g, "");
wCode = wCode.replace(/if \(loading\).*?Loading wallets.*?<\/div>;\s*}/s, "");
fs.writeFileSync(walletsPath, wCode);

// 4. Update Transactions
const txPath = path.join(dir, 'pages', 'Transactions.jsx');
let txCode = fs.readFileSync(txPath, 'utf8');
txCode = txCode.replace(/import \{ db, auth \}.*?;/, "import { db, auth } from '../lib/firebase';\nimport { useOutletContext } from 'react-router-dom';");
txCode = txCode.replace(/const \[transactions, setTransactions\].*(?=const handleAddTransaction)/s,
`const { wallets, transactions } = useOutletContext();
  const [showForm, setShowForm] = useState(false);
  
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [source, setSource] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  `);
txCode = txCode.replace(/fetchData\(\);/g, "");
txCode = txCode.replace(/if \(loading\).*?Loading transactions.*?<\/div>;\s*}/s, "");
fs.writeFileSync(txPath, txCode);

// 5. Update Debts
const debtsPath = path.join(dir, 'pages', 'Debts.jsx');
let dCode = fs.readFileSync(debtsPath, 'utf8');
dCode = dCode.replace(/import \{ db, auth \}.*?;/, "import { db, auth } from '../lib/firebase';\nimport { useOutletContext } from 'react-router-dom';");
dCode = dCode.replace(/const \[debts, setDebts\].*(?=const handleAddDebt)/s,
`const { wallets, debts } = useOutletContext();
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('lent');
  
  const [personName, setPersonName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');

  const [repayingDebt, setRepayingDebt] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayWalletId, setRepayWalletId] = useState('');

  `);
dCode = dCode.replace(/fetchData\(\);/g, "");
dCode = dCode.replace(/if \(loading\).*?Loading debts.*?<\/div>;\s*}/s, "");
fs.writeFileSync(debtsPath, dCode);

// 6. Update Reports
const repPath = path.join(dir, 'pages', 'Reports.jsx');
let rCode = fs.readFileSync(repPath, 'utf8');
rCode = rCode.replace(/import \{ db, auth \}.*?;/, "import { db, auth } from '../lib/firebase';\nimport { useOutletContext } from 'react-router-dom';");
rCode = rCode.replace(/const \[loading, setLoading\].*(?=\/\/ Filter by time range)/s,
`const { transactions } = useOutletContext();
  const [timeRange, setTimeRange] = useState('month');

  `);
rCode = rCode.replace(/if \(loading\).*?Loading reports.*?<\/div>;\s*}/s, "");
fs.writeFileSync(repPath, rCode);

console.log("Refactor Complete!");
