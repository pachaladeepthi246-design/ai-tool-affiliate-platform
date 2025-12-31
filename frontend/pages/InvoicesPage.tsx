import React from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText } from 'lucide-react';

export default function InvoicesPage() {
  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => backend.financial.listInvoices(),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500';
      case 'refunded': return 'bg-red-500';
      case 'void': return 'bg-gray-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Invoices</h1>

      <div className="grid gap-4">
        {invoices?.invoices.map((invoice: any) => (
          <Card key={invoice.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                    <p className="text-sm text-muted-foreground">
                      Issued: {new Date(invoice.issued_at).toLocaleDateString()}
                    </p>
                    {invoice.paid_at && (
                      <p className="text-sm text-muted-foreground">
                        Paid: {new Date(invoice.paid_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Amount</div>
                    <div className="text-xl font-bold">${invoice.amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Tax</div>
                    <div className="text-sm">${invoice.tax.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total</div>
                    <div className="text-lg font-bold">${invoice.total.toFixed(2)}</div>
                  </div>
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
              {invoice.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{invoice.notes}</p>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!invoices?.invoices || invoices.invoices.length === 0) && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
            <p className="text-muted-foreground">
              Your invoices will appear here after making purchases
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
