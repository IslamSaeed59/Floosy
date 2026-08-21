import { useState, useMemo } from "react";
import { formatCurrency } from "../lib/utils";
import { db, auth } from "../lib/firebase";
import { useOutletContext, useSearchParams } from "react-router-dom";
import {
  collection,
  serverTimestamp,
  doc,
  writeBatch,
  increment,
} from "firebase/firestore";
import {
  Plus,
  CheckCircle,
  ArrowRightLeft,
  User,
  Calendar,
  FileText,
  ChevronRight,
  X,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default function Debts() {
  const { wallets, debts } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "lent");

  // Ledger View State
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Add Debt Form State
  const [showForm, setShowForm] = useState(searchParams.get("add") === "true");
  const [personName, setPersonName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [walletId, setWalletId] = useState("");
  const [newDebtDirection, setNewDebtDirection] = useState("lent");

  // Repayment Modal State
  const [repayingDebt, setRepayingDebt] = useState(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayWalletId, setRepayWalletId] = useState("");

  // Group Debts into Person Ledgers
  const groupedDebts = useMemo(() => {
    const groups = {};
    debts.forEach((debt) => {
      if (!groups[debt.personName]) {
        groups[debt.personName] = {
          name: debt.personName,
          netBalance: 0,
          history: [],
        };
      }
      groups[debt.personName].history.push(debt);
      if (debt.status !== "settled") {
        if (debt.direction === "lent")
          groups[debt.personName].netBalance += debt.remainingAmount;
        else groups[debt.personName].netBalance -= debt.remainingAmount;
      }
    });
    Object.values(groups).forEach((g) => {
      g.history.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
    });
    return Object.values(groups);
  }, [debts]);

  const peopleOweMe = groupedDebts.filter((p) => p.netBalance > 0);
  const iOwePeople = groupedDebts.filter((p) => p.netBalance < 0);
  const settledPeople = groupedDebts.filter(
    (p) => p.netBalance === 0 && p.history.length > 0,
  );

  // Update selectedPerson dynamically if debts change
  const currentPersonData = selectedPerson
    ? groupedDebts.find((g) => g.name === selectedPerson.name) || selectedPerson
    : null;

  const handleAddDebt = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const amount = parseFloat(totalAmount);
    if (!amount || amount <= 0 || !personName)
      return alert("Please fill required fields properly");

    try {
      const batch = writeBatch(db);
      const newDebtRef = doc(collection(db, "debts"));
      const newTxRef = doc(collection(db, "transactions"));

      batch.set(newDebtRef, {
        ownerId: auth.currentUser.uid,
        direction: newDebtDirection,
        personName,
        totalAmount: amount,
        remainingAmount: amount,
        dueDate: dueDate || null,
        status: "open",
        note,
        createdAt: serverTimestamp(),
      });

      if (walletId) {
        batch.set(newTxRef, {
          ownerId: auth.currentUser.uid,
          type: newDebtDirection === "lent" ? "expense" : "income",
          amount,
          walletId,
          source:
            newDebtDirection === "borrowed"
              ? `Borrowed from ${personName}`
              : null,
          categoryId: newDebtDirection === "lent" ? "other_expense" : null,
          note: `Debt: ${newDebtDirection === "lent" ? "Lent to" : "Borrowed from"} ${personName}`,
          relatedDebtId: newDebtRef.id,
          date: new Date().toISOString().split("T")[0],
          createdAt: serverTimestamp(),
        });

        const walletRef = doc(db, "wallets", walletId);
        if (newDebtDirection === "lent")
          batch.update(walletRef, { balance: increment(-amount) });
        else batch.update(walletRef, { balance: increment(amount) });
      }

      await batch.commit();

      setShowForm(false);
      if (!selectedPerson) setPersonName(""); // keep name if we are inside their ledger
      setTotalAmount("");
      setDueDate("");
      setNote("");
      setWalletId("");
    } catch (error) {
      console.error("Error adding debt: ", error);
    }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    if (!repayingDebt) return;
    const amount = parseFloat(repayAmount);
    if (!amount || amount <= 0 || amount > repayingDebt.remainingAmount)
      return alert("Invalid amount");

    try {
      const batch = writeBatch(db);
      const newRemaining = repayingDebt.remainingAmount - amount;

      batch.update(doc(db, "debts", repayingDebt.id), {
        remainingAmount: newRemaining,
        status: newRemaining <= 0 ? "settled" : "partially_paid",
      });

      if (repayWalletId) {
        const newTxRef = doc(collection(db, "transactions"));
        batch.set(newTxRef, {
          ownerId: auth.currentUser.uid,
          type: repayingDebt.direction === "lent" ? "income" : "expense",
          amount,
          walletId: repayWalletId,
          source:
            repayingDebt.direction === "lent"
              ? `Debt repayment from ${repayingDebt.personName}`
              : null,
          categoryId:
            repayingDebt.direction === "borrowed" ? "other_expense" : null,
          note: `Repayment for debt: ${repayingDebt.personName}`,
          relatedDebtId: repayingDebt.id,
          date: new Date().toISOString().split("T")[0],
          createdAt: serverTimestamp(),
        });

        const walletRef = doc(db, "wallets", repayWalletId);
        if (repayingDebt.direction === "lent")
          batch.update(walletRef, { balance: increment(amount) });
        else batch.update(walletRef, { balance: increment(-amount) });
      }

      await batch.commit();
      setRepayingDebt(null);
      setRepayAmount("");
      setRepayWalletId("");
    } catch (error) {
      console.error("Error processing repayment: ", error);
    }
  };

  const openNewDebtForm = (name = "", direction = "lent") => {
    setPersonName(name);
    setNewDebtDirection(direction);
    setTotalAmount("");
    setNote("");
    setDueDate("");
    setWalletId("");
    setShowForm(true);
  };

  const renderPeopleList = (list, emptyMessage) => {
    if (list.length === 0)
      return <p className="text-gray-500 text-center py-8">{emptyMessage}</p>;
    return (
      <div className="space-y-3">
        {list.map((p) => (
          <div
            key={p.name}
            onClick={() => setSelectedPerson(p)}
            className="bg-white p-4 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex justify-between items-center cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className={`p-2 sm:p-3 rounded-xl ${p.netBalance > 0 ? "bg-primary/10 text-primary" : p.netBalance < 0 ? "bg-error/10 text-error" : "bg-gray-100 text-gray-500"}`}
              >
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-gray-900 group-hover:text-primary transition-colors">
                  {p.name}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  {p.history.filter((d) => d.status !== "settled").length}{" "}
                  active records
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right">
                <p className="text-xs sm:text-sm text-gray-500">Net Balance</p>
                <p
                  className={`font-bold text-base sm:text-xl ${p.netBalance > 0 ? "text-primary" : p.netBalance < 0 ? "text-error" : "text-gray-500"}`}
                >
                  {p.netBalance < 0 ? "-" : ""}
                  {formatCurrency(Math.abs(p.netBalance))}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Ledger</h1>
          <p className="text-gray-500">
            Track balances with your friends and family.
          </p>
        </div>
        <button
          onClick={() => openNewDebtForm("", activeTab)}
          className="flex items-center px-4 py-2 bg-primary text-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:opacity-90 transition-all"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Person
        </button>
      </div>

      <div className="flex p-1.5 bg-gray-100 rounded-2xl w-full mb-8 shadow-inner">
        <button
          onClick={() => setActiveTab("lent")}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === "lent" ? "bg-white text-primary shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]" : "text-gray-500 hover:text-gray-900"}`}
        >
          People who owe me
        </button>
        <button
          onClick={() => setActiveTab("borrowed")}
          className={`flex-1 py-3 text-center text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === "borrowed" ? "bg-white text-error shadow-[0_2px_8px_rgba(0,0,0,0.08)] scale-[1.02]" : "text-gray-500 hover:text-gray-900"}`}
        >
          People I owe
        </button>
      </div>

      {activeTab === "lent" &&
        renderPeopleList(peopleOweMe, "Nobody owes you money.")}
      {activeTab === "borrowed" &&
        renderPeopleList(iOwePeople, "You don't owe anyone money.")}

      {settledPeople.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4 text-gray-400">
            Settled Profiles
          </h2>
          <div className="opacity-70">
            {renderPeopleList(settledPeople, "")}
          </div>
        </div>
      )}

      {/* Person Ledger Modal */}
      {selectedPerson && currentPersonData && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 flex justify-end">
          <div className="w-full max-w-xl bg-[#f4f7f9] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="bg-white px-6 py-6 border-b border-gray-100 flex items-center justify-between shadow-sm z-10 shrink-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedPerson(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {currentPersonData.name}
                  </h2>
                  <p
                    className={`font-semibold ${currentPersonData.netBalance > 0 ? "text-primary" : currentPersonData.netBalance < 0 ? "text-error" : "text-gray-500"}`}
                  >
                    Net Balance: {currentPersonData.netBalance < 0 ? "-" : ""}
                    {formatCurrency(Math.abs(currentPersonData.netBalance))}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-32">
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() =>
                    openNewDebtForm(currentPersonData.name, "lent")
                  }
                  className="flex-1 py-3 bg-primary/10 text-primary font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-primary/20 transition-colors"
                >
                  <ArrowUpRight className="h-5 w-5" /> I Lent Them
                </button>
                <button
                  onClick={() =>
                    openNewDebtForm(currentPersonData.name, "borrowed")
                  }
                  className="flex-1 py-3 bg-error/10 text-error font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-error/20 transition-colors"
                >
                  <ArrowDownRight className="h-5 w-5" /> I Borrowed
                </button>
              </div>

              <div className="space-y-4">
                {currentPersonData.history.map((debt) => (
                  <div
                    key={debt.id}
                    className={`bg-white p-5 rounded-2xl border ${debt.status === "settled" ? "opacity-60 grayscale" : "shadow-sm"} border-gray-100`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${debt.direction === "lent" ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}
                        >
                          {debt.direction === "lent"
                            ? "Lent to them"
                            : "Borrowed from them"}
                        </span>
                        {debt.dueDate && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar className="h-4 w-4" /> Due: {debt.dueDate}
                          </p>
                        )}
                        {debt.note && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 bg-gray-50 px-2 py-1 rounded-md inline-flex">
                            <FileText className="h-3.5 w-3.5" /> {debt.note}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm text-gray-500">Total</p>
                        <p className="font-bold text-base sm:text-lg text-gray-900">
                          {formatCurrency(debt.totalAmount)}
                        </p>
                      </div>
                    </div>

                    {debt.status !== "settled" && (
                      <>
                        <div className="flex justify-between text-sm mb-1 mt-4">
                          <span className="text-gray-500">Remaining</span>
                          <span className="font-bold text-gray-900">
                            {formatCurrency(debt.remainingAmount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                          <div
                            className={`h-2 rounded-full ${debt.direction === "lent" ? "bg-primary" : "bg-error"}`}
                            style={{
                              width: `${((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-end border-t border-gray-50 pt-3">
                          <button
                            onClick={() => {
                              setRepayingDebt(debt);
                              setRepayAmount(debt.remainingAmount);
                            }}
                            className={`px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-2 ${debt.direction === "lent" ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-error/10 text-error hover:bg-error/20"} transition-colors`}
                          >
                            <ArrowRightLeft className="h-4 w-4" />{" "}
                            {debt.direction === "lent"
                              ? "Record Repayment"
                              : "Pay Them Back"}
                          </button>
                        </div>
                      </>
                    )}
                    {debt.status === "settled" && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-sm font-bold text-gray-400">
                        <CheckCircle className="h-4 w-4" /> Settled
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Debt Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddDebt}
            className="bg-white p-7 rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200"
          >
            <h2 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">
              {newDebtDirection === "lent" ? "Lend Money" : "Borrow Money"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Person Name
                </label>
                <input
                  type="text"
                  required
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  disabled={!!selectedPerson}
                  placeholder="e.g. Ahmed"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Wallet (Optional)
                </label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="">None (Historical debt)</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Note (Reason)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Dinner split"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:opacity-90 transition-all"
              >
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Repayment Modal */}
      {repayingDebt && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form
            onSubmit={handleRepay}
            className="bg-white p-7 rounded-2xl max-w-md w-full space-y-5 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200"
          >
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <ArrowRightLeft className="h-6 w-6 text-primary" />
                {repayingDebt.direction === "lent"
                  ? "Collect from"
                  : "Pay to"}{" "}
                {repayingDebt.personName}
              </h2>
              <p className="text-gray-500 mt-1 font-medium">
                Remaining to settle:{" "}
                <span className="font-bold text-gray-900">
                  {formatCurrency(repayingDebt.remainingAmount)}
                </span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount to{" "}
                  {repayingDebt.direction === "lent" ? "Collect" : "Pay"}
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  max={repayingDebt.remainingAmount}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Wallet (Optional)
                </label>
                <select
                  value={repayWalletId}
                  onChange={(e) => setRepayWalletId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-primary outline-none transition-all"
                >
                  <option value="">None (Don't update any wallet)</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatCurrency(w.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRepayingDebt(null)}
                className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-white rounded-xl font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.05)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
              >
                Confirm{" "}
                {repayingDebt.direction === "lent" ? "Collection" : "Payment"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
