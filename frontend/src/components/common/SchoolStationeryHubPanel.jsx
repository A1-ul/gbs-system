import React, { useState, useEffect, useCallback, useMemo } from "react";
import apiClient from "../../api/client/apiClient";
import { isDemoSandboxMode } from "../../utils/tokenStorage";

const CATEGORIES = [
  { id: "ALL", label: "All School Items" },
  { id: "TEXTBOOK", label: "Textbooks" },
  { id: "CARDIGAN", label: "Cardigans / Sweaters" },
  { id: "SOCKS", label: "School Socks" },
  { id: "SCHOOL_BAG", label: "School Bags" },
  { id: "EXERCISE_BOOK", label: "Exercise Books" },
  { id: "UNIFORM", label: "School Uniforms" },
  { id: "OTHER", label: "Other Stationery" }
];

const CATEGORY_BADGES = {
  TEXTBOOK: { label: "Textbook", icon: "📚", bg: "#dbeafe", color: "#1e40af" },
  CARDIGAN: { label: "Cardigan", icon: "🧥", bg: "#fef3c7", color: "#92400e" },
  SOCKS: { label: "School Socks", icon: "🧦", bg: "#ede9fe", color: "#5b21b6" },
  SCHOOL_BAG: { label: "School Bag", icon: "🎒", bg: "#dcfce7", color: "#166534" },
  EXERCISE_BOOK: { label: "Exercise Book", icon: "📓", bg: "#fae8ff", color: "#86198f" },
  UNIFORM: { label: "Uniform", icon: "👔", bg: "#e0f2fe", color: "#0369a1" },
  STATIONERY: { label: "Stationery", icon: "✏️", bg: "#f1f5f9", color: "#334155" },
  OTHER: { label: "School Item", icon: "📦", bg: "#f1f5f9", color: "#334155" }
};

const DEFAULT_SCHOOL_LEVELS = [
  "Creche",
  "Nursery 1",
  "Nursery 2",
  "KG 1",
  "KG 2",
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "JHS 1",
  "JHS 2",
  "JHS 3",
  "SHS 1",
  "SHS 2",
  "SHS 3",
  "TVET Year 1",
  "TVET Year 2",
  "TVET Year 3",
  "Level 100",
  "Level 200",
  "Level 300",
  "Level 400"
];

function resolveItemPriceForClass(item, className) {
  if (!item) return 0;
  const cleanClass = String(className || "").trim().toLowerCase();
  const pricing = item.classPricing && typeof item.classPricing === "object" ? item.classPricing : {};
  if (cleanClass && cleanClass !== "all" && cleanClass !== "all_classes") {
    for (const [cls, price] of Object.entries(pricing)) {
      if (String(cls).trim().toLowerCase() === cleanClass) {
        return Number(price) || 0;
      }
    }
  }
  return Number(item.unitPrice) || 0;
}

export default function SchoolStationeryHubPanel({
  currentUser = {},
  mode = "STAFF",
  isDark = false,
  onExpenseRecorded = null
}) {
  // Strictly evaluate portal mode first so Headmaster pricing tools NEVER leak onto Teacher, Secretary, Staff, HR, Clinic, Accountant, Student, or Parent dashboards
  const modeUpper = String(mode || currentUser?.role || "STAFF").trim().toUpperCase();
  const userRoleUpper = String(currentUser?.role || "").trim().toUpperCase();
  const isHeadmasterPortal = ["ADMIN", "SUPER_ADMIN", "HEADMASTER", "PRINCIPAL"].includes(modeUpper);
  const isHeadmaster =
    isHeadmasterPortal &&
    (isDemoSandboxMode() ||
      !userRoleUpper ||
      ["ADMIN", "SUPER_ADMIN", "HEADMASTER", "PRINCIPAL", "DEVELOPER"].includes(userRoleUpper));
  const isStaffPriceListOnly = [
    "TEACHER",
    "STAFF",
    "HR",
    "SECRETARY",
    "CLINIC",
    "CLINIC_DOCTOR",
    "CLINIC_NURSE"
  ].includes(modeUpper);
  const canRequestItem = ["STUDENT", "PARENT"].includes(modeUpper);
  const canOperateStore = isHeadmaster;
  const canViewAudit = isHeadmaster || modeUpper === "ACCOUNTANT";

  const [activeSubTab, setActiveSubTab] = useState(
    modeUpper === "ACCOUNTANT" ? "CATALOG" : "CATALOG"
  );
  const [items, setItems] = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [auditSummary, setAuditSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [classFilter, setClassFilter] = useState("ALL_CLASSES");
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState(null);

  // Headmaster Create Item Form State (supports Class/Level selection & Per-Class Pricing Matrix)
  const [newItem, setNewItem] = useState({
    name: "",
    category: "TEXTBOOK",
    targetClass: "ALL_CLASSES",
    unitPrice: "",
    stockQty: "50",
    reorderLevel: "10",
    unitLabel: "Piece",
    description: "",
    classPricing: {}
  });
  const [newClassPriceDraft, setNewClassPriceDraft] = useState({ className: "Primary 1", price: "" });

  // Headmaster Inline Edit Price / Class Pricing / Stock State
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    targetClass: "ALL_CLASSES",
    unitPrice: "",
    stockQty: "",
    description: "",
    classPricing: {}
  });
  const [editClassPriceDraft, setEditClassPriceDraft] = useState({ className: "Primary 1", price: "" });

  // Sales / Order Request Form State
  const [saleForm, setSaleForm] = useState({
    itemId: "",
    quantity: "1",
    buyerName: `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() || "",
    buyerRole: canOperateStore ? "STUDENT" : modeUpper,
    buyerClass: currentUser?.className || currentUser?.gradeLevel || "",
    notes: ""
  });

  // Stationery Expense (Auto-Synced to Accountant Expenses Ledger)
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    itemId: "",
    quantity: "0",
    amount: "",
    vendorName: "",
    paymentStatus: "PAID",
    notes: ""
  });

  const loadStationeryData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, txnRes, clsRes] = await Promise.all([
        apiClient.get("/stationery/items"),
        apiClient.get("/stationery/transactions"),
        apiClient.get("/academics/classes").catch(() => null)
      ]);
      const loadedItems = catRes.data?.data?.items || [];
      const backendClasses = catRes.data?.data?.availableClasses || [];
      const academicClasses = clsRes?.data?.data?.classes || clsRes?.data?.data || [];
      const mergedClasses = new Set();
      if (Array.isArray(academicClasses)) {
        academicClasses.forEach((c) => {
          const nm = typeof c === "string" ? c : c?.name || c?.className || c?.gradeLevel;
          if (nm && String(nm).trim()) mergedClasses.add(String(nm).trim());
        });
      }
      if (Array.isArray(backendClasses)) {
        backendClasses.forEach((nm) => {
          if (nm && String(nm).trim()) mergedClasses.add(String(nm).trim());
        });
      }
      DEFAULT_SCHOOL_LEVELS.forEach((lvl) => mergedClasses.add(lvl));
      setSchoolClasses(Array.from(mergedClasses));

      setItems(loadedItems);
      setTransactions(txnRes.data?.data?.transactions || []);

      if (loadedItems.length > 0 && !saleForm.itemId) {
        setSaleForm((prev) => ({ ...prev, itemId: prev.itemId || loadedItems[0].id }));
      }

      if (canViewAudit) {
        try {
          const auditRes = await apiClient.get("/stationery/audit");
          setAuditSummary(auditRes.data?.data || null);
        } catch { }
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text: err?.response?.data?.message || "Unable to load School Stationery catalog right now."
      });
    } finally {
      setLoading(false);
    }
  }, [canViewAudit]);

  useEffect(() => {
    loadStationeryData();
  }, [loadStationeryData]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (categoryFilter !== "ALL" && it.category !== categoryFilter) return false;
      if (classFilter && classFilter !== "ALL_CLASSES") {
        const cleanFilter = classFilter.trim().toLowerCase();
        const itemTarget = String(it.targetClass || "ALL_CLASSES").trim().toLowerCase();
        const hasClassTier = Object.keys(it.classPricing || {}).some(
          (k) => String(k).trim().toLowerCase() === cleanFilter
        );
        if (itemTarget !== "all_classes" && itemTarget !== cleanFilter && !hasClassTier) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const classKeys = Object.keys(it.classPricing || {}).join(" ");
        const hay = `${it.name || ""} ${it.itemCode || ""} ${it.category || ""} ${it.targetClass || ""} ${classKeys} ${it.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, categoryFilter, classFilter, searchTerm]);

  const selectedSaleItem = useMemo(
    () => items.find((it) => String(it.id) === String(saleForm.itemId)) || null,
    [items, saleForm.itemId]
  );

  const selectedSaleUnitPrice = useMemo(
    () => resolveItemPriceForClass(selectedSaleItem, saleForm.buyerClass),
    [selectedSaleItem, saleForm.buyerClass]
  );

  const handleAddNewClassPriceRow = () => {
    const cls = String(newClassPriceDraft.className || "").trim();
    const price = Number(newClassPriceDraft.price);
    if (!cls || !Number.isFinite(price) || price < 0) {
      setFeedback({ type: "error", text: "Select a class/level and enter a valid price first." });
      return;
    }
    setNewItem((prev) => ({
      ...prev,
      unitPrice: prev.unitPrice === "" ? String(price) : prev.unitPrice,
      classPricing: { ...(prev.classPricing || {}), [cls]: Math.round(price * 100) / 100 }
    }));
    setNewClassPriceDraft((prev) => ({ ...prev, price: "" }));
  };

  const handleRemoveNewClassPriceRow = (clsKey) => {
    setNewItem((prev) => {
      const next = { ...(prev.classPricing || {}) };
      delete next[clsKey];
      return { ...prev, classPricing: next };
    });
  };

  const handleAddEditClassPriceRow = () => {
    const cls = String(editClassPriceDraft.className || "").trim();
    const price = Number(editClassPriceDraft.price);
    if (!cls || !Number.isFinite(price) || price < 0) return;
    setEditForm((prev) => ({
      ...prev,
      classPricing: { ...(prev.classPricing || {}), [cls]: Math.round(price * 100) / 100 }
    }));
    setEditClassPriceDraft((prev) => ({ ...prev, price: "" }));
  };

  const handleRemoveEditClassPriceRow = (clsKey) => {
    setEditForm((prev) => {
      const next = { ...(prev.classPricing || {}) };
      delete next[clsKey];
      return { ...prev, classPricing: next };
    });
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!isHeadmaster) return;
    setFeedback(null);
    try {
      const classPrices = newItem.classPricing || {};
      const fallbackPrice = newItem.unitPrice !== ""
        ? Number(newItem.unitPrice)
        : Number(Object.values(classPrices)[0]);
      const res = await apiClient.post("/stationery/items", {
        ...newItem,
        targetClass: newItem.targetClass || "ALL_CLASSES",
        classPricing: classPrices,
        unitPrice: fallbackPrice,
        stockQty: parseInt(newItem.stockQty || "0", 10),
        reorderLevel: parseInt(newItem.reorderLevel || "10", 10)
      });
      setFeedback({
        type: "success",
        text: res.data?.message || `Published "${newItem.name}" at Headmaster official class price.`
      });
      setNewItem({
        name: "",
        category: "TEXTBOOK",
        targetClass: "ALL_CLASSES",
        unitPrice: "",
        stockQty: "50",
        reorderLevel: "10",
        unitLabel: "Piece",
        description: "",
        classPricing: {}
      });
      await loadStationeryData();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err?.response?.data?.message || "Only the Headmaster can publish or price stationery items."
      });
    }
  };

  const handleSaveItemEdit = async (itemId) => {
    if (!isHeadmaster) return;
    setFeedback(null);
    try {
      const res = await apiClient.put(`/stationery/items/${itemId}`, {
        name: editForm.name,
        targetClass: editForm.targetClass || "ALL_CLASSES",
        classPricing: editForm.classPricing || {},
        unitPrice: Number(editForm.unitPrice),
        stockQty: parseInt(editForm.stockQty || "0", 10),
        description: editForm.description
      });
      setEditingItemId(null);
      setFeedback({
        type: "success",
        text: res.data?.message || "Headmaster updated stationery class prices & stock cleanly."
      });
      await loadStationeryData();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err?.response?.data?.message || "Failed to update stationery price."
      });
    }
  };

  const handleSubmitSaleOrOrder = async (e) => {
    e.preventDefault();
    if (!saleForm.itemId) {
      setFeedback({ type: "error", text: "Please select a stationery item first." });
      return;
    }
    setFeedback(null);
    try {
      const endpoint = canOperateStore ? "/stationery/sales" : "/stationery/orders";
      const res = await apiClient.post(endpoint, {
        itemId: saleForm.itemId,
        quantity: Math.max(1, parseInt(saleForm.quantity || "1", 10)),
        buyerName: saleForm.buyerName,
        buyerRole: saleForm.buyerRole,
        buyerClass: saleForm.buyerClass,
        notes: saleForm.notes,
        orderOnly: !canOperateStore
      });
      setFeedback({
        type: "success",
        text: res.data?.message || "Transaction recorded cleanly."
      });
      setSaleForm((prev) => ({ ...prev, quantity: "1", notes: "" }));
      await loadStationeryData();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err?.response?.data?.message || "Could not process stationery sale or order."
      });
    }
  };

  const handleApproveOrder = async (txnId) => {
    setFeedback(null);
    try {
      const res = await apiClient.patch(`/stationery/orders/${txnId}/approve`, {});
      setFeedback({
        type: "success",
        text: res.data?.message || "Order approved and stock updated."
      });
      await loadStationeryData();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err?.response?.data?.message || "Unable to approve order."
      });
    }
  };

  const handleRecordExpense = async (e) => {
    e.preventDefault();
    setFeedback(null);
    try {
      const res = await apiClient.post("/stationery/expenses", {
        title: expenseForm.title,
        itemId: expenseForm.itemId || undefined,
        quantity: parseInt(expenseForm.quantity || "0", 10) || 0,
        amount: Number(expenseForm.amount),
        vendorName: expenseForm.vendorName,
        paymentStatus: expenseForm.paymentStatus,
        notes: expenseForm.notes
      });
      setFeedback({
        type: "success",
        text:
          res.data?.message ||
          "Stationery expense recorded and automatically synced to Accountant Expenses Ledger."
      });
      setExpenseForm({
        title: "",
        itemId: "",
        quantity: "0",
        amount: "",
        vendorName: "",
        paymentStatus: "PAID",
        notes: ""
      });
      await loadStationeryData();
      if (typeof onExpenseRecorded === "function") {
        try {
          await onExpenseRecorded(res.data?.data);
        } catch { }
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text: err?.response?.data?.message || "Failed to log stationery expense."
      });
    }
  };

  const cardBg = isDark ? "rgba(15, 23, 42, 0.9)" : "#ffffff";
  const cardBorder = isDark ? "1px solid rgba(212, 175, 55, 0.28)" : "1px solid rgba(13, 34, 71, 0.14)";
  const textPrimary = isDark ? "#f8fafc" : "#081833";
  const textMuted = isDark ? "#94a3b8" : "#475569";
  const surfaceBg = isDark ? "rgba(2, 6, 23, 0.72)" : "#f8fafc";
  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
    background: isDark ? "#0f172a" : "#ffffff",
    color: textPrimary,
    fontSize: "0.86rem",
    fontWeight: 600,
    boxSizing: "border-box"
  };

  return (
    <div data-testid="school-stationery-hub-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #081833 0%, #0d2247 65%, #1e293b 100%)",
          border: "1.5px solid #d4af37",
          borderRadius: "14px",
          padding: "18px 20px",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        <div>
          <span
            style={{
              display: "inline-block",
              background: "rgba(212, 175, 55, 0.2)",
              color: "#f6dd84",
              border: "1px solid #d4af37",
              padding: "2px 10px",
              borderRadius: "999px",
              fontSize: "0.7rem",
              fontWeight: 800,
              letterSpacing: "0.5px",
              marginBottom: "6px"
            }}
          >
            OFFICIAL SCHOOL BOOKSHOP &amp; STATIONERY STORE
          </span>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 900, color: "#f6dd84" }}>
            🎒 {isStaffPriceListOnly ? "Official School Stationery Price List (View Only)" : "School Stationery, Uniforms & Textbooks Store"}
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#e2e8f0" }}>
            {isHeadmaster
              ? "Headmaster Authority Active: You hold exclusive authority to add stationery items, set & edit official prices, and manage store stock across every portal."
              : isStaffPriceListOnly
                ? "Read-Only Stationery Price List: Staff may only view the official prices listed by the Headmaster. Adding or editing prices is strictly restricted to the Headmaster."
                : modeUpper === "ACCOUNTANT"
                  ? "Read-Only Price Catalog & Financial Audit: Official stationery prices are set strictly by the Headmaster; view synced store revenue & expenses in the Audit tab."
                  : "All prices below are officially fixed by the Institution Headmaster and cannot be edited by other users."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveSubTab("CATALOG")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: activeSubTab === "CATALOG" ? "2px solid #f6dd84" : "1px solid rgba(255,255,255,0.22)",
              background: activeSubTab === "CATALOG" ? "#cfa028" : "rgba(255,255,255,0.08)",
              color: activeSubTab === "CATALOG" ? "#081833" : "#f8fafc",
              fontWeight: 800,
              fontSize: "0.82rem",
              cursor: "pointer"
            }}
          >
            📚 Listed Prices ({items.length})
          </button>

          {(canOperateStore || canRequestItem) && (
            <button
              type="button"
              onClick={() => setActiveSubTab("SALES_ORDERS")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: activeSubTab === "SALES_ORDERS" ? "2px solid #f6dd84" : "1px solid rgba(255,255,255,0.22)",
                background: activeSubTab === "SALES_ORDERS" ? "#cfa028" : "rgba(255,255,255,0.08)",
                color: activeSubTab === "SALES_ORDERS" ? "#081833" : "#f8fafc",
                fontWeight: 800,
                fontSize: "0.82rem",
                cursor: "pointer"
              }}
            >
              🛒 {canOperateStore ? "Record Sale / Orders" : "Request Item"} ({transactions.length})
            </button>
          )}

          {canOperateStore && (
            <button
              type="button"
              onClick={() => setActiveSubTab("EXPENSES")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: activeSubTab === "EXPENSES" ? "2px solid #f6dd84" : "1px solid rgba(255,255,255,0.22)",
                background: activeSubTab === "EXPENSES" ? "#cfa028" : "rgba(255,255,255,0.08)",
                color: activeSubTab === "EXPENSES" ? "#081833" : "#f8fafc",
                fontWeight: 800,
                fontSize: "0.82rem",
                cursor: "pointer"
              }}
            >
              🧾 Stationery Expenses (→ Accountant)
            </button>
          )}

          {canViewAudit && (
            <button
              type="button"
              onClick={() => setActiveSubTab("AUDIT")}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: activeSubTab === "AUDIT" ? "2px solid #f6dd84" : "1px solid rgba(255,255,255,0.22)",
                background: activeSubTab === "AUDIT" ? "#cfa028" : "rgba(255,255,255,0.08)",
                color: activeSubTab === "AUDIT" ? "#081833" : "#f8fafc",
                fontWeight: 800,
                fontSize: "0.82rem",
                cursor: "pointer"
              }}
            >
              📊 Accountant Audit
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            fontSize: "0.86rem",
            fontWeight: 700,
            background: feedback.type === "success" ? "rgba(16, 185, 129, 0.14)" : "rgba(239, 68, 68, 0.14)",
            border: feedback.type === "success" ? "1.5px solid #10b981" : "1.5px solid #ef4444",
            color: feedback.type === "success" ? (isDark ? "#6ee7b7" : "#065f46") : (isDark ? "#fca5a5" : "#991b1b")
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* TAB 1: SYSTEM-WIDE STATIONERY CATALOG (+ HEADMASTER-ONLY PRICING DESK) */}
      {activeSubTab === "CATALOG" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Headmaster-Only Add Item & Price Authority Box */}
          {isHeadmaster ? (
            <form
              onSubmit={handleCreateItem}
              data-testid="headmaster-stationery-price-form"
              style={{
                background: cardBg,
                border: "2px solid #d4af37",
                borderRadius: "12px",
                padding: "16px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <strong style={{ color: isDark ? "#f6dd84" : "#081833", fontSize: "1rem" }}>
                  👑 Headmaster Price Authority — Publish School Item &amp; Set Official Price
                </strong>
                <span style={{ fontSize: "0.74rem", fontWeight: 800, color: "#065f46", background: "#d1fae5", padding: "3px 10px", borderRadius: "999px" }}>
                  Exclusive Headmaster Control
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GBS Striped Cardigan"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Category *</label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    style={inputStyle}
                  >
                    {CATEGORIES.filter((c) => c.id !== "ALL").map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Class / Level Scope *</label>
                  <select
                    value={newItem.targetClass}
                    onChange={(e) => setNewItem({ ...newItem, targetClass: e.target.value })}
                    style={inputStyle}
                    data-testid="stationery-target-class-select"
                  >
                    <option value="ALL_CLASSES">🌐 All Classes (or Multi-Level Matrix Below)</option>
                    {schoolClasses.map((cls) => (
                      <option key={cls} value={cls}>🎓 {cls} Only</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>
                    {newItem.targetClass !== "ALL_CLASSES" ? `${newItem.targetClass} Price (GH₵) *` : "Base / Default Price (GH₵) *"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required={Object.keys(newItem.classPricing || {}).length === 0}
                    placeholder="e.g. 95.00"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Opening Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.stockQty}
                    onChange={(e) => setNewItem({ ...newItem, stockQty: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Unit Label</label>
                  <input
                    type="text"
                    placeholder="Piece / Pair / Set / Pack"
                    value={newItem.unitLabel}
                    onChange={(e) => setNewItem({ ...newItem, unitLabel: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "none",
                      background: "linear-gradient(135deg, #081833, #0d2247)",
                      color: "#f6dd84",
                      fontWeight: 800,
                      fontSize: "0.86rem",
                      cursor: "pointer"
                    }}
                  >
                    + Set Class Price &amp; Publish Item
                  </button>
                </div>
              </div>

              {/* Per-Class / Per-Level Price Matrix Builder */}
              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: `1px dashed ${isDark ? "rgba(212,175,55,0.35)" : "#cbd5e1"}`
                }}
              >
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: isDark ? "#f6dd84" : "#081833", marginBottom: "6px" }}>
                  🎓 Set Different Prices by Class / Level (Optional — overrides base price for each class selected)
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <select
                    value={newClassPriceDraft.className}
                    onChange={(e) => setNewClassPriceDraft((p) => ({ ...p, className: e.target.value }))}
                    style={{ ...inputStyle, width: "auto", minWidth: "160px" }}
                  >
                    {schoolClasses.map((cls) => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Class Price (GH₵)"
                    value={newClassPriceDraft.price}
                    onChange={(e) => setNewClassPriceDraft((p) => ({ ...p, price: e.target.value }))}
                    style={{ ...inputStyle, width: "160px" }}
                  />
                  <button
                    type="button"
                    onClick={handleAddNewClassPriceRow}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "8px",
                      border: "1px solid #d4af37",
                      background: "rgba(212, 175, 55, 0.16)",
                      color: isDark ? "#f6dd84" : "#081833",
                      fontWeight: 800,
                      fontSize: "0.8rem",
                      cursor: "pointer"
                    }}
                  >
                    + Add Class Price
                  </button>
                </div>
                {Object.keys(newItem.classPricing || {}).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                    {Object.entries(newItem.classPricing).map(([cls, pr]) => (
                      <span
                        key={cls}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: isDark ? "rgba(56, 189, 248, 0.15)" : "#eff6ff",
                          border: "1px solid rgba(56, 189, 248, 0.45)",
                          color: isDark ? "#bae6fd" : "#1e3a8a",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: 800
                        }}
                      >
                        🎓 {cls}: GHS {Number(pr).toFixed(2)}
                        <button
                          type="button"
                          onClick={() => handleRemoveNewClassPriceRow(cls)}
                          style={{ border: "none", background: "transparent", color: "#ef4444", fontWeight: 900, cursor: "pointer", padding: 0 }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </form>
          ) : (
            <div
              data-testid="stationery-readonly-price-notice"
              style={{
                background: surfaceBg,
                border: cardBorder,
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "0.82rem",
                color: textMuted,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px"
              }}
            >
              <span>🔒 <strong>Official Stationery Price List (Read-Only):</strong> Only the Headmaster has access to create stationery items and edit prices. You can view the listed prices by category and class level below.</span>
            </div>
          )}

          {/* Filter & Search Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: categoryFilter === cat.id ? "1.5px solid #081833" : "1px solid #cbd5e1",
                    background: categoryFilter === cat.id ? "#081833" : surfaceBg,
                    color: categoryFilter === cat.id ? "#f6dd84" : textPrimary,
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                style={{ ...inputStyle, width: "auto", minWidth: "185px" }}
                data-testid="stationery-class-filter"
              >
                <option value="ALL_CLASSES">🎓 All Classes / Levels</option>
                {schoolClasses.map((cls) => (
                  <option key={cls} value={cls}>View Prices for: {cls}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Search textbook, cardigan, class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...inputStyle, maxWidth: "240px" }}
              />
            </div>
          </div>

          {/* Items Grid */}
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: textMuted }}>Loading School Stationery catalog...</div>
          ) : filteredItems.length === 0 ? (
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "12px", padding: "28px", textAlign: "center", color: textMuted }}>
              <div style={{ fontSize: "2rem", marginBottom: "6px" }}>🎒</div>
              <strong>No stationery items published yet for this institution.</strong>
              <p style={{ margin: "6px 0 0", fontSize: "0.82rem" }}>
                {isHeadmaster
                  ? "Use the Headmaster Price Authority form above to add Textbooks, Cardigans, Socks, School Bags, or Uniforms."
                  : "Once your Headmaster publishes school stationery items and official prices, they will appear immediately across every dashboard."}
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(265px, 1fr))", gap: "14px" }}>
              {filteredItems.map((item) => {
                const badge = CATEGORY_BADGES[item.category] || CATEGORY_BADGES.OTHER;
                const isLow = Number(item.stockQty || 0) <= Number(item.reorderLevel || 10);
                const isEditing = editingItemId === item.id;
                return (
                  <div
                    key={item.id}
                    style={{
                      background: cardBg,
                      border: cardBorder,
                      borderRadius: "12px",
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "10px",
                      boxShadow: "0 2px 10px rgba(8, 24, 51, 0.06)"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ background: badge.bg, color: badge.color, fontSize: "0.72rem", fontWeight: 800, padding: "3px 9px", borderRadius: "999px" }}>
                          {badge.icon} {badge.label}
                        </span>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: isLow ? "#dc2626" : "#16a34a" }}>
                          {item.stockQty} {item.unitLabel || "Piece"}(s) {isLow ? "• Low Stock" : "In Stock"}
                        </span>
                      </div>

                      {isEditing && isHeadmaster ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            style={inputStyle}
                            aria-label="Edit item name"
                          />
                          <select
                            value={editForm.targetClass || "ALL_CLASSES"}
                            onChange={(e) => setEditForm({ ...editForm, targetClass: e.target.value })}
                            style={inputStyle}
                            aria-label="Edit target class"
                          >
                            <option value="ALL_CLASSES">🌐 All Classes / Multi-Level</option>
                            {schoolClasses.map((cls) => (
                              <option key={cls} value={cls}>🎓 {cls} Only</option>
                            ))}
                          </select>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.unitPrice}
                              onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
                              style={inputStyle}
                              aria-label="Edit official price"
                            />
                            <input
                              type="number"
                              value={editForm.stockQty}
                              onChange={(e) => setEditForm({ ...editForm, stockQty: e.target.value })}
                              style={inputStyle}
                              aria-label="Edit stock quantity"
                            />
                          </div>
                          {/* Inline Per-Class Price Editor */}
                          <div style={{ background: surfaceBg, borderRadius: "8px", padding: "8px", border: cardBorder }}>
                            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: textMuted, marginBottom: "4px" }}>
                              Per-Class Prices ({Object.keys(editForm.classPricing || {}).length})
                            </div>
                            <div style={{ display: "flex", gap: "4px", marginBottom: "6px" }}>
                              <select
                                value={editClassPriceDraft.className}
                                onChange={(e) => setEditClassPriceDraft((p) => ({ ...p, className: e.target.value }))}
                                style={{ ...inputStyle, padding: "5px 6px", fontSize: "0.75rem", flex: 1 }}
                              >
                                {schoolClasses.map((cls) => (
                                  <option key={cls} value={cls}>{cls}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Price"
                                value={editClassPriceDraft.price}
                                onChange={(e) => setEditClassPriceDraft((p) => ({ ...p, price: e.target.value }))}
                                style={{ ...inputStyle, padding: "5px 6px", fontSize: "0.75rem", width: "78px" }}
                              />
                              <button
                                type="button"
                                onClick={handleAddEditClassPriceRow}
                                style={{ padding: "5px 8px", borderRadius: "6px", border: "none", background: "#0284c7", color: "#fff", fontWeight: 800, fontSize: "0.72rem", cursor: "pointer" }}
                              >
                                +
                              </button>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {Object.entries(editForm.classPricing || {}).map(([cls, pr]) => (
                                <span
                                  key={cls}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: isDark ? "rgba(56,189,248,0.16)" : "#e0f2fe",
                                    color: isDark ? "#bae6fd" : "#0369a1",
                                    padding: "2px 7px",
                                    borderRadius: "999px",
                                    fontSize: "0.7rem",
                                    fontWeight: 700
                                  }}
                                >
                                  {cls}: {Number(pr).toFixed(2)}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveEditClassPriceRow(cls)}
                                    style={{ border: "none", background: "transparent", color: "#ef4444", fontWeight: 900, cursor: "pointer", padding: 0 }}
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                            <button
                              type="button"
                              onClick={() => handleSaveItemEdit(item.id)}
                              style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "none", background: "#16a34a", color: "#fff", fontWeight: 800, fontSize: "0.78rem", cursor: "pointer" }}
                            >
                              Save Class Prices
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: surfaceBg, color: textPrimary, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontWeight: 800, fontSize: "0.96rem", color: textPrimary, marginBottom: "4px" }}>
                            {item.name}
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "6px" }}>
                            <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: "999px", background: isDark ? "rgba(56,189,248,0.15)" : "#e0f2fe", color: isDark ? "#7dd3fc" : "#0369a1" }}>
                              🎓 {item.targetClass && item.targetClass !== "ALL_CLASSES" ? item.targetClass : (Object.keys(item.classPricing || {}).length > 0 ? `Class-Level Tariff (${Object.keys(item.classPricing).length} levels)` : "All Classes")}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.72rem", color: textMuted, marginBottom: "8px" }}>
                            Code: <code>{item.itemCode}</code> {item.description ? `• ${item.description}` : ""}
                          </div>
                          {Object.keys(item.classPricing || {}).length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                              {Object.entries(item.classPricing).map(([cls, pr]) => {
                                const isActiveClass = classFilter !== "ALL_CLASSES" && cls.toLowerCase() === classFilter.toLowerCase();
                                return (
                                  <span
                                    key={cls}
                                    style={{
                                      fontSize: "0.69rem",
                                      fontWeight: isActiveClass ? 900 : 700,
                                      padding: "2px 7px",
                                      borderRadius: "6px",
                                      background: isActiveClass ? "#16a34a" : (isDark ? "rgba(15,23,42,0.85)" : "#f1f5f9"),
                                      color: isActiveClass ? "#ffffff" : textPrimary,
                                      border: isActiveClass ? "1px solid #4ade80" : cardBorder
                                    }}
                                  >
                                    {cls}: {item.currency || "GHS"} {Number(pr).toFixed(2)}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: "8px", borderTop: `1px solid ${isDark ? "rgba(148,163,184,0.18)" : "#e2e8f0"}` }}>
                            <strong style={{ fontSize: "1.25rem", color: isDark ? "#f6dd84" : "#081833" }}>
                              {item.currency || "GHS"} {resolveItemPriceForClass(item, classFilter).toFixed(2)}
                            </strong>
                            <span style={{ fontSize: "0.68rem", color: "#16a34a", fontWeight: 700 }}>
                              🔒 {classFilter !== "ALL_CLASSES" ? `${classFilter} Tariff` : "Headmaster Fixed"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {!isEditing && (canOperateStore || canRequestItem || isHeadmaster) && (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {(canOperateStore || canRequestItem) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSaleForm((prev) => ({
                                ...prev,
                                itemId: item.id,
                                quantity: "1",
                                buyerClass: classFilter !== "ALL_CLASSES"
                                  ? classFilter
                                  : (item.targetClass && item.targetClass !== "ALL_CLASSES" ? item.targetClass : prev.buyerClass)
                              }));
                              setActiveSubTab("SALES_ORDERS");
                            }}
                            style={{
                              flex: 1,
                              padding: "7px 10px",
                              borderRadius: "8px",
                              border: "none",
                              background: "#081833",
                              color: "#f6dd84",
                              fontWeight: 800,
                              fontSize: "0.78rem",
                              cursor: "pointer"
                            }}
                          >
                            {canOperateStore ? "Record Sale" : "Order Item"}
                          </button>
                        )}
                        {isHeadmaster && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditForm({
                                name: item.name,
                                targetClass: item.targetClass || "ALL_CLASSES",
                                unitPrice: String(item.unitPrice),
                                stockQty: String(item.stockQty),
                                description: item.description || "",
                                classPricing: { ...(item.classPricing || {}) }
                              });
                            }}
                            style={{
                              padding: "7px 10px",
                              borderRadius: "8px",
                              border: "1px solid #d4af37",
                              background: "rgba(212, 175, 55, 0.14)",
                              color: isDark ? "#f6dd84" : "#781d2b",
                              fontWeight: 800,
                              fontSize: "0.76rem",
                              cursor: "pointer"
                            }}
                          >
                            Edit Class Price
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECORD SALES OR SUBMIT ITEM ORDER REQUEST */}
      {activeSubTab === "SALES_ORDERS" && (canOperateStore || canRequestItem) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <form
            onSubmit={handleSubmitSaleOrOrder}
            style={{ background: cardBg, border: cardBorder, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <strong style={{ color: textPrimary, fontSize: "1rem" }}>
              {canOperateStore ? "🛒 Record School Stationery Sale" : "🛍️ Request School Stationery Item"}
            </strong>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Select Item *</label>
              <select
                value={saleForm.itemId}
                onChange={(e) => setSaleForm({ ...saleForm, itemId: e.target.value })}
                style={inputStyle}
                required
              >
                <option value="">-- Choose Stationery Item --</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} — {it.currency || "GHS"} {Number(it.unitPrice || 0).toFixed(2)} ({it.stockQty} left)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm({ ...saleForm, quantity: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>
                  Headmaster Locked Total {saleForm.buyerClass ? `(${saleForm.buyerClass})` : ""}
                </label>
                <div style={{ ...inputStyle, background: surfaceBg, color: "#16a34a", fontWeight: 900 }}>
                  {selectedSaleItem
                    ? `${selectedSaleItem.currency || "GHS"} ${(selectedSaleUnitPrice * Math.max(1, parseInt(saleForm.quantity || "1", 10))).toFixed(2)}`
                    : "GHS 0.00"}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Student / Buyer Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={saleForm.buyerName}
                  onChange={(e) => setSaleForm({ ...saleForm, buyerName: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Class / Level (Determines Tariff)</label>
                <select
                  value={saleForm.buyerClass}
                  onChange={(e) => setSaleForm({ ...saleForm, buyerClass: e.target.value })}
                  style={inputStyle}
                  data-testid="stationery-sale-class-select"
                >
                  <option value="">-- General / Default Price --</option>
                  {schoolClasses.map((cls) => {
                    const clsPrice = selectedSaleItem ? resolveItemPriceForClass(selectedSaleItem, cls) : null;
                    const hasExplicit = selectedSaleItem?.classPricing && Object.keys(selectedSaleItem.classPricing).some((k) => k.toLowerCase() === cls.toLowerCase());
                    return (
                      <option key={cls} value={cls}>
                        {cls}{hasExplicit && clsPrice !== null ? ` — ${selectedSaleItem.currency || "GHS"} ${clsPrice.toFixed(2)}` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: "6px",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #081833, #0d2247)",
                color: "#f6dd84",
                fontWeight: 800,
                fontSize: "0.88rem",
                cursor: "pointer"
              }}
            >
              {canOperateStore ? "Record Official Sale & Deduct Stock" : "Submit Item Order Request"}
            </button>
          </form>

          {/* Recent Sales & Orders List */}
          <div style={{ background: cardBg, border: cardBorder, borderRadius: "12px", padding: "16px", overflowX: "auto" }}>
            <strong style={{ color: textPrimary, fontSize: "1rem", display: "block", marginBottom: "10px" }}>
              Recent Sales &amp; Item Order Requests
            </strong>
            {transactions.length === 0 ? (
              <div style={{ padding: "18px", textAlign: "center", color: textMuted, fontSize: "0.84rem" }}>
                No stationery transactions recorded yet.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", color: textMuted }}>
                    <th style={{ padding: "6px" }}>Ref</th>
                    <th style={{ padding: "6px" }}>Item</th>
                    <th style={{ padding: "6px" }}>Type</th>
                    <th style={{ padding: "6px" }}>Total</th>
                    <th style={{ padding: "6px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 15).map((t) => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${isDark ? "rgba(148,163,184,0.14)" : "#f1f5f9"}` }}>
                      <td style={{ padding: "6px", fontWeight: 700, color: textPrimary }}>{t.referenceNumber}</td>
                      <td style={{ padding: "6px", color: textPrimary }}>
                        {t.itemName} (×{t.quantity})
                        <div style={{ fontSize: "0.7rem", color: textMuted }}>{t.buyerName || t.vendorName || t.recordedByName}</div>
                      </td>
                      <td style={{ padding: "6px" }}>
                        <span style={{ fontWeight: 800, fontSize: "0.7rem", color: t.transactionType === "SALE" ? "#16a34a" : t.transactionType === "ORDER_REQUEST" ? "#d97706" : "#781d2b" }}>
                          {t.transactionType}
                        </span>
                      </td>
                      <td style={{ padding: "6px", fontWeight: 800, color: textPrimary }}>
                        {t.currency || "GHS"} {Number(t.totalAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "6px" }}>
                        {canOperateStore && t.transactionType === "ORDER_REQUEST" && t.paymentStatus === "PENDING_APPROVAL" ? (
                          <button
                            type="button"
                            onClick={() => handleApproveOrder(t.id)}
                            style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: "#16a34a", color: "#fff", fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
                          >
                            Fulfill Order
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.72rem", color: textMuted }}>{t.paymentStatus}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: STATIONERY EXPENSES -> AUTO-SYNCED TO ACCOUNTANT DASHBOARD */}
      {activeSubTab === "EXPENSES" && canOperateStore && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
          <form
            onSubmit={handleRecordExpense}
            data-testid="stationery-expense-form"
            style={{ background: cardBg, border: "1.5px solid #781d2b", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <strong style={{ color: isDark ? "#fca5a5" : "#781d2b", fontSize: "1rem" }}>
              🧾 Record Stationery Restock / Store Expense
            </strong>
            <div style={{ fontSize: "0.78rem", color: textMuted }}>
              Every expense submitted here posts automatically to the <strong>Accountant Dashboard (Expenses Ledger • STATIONERY_SUPPLIES)</strong> for financial accounting &amp; auditing.
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Expense Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Bulk Cardigan & Socks Restock Batch"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Link Catalog Item to Restock (Optional)</label>
                <select
                  value={expenseForm.itemId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, itemId: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">-- General Store Expense --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>{it.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Restock Units Added</label>
                <input
                  type="number"
                  min="0"
                  value={expenseForm.quantity}
                  onChange={(e) => setExpenseForm({ ...expenseForm, quantity: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Total Expense Amount (GH₵) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="e.g. 1250.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Supplier / Vendor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Accra Academic Press"
                  value={expenseForm.vendorName}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendorName: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: textMuted, fontWeight: 700, marginBottom: "4px" }}>Audit Notes</label>
              <input
                type="text"
                placeholder="Invoice reference or delivery receipt note"
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                style={inputStyle}
              />
            </div>

            <button
              type="submit"
              style={{
                marginTop: "4px",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, #781d2b, #991b1b)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "0.88rem",
                cursor: "pointer"
              }}
            >
              Record Expense &amp; Sync to Accountant Ledger
            </button>
          </form>

          <div style={{ background: cardBg, border: cardBorder, borderRadius: "12px", padding: "16px", overflowX: "auto" }}>
            <strong style={{ color: textPrimary, fontSize: "1rem", display: "block", marginBottom: "10px" }}>
              Synced Stationery Expenses History
            </strong>
            {transactions.filter((t) => t.transactionType === "RESTOCK_EXPENSE" || t.transactionType === "OPERATING_EXPENSE").length === 0 ? (
              <div style={{ padding: "18px", textAlign: "center", color: textMuted, fontSize: "0.84rem" }}>
                No stationery expenses logged yet.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", color: textMuted }}>
                    <th style={{ padding: "6px" }}>Expense #</th>
                    <th style={{ padding: "6px" }}>Title / Supplier</th>
                    <th style={{ padding: "6px" }}>Amount</th>
                    <th style={{ padding: "6px" }}>Accountant Link</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter((t) => t.transactionType === "RESTOCK_EXPENSE" || t.transactionType === "OPERATING_EXPENSE")
                    .slice(0, 15)
                    .map((t) => (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${isDark ? "rgba(148,163,184,0.14)" : "#f1f5f9"}` }}>
                        <td style={{ padding: "6px", fontWeight: 700, color: textPrimary }}>{t.linkedExpenseNumber || t.referenceNumber}</td>
                        <td style={{ padding: "6px", color: textPrimary }}>
                          {t.itemName}
                          <div style={{ fontSize: "0.7rem", color: textMuted }}>{t.vendorName || "Supplier"}</div>
                        </td>
                        <td style={{ padding: "6px", fontWeight: 800, color: "#dc2626" }}>
                          {t.currency || "GHS"} {Number(t.totalAmount || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: "6px", color: "#16a34a", fontWeight: 700 }}>
                          ✓ Synced (STATIONERY_SUPPLIES)
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ACCOUNTANT & HEADMASTER STATIONERY AUDIT SUMMARY */}
      {activeSubTab === "AUDIT" && canViewAudit && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "0.72rem", color: textMuted, fontWeight: 700 }}>TOTAL SALES REVENUE</div>
              <strong style={{ fontSize: "1.3rem", color: "#16a34a" }}>
                GHS {Number(auditSummary?.totalSalesRevenue || 0).toLocaleString()}
              </strong>
            </div>
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "0.72rem", color: textMuted, fontWeight: 700 }}>SYNCED STATIONERY EXPENSES</div>
              <strong style={{ fontSize: "1.3rem", color: "#dc2626" }}>
                GHS {Number(auditSummary?.totalStationeryExpenses || 0).toLocaleString()}
              </strong>
            </div>
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "0.72rem", color: textMuted, fontWeight: 700 }}>NET STATIONERY POSITION</div>
              <strong style={{ fontSize: "1.3rem", color: isDark ? "#f6dd84" : "#081833" }}>
                GHS {Number(auditSummary?.netStationeryBalance || 0).toLocaleString()}
              </strong>
            </div>
            <div style={{ background: cardBg, border: cardBorder, borderRadius: "12px", padding: "14px" }}>
              <div style={{ fontSize: "0.72rem", color: textMuted, fontWeight: 700 }}>ACCOUNTANT LEDGER ENTRIES</div>
              <strong style={{ fontSize: "1.3rem", color: "#0284c7" }}>
                {auditSummary?.linkedAccountantExpensesCount || 0} Synced
              </strong>
            </div>
          </div>

          <div style={{ background: cardBg, border: cardBorder, borderRadius: "12px", padding: "16px", overflowX: "auto" }}>
            <strong style={{ color: textPrimary, fontSize: "0.98rem", display: "block", marginBottom: "8px" }}>
              Accountant Audit Feed — Stationery Supplies Expenses (<code>finance/expenses?category=STATIONERY_SUPPLIES</code>)
            </strong>
            {(auditSummary?.linkedFinanceExpenses || []).length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: textMuted, fontSize: "0.84rem" }}>
                No stationery expenses posted to Accountant Expenses Ledger yet.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", color: textMuted }}>
                    <th style={{ padding: "6px" }}>Expense Number</th>
                    <th style={{ padding: "6px" }}>Title</th>
                    <th style={{ padding: "6px" }}>Vendor</th>
                    <th style={{ padding: "6px" }}>Amount</th>
                    <th style={{ padding: "6px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditSummary?.linkedFinanceExpenses || []).map((exp) => (
                    <tr key={exp.id || exp.expenseNumber} style={{ borderBottom: `1px solid ${isDark ? "rgba(148,163,184,0.14)" : "#f1f5f9"}` }}>
                      <td style={{ padding: "6px", fontWeight: 800, color: textPrimary }}>{exp.expenseNumber}</td>
                      <td style={{ padding: "6px", color: textPrimary }}>{exp.title}</td>
                      <td style={{ padding: "6px", color: textMuted }}>{exp.vendorName || "Supplier"}</td>
                      <td style={{ padding: "6px", fontWeight: 800, color: "#dc2626" }}>
                        {exp.currency || "GHS"} {Number(exp.amount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: "6px", fontWeight: 800, color: "#16a34a" }}>{exp.paymentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
