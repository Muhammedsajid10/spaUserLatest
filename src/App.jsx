import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Services from "./pages/Services"; // adjust imports to match your project
import ProfessionalsUpdated from "./pages/ProfessionalsUpdated";
import Time from "./pages/TimeWithAPI";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";

import Signuppage from "./Authentication/Signuppage";
import ResetPassword from "./pages/ResetPassword";


import SelectProfessional from "./pages/ProfessionalsUpdated";
import TimeWithAPI from "./pages/TimeWithAPI";
import LayoutWithBooking from "./LayoutWithBooking";

// Import Stripe payment components
import StripePayment from "./pages/StripePayment";
import PaymentCancel from "./pages/PaymentCancel";
import PaymentProcess from "./pages/PaymentProcess";

// Import authentication components
import { AuthProvider } from "./Service/Context";
import ProtectedRoute from "./Components/ProtectedRoute";

import ClientProfilePage from './pages/ClientProfilePage';

function App() {

  return (
    <AuthProvider>
    <BrowserRouter>
        <Routes>
          <Route path="/booking" element={<Navigate to="/" replace />} />
          
          {/* Booking flow wrapped by LayoutWithBooking (left = page, right = summary) */}
          <Route path="/" element={<LayoutWithBooking />}>
            <Route index element={<Services />} />
            <Route path="professionals" element={<ProfessionalsUpdated />} />
            
            {/* Time route - accessible without authentication */}
            <Route path="time" element={<Time />} />
            
            {/* Protected Payment route - requires authentication */}
            <Route 
              path="payment" 
              element={
                <ProtectedRoute>
                  <Payment />
                </ProtectedRoute>
              } 
            />
            
            <Route path="payment/success" element={<PaymentSuccess />} />
          </Route>

          {/* Non-booking routes */}
          {/* Authentication routes */}
          <Route path="/login" element={<Signuppage />} />
          <Route path="/signup" element={<Signuppage />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          <Route 
            path="/payment" 
            element={
              <ProtectedRoute>
                <LayoutWithBooking>
                  <Payment />
                </LayoutWithBooking>
              </ProtectedRoute>
            } 
          />

          <Route path="/payment-test" element={<Payment />} />

      
          <Route path="/payment/stripe" element={
            <LayoutWithBooking>
              <StripePayment />
            </LayoutWithBooking>
          } />
          
          <Route path="/payment/process" element={
            <LayoutWithBooking>
              <PaymentProcess />
            </LayoutWithBooking>
          } />
 
          <Route path="/payment/cancel" element={
            <LayoutWithBooking>
              <PaymentCancel />
            </LayoutWithBooking>
          } />

          {/* Ensure confirm root is resolvable at top-level as well */}
          <Route path="/payment/success" element={
            <LayoutWithBooking>
              <PaymentSuccess />
            </LayoutWithBooking>
          } />

 

          
          {/* Demo/test routes for updated components */}
          <Route path="/professionals-demo" element={<SelectProfessional />} />
          <Route path="/time-demo" element={<TimeWithAPI />} />
          
   
          
          {/* Protected routes */}
      
        
          <Route path="/client-profile" element={
            <ProtectedRoute>
              <ClientProfilePage />
            </ProtectedRoute>
          } />
        </Routes>

    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
