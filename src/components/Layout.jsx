import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, Wallet, ArrowRightLeft, CreditCard, PieChart, Settings, LogOut, Menu } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import clsx from 'clsx';
import { useState, useEffect } from 'react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: Home },
  { name: 'Wallets', path: '/wallets', icon: Wallet },
  { name: 'Transactions', path: '/transactions', icon: ArrowRightLeft },
  { name: 'Debts', path: '/debts', icon: CreditCard },
  { name: 'Reports', path: '/reports', icon: PieChart },
];

export default function Layout() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [debts, setDebts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    let wLoaded = false, tLoaded = false, dLoaded = false, gLoaded = false;
    const checkLoad = () => { if(wLoaded && tLoaded && dLoaded && gLoaded) setLoading(false); };

    const unsubW = onSnapshot(query(collection(db, 'wallets'), where('ownerId', '==', auth.currentUser.uid)), (snap) => {
      setWallets(snap.docs.map(d => ({id: d.id, ...d.data()})));
      wLoaded = true; checkLoad();
    }, (err) => {
      console.error(err); wLoaded = true; checkLoad();
    });
    
    // Removed orderBy to prevent missing composite index errors, sorted on client side
    const unsubT = onSnapshot(query(collection(db, 'transactions'), where('ownerId', '==', auth.currentUser.uid)), (snap) => {
      const txs = snap.docs.map(d => ({id: d.id, ...d.data()}));
      txs.sort((a, b) => b.date.localeCompare(a.date));
      setTransactions(txs);
      tLoaded = true; checkLoad();
    }, (err) => {
      console.error(err); tLoaded = true; checkLoad();
    });
    
    const unsubD = onSnapshot(query(collection(db, 'debts'), where('ownerId', '==', auth.currentUser.uid)), (snap) => {
      setDebts(snap.docs.map(d => ({id: d.id, ...d.data()})));
      dLoaded = true; checkLoad();
    }, (err) => {
      console.error(err); dLoaded = true; checkLoad();
    });

    const unsubG = onSnapshot(query(collection(db, 'goals'), where('ownerId', '==', auth.currentUser.uid)), (snap) => {
      setGoals(snap.docs.map(d => ({id: d.id, ...d.data()})));
      gLoaded = true; checkLoad();
    }, (err) => {
      console.error(err); gLoaded = true; checkLoad();
    });

    return () => { unsubW(); unsubT(); unsubD(); unsubG(); };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const NavLinks = () => (
    <>
      <div className="space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20 translate-x-1'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <item.icon className={clsx("mr-3.5 h-5 w-5 transition-transform", "group-hover:scale-110")} />
            {item.name}
          </NavLink>
        ))}
      </div>
      <div className="mt-8 pt-8 border-t border-gray-100 space-y-2">
        <NavLink
          to="/settings"
          onClick={() => setMobileMenuOpen(false)}
          className={({ isActive }) =>
            clsx(
              'flex items-center px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200',
              isActive
                ? 'bg-primary text-white shadow-md shadow-primary/20 translate-x-1'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            )
          }
        >
          <Settings className="mr-3.5 h-5 w-5" />
          Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="mr-3.5 h-5 w-5" />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-gray-900 flex flex-col md:flex-row font-sans relative">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white shadow-sm z-10 sticky top-0">
        <h1 className="text-xl font-black text-primary tracking-tight flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          Floosy
        </h1>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-72 bg-white px-6 py-8 shrink-0 h-screen sticky top-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 border-r border-gray-100">
        <h1 className="text-3xl font-black text-primary mb-10 px-2 shrink-0 tracking-tight flex items-center gap-2">
          <Wallet className="h-8 w-8" />
          Floosy
        </h1>
        <div className="flex-1 flex flex-col justify-between overflow-y-auto pb-4 custom-scrollbar">
          <NavLinks />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-28 md:pb-10 w-full max-w-[1600px] mx-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">Loading data...</div>
        ) : (
          <Outlet context={{ wallets, transactions, debts, goals }} />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-around items-center px-2 py-2 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center justify-center p-2 min-w-[64px] transition-all',
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              )
            }
          >
            <item.icon className={clsx("h-6 w-6 mb-1 transition-transform", ({isActive}) => isActive && "scale-110")} />
            <span className="text-[10px] font-semibold">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
