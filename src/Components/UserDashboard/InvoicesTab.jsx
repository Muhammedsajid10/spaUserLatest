import { CreditCard, FileText, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const InvoicesTab = ({ invoices }) => {
  const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
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
      <div className="flex items-center justify-center min-h-96">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No invoices yet</h3>
            <p className="text-gray-600">
              Your payment history will appear here once you make your first booking.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Invoices & Payments</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <FileText className="w-4 h-4" />
                      <span>{new Date(invoice.createdAt).toLocaleDateString()}</span>
                    </div>
                    <Badge variant={getStatusBadgeVariant(invoice.status)}>
                      {invoice.status || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        Invoice #{invoice.invoiceNumber || invoice._id?.slice(-8) || 'N/A'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {invoice.description || 'Spa service payment'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-lg font-semibold text-gray-900">
                        <DollarSign className="w-4 h-4" />
                        <span>{formatAmount(invoice.amount)}</span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {invoice.paymentMethod || 'Card'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoicesTab;

