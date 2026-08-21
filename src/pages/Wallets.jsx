import { useState, useEffect } from 'react';
import { formatCurrency } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { WALLET_COLORS } from '../lib/constants';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Plus, Check, Wallet as WalletIcon, Trash2, Edit2 } from 'lucide-react';

export default function Wallets() {
  const { wallets } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get('add') === 'true');
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(WALLET_COLORS[0].hex);
  const [editingWalletId, setEditingWalletId] = useState(null);

  const handleSaveWallet = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    try {
      const walletData = {
        name,
        balance: parseFloat(balance) || 0,
        color,
      };

      if (editingWalletId) {
        await updateDoc(doc(db, 'wallets', editingWalletId), walletData);
      } else {
        walletData.ownerId = auth.currentUser.uid;
        walletData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'wallets'), walletData);
      }
      
      resetForm();
    } catch (error) {
      console.error("Error saving wallet: ", error);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingWalletId(null);
    setName('');
    setBalance('');
    setColor(WALLET_COLORS[0].hex);
  };

  const handleEdit = (wallet) => {
    setEditingWalletId(wallet.id);
    setName(wallet.name);
    setBalance(wallet.balance);
    setColor(wallet.color);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this wallet?')) return;
    try {
      await deleteDoc(doc(db, 'wallets', id));
      
    } catch (error) {
      console.error("Error deleting wallet: ", error);
    }
  };

  

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Wallets</h1>
          <p className="text-gray-500">Manage your different sources of money.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:bg-gray-50-tint transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Wallet
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSaveWallet} className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{editingWalletId ? 'Edit Wallet' : 'Add New Wallet'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Wallet Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Cash, InstaPay"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Initial Balance</label>
              <input
                type="number"
                required
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Color</label>
              <div className="flex flex-wrap gap-3">
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
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:bg-gray-50-tint transition-colors"
            >
              Save Wallet
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.length === 0 && !showForm && (
          <div className="col-span-full p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <WalletIcon className="h-12 w-12 text-outline mx-auto mb-3" />
            <p className="text-gray-500">No wallets found. Create one to get started.</p>
          </div>
        )}
        
        {wallets.map((wallet) => (
          <div key={wallet.id} className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 relative group overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-full h-2" 
              style={{ backgroundColor: wallet.color }}
            />
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 rounded-full mr-3 sm:mr-4" style={{ backgroundColor: `${wallet.color}20`, color: wallet.color }}>
                  <WalletIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-900">{wallet.name}</h3>
                  <p className="text-xl sm:text-2xl font-bold text-primary mt-0.5 sm:mt-1">
                    {formatCurrency(wallet.balance)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleEdit(wallet)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                title="Edit Wallet"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleDelete(wallet.id)}
                className="p-2 text-error hover:bg-error-container rounded-xl transition-colors"
                title="Delete Wallet"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
