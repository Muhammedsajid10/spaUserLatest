import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// Use your actual Stripe publishable key
const stripePromise = loadStripe('pk_test_51RpSYD5FOF6KgbFpVgzOspHQuZYVwLuawvNXCAI60gDNuyEFdfvwd9UnhHMqal5RfWh3N4WPv5uzLn3GEFiRTm1D00rpI5BXPQ');

const StripePayment = ({ paymentData, onSuccess, onError }) => {
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    try {
      setProcessing(true);
      
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // If we have a clientSecret from the backend, use it for payment confirmation
      if (paymentData.clientSecret) {
        const result = await stripe.confirmPayment({
          clientSecret: paymentData.clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/payment/success?paymentId=${paymentData.paymentId}`,
          },
        });

        if (result.error) {
          onError(result.error.message);
        } else {
          onSuccess(result.paymentIntent);
        }
      } else if (paymentData.paymentUrl) {
        // If we have a paymentUrl, redirect to it
        window.location.href = paymentData.paymentUrl;
      }
    } catch (error) {
      console.error('Payment error:', error);
      onError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="stripe-payment">
      <button 
        onClick={handlePayment} 
        disabled={processing}
        className="btn-primary"
      >
        {processing ? 'Processing...' : 'Complete Payment'}
      </button>
    </div>
  );
};

export default StripePayment;
