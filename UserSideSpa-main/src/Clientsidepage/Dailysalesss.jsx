import React, { useState } from 'react';
import './Dailysalesss.css';
import { BiSolidLeftArrowSquare, BiSolidRightArrowSquare } from 'react-icons/bi';


const DailySales = () => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const transactionSummary = [
    { itemType: 'Services', salesQty: 0, refundQty: 0, grossTotal: 'AED 0.00' },
    { itemType: 'Products', salesQty: 0, refundQty: 0, grossTotal: 'AED 0.00' },
    { itemType: 'Shipping', salesQty: 0, refundQty: 0, grossTotal: 'AED 0.00' },
    { itemType: 'Gift cards', salesQty: 0, refundQty: 0, grossTotal: 'AED 0.00' },
  ];

  const cashMovementSummary = [
    { paymentType: 'Deposit Redemptions', paymentsCollected: 'AED 0.00', refundsPaid: 'AED 0.00' },
    { paymentType: 'Fresha online', paymentsCollected: 'AED 0.00', refundsPaid: 'AED 0.00' },
    { paymentType: 'Payment Link', paymentsCollected: 'AED 0.00', refundsPaid: 'AED 0.00' },
    { paymentType: 'Cash', paymentsCollected: 'AED 0.00', refundsPaid: 'AED 0.00' },
  ];

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const changeDate = (days) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  return (
    <div className="daily-sales-container">
      <h1 className="title">Daily sales</h1>
      <p className="subtitle">
        View, filter and export the transactions and cash movement for the day.
      </p>


      <div className="date-section">

        <div className="date-display-with-arrows">
          <span className="arrow-icon" onClick={() => changeDate(-1)}>
            <BiSolidLeftArrowSquare />
          </span>
          <div className="date-display">{formatDate(currentDate)}</div>
          <span className="arrow-icon" onClick={() => changeDate(1)}>
            <BiSolidRightArrowSquare />
          </span>
        </div>

        <button className="today-btn" onClick={() => setCurrentDate(new Date())}>
          Today
        </button>
      </div>

      <div className="tables-container">
        <div className="table-card">
          <h2 className="table-title">Transaction summary</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Item type</th>
                  <th>Sales qty</th>
                  <th>Refund qty</th>
                  <th>Gross total</th>
                </tr>
              </thead>
              <tbody>
                {transactionSummary.map((item, index) => (
                  <tr key={index}>
                    <td>{item.itemType}</td>
                    <td>{item.salesQty}</td>
                    <td>{item.refundQty}</td>
                    <td>{item.grossTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-card">
          <h2 className="table-title">Cash movement summary</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Payment type</th>
                  <th>Payments collected</th>
                  <th>Refunds paid</th>
                </tr>
              </thead>
              <tbody>
                {cashMovementSummary.map((item, index) => (
                  <tr key={index}>
                    <td>{item.paymentType}</td>
                    <td>{item.paymentsCollected}</td>
                    <td>{item.refundsPaid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="export-btn">Export</button>
        <button className="add-btn">Add new</button>
      </div>
    </div>
  );
};

export default DailySales;