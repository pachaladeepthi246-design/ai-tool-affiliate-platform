import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/Header';
import PaymentForm from '../components/PaymentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBackend } from '../hooks/useBackend';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const backend = useBackend();
  
  const cardId = searchParams.get('cardId');
  const subscriptionType = searchParams.get('subscription') as 'monthly' | 'yearly' | null;

  const { data: card } = useQuery({
    queryKey: ['card-for-checkout', cardId],
    queryFn: () => backend.cards.get({ slug: cardId! }),
    enabled: !!cardId,
  });

  const handlePaymentSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-center">Complete Your Purchase</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {cardId && card ? (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-4">
                        {card.images[0] && (
                          <img
                            src={card.images[0]}
                            alt={card.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{card.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {card.description}
                          </p>
                          <Badge variant="secondary" className="mt-1">
                            {card.category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total</span>
                          <span>${card.price}</span>
                        </div>
                      </div>
                    </div>
                  ) : subscriptionType ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold">
                          {subscriptionType === 'monthly' ? 'Monthly' : 'Yearly'} Subscription
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Access to all premium content and resources
                        </p>
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total</span>
                          <span>${subscriptionType === 'monthly' ? '9.99' : '99.99'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No items selected</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>What You Get</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      Instant access to content
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      Downloadable resources
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      Lifetime updates
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      24/7 support
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Payment Form */}
            <div className="flex justify-center">
              <PaymentForm
                cardId={cardId ? parseInt(cardId) : undefined}
                subscriptionType={subscriptionType || undefined}
                onSuccess={handlePaymentSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
