import React, { useState } from 'react';
import './PaymentProcessing.css';
import { FaCcMastercard } from "react-icons/fa";
import { FaAmazonPay } from "react-icons/fa";
import { AiTwotoneDollarCircle } from "react-icons/ai";

const PaymentProcessing = () => {
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const paymentMethods = [
        {
            id: 'card',
            icon: FaCcMastercard,
            title: 'Payment through Card',
            description: 'Secure card payment with encryption',
            className: 'pay-card',
            color: '#00bcd4'
        },
        {
            id: 'upi',
            icon: FaAmazonPay,
            title: 'Payment through UPI',
            description: 'Quick and easy UPI payment',
            className: 'upi-pay',
            color: '#ff9800'
        }
 
    ];

    const handlePaymentSelect = (paymentId) => {
        setSelectedPayment(paymentId);
        setIsLoading(true);
        
        // Simulate loading
        setTimeout(() => {
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className='pay-process'>
            <div className="header-section">
                <h1 className="main-title">Choose Your Payment Method</h1>
                <p className="subtitle">Select your preferred payment option to continue</p>
            </div>

            <div className="payment-container">
                <div className="button-row">
                    {paymentMethods.map((method, index) => {
                        const IconComponent = method.icon;
                        const isSelected = selectedPayment === method.id;
                        const isCurrentlyLoading = isLoading && isSelected;
                        
                        return (
                            <button 
                                key={method.id}
                                className={`payment-button ${method.className} ${isSelected ? 'selected' : ''} ${isCurrentlyLoading ? 'loading' : ''}`}
                                type="button"
                                onClick={() => handlePaymentSelect(method.id)}
                                disabled={isLoading}
                                style={{ '--animation-delay': `${index * 0.1}s`, '--accent-color': method.color }}
                                aria-label={method.title}
                            >
                                <div className="button-content">
                                    <div className="icon-wrapper">
                                        <IconComponent className="payment-icon" />
                                        {isCurrentlyLoading && (
                                            <div className="loading-spinner"></div>
                                        )}
                                    </div>
                                    <div className="text-content">
                                        <h3 className="payment-title">{method.title}</h3>
                                        <p className="payment-description">{method.description}</p>
                                    </div>
                                </div>
                                <div className="button-overlay"></div>
                            </button>
                        );
                    })}
                </div>
                
                {selectedPayment && !isLoading && (
                    <div className="confirmation-section">
                        <div className="success-message">
                            <div className="success-icon">✓</div>
                            <p>Payment method selected successfully!</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentProcessing;

