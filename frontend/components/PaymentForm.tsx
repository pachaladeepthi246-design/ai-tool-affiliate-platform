import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBackend } from '../hooks/useBackend';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { stripePublishableKey } from '../config';

const stripePromise = loadStripe(stripePublishableKey);

interface PaymentFormProps {
  cardId?: number;
  subscriptionType?: 'monthly' | 'yearly';
  onSuccess?: () => void;
}

function PaymentFormInner({ cardId, subscriptionType, onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const backend = useBackend();
  const { toast } = useToast();
  const [couponCode, setCouponCode] = React.useState('');
  const [couponApplied, setCouponApplied] = React.useState(false);

  const checkoutMutation = useMutation({
    mutationFn: (data: { cardId?: number; subscriptionType?: 'monthly' | 'yearly'; couponCode?: string }) =>
      backend.payments.checkout(data),
  });

  const validateCouponMutation = useMutation({
    mutationFn: (code: string) => backend.coupons.validate({ code }),
  });

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      const result = await validateCouponMutation.mutateAsync(couponCode);
      if (result.valid) {
        setCouponApplied(true);
        toast({
          title: "Coupon applied!",
          description: `You'll get ${result.coupon?.discount_value}${result.coupon?.discount_type === 'percentage' ? '%' : '$'} off`,
        });
      } else {
        toast({
          title: "Invalid coupon",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Coupon validation error:', error);
      toast({
        title: "Error",
        description: "Failed to validate coupon",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    try {
      // Create payment intent
      const { clientSecret } = await checkoutMutation.mutateAsync({
        cardId,
        subscriptionType,
        couponCode: couponApplied ? couponCode : undefined,
      });

      // Confirm payment
      const { error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        toast({
          title: "Payment failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment successful!",
          description: "Your purchase has been completed.",
        });
        onSuccess?.();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: "An error occurred during payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coupon">Coupon Code (Optional)</Label>
            <div className="flex space-x-2">
              <Input
                id="coupon"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon code"
                disabled={couponApplied}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleValidateCoupon}
                disabled={!couponCode.trim() || couponApplied || validateCouponMutation.isPending}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Card Details</Label>
            <div className="p-3 border rounded-md">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!stripe || checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? 'Processing...' : 'Pay Now'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PaymentForm(props: PaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormInner {...props} />
    </Elements>
  );
}
