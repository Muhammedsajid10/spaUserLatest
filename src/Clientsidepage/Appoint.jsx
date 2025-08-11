import React, { useState } from 'react';
import { ChevronDown, Search, Calendar, Filter, ArrowUpDown } from 'lucide-react';
import './Appoint.css';

const Appoint = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('scheduledDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [dateFilter, setDateFilter] = useState('Month to date');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const appointments = [
    {
      ref: '#8EB6FB9C',
      createdBy: 'Allora Spa Dubai',
      createdDate: '19 Jun 2025, 22:31',
      scheduledDate: '21 Jun 2025, 15:30',
      duration: '1h',
      teamMember: 'Dayu Eka',
      price: 'AED 250.00',
      status: 'New'
    },
    {
      ref: '#DFA4C2CC',
      createdBy: 'Allora Spa Dubai',
      createdDate: '19 Jun 2025, 13:32',
      scheduledDate: '20 Jun 2025, 16:55',
      duration: '1h',
      teamMember: 'Employee',
      price: 'AED 200.00',
      status: 'Completed'
    },
    {
      ref: '#CE8C37CB',
      createdBy: 'Allora Spa Dubai',
      createdDate: '20 Jun 2025, 19:46',
      scheduledDate: '20 Jun 2025, 16:15',
      duration: '1h',
      teamMember: 'Dayu Eka',
      price: 'AED 300.00',
      status: 'New'
    },
    {
      ref: '#9449CFCC',
      createdBy: 'Allora Spa Dubai',
      createdDate: '20 Jun 2025, 16:46',
      scheduledDate: '20 Jun 2025, 15:30',
      duration: '1h',
      teamMember: 'Employee',
      price: 'AED 200.00',
      status: 'Completed'
    }
  ];

  const [filteredAppointments, setFilteredAppointments] = useState(appointments);

  const handleSearch = (value) => {
    setSearchTerm(value);
    const filtered = appointments.filter(appointment => 
      appointment.ref.toLowerCase().includes(value.toLowerCase()) ||
      appointment.createdBy.toLowerCase().includes(value.toLowerCase()) ||
      appointment.teamMember.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredAppointments(filtered);
  };

  const handleSort = (field) => {
    const direction = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(direction);
    
    const sorted = [...filteredAppointments].sort((a, b) => {
      if (direction === 'asc') {
        return a[field] > b[field] ? 1 : -1;
      }
      return a[field] < b[field] ? 1 : -1;
    });
    setFilteredAppointments(sorted);
  };

  return (
    <div className="schedule-main-wrapper">
      <div className="schedule-content-container">
        {/* Header */}
        <div className="page-header-section">
          <div className="header-flex-container">
            <div className="title-description-block">
              <h1 className="page-primary-title">Appointments</h1>
              <p className="page-description-text">View, filter and export appointments booked by your clients.</p>
            </div>
            <div className="export-controls-wrapper">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="export-trigger-button"
              >
                Export
                <ChevronDown className="button-icon" />
              </button>
              {showExportMenu && (
                <div className="export-dropdown-menu">
                  <div className="dropdown-menu-inner">
                    <button className="dropdown-menu-item">Export as CSV</button>
                    <button className="dropdown-menu-item">Export as PDF</button>
                    <button className="dropdown-menu-item">Export as Excel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-controls-section">
          <div className="search-input-wrapper">
            <Search className="search-field-icon" />
            <input
              type="text"
              placeholder="Search by Reference or Client"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="search-text-input"
            />
          </div>
          
          <div className="filter-button-group">
            <div className="filter-select-wrapper">
              <button className="filter-control-button">
                <Calendar className="button-icon" />
                {dateFilter}
                <ChevronDown className="button-icon" />
              </button>
            </div>
            
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="filter-control-button"
            >
              <Filter className="button-icon" />
              Filters
            </button>
            
            <div className="filter-select-wrapper">
              <button className="filter-control-button">
                Scheduled Date (newest first)
                <ArrowUpDown className="button-icon" />
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="data-table-container">
          <div className="table-scroll-wrapper">
            <table className="schedule-data-table">
              <thead className="data-table-head">
                <tr>
                  <th className="column-header-cell clickable-header" onClick={() => handleSort('ref')}>
                    <div className="column-header-content">
                      Ref #
                      <ArrowUpDown className="button-icon" />
                    </div>
                  </th>
                  <th className="column-header-cell clickable-header" onClick={() => handleSort('createdBy')}>
                    <div className="column-header-content">
                      Created by
                      <ArrowUpDown className="button-icon" />
                    </div>
                  </th>
                  <th className="column-header-cell clickable-header" onClick={() => handleSort('createdDate')}>
                    <div className="column-header-content">
                      Created Date
                      <ArrowUpDown className="button-icon" />
                    </div>
                  </th>
                  <th className="column-header-cell clickable-header" onClick={() => handleSort('scheduledDate')}>
                    <div className="column-header-content">
                      Scheduled Date
                      <ChevronDown className="button-icon" />
                    </div>
                  </th>
                  <th className="column-header-cell clickable-header" onClick={() => handleSort('duration')}>
                    <div className="column-header-content">
                      Duration
                      <ArrowUpDown className="button-icon" />
                    </div>
                  </th>
                  <th className="column-header-cell">Team member</th>
                  <th className="column-header-cell clickable-header" onClick={() => handleSort('price')}>
                    <div className="column-header-content">
                      Price
                      <ArrowUpDown className="button-icon" />
                    </div>
                  </th>
                  <th className="column-header-cell">Status</th>
                </tr>
              </thead>
              <tbody className="data-table-body">
                {filteredAppointments.map((appointment, index) => (
                  <tr key={index} className="data-row-item">
                    <td className="data-cell-content">
                      <span className="reference-link-text">
                        {appointment.ref}
                      </span>
                    </td>
                    <td className="data-cell-content">{appointment.createdBy}</td>
                    <td className="data-cell-content secondary-text">{appointment.createdDate}</td>
                    <td className="data-cell-content emphasized-text">{appointment.scheduledDate}</td>
                    <td className="data-cell-content secondary-text">{appointment.duration}</td>
                    <td className="data-cell-content">{appointment.teamMember}</td>
                    <td className="data-cell-content emphasized-text">{appointment.price}</td>
                    <td className="data-cell-content">
                      <span className={`status-indicator-badge ${appointment.status.toLowerCase()}`}>
                        {appointment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="mobile-card-layout">
          <div className="card-list-container">
            {filteredAppointments.map((appointment, index) => (
              <div key={index} className="schedule-card-item">
                <div className="card-top-section">
                  <span className="card-reference-number">{appointment.ref}</span>
                  <span className={`status-indicator-badge ${appointment.status.toLowerCase()}`}>
                    {appointment.status}
                  </span>
                </div>
                <div className="card-details-section">
                  <div className="card-info-row">
                    <span className="info-label-text">Created by:</span>
                    <span className="info-value-text">{appointment.createdBy}</span>
                  </div>
                  <div className="card-info-row">
                    <span className="info-label-text">Scheduled:</span>
                    <span className="info-value-text emphasized-text">{appointment.scheduledDate}</span>
                  </div>
                  <div className="card-info-row">
                    <span className="info-label-text">Team member:</span>
                    <span className="info-value-text">{appointment.teamMember}</span>
                  </div>
                  <div className="card-info-row">
                    <span className="info-label-text">Duration:</span>
                    <span className="info-value-text">{appointment.duration}</span>
                  </div>
                  <div className="card-info-row">
                    <span className="info-label-text">Price:</span>
                    <span className="info-value-text emphasized-text">{appointment.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredAppointments.length === 0 && (
          <div className="no-results-state">
            <p className="no-results-message">No appointments found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Appoint;