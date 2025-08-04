import React from 'react';
import './Visit.css';

const Visit = () => {
  return (
    <div className='visit-container'>
      <h1 className='visit-title'>
        Is this your first visit to Allora Spa <br />
        and Massage Centre Dubai?
      </h1>

      <div className='visit-option'>
        <h6>Yes</h6>
        <p>This is my first visit</p>
      </div>

      <div className='visit-option'>
        <h6>No</h6>
        <p>I've visited before</p>
      </div>
    </div>
  );
};

export default Visit;