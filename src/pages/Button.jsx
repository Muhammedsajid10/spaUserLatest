import React, { useState } from 'react';
import './Button.css';

const Button = () => {
    const [code, setCode] = useState('');

    const handleConfirm = () => {
        console.log('Entered Code:', code);
    }

    return (
        <div className='carddd-container'>
            <div className='carddd'>
                <h2 className='carddd-title'>Add a gift card</h2>
                <h6 className='cardsub-title'>Enter the code on your gift card</h6>
                <div className='empty-container'>
                    <input 
                        type="text" 
                        className="input-box" 
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                    />
                </div>
                <div>
                    <button className='rainbow-button' onClick={handleConfirm}>Confirm</button>
                </div>
            </div>
        </div>
    );
};

export default Button;
