import { useState, useEffect } from "react";
import { db, auth } from "../lib/firebase";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  ArrowRight,
  Plus,
  Target,
  Check,
  X
} from "lucide-react";
import { Link, useOutletContext, useNavigate } from "react-router-dom";
import { formatCurrency } from "../lib/utils";
import { DEFAULT_CATEGORIES } from "../lib/constants";
import { collection, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { wallets, transactions, debts, goals } = useOutletContext();
  const [selectedWallets, setSelectedWallets] = useState(new Set());

  // Goal Form State
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalWallets, setGoalWallets] = useState([]);

  const toggleWallet = (id) => {
    const newSet = new Set(selectedWallets);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedWallets(newSet);
  };

  const activeWallets =
    selectedWallets.size > 0
      ? wallets.filter((w) => selectedWallets.has(w.id))
      : wallets;
  const totalBalance = activeWallets.reduce((sum, w) => sum + w.balance, 0);

  const recentTxs = transactions.slice(0, 5);
  const debtStats = debts
    .filter((d) => d.status !== "settled")
    .reduce(
      (acc, d) => {
        if (d.direction === "lent") acc.lent += d.remainingAmount;
        else acc.borrowed += d.remainingAmount;
        return acc;
      },
      { lent: 0, borrowed: 0 },
    );

  const netWorth = totalBalance + debtStats.lent - debtStats.borrowed;

  const getCategoryDetails = (catId) =>
    DEFAULT_CATEGORIES.find((c) => c.id === catId) || {
      name: "Unknown",
      icon: "❓",
    };
  const getWalletName = (wId) =>
    wallets.find((w) => w.id === wId)?.name || "Unknown";

  const toggleGoalWallet = (id) => {
    if (goalWallets.includes(id)) {
      setGoalWallets(goalWallets.filter(wId => wId !== id));
    } else {
      setGoalWallets([...goalWallets, id]);
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!goalName || !goalTarget || goalWallets.length === 0) return alert("Please fill all fields and select at least one wallet.");
    
    try {
      const newGoalRef = doc(collection(db, 'goals'));
      await setDoc(newGoalRef, {
        ownerId: auth.currentUser.uid,
        name: goalName,
        targetAmount: parseFloat(goalTarget),
        linkedWallets: goalWallets,
        status: 'active',
        createdAt: serverTimestamp()
      });
      setShowGoalForm(false);
      setGoalName("");
      setGoalTarget("");
      setGoalWallets([]);
    } catch(err) {
      console.error(err);
      alert("Error adding goal.");
    }
  };

  const handleCompleteGoal = async (goalId) => {
    if (!window.confirm("Mark this goal as completed? It will be hidden from the dashboard.")) return;
    try {
      await updateDoc(doc(db, 'goals', goalId), { status: 'completed' });
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500">
          Here is what's happening with your money today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 md:gap-4">
        <button
          onClick={() => navigate("/transactions?add=true")}
          className="flex-1 min-w-[140px] flex justify-center items-center px-4 py-3 bg-primary text-white font-semibold rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="h-5 w-5 mr-2" /> Transaction
        </button>
        <button
          onClick={() => navigate("/wallets?add=true")}
          className="flex-1 min-w-[140px] flex justify-center items-center px-4 py-3 bg-white text-gray-900 border border-gray-100 font-semibold rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-gray-50 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="h-5 w-5 mr-2 text-primary" /> Wallet
        </button>
        <button
          onClick={() => navigate("/debts?add=true")}
          className="flex-1 min-w-[140px] flex justify-center items-center px-4 py-3 bg-white text-gray-900 border border-gray-100 font-semibold rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-gray-50 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="h-5 w-5 mr-2 text-primary" /> Debt
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-primary text-white p-4 sm:p-6 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <span className="text-white font-medium opacity-90 text-xs sm:text-base leading-tight">
              {selectedWallets.size > 0
                ? `Selected (${selectedWallets.size})`
                : "Total Balance"}
            </span>
            <Wallet className="h-5 w-5 sm:h-6 sm:w-6 opacity-70 shrink-0 ml-1" />
          </div>
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold tracking-tight truncate">
            {formatCurrency(totalBalance)}
          </h2>
        </div>

        <div onClick={() => navigate('/debts?tab=lent')} className="bg-white border border-gray-100 p-4 sm:p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all group">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <span className="text-gray-500 font-medium group-hover:text-primary transition-colors text-xs sm:text-base leading-tight">Owed to Me</span>
            <ArrowUpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0 ml-1" />
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
            {formatCurrency(debtStats.lent)}
          </h2>
        </div>

        <div onClick={() => navigate('/debts?tab=borrowed')} className="bg-white border border-gray-100 p-4 sm:p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all group">
          <div className="flex justify-between items-start mb-3 sm:mb-4">
            <span className="text-gray-500 font-medium group-hover:text-error transition-colors text-xs sm:text-base leading-tight">I Owe</span>
            <ArrowDownCircle className="h-5 w-5 sm:h-6 sm:w-6 text-error shrink-0 ml-1" />
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
            {formatCurrency(debtStats.borrowed)}
          </h2>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white p-4 sm:p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-700/50 flex flex-col justify-between relative overflow-hidden group transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 rounded-full blur-[40px] -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 rounded-full blur-[30px] -ml-10 -mb-10"></div>
          <div className="relative z-10 flex justify-between items-start mb-3 sm:mb-4">
            <span className="text-gray-300 font-semibold tracking-wide uppercase text-[10px] sm:text-xs mt-1">
              Net Worth
            </span>
            <div className="p-1.5 sm:p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/10">
              <svg
                className="h-4 w-4 sm:h-5 sm:w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <h2 className="relative z-10 text-xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white drop-shadow-sm truncate">
            {formatCurrency(netWorth)}
          </h2>
        </div>
      </div>

      {/* Goals Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Savings Goals</h3>
          <button onClick={() => setShowGoalForm(true)} className="text-sm font-medium text-primary flex items-center hover:underline">
            <Plus className="h-4 w-4 mr-1" /> New Goal
          </button>
        </div>
        
        {(!goals || goals.filter(g => g.status !== 'completed').length === 0) ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-center">
            <Target className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No active goals. Set a goal to track your savings!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
            {goals.filter(g => g.status !== 'completed').map(goal => {
              const currentAmount = goal.linkedWallets.reduce((sum, wId) => sum + (wallets.find(w => w.id === wId)?.balance || 0), 0);
              const progress = Math.min((currentAmount / goal.targetAmount) * 100, 100);
              const isAchieved = currentAmount >= goal.targetAmount;
              
              return (
                <div key={goal.id} className="bg-white p-3 sm:p-5 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div className="p-1.5 sm:p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                          <Target className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm sm:text-base leading-tight line-clamp-2">{goal.name}</h4>
                      </div>
                      {isAchieved && (
                        <button onClick={() => handleCompleteGoal(goal.id)} className="p-1 sm:p-1.5 bg-[#d3f9d8] text-[#2b8a3e] rounded-md hover:scale-110 transition-transform shrink-0 ml-1" title="Mark as Completed">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2">
                      <span className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(currentAmount)}</span>
                      <span className="text-[10px] sm:text-sm font-medium text-gray-500 mb-0.5 sm:mb-1 truncate">of {formatCurrency(goal.targetAmount)}</span>
                    </div>
                    
                    <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2.5 mb-2 overflow-hidden">
                      <div 
                        className={`h-1.5 sm:h-2.5 rounded-full transition-all duration-1000 ${isAchieved ? 'bg-[#2b8a3e]' : 'bg-primary'}`} 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="mt-1 sm:mt-2 text-[9px] sm:text-xs font-medium text-gray-500 flex flex-col sm:flex-row sm:justify-between gap-0.5 sm:gap-2">
                    <span>{progress.toFixed(1)}% {isAchieved ? 'Achieved!' : 'completed'}</span>
                    <span className="truncate sm:max-w-[120px] sm:text-right" title={goal.linkedWallets.map(getWalletName).join(', ')}>
                      In {goal.linkedWallets.length} wallet{goal.linkedWallets.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">
              Recent Transactions
            </h3>
            <Link
              to="/transactions"
              className="text-sm font-medium text-primary flex items-center hover:underline"
            >
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
            {recentTxs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No transactions yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentTxs.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {(() => {
                        const isExpense = tx.type === "expense";
                        const cat = isExpense
                          ? getCategoryDetails(tx.categoryId)
                          : null;
                        const IconComp = isExpense
                          ? cat.icon
                          : tx.type === "income"
                            ? ArrowUpCircle
                            : ArrowRight;
                        return (
                          <div
                            className={`p-2 rounded-full ${
                              isExpense
                                ? "bg-orange-50 text-orange-500"
                                : tx.type === "income"
                                  ? "bg-[#d3f9d8] text-[#2b8a3e]"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                            style={
                              isExpense
                                ? {
                                    backgroundColor: `${cat.color}20`,
                                    color: cat.color,
                                  }
                                : {}
                            }
                          >
                            <IconComp className="h-5 w-5" />
                          </div>
                        );
                      })()}
                      <div>
                        <h4 className="font-bold text-sm">
                          {tx.type === "expense" &&
                            getCategoryDetails(tx.categoryId).name}
                          {tx.type === "income" && tx.source}
                          {tx.type === "transfer" && `Transfer`}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {tx.date} •{" "}
                          {getWalletName(tx.walletId || tx.fromWalletId)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-sm ${
                        tx.type === "expense"
                          ? "text-error"
                          : tx.type === "income"
                            ? "text-[#2b8a3e]"
                            : "text-gray-900"
                      }`}
                    >
                      {tx.type === "expense"
                        ? "-"
                        : tx.type === "income"
                          ? "+"
                          : ""}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Wallets Overview */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Your Wallets</h3>
            <Link
              to="/wallets"
              className="text-sm font-medium text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="space-y-3">
            {wallets.map((w) => (
              <div
                key={w.id}
                onClick={() => toggleWallet(w.id)}
                className={`p-4 rounded-2xl border flex justify-between items-center relative overflow-hidden group cursor-pointer transition-all duration-200 ${
                  selectedWallets.has(w.id)
                    ? "bg-primary/5 border-primary ring-1 ring-primary shadow-sm"
                    : "bg-white border-gray-100 hover:border-gray-300"
                }`}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: w.color }}
                ></div>
                <div className="pl-2 flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${selectedWallets.has(w.id) ? "bg-primary border-primary" : "border-gray-300"}`}
                  >
                    {selectedWallets.has(w.id) && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">{w.name}</h4>
                </div>
                <span className="font-bold text-gray-900">
                  {formatCurrency(w.balance)}
                </span>
              </div>
            ))}
            {wallets.length === 0 && (
              <p className="text-sm text-gray-500">No wallets configured.</p>
            )}
          </div>
        </div>
      </div>

      {/* Add Goal Modal */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddGoal} className="bg-white p-7 rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                New Goal
              </h2>
              <button type="button" onClick={() => setShowGoalForm(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Goal Name</label>
                <input 
                  type="text" required value={goalName} onChange={e => setGoalName(e.target.value)} 
                  placeholder="e.g. New Car" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Target Amount</label>
                <input 
                  type="number" required step="0.01" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} 
                  placeholder="e.g. 50000" 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Linked Wallets (Select at least 1)</label>
                <p className="text-xs text-gray-500 mb-2">The goal progress will automatically equal the total balance of the wallets you select here.</p>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {wallets.map(w => (
                    <div 
                      key={w.id}
                      onClick={() => toggleGoalWallet(w.id)}
                      className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer transition-all ${
                        goalWallets.includes(w.id) ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-semibold text-sm">{w.name}</span>
                      {goalWallets.includes(w.id) && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
              <button type="button" onClick={() => setShowGoalForm(false)} className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl font-semibold transition-colors">Cancel</button>
              <button type="submit" className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:opacity-90 transition-all">Create Goal</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
