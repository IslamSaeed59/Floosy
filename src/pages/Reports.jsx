import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { DEFAULT_CATEGORIES } from "../lib/constants";
import { formatCurrency } from "../lib/utils";

export default function Reports() {
  const { transactions, wallets } = useOutletContext();
  const [timeRange, setTimeRange] = useState("month");

  // Filter by time range
  const getFilteredTxs = () => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (timeRange === "today") {
      return transactions.filter((tx) => tx.date === todayStr);
    }
    if (timeRange === "yesterday") {
      return transactions.filter((tx) => tx.date === yesterdayStr);
    }

    let startDate = new Date();

    if (timeRange === "week") startDate.setDate(now.getDate() - 7);
    if (timeRange === "month") startDate.setMonth(now.getMonth() - 1);
    if (timeRange === "year") startDate.setFullYear(now.getFullYear() - 1);

    const startStr = startDate.toISOString().split("T")[0];
    return transactions.filter((tx) => tx.date >= startStr);
  };

  const filteredTxs = getFilteredTxs();

  const expenses = filteredTxs.filter((tx) => tx.type === "expense");
  const incomes = filteredTxs.filter((tx) => tx.type === "income");
  const transfers = filteredTxs.filter((tx) => tx.type === "transfer");

  const totalExpense =
    expenses.reduce((sum, tx) => sum + tx.amount, 0) +
    transfers.reduce((sum, tx) => sum + (tx.companyFee || 0), 0);
  const totalIncome =
    incomes.reduce((sum, tx) => sum + tx.amount, 0) +
    transfers.reduce((sum, tx) => sum + (tx.profit || 0), 0);

  // Group Expenses by Category
  const categoryData = expenses.reduce((acc, tx) => {
    const existing = acc.find((c) => c.id === tx.categoryId);
    if (existing) {
      existing.value += tx.amount;
    } else {
      const catDef = DEFAULT_CATEGORIES.find((c) => c.id === tx.categoryId) || {
        name: "Unknown",
        color: "#999",
      };
      acc.push({
        id: tx.categoryId,
        name: catDef.name,
        value: tx.amount,
        color: catDef.color,
      });
    }
    return acc;
  }, []);

  const totalTransferFees = transfers.reduce(
    (sum, tx) => sum + (tx.companyFee || 0),
    0,
  );
  if (totalTransferFees > 0) {
    categoryData.push({
      id: "transfer_fee",
      name: "Transfer Fees",
      value: totalTransferFees,
      color: "#f97316",
    });
  }

  categoryData.sort((a, b) => b.value - a.value);

  // Group by Date for Bar Chart
  const dateDataRaw = [...expenses, ...incomes, ...transfers].reduce(
    (acc, tx) => {
      if (!acc[tx.date])
        acc[tx.date] = { date: tx.date, expense: 0, income: 0 };
      if (tx.type === "expense") acc[tx.date].expense += tx.amount;
      if (tx.type === "income") acc[tx.date].income += tx.amount;
      if (tx.type === "transfer") {
        acc[tx.date].expense += tx.companyFee || 0;
        acc[tx.date].income += tx.profit || 0;
      }
      return acc;
    },
    {},
  );
  const dateData = Object.values(dateDataRaw).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Reports
          </h1>
          <p className="text-gray-500">Analyze your spending and income.</p>
        </div>

        <div className="bg-gray-100/80 rounded-2xl p-1.5 flex overflow-x-auto w-full md:w-auto shadow-inner no-scrollbar">
          {["today", "yesterday", "week", "month", "year"].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl capitalize transition-all duration-300 whitespace-nowrap ${timeRange === r ? "bg-white text-primary shadow-[0_2px_10px_rgba(0,0,0,0.1)] scale-[1.02]" : "text-gray-500 hover:text-gray-900"}`}
            >
              {r === "today" || r === "yesterday" ? r : `Last ${r}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col justify-center hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-error/10 transition-colors"></div>
          <p className="text-xs sm:text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider relative z-10">
            Total Expenses
          </p>
          <p className="text-3xl md:text-4xl lg:text-4xl font-black text-error relative z-10 tracking-tight">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col justify-center hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#2b8a3e]/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-[#2b8a3e]/10 transition-colors"></div>
          <p className="text-xs sm:text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider relative z-10">
            Total Income
          </p>
          <p className="text-3xl md:text-4xl lg:text-4xl font-black text-[#2b8a3e] relative z-10 tracking-tight">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col justify-center hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-colors ${totalIncome - totalExpense >= 0 ? 'bg-primary/5 group-hover:bg-primary/10' : 'bg-orange-500/5 group-hover:bg-orange-500/10'}`}></div>
          <p className="text-xs sm:text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider relative z-10">
            Net Balance
          </p>
          <p className={`text-3xl md:text-4xl lg:text-4xl font-black relative z-10 tracking-tight ${totalIncome - totalExpense >= 0 ? 'text-primary' : 'text-orange-500'}`}>
            {totalIncome - totalExpense > 0 ? '+' : ''}{totalIncome - totalExpense < 0 ? '-' : ''}{formatCurrency(Math.abs(totalIncome - totalExpense))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Pie Chart: Expenses by Category */}
        <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-6">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">
            Expenses by Category
          </h3>
          {categoryData.length === 0 ? (
            <p className="text-gray-400 py-12 text-center font-medium bg-gray-50/50 rounded-2xl">
              No expenses in this period.
            </p>
          ) : (
            <div className="flex flex-col">
              <div className="h-56 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "none",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                        padding: "12px 16px",
                        fontWeight: "bold",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2.5 justify-center mt-6">
                {categoryData.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center text-xs sm:text-sm font-semibold text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 shrink-0"
                  >
                    <div
                      className="w-3 h-3 rounded-full mr-2 shrink-0"
                      style={{ backgroundColor: c.color }}
                    ></div>
                    <span className="whitespace-nowrap">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar Chart: Income vs Expense Over Time */}
        <div className="bg-white border border-gray-100 p-6 sm:p-8 rounded-3xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] space-y-6">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">
            Income vs Expenses
          </h3>
          {dateData.length === 0 ? (
            <p className="text-gray-400 py-12 text-center font-medium bg-gray-50/50 rounded-2xl">
              No data in this period.
            </p>
          ) : (
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dateData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f3f5"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#868e96", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#868e96", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value
                    }
                  />
                  <RechartsTooltip
                    formatter={(value) => formatCurrency(value)}
                    cursor={{ fill: "#f8f9fa" }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "none",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                      padding: "12px 16px",
                      fontWeight: "bold",
                    }}
                  />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#38b000"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="expense"
                    name="Expense"
                    fill="#ba1a1a"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
