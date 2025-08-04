
import React, { useState } from 'react';
import './Memberss.css';
import { CiFilter } from "react-icons/ci";

const allMemberships = [
  {
    name: 'W residence',
    services: '2 services',
    valid: '2 years',
    sessions: '5 sessions',
    price: 'AED 1,600',
    iconColor: '#0d1b2a',
  },
  {
    name: 'Couple',
    services: '2 services',
    valid: '5 years',
    sessions: '10 sessions',
    price: 'AED 1,500',
    iconColor: '#0d1b2a',
  },
  {
    name: '90min deeptissue 30min scrub',
    services: '2 services',
    valid: '1 month',
    sessions: '5 sessions',
    price: 'AED 1,850',
    iconColor: '#4285F4',
  },
  {
    name: 'mr perfect(sajid)',
    services: '2 services',
    valid: '2 years',
    sessions: '5 sessions',
    price: 'AED 10,6000',
    iconColor: '#0d1b2a',
  },
];

const MembershipTable = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMemberships = allMemberships.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="membership-container">
      <div className="membership-nav">
        <h2>Memberships</h2>
        <div className="buttons2">
          <button className='btn-options'>Options</button>
          <button className='add-btn'>Add</button>
        </div>
      </div>

      <div className="serch-nav">
        <input
          className='search-name'
          type="text"
          placeholder="Search by membership name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className='btn-filter'>
          Filter <CiFilter />
        </button>
      </div>

      <div className="table-header">
        <span>Membership name</span>
        <span>Valid for</span>
        <span>Sessions</span>
        <span>Price</span>
      </div>

      {filteredMemberships.map((item, index) => (
        <div className="table-row" key={index}>
          <div className="membership-name">
            <div className="icon" style={{ backgroundColor: item.iconColor }}>📅</div>
            <div>
              <div className="title">{item.name}</div>
              <div className="subtitle">{item.services}</div>
            </div>
          </div>
          <span>{item.valid}</span>
          <span>{item.sessions}</span>
          <span className="price">{item.price}</span>
        </div>
      ))}

      {filteredMemberships.length === 0 && (
        <div style={{ padding: '20px', color: '#888' }}>No memberships found.</div>
      )}
    </div>
  );
};

export default MembershipTable;