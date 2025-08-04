
import React from 'react';
import './Allora.css';
import { FaStar } from "react-icons/fa6";
import mer from '../pages/Images/profile.webp';

const Allora = () => {
  return (
    <div className="svc-container">
      <div className='main-allora'>
        <div className="allora-main">
          <img
            className='image-mer'
            src={mer}
            alt="Allora Spa and Massage Center"
          />
          <div className='detail-allora'>
            <h3 className='allora-h1'>Allora Spa and Massage Centre Dubai</h3>
            <h4 className='all-h4'>
              5.0 <FaStar /><FaStar /><FaStar /><FaStar /><FaStar /> (24)
            </h4>
            <h5 className='allora-h2'>Concord Tower, 1913 19th Floor, Al Sufouh, Dubai</h5>
          </div>
        </div>

        <div className="booking-info">
          <p>📅 Wednesday, 25 June</p>
          <p>⏰ 3:00–4:00 pm (1 hr duration)</p>
          <h3 className='allora-h3'>Relaxing Massage</h3>
          <p>1 hr with Putri</p>
        </div>

        <div className='divider-line'></div>

        <div className="final-price">
          <div className="total">
            <b>Total</b>
            <p className="pay-method">Pay now</p>
          </div>
          <div className="total-amount">
            <b>AED 410</b>
            <p className="pay-now">AED 410</p>
          </div>
        </div>

        <div className="payment-section">
          <h3 className="section-title">Payment method</h3>
          <input type="text" placeholder="Card holder full name" className="input-box" />
          <input type="text" placeholder="Card number" className="input-box" />
          <div className="card-details">
            <input type="text" placeholder="MM/YY" className="input-box half" />
            <input type="text" placeholder="123" className="input-box half" />
          </div>
          <p className="secure-text">Pay securely with <span className="logos">VISA, MasterCard, Amex</span></p>
          <button className="gift-btn">+ Add a gift card</button>
        </div>

        <div className='divider-line'></div>

        <div className="terms">
          <p><b>Deposit policy</b><br />Allora Spa and Massage Centre Dubai requires AED 410 to be paid upfront.</p>
          <p><b>Additional terms and conditions</b><br />Deposits are non-refundable. You can reschedule your appointment and your deposit will be transferred to your future booking.</p>
        </div>

        <button className='btn-allora'>Confirm</button>
      </div>
    </div>
  );
};

export default Allora;
