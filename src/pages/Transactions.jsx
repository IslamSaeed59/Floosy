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
  const isVodafoneCash = type === 'transfer' && selectedFromWallet?.name.toLowerCase().includes('vodafone-cash');

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

        if (isVodafoneCash) {
          feeAmount = parseFloat(companyFee) || 0;
          profitAmount = parseFloat(profit) || 0;
          
          if (feeAmount > 0) txData.companyFee = feeAmount;
          if (profitAmount > 0) txData.profit = profitAmount;
        }

        batch.update(doc(db, 'wallets', walletId), { balance: increment(-(parsedAmount + feeAmount)) });
        batch.update(doc(db, 'wallets', toWalletId), { balance: increment(parsedAmount + profitAmount) });
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
        const reverseFromAmount = tx.amount + (tx.companyFee || 0);
        const reverseToAmount = tx.amount + (tx.profit || 0);
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
        <form onSubmit={handleAddTransaction} className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 space-y-6">
          <div className="flex gap-4 border-b border-gray-100 pb-4">
            {['expense', 'income', 'transfer'].map(t => (
              <label key={t} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="text-primary focus:ring-primary h-4 w-4"
                />
                <span className="capitalize text-gray-900 font-medium">{t}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Amount</label>
              <input
                type="number"
                required
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900"
              />
            </div>

            {type !== 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Wallet</label>
                <select
                  required
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900"
                >
                  <option value="">Select Wallet</option>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.balance})</option>)}
                </select>
              </div>
            )}

            {type === 'transfer' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">From Wallet</label>
                  <select
                    required
                    value={walletId}
                    onChange={(e) => setWalletId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900"
                  >
                    <option value="">Select Wallet</option>
                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({w.balance})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">To Wallet (الكاش المستلم)</label>
                  <select
                    required
                    value={toWalletId}
                    onChange={(e) => setToWalletId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900"
                  >
                    <option value="">Select Wallet</option>
                    {wallets.filter(w => w.id !== walletId).map(w => <option key={w.id} value={w.id}>{w.name} ({w.balance})</option>)}
                  </select>
                </div>
                {isVodafoneCash && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Company Fee (خصم الشركة)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={companyFee}
                        onChange={(e) => setCompanyFee(e.target.value)}
                        placeholder="e.g. 1"
                        className="w-full px-3 py-2 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 bg-orange-50/50 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">My Profit (مكسبي/العمولة)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={profit}
                        onChange={(e) => setProfit(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full px-3 py-2 border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 bg-green-50/50 text-gray-900"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {type === 'expense' && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Category</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900"
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
                <label className="block text-sm font-medium text-gray-900 mb-2">Source</label>
                <input
                  type="text"
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Salary, Freelance"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900"
                />
              </div>
            )}
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-2">Note (Optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-900">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:bg-gray-50-tint">Save Transaction</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No transactions found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {currentTransactions.map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  {(() => {
                    const isExpense = tx.type === 'expense';
                    const cat = isExpense ? getCategoryDetails(tx.categoryId) : null;
                    const IconComp = isExpense ? cat.icon : (tx.type === 'income' ? ArrowUpCircle : ArrowRightLeft);
                    return (
                      <div className={`p-2 sm:p-3 rounded-full ${
                        isExpense ? 'bg-orange-50 text-orange-500' :
                        tx.type === 'income' ? 'bg-[#d3f9d8] text-[#2b8a3e]' : 'bg-gray-100 text-gray-700'
                      }`} style={isExpense ? { backgroundColor: `${cat.color}20`, color: cat.color } : {}}>
                        <IconComp className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    );
                  })()}
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-gray-900">
                      {tx.type === 'expense' && getCategoryDetails(tx.categoryId).name}
                      {tx.type === 'income' && tx.source}
                      {tx.type === 'transfer' && `Transfer`}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {tx.date} • {tx.type === 'transfer' ? `${getWalletName(tx.fromWalletId)} ➔ ${getWalletName(tx.toWalletId)}` : getWalletName(tx.walletId)}
                      {tx.note && ` • ${tx.note}`}
                    </p>
                    {tx.type === 'transfer' && (tx.companyFee > 0 || tx.profit > 0) && (
                      <div className="flex gap-2 mt-1">
                        {tx.companyFee > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md font-bold">Fee: {formatCurrency(tx.companyFee)}</span>}
                        {tx.profit > 0 && <span className="text-xs bg-[#d3f9d8] text-[#2b8a3e] px-2 py-0.5 rounded-md font-bold">Profit: {formatCurrency(tx.profit)}</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-bold text-base sm:text-lg ${
                    tx.type === 'expense' ? 'text-error' : tx.type === 'income' ? 'text-[#2b8a3e]' : 'text-gray-900'
                  }`}>
                    {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}
                    {formatCurrency(tx.amount)}
                  </span>
                  <button onClick={() => handleDelete(tx)} className="p-2 text-error opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-4 w-4" />
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
