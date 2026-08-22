import { useState, useEffect } from 'react';
import { formatCurrency } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, writeBatch, increment, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { Plus, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Trash2 } from 'lucide-react';
import { DEFAULT_CATEGORIES } from '../lib/constants';

export default function Transactions() {
  const { wallets, transactions } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get('add') === 'true');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const currentTransactions = transactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [source, setSource] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [companyFee, setCompanyFee] = useState('');
  const [profit, setProfit] = useState('');

  const selectedFromWallet = wallets.find(w => w.id === walletId);
  const selectedToWallet = wallets.find(w => w.id === toWalletId);
  const isVodafoneFrom = type === 'transfer' && selectedFromWallet?.name.toLowerCase().includes('vodafone-cash');
  const isVodafoneTo = type === 'transfer' && selectedToWallet?.name.toLowerCase().includes('vodafone-cash');
  const isVodafoneCash = isVodafoneFrom || isVodafoneTo;

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return alert('Invalid amount');

    try {
      const batch = writeBatch(db);
      const newTxRef = doc(collection(db, 'transactions'));
      
      const txData = {
        ownerId: auth.currentUser.uid,
        type,
        amount: parsedAmount,
        date,
        note,
        createdAt: serverTimestamp()
      };

      if (type === 'expense') {
        if (!walletId || !categoryId) return alert('Wallet and category required');
        txData.walletId = walletId;
        txData.categoryId = categoryId;
        batch.update(doc(db, 'wallets', walletId), { balance: increment(-parsedAmount) });
      } else if (type === 'income') {
        if (!walletId || !source) return alert('Wallet and source required');
        txData.walletId = walletId;
        txData.source = source;
        batch.update(doc(db, 'wallets', walletId), { balance: increment(parsedAmount) });
      } else if (type === 'transfer') {
        if (!walletId || !toWalletId || walletId === toWalletId) return alert('Valid wallets required');
        txData.fromWalletId = walletId;
        txData.toWalletId = toWalletId;
        
        let feeAmount = 0;
        let profitAmount = 0;

        let fromDelta = -parsedAmount;
        let toDelta = parsedAmount;
        let transferSubType = 'standard';

        if (isVodafoneCash) {
          feeAmount = parseFloat(companyFee) || 0;
          profitAmount = parseFloat(profit) || 0;
          
          if (feeAmount > 0) txData.companyFee = feeAmount;
          if (profitAmount > 0) txData.profit = profitAmount;

          if (isVodafoneFrom) {
            fromDelta = -(parsedAmount + feeAmount);
            toDelta = parsedAmount + profitAmount;
            transferSubType = 'cash_in';
          } else if (isVodafoneTo) {
            fromDelta = -(parsedAmount - profitAmount + feeAmount);
            toDelta = parsedAmount;
            transferSubType = 'cash_out';
          }
        }

        txData.transferSubType = transferSubType;

        batch.update(doc(db, 'wallets', walletId), { balance: increment(fromDelta) });
        batch.update(doc(db, 'wallets', toWalletId), { balance: increment(toDelta) });
      }

      batch.set(newTxRef, txData);
      await batch.commit();

      setShowForm(false);
      setAmount('');
      setNote('');
      setCompanyFee('');
      setProfit('');
      
    } catch (error) {
      console.error("Error adding transaction: ", error);
      alert('Error adding transaction. Check console.');
    }
  };

  const handleDelete = async (tx) => {
    if (!window.confirm('Are you sure you want to delete this transaction? This will reverse the wallet balance.')) return;
    
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'transactions', tx.id));

      if (tx.type === 'expense') {
        batch.update(doc(db, 'wallets', tx.walletId), { balance: increment(tx.amount) });
      } else if (tx.type === 'income') {
        batch.update(doc(db, 'wallets', tx.walletId), { balance: increment(-tx.amount) });
      } else if (tx.type === 'transfer') {
        let reverseFromAmount = tx.amount;
        let reverseToAmount = tx.amount;

        if (tx.transferSubType === 'cash_out') {
          reverseFromAmount = tx.amount - (tx.profit || 0) + (tx.companyFee || 0);
          reverseToAmount = tx.amount;
        } else {
          reverseFromAmount = tx.amount + (tx.companyFee || 0);
          reverseToAmount = tx.amount + (tx.profit || 0);
        }

        batch.update(doc(db, 'wallets', tx.fromWalletId), { balance: increment(reverseFromAmount) });
        batch.update(doc(db, 'wallets', tx.toWalletId), { balance: increment(-reverseToAmount) });
      }

      await batch.commit();
      
    } catch (error) {
      console.error("Error deleting transaction: ", error);
    }
  };

  const getCategoryDetails = (catId) => DEFAULT_CATEGORIES.find(c => c.id === catId) || { name: 'Unknown', icon: '❓' };
  const getWalletName = (wId) => wallets.find(w => w.id === wId)?.name || 'Unknown Wallet';



  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500">Track your expenses, income, and transfers.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:bg-gray-50-tint transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Transaction
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddTransaction} className="bg-white p-5 sm:p-8 rounded-[2rem] shadow-2xl border border-gray-100 animate-in slide-in-from-top-4 duration-300">
          <div className="flex p-1.5 bg-gray-100 rounded-2xl w-full mb-8 shadow-inner">
            {['expense', 'income', 'transfer'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all duration-300 capitalize ${
                  type === t 
                    ? `bg-white shadow-[0_2px_10px_rgba(0,0,0,0.1)] scale-[1.02] ${t === 'expense' ? 'text-error' : t === 'income' ? 'text-[#2b8a3e]' : 'text-primary'}` 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider">Amount</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-xl">EGP</span>
              <input
                type="number"
                required
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-16 pr-5 py-4 text-3xl font-black border border-gray-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary bg-white text-gray-900 transition-all outline-none shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {type !== 'transfer' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Wallet</label>
                <select
                  required
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 text-gray-900 transition-all outline-none"
                >
                  <option value="">Select Wallet</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>)}
                </select>
              </div>
            )}

            {type === 'transfer' && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">From Wallet</label>
                  <select
                    required
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 text-gray-900 transition-all outline-none"
                  >
                    <option value="">Select Wallet</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">To Wallet (الكاش المستلم)</label>
                  <select
                    required
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 text-gray-900 transition-all outline-none"
                  >
                    <option value="">Select Wallet</option>
                    {wallets.filter(w => w.id !== walletId).map(w => <option key={w.id} value={w.id}>{w.name} ({formatCurrency(w.balance)})</option>)}
                  </select>
                </div>
                {isVodafoneCash && (
                  <div className="md:col-span-2 p-5 bg-primary/5 rounded-2xl border border-primary/10 mt-2">
                    <h4 className="text-sm font-black text-primary flex items-center gap-2 mb-4">
                      {isVodafoneFrom ? 'Vodafone Cash In (إيداع للعميل)' : 'Vodafone Cash Out (سحب من العميل)'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-orange-700 mb-1.5 uppercase tracking-wider">Company Fee (خصم الشركة)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={companyFee}
                          onChange={(e) => setCompanyFee(e.target.value)}
                          placeholder="e.g. 1"
                          className="w-full px-4 py-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 bg-white text-gray-900 shadow-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-green-700 mb-1.5 uppercase tracking-wider">My Profit (مكسبي/العمولة)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={profit}
                          onChange={(e) => setProfit(e.target.value)}
                          placeholder="e.g. 10"
                          className="w-full px-4 py-3 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500/20 bg-white text-gray-900 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {type === 'expense' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 text-gray-900 transition-all outline-none"
                >
                  <option value="">Select Category</option>
                  {DEFAULT_CATEGORIES.filter(c => c.type === 'expense').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'income' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Source</label>
                <input
                  type="text"
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Salary, Freelance"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 text-gray-900 transition-all outline-none"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 text-gray-900 transition-all outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Note (Optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What was this for?"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 text-gray-900 transition-all outline-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl font-semibold transition-colors">Cancel</button>
            <button type="submit" className={`px-6 py-2.5 text-white rounded-xl font-bold shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:opacity-90 hover:-translate-y-0.5 transition-all capitalize ${
              type === 'expense' ? 'bg-error' : type === 'income' ? 'bg-[#2b8a3e]' : 'bg-primary'
            }`}>
              Save {type}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No transactions found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {currentTransactions.map((tx) => (
              <div key={tx.id} className="p-4 sm:p-5 hover:bg-gray-50/80 transition-all duration-200 flex items-center justify-between group cursor-pointer relative overflow-hidden">
                <div className="flex items-center gap-4 sm:gap-5">
                  {(() => {
                    const isExpense = tx.type === 'expense';
                    const cat = isExpense ? getCategoryDetails(tx.categoryId) : null;
                    const IconComp = isExpense ? cat.icon : (tx.type === 'income' ? ArrowUpCircle : ArrowRightLeft);
                    return (
                      <div className={`p-3 sm:p-3.5 rounded-2xl flex items-center justify-center shadow-sm border border-black/5 relative overflow-hidden group-hover:scale-105 transition-transform`} style={isExpense ? { backgroundColor: `${cat.color}15`, color: cat.color } : {
                        backgroundColor: tx.type === 'income' ? '#d3f9d8' : '#f3f4f6',
                        color: tx.type === 'income' ? '#2b8a3e' : '#4b5563'
                      }}>
                        <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <IconComp className="h-5 w-5 sm:h-6 sm:w-6 relative z-10" />
                      </div>
                    );
                  })()}
                  <div className="flex flex-col gap-1">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                      {tx.type === 'expense' && getCategoryDetails(tx.categoryId).name}
                      {tx.type === 'income' && tx.source}
                      {tx.type === 'transfer' && (!tx.transferSubType || tx.transferSubType === 'standard' ? 'Transfer' : tx.transferSubType === 'cash_in' ? 'Vodafone Cash In (إيداع)' : 'Vodafone Cash Out (سحب)')}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-semibold text-gray-500 bg-gray-100/80 px-2 py-0.5 rounded-md border border-gray-200/50">
                        {tx.date}
                      </span>
                      <span className="text-[10px] sm:text-xs font-medium text-gray-500 flex items-center gap-1">
                        {tx.type === 'transfer' ? (
                          <>
                            <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{getWalletName(tx.fromWalletId)}</span>
                            <ArrowRightLeft className="h-3 w-3 text-gray-400" />
                            <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{getWalletName(tx.toWalletId)}</span>
                          </>
                        ) : (
                          <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">{getWalletName(tx.walletId)}</span>
                        )}
                      </span>
                    </div>
                    {tx.note && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px] sm:max-w-md">"{tx.note}"</p>}
                    {tx.type === 'transfer' && (tx.companyFee > 0 || tx.profit > 0) && (
                      <div className="flex gap-2 mt-1">
                        {tx.companyFee > 0 && <span className="text-[10px] sm:text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md font-semibold border border-orange-100 shadow-sm">Fee: {formatCurrency(tx.companyFee)}</span>}
                        {tx.profit > 0 && <span className="text-[10px] sm:text-xs bg-[#d3f9d8]/50 text-[#2b8a3e] px-2 py-0.5 rounded-md font-semibold border border-[#d3f9d8] shadow-sm">Profit: {formatCurrency(tx.profit)}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-5">
                  <div className="text-right">
                    <span className={`block font-black tracking-tight text-base sm:text-lg ${
                      tx.type === 'expense' ? 'text-error' : tx.type === 'income' ? 'text-[#2b8a3e]' : 'text-gray-900'
                    }`}>
                      {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(tx); }} className="p-2 sm:p-2.5 bg-red-50 text-error hover:bg-error hover:text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0 shadow-sm">
                    <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
