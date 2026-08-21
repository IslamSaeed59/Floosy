import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { useOutletContext } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DEFAULT_CATEGORIES } from '../lib/constants';

export default function Reports() {
  const { transactions } = useOutletContext();
  const [timeRange, setTimeRange] = useState('month');

  // Filter by time range
  const getFilteredTxs = () => {
    const now = new Date();
    let startDate = new Date();
    
    if (timeRange === 'week') startDate.setDate(now.getDate() - 7);
    if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);
    if (timeRange === 'year') startDate.setFullYear(now.getFullYear() - 1);

    const startStr = startDate.toISOString().split('T')[0];
    return transactions.filter(tx => tx.date >= startStr);
  };

  const filteredTxs = getFilteredTxs();
  
  const expenses = filteredTxs.filter(tx => tx.type === 'expense');
  const incomes = filteredTxs.filter(tx => tx.type === 'income');
  const transfers = filteredTxs.filter(tx => tx.type === 'transfer');

  const totalExpense = expenses.reduce((sum, tx) => sum + tx.amount, 0) + transfers.reduce((sum, tx) => sum + (tx.companyFee || 0), 0);
  const totalIncome = incomes.reduce((sum, tx) => sum + tx.amount, 0) + transfers.reduce((sum, tx) => sum + (tx.profit || 0), 0);

  // Group Expenses by Category
  const categoryData = expenses.reduce((acc, tx) => {
    const existing = acc.find(c => c.id === tx.categoryId);
    if (existing) {
      existing.value += tx.amount;
    } else {
      const catDef = DEFAULT_CATEGORIES.find(c => c.id === tx.categoryId) || { name: 'Unknown', color: '#999' };
      acc.push({ id: tx.categoryId, name: catDef.name, value: tx.amount, color: catDef.color });
    }
    return acc;
  }, []);

  const totalTransferFees = transfers.reduce((sum, tx) => sum + (tx.companyFee || 0), 0);
  if (totalTransferFees > 0) {
    categoryData.push({ id: 'transfer_fee', name: 'Transfer Fees', value: totalTransferFees, color: '#f97316' });
  }
  
  categoryData.sort((a, b) => b.value - a.value);

  // Group by Date for Bar Chart
  const dateDataRaw = [...expenses, ...incomes, ...transfers].reduce((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = { date: tx.date, expense: 0, income: 0 };
    if (tx.type === 'expense') acc[tx.date].expense += tx.amount;
    if (tx.type === 'income') acc[tx.date].income += tx.amount;
    if (tx.type === 'transfer') {
      acc[tx.date].expense += (tx.companyFee || 0);
      acc[tx.date].income += (tx.profit || 0);
    }
    return acc;
  }, {});
  const dateData = Object.values(dateDataRaw).sort((a, b) => a.date.localeCompare(b.date));



  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500">Analyze your spending habits and income.</p>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-1 flex">
          {['week', 'month', 'year'].map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${timeRange === r ? 'bg-gray-50 text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.03)]' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Last {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-error">${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Total Income</h3>
          <p className="text-3xl font-bold text-[#2b8a3e]">${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart: Expenses by Category */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Expenses by Category</h3>
          {categoryData.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No expenses in this period.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {categoryData.map(c => (
                  <div key={c.id} className="flex items-center text-xs">
                    <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: c.color }}></div>
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar Chart: Income vs Expense Over Time */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Income vs Expenses</h3>
          {dateData.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No data in this period.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dateData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e3e3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} cursor={{fill: '#f3f2ff'}} />
                  <Bar dataKey="income" name="Income" fill="#38b000" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ba1a1a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
