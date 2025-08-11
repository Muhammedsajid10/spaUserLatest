// import React, { useState } from 'react';
// import './Membership.css';

// const Membership = () => {
//   const [searchTerm, setSearchTerm] = useState('');
//   const [showFilters, setShowFilters] = useState(false);

//   const memberships = [
//     {
//       name: 'W residence',
//       client: 'Sam W RESIDENCE',
//       type: 'One-time',
//       startDate: '14 Jun 2025',
//       endDate: '13 Jun 2027',
//       status: 'Active',
//       total: 'AED 1,600'
//     },
//     {
//       name: 'Kempensiki',
//       client: 'dikshit',
//       type: 'One-time',
//       startDate: '14 Jun 2025',
//       endDate: '13 Jul 2025',
//       status: 'Active',
//       total: 'AED 1,000'
//     },
//     {
//       name: 'lymphatic package',
//       client: 'Labor',
//       type: 'One-time',
//       startDate: '31 May 2025',
//       endDate: '30 May 2026',
//       status: 'Active',
//       total: 'AED 1,200'
//     },
//     {
//       name: 'W residence',
//       client: 'sergei',
//       type: 'One-time',
//       startDate: '27 May 2025',
//       endDate: '26 May 2027',
//       status: 'Used',
//       total: 'AED 1,600'
//     },
//     {
//       name: 'Anti Cellulite',
//       client: 'cinderlla',
//       type: 'One-time',
//       startDate: '24 May 2025',
//       endDate: '23 Jun 2025',
//       status: 'Active',
//       total: 'AED 1,400'
//     }
//   ];

//   const filteredMemberships = memberships.filter(membership =>
//     membership.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//     membership.client.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const getStatusClass = (status) => {
//     return status === 'Active' ? 'status-active' : 'status-used';
//   };

//   const SearchIcon = () => (
//     <svg className="search-icon icon" viewBox="0 0 24 24">
//       <circle cx="11" cy="11" r="8"></circle>
//       <path d="m21 21-4.35-4.35"></path>
//     </svg>
//   );

//   const FilterIcon = () => (
//     <svg className="icon" viewBox="0 0 24 24">
//       <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
//     </svg>
//   );

//   const ChevronDownIcon = () => (
//     <svg className="icon" viewBox="0 0 24 24">
//       <polyline points="6,9 12,15 18,9"></polyline>
//     </svg>
//   );

//   const handleSearchChange = (e) => {
//     setSearchTerm(e.target.value);
//   };

//   const toggleFilters = () => {
//     setShowFilters(!showFilters);
//   };

//   return (
//     <div className="container">
//       <div className="max-width">
//         {/* Header */}
//         <div className="header">
//           <div className="header-content">
//             <h1 className="title">Memberships sold</h1>
//             <p className="subtitle">
//               View and filter memberships purchased by your clients.{' '}
//               <a href="#" className="learn-more">Read more</a>
//             </p>
//           </div>
//           <button className="options-btn">
//             <span>Options</span>
//             <ChevronDownIcon />
//           </button>
//         </div>

//         {/* Search and Filters */}
//         <div className="search-container">
//           <div className="search-wrapper">
//             <SearchIcon />
//             <input
//               type="text"
//               className="search-input"
//               placeholder="Search by client or membership"
//               value={searchTerm}
//               onChange={handleSearchChange}
//             />
//           </div>
//           <button className="filters-btn" onClick={toggleFilters}>
//             <FilterIcon />
//             <span>Filters</span>
//           </button>
//         </div>

//         {/* Desktop Table */}
//         <div className="table-container">
//           <div className="table-wrapper">
//             <table className="table">
//               <thead className="table-header">
//                 <tr>
//                   <th>Name</th>
//                   <th>Client</th>
//                   <th>Type</th>
//                   <th>Start date</th>
//                   <th>End date</th>
//                   <th>Status</th>
//                   <th>Total charged</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredMemberships.map((membership, index) => (
//                   <tr key={index} className="table-row">
//                     <td className="table-cell">
//                       <a href="#" className="link-text">{membership.name}</a>
//                     </td>
//                     <td className="table-cell">
//                       <a href="#" className="link-text">{membership.client}</a>
//                     </td>
//                     <td className="table-cell">{membership.type}</td>
//                     <td className="table-cell date-text">{membership.startDate}</td>
//                     <td className="table-cell date-text">{membership.endDate}</td>
//                     <td className="table-cell">
//                       <span className={`status-badge ${getStatusClass(membership.status)}`}>
//                         {membership.status}
//                       </span>
//                     </td>
//                     <td className="table-cell total-amount">{membership.total}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Mobile/Tablet Cards */}
//         <div className="cards-container">
//           {filteredMemberships.map((membership, index) => (
//             <div key={index} className="card">
//               <div className="card-header">
//                 <div className="card-info">
//                   <a href="#" className="card-title">{membership.name}</a>
//                   <div className="card-client">{membership.client}</div>
//                 </div>
//                 <span className={`status-badge ${getStatusClass(membership.status)}`}>
//                   {membership.status}
//                 </span>
//               </div>

//               <div className="card-grid">
//                 <div className="card-field">
//                   <div className="card-label">Type</div>
//                   <div className="card-value">{membership.type}</div>
//                 </div>
//                 <div className="card-field">
//                   <div className="card-label">Start date</div>
//                   <div className="card-value date-text">{membership.startDate}</div>
//                 </div>
//                 <div className="card-field">
//                   <div className="card-label">End date</div>
//                   <div className="card-value date-text">{membership.endDate}</div>
//                 </div>
//                 <div className="card-field card-total">
//                   <div className="card-label">Total charged</div>
//                   <div className="card-value">{membership.total}</div>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* No Results */}
//         {filteredMemberships.length === 0 && (
//           <div className="no-results">
//             <p>No memberships found matching your search.</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Membership;


// --------------


import React, { useState } from 'react';
import './Membership.css';

const Membership = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const memberships = [
    { name: 'W residence', client: 'Sam W RESIDENCE', type: 'One-time', startDate: '14 Jun 2025', endDate: '13 Jun 2027', status: 'Active', total: 'AED 1,600' },
    { name: 'Kempensiki', client: 'dikshit', type: 'One-time', startDate: '14 Jun 2025', endDate: '13 Jul 2025', status: 'Active', total: 'AED 1,000' },
    { name: 'lymphatic package', client: 'Labor', type: 'One-time', startDate: '31 May 2025', endDate: '30 May 2026', status: 'Active', total: 'AED 1,200' },
    { name: 'W residence', client: 'sergei', type: 'One-time', startDate: '27 May 2025', endDate: '26 May 2027', status: 'Used', total: 'AED 1,600' },
    { name: 'Anti Cellulite', client: 'cinderlla', type: 'One-time', startDate: '24 May 2025', endDate: '23 Jun 2025', status: 'Active', total: 'AED 1,400' }
  ];

  const filteredMemberships = memberships.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusClass = status => status === 'Active' ? 'mem-status-active' : 'mem-status-used';

  const SearchIcon = () => (
    <svg className="mem-search-icon mem-icon" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
  );

  const FilterIcon = () => (
    <svg className="mem-icon" viewBox="0 0 24 24">
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"></polygon>
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg className="mem-icon" viewBox="0 0 24 24">
      <polyline points="6,9 12,15 18,9"></polyline>
    </svg>
  );

  const handleSearchChange = (e) => setSearchTerm(e.target.value);
  const toggleFilters = () => setShowFilters(!showFilters);

  return (
    <div className="mem-container">
      <div className="mem-max-width">
        <div className="mem-header">
          <div className="mem-header-content">
            <h1 className="mem-title">Memberships sold</h1>
            <p className="mem-subtitle">
              View and filter memberships purchased by your clients.{' '}
              <a href="#" className="mem-learn-more">Read more</a>
            </p>
          </div>
          <button className="mem-options-btn">
            <span>Options</span>
            <ChevronDownIcon />
          </button>
        </div>

        <div className="mem-search-container">
          <div className="mem-search-wrapper">
            <SearchIcon />
            <input
              type="text"
              className="mem-search-input"
              placeholder="Search by client or membership"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
          <button className="mem-filters-btn" onClick={toggleFilters}>
            <FilterIcon />
            <span>Filters</span>
          </button>
        </div>

        <div className="mem-table-container">
          <div className="mem-table-wrapper">
            <table className="mem-table">
              <thead className="mem-table-header">
                <tr>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Start date</th>
                  <th>End date</th>
                  <th>Status</th>
                  <th>Total charged</th>
                </tr>
              </thead>
              <tbody>
                {filteredMemberships.map((membership, index) => (
                  <tr key={index} className="mem-table-row">
                    <td className="mem-table-cell">
                      <a href="#" className="mem-link-text">{membership.name}</a>
                    </td>
                    <td className="mem-table-cell">
                      <a href="#" className="mem-link-text">{membership.client}</a>
                    </td>
                    <td className="mem-table-cell">{membership.type}</td>
                    <td className="mem-table-cell mem-date-text">{membership.startDate}</td>
                    <td className="mem-table-cell mem-date-text">{membership.endDate}</td>
                    <td className="mem-table-cell">
                      <span className={`mem-status-badge ${getStatusClass(membership.status)}`}>
                        {membership.status}
                      </span>
                    </td>
                    <td className="mem-table-cell mem-total-amount">{membership.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mem-cards-container">
          {filteredMemberships.map((membership, index) => (
            <div key={index} className="mem-card">
              <div className="mem-card-header">
                <div className="mem-card-info">
                  <a href="#" className="mem-card-title">{membership.name}</a>
                  <div className="mem-card-client">{membership.client}</div>
                </div>
                <span className={`mem-status-badge ${getStatusClass(membership.status)}`}>
                  {membership.status}
                </span>
              </div>

              <div className="mem-card-grid">
                <div className="mem-card-field">
                  <div className="mem-card-label">Type</div>
                  <div className="mem-card-value">{membership.type}</div>
                </div>
                <div className="mem-card-field">
                  <div className="mem-card-label">Start date</div>
                  <div className="mem-card-value mem-date-text">{membership.startDate}</div>
                </div>
                <div className="mem-card-field">
                  <div className="mem-card-label">End date</div>
                  <div className="mem-card-value mem-date-text">{membership.endDate}</div>
                </div>
                <div className="mem-card-field mem-card-total">
                  <div className="mem-card-label">Total charged</div>
                  <div className="mem-card-value">{membership.total}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMemberships.length === 0 && (
          <div className="mem-no-results">
            <p>No memberships found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Membership;

