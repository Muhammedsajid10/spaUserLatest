import React from 'react';
import { Link } from 'react-router-dom';
import Allora from './Components/Allora';
import './Layout.css'; // Link the CSS file
import alloraLogo from './assets/allora-logo-header.svg';

const Layout = ({ children }) => {
  return (
    <div className="layout-container">
      <div className="sidebar">
        <Allora />
      </div>
      <div className="main-content">
        <div className="global-header">
          <div className="header-left">
            <Link to="/" className="logo-link">
              <img 
                src={alloraLogo} 
                alt="Allora Spa" 
                className="header-logo"
              />
            </Link>
          </div>
        </div>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;
