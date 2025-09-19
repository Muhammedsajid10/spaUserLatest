import { CreditCard, FileText, DollarSign } from 'lucide-react';

const InvoicesTab = ({ invoices }) => {
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'badge badge-default';
      case 'pending':
        return 'badge badge-secondary';
      case 'failed':
        return 'badge badge-destructive';
      default:
        return 'badge badge-secondary';
    }
  };

  const formatAmount = (amount) => {
    if (typeof amount === 'number') {
      return `$${amount.toFixed(2)}`;
    }
    return amount || 'N/A';
  };

  if (!invoices || invoices.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-card">
          <CreditCard className="empty-state-icon" />
          <h3 className="empty-state-title">No invoices yet</h3>
          <p className="empty-state-description">
            Your payment history will appear here once you make your first booking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <FileText className="w-5 h-5" />
          <span>Invoices & Payments</span>
        </h3>
      </div>
      <div className="card-content">
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice._id} className="invoice-item">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="invoice-header">
                    <div className="invoice-date">
                      <FileText className="w-4 h-4" />
                      <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className={getStatusBadgeClass(invoice.status)}>
                      {invoice.status || 'Unknown'}
                    </span>
                  </div>
                  <div className="invoice-content">
                    <div className="invoice-details">
                      <h4>
                        Invoice #{invoice.invoiceNumber || invoice._id?.slice(-8) || 'N/A'}
                      </h4>
                      <p className="invoice-description">
                        {invoice.description || 'Spa service payment'}
                      </p>
                    </div>
                    <div className="invoice-amount">
                      <div className="invoice-price">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatAmount(invoice.amount)}</span>
                      </div>
                      <p className="invoice-method">
                        {invoice.paymentMethod || 'Card'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvoicesTab;

