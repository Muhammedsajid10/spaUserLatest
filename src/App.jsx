import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Services from "./pages/Services"; // adjust imports to match your project
import ProfessionalsUpdated from "./pages/ProfessionalsUpdated";
import Time from "./pages/TimeWithAPI";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";

// import Button from "./pages/Button";
// import Layout from "./Layout";
// import Appoint from "./Clientsidepage/Appoint"

// import Teammembers from "./Clientsidepage/Teammembers";
// import Giftcards from "./Clientsidepage/Giftcards";
// import Membership from "./Clientsidepage/Membership";
// import ClientsList from "./Clientsidepage/Clientlist";
// import Visit from "./pages/Visit";
// import Todayandbody from "./Clientsidepage/Todayandbody";
// import Memberss from "./Clientsidepage/Memberss";
// import Dailysalesss from "./Clientsidepage/Dailysalesss";
// import Paymentclient from "./Clientsidepage/Paymentclient";
// import SalesPage from "./Clientsidepage/Salespage";
// import TopService from "./Clientsidepage/Topservices";
// import Dashboard from "./Clientsidepage/Dashboard";
// import Sheduledshifts from "./Clientsidepage/Sheduledshifts";
// import Graphs from "./Clientsidepage/Graphs";
// import Selectcalander from "./Clientsidepage/Selectcalander";
// import LoginPage from "./Clientsidepage/Loginpage";
import Signuppage from "./Authentication/Signuppage";
import ForgotPassword from "./Authentication/ForgotPassword";
import ResetPassword from "./Authentication/ResetPassword";
import VerifyEmailPage from './pages/VerifyEmailPage';

// Import the new/updated components
// import BookingFlow from "./pages/BookingFlow";
import SelectProfessional from "./pages/ProfessionalsUpdated";
import TimeWithAPI from "./pages/TimeWithAPI";
import LayoutWithBooking from "./LayoutWithBooking";

// Import Stripe payment components
import StripePayment from "./pages/StripePayment";
// import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import PaymentProcess from "./pages/PaymentProcess";

// Import authentication components
import { AuthProvider } from "./Service/Context";
import ProtectedRoute from "./Components/ProtectedRoute";
import ProfilePage from './pages/ProfilePage';
import OrdersPage from './pages/OrdersPage';
import ClientProfilePage from './pages/ClientProfilePage';
import Dashboard from './pages/Dashboard';
// import Time from "./pages/TimeUpdated";

function App() {
  const [count, setCount] = useState(0);

  return (
    <AuthProvider>
    <BrowserRouter>
        <Routes>
          <Route path="/booking" element={<Navigate to="/" replace />} />
          
          {/* Booking flow wrapped by LayoutWithBooking (left = page, right = summary) */}
          <Route path="/" element={<LayoutWithBooking />}>
            <Route index element={<Services />} />
            <Route path="professionals" element={<ProfessionalsUpdated />} />
            <Route path="time" element={<Time />} />
            <Route path="payment" element={<Payment />} />
            <Route path="payment/success" element={<PaymentSuccess />} />
          </Route>

          {/* Non-booking routes */}
          {/* Authentication routes */}
          <Route path="/login" element={<Signuppage />} />
          <Route path="/signup" element={<Signuppage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* Protected payment route - requires authentication */}
          <Route path="/payment" element={
            <LayoutWithBooking>
              {/* <LayoutWithBooking> */}
                <Payment />
              {/* </LayoutWithBooking> */}
            </LayoutWithBooking>
          } />

          {/* Test payment route without protection */}
          <Route path="/payment-test" element={<Payment />} />

          {/* Stripe Payment Routes */}
          {/* <Route path="/payment/network" element={
            <LayoutWithBooking>
              <StripePayment />
            </LayoutWithBooking>
          } />
           */}
          <Route path="/payment/stripe" element={
            <LayoutWithBooking>
              <StripePayment />
            </LayoutWithBooking>
          } />
          
          {/* <Route path="/payment/process" element={
            <LayoutWithBooking>
              <PaymentProcess />
            </LayoutWithBooking>
          } /> */}
          
          {/* <Route path="/payment/success" element={
            <LayoutWithBooking>
              <PaymentSuccess />
            </LayoutWithBooking>
          } />
           */}
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

          {/* Dashboard route - requires authentication */}
          {/* <Route path="/dashboard" element={
            <LayoutWithBooking>
              <ClientProfilePage />
            </LayoutWithBooking>
          } /> */}

          {/* Alternative booking flow route */}
          {/* <Route path="/booking" element={<BookingFlow />} /> */}
          
          {/* Demo/test routes for updated components */}
          <Route path="/professionals-demo" element={<SelectProfessional />} />
          <Route path="/time-demo" element={<TimeWithAPI />} />
          
          {/* Legacy routes (commented out) */}
           {/* <Route path="/" element={<Visit/>} /> */}
          {/* <Route path="/" element={<Time/>} /> */}
          {/* <Route path="/" element={<Button/>} /> */}
          {/* <Route path="/" element={<Professional/>} /> */}
          {/* ----------------------------------------------------- */}
           {/* <Route path="/" element={<Appoint />} /> */}
            {/* <Route path="/" element={<Teammembers/>} /> */}
             {/* <Route path="/" element={<Giftcards/>} /> */}
             {/* <Route path="/" element={<Membership />} />   */}
              {/* <Route path="/" element={<ClientsList />} /> */}
               {/* <Route path="/" element={<Todayandbody/>} /> */}
               {/* <Route path="/" element={<Memberss />} />  */}
                {/* <Route path="/" element={<Dailysalesss />} />  */}
                {/* <Route path="/" element={<Paymentclient />} /> */}
                 {/* <Route path="/" element={<SalesPage/>} /> */}
                 {/* <Route path="/" element={<TopService/>} /> */}
                  {/* <Route path="/" element={<Sheduledshifts/>} /> */}
                   {/* <Route path="/" element={<Graphs/>} /> */}
                   {/* <Route path="/" element={<Selectcalander/>} /> */}
          <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
          
          {/* Protected routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/client-profile" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>

    </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
