// PaymentComponent.jsx
import React, { useState, useMemo } from 'react';
import { ChevronDown, Search, Filter, MoreHorizontal, ChevronUp } from 'lucide-react';
import './Paymentclient.css';

const PaymentComponent = () => {
  const [dateRange, setDateRange] = useState('22 May, 2025 - 21 Jun, 2025');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showOptions, setShowOptions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const transactions = [
    { id: 1, paymentDate: '20 Jun 2025, 19:47', refNumber: '12633', client: 'Walk-In', teamMember: 'Allora Spa Dubai', type: 'Sale', method: 'Card', amount: 'AED 250.00' },
    { id: 2, paymentDate: '20 Jun 2025, 19:45', refNumber: '12632', client: 'Samar', teamMember: 'Allora Spa Dubai', type: 'Sale', method: 'Card', amount: 'AED 400.00' },
    { id: 3, paymentDate: '20 Jun 2025, 19:42', refNumber: '12631', client: 'Vejay', teamMember: 'Allora Spa Dubai', type: 'Sale', method: 'Card', amount: 'AED 200.00' },
    { id: 4, paymentDate: '20 Jun 2025, 19:37', refNumber: '12630', client: 'Walk-In', teamMember: 'Allora Spa Dubai', type: 'Sale', method: 'Card', amount: 'AED 300.00' }
  ];

  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter((t) =>
      t.refNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.client.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortConfig.key) {
      filtered = filtered.sort((a, b) => {
        const valA = a[sortConfig.key].toLowerCase?.() || a[sortConfig.key];
        const valB = b[sortConfig.key].toLowerCase?.() || b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [searchTerm, sortConfig]);

  const totalAmount = useMemo(() => {
    const total = filteredTransactions.reduce((sum, t) => {
      const num = parseFloat(t.amount.replace(/[^\d.-]/g, ''));
      return sum + num;
    }, 0);
    return `AED ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }, [filteredTransactions]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <ChevronUp className="pay-sort-icon" /> : <ChevronDown className="pay-sort-icon" />;
    }
    return <ChevronDown className="pay-sort-icon pay-sort-icon-inactive" />;
  };

  return (
    <div className="pay-container">
      <div className="pay-header">
        <div className="pay-header-top">
          <div className="pay-header-info">
            <h1 className="pay-title">Payment transactions</h1>
            <p className="pay-description">View, filter and export the history of your payments.</p>
          </div>
          <div className="pay-options">
            <button onClick={() => setShowOptions(!showOptions)} className="pay-options-btn">
              Options
              <ChevronDown className="pay-icon" />
            </button>
            {showOptions && (
              <div className="pay-options-dropdown">
                <button className="pay-dropdown-item">Export CSV</button>
                <button className="pay-dropdown-item">Export PDF</button>
                <button className="pay-dropdown-item">Print</button>
              </div>
            )}
          </div>
        </div>

        <div className="pay-controls">
          <div className="pay-search">
            <Search className="pay-search-icon" />
            <input
              type="text"
              className="pay-search-input"
              placeholder="Search by Sale or Client"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="pay-filters">
            <button className="pay-date-btn">
              {dateRange}
              <ChevronDown className="pay-icon" />
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="pay-filter-btn">
              Filters
              <Filter className="pay-icon" />
            </button>
          </div>
        </div>
      </div>

      <div className="pay-table-container">
        <div className="pay-desktop-table">
          <table className="pay-table">
            <thead>
              <tr>
                {['paymentDate', 'refNumber', 'client', 'teamMember', 'type', 'method', 'amount'].map((key) => (
                  <th key={key} className="pay-th">
                    <button onClick={() => handleSort(key)} className="pay-sort-btn">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                      {getSortIcon(key)}
                    </button>
                  </th>
                ))}
                <th className="pay-th pay-th-action"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="pay-total-row">
                <td className="pay-td">Total</td>
                <td className="pay-td" colSpan="5"></td>
                <td className="pay-td pay-td-bold">{totalAmount}</td>
                <td className="pay-td"></td>
              </tr>
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="pay-row">
                  <td className="pay-td">{t.paymentDate}</td>
                  <td className="pay-td"><span className="pay-link">{t.refNumber}</span></td>
                  <td className="pay-td"><span className="pay-link">{t.client}</span></td>
                  <td className="pay-td">{t.teamMember}</td>
                  <td className="pay-td">{t.type}</td>
                  <td className="pay-td">{t.method}</td>
                  <td className="pay-td pay-td-bold">{t.amount}</td>
                  <td className="pay-td pay-th-action">
                    <button className="pay-action-btn"><MoreHorizontal className="pay-icon" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pay-mobile-cards">
          <div className="pay-total-card">
            <span className="pay-total-label">Total</span>
            <span className="pay-total-value">{totalAmount}</span>
          </div>
          {filteredTransactions.map((t) => (
            <div key={t.id} className="pay-card">
              <div className="pay-card-header">
                <div>
                  <div className="pay-card-date">{t.paymentDate}</div>
                  <div className="pay-card-ref">Ref: {t.refNumber}</div>
                </div>
                <div className="pay-card-right">
                  <span className="pay-card-amount">{t.amount}</span>
                  <button className="pay-action-btn"><MoreHorizontal className="pay-icon" /></button>
                </div>
              </div>
              <div className="pay-card-body">
                <div><strong>Client:</strong> <span className="pay-link">{t.client}</span></div>
                <div><strong>Type:</strong> {t.type}</div>
                <div><strong>Method:</strong> {t.method}</div>
                <div><strong>Team:</strong> {t.teamMember}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentComponent;
