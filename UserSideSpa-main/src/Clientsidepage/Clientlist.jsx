import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, MoreVertical, Plus } from 'lucide-react';
import './Clientlist.css';

const ClientDirectory = () => {
  const [clients, setClients] = useState([
    {
      id: 1,
      name: 'Maymoonah Patel',
      mobile: '+971 52 617 0783',
      reviews: '-',
      sales: 'AED 0',
      createdAt: '21 Jun 2025',
      initial: 'M',
      color: 'purple'
    },
    {
      id: 2,
      name: 'Cantid',
      mobile: '+971 58 529 6785',
      reviews: '-',
      sales: 'AED 180',
      createdAt: '20 Jun 2025',
      initial: 'C',
      color: 'blue'
    },
    {
      id: 3,
      name: 'Media',
      mobile: '+420 776 211 111',
      reviews: '-',
      sales: 'AED 650',
      createdAt: '19 Jun 2025',
      initial: 'M',
      color: 'indigo'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedClients, setSelectedClients] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const filteredAndSortedClients = useMemo(() => {
    let filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.mobile.includes(searchTerm) ||
      client.sales.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return filtered;
  }, [clients, searchTerm, sortBy]);

  const handleSelectClient = (clientId) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClients.length === filteredAndSortedClients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(filteredAndSortedClients.map(client => client.id));
    }
  };

  const addNewClient = () => {
    const newClient = {
      id: Date.now(),
      name: 'New Client',
      mobile: '+971 50 000 0000',
      reviews: '-',
      sales: 'AED 0',
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      initial: 'N',
      color: 'green'
    };
    setClients(prev => [newClient, ...prev]);
  };

  const toggleSort = () => {
    if (sortBy === 'newest') {
      setSortBy('oldest');
    } else if (sortBy === 'oldest') {
      setSortBy('name');
    } else {
      setSortBy('newest');
    }
  };

  return (
    <div className="client-directory-container">
      <div className="client-directory-wrapper">
        {/* Header */}
        <div className="directory-header">
          <div className="header-main">
            <div className="header-title-block">
              <h1 className="directory-title">
                Clients list
                <span className="directory-count">{clients.length}</span>
              </h1>
              <p className="directory-subtitle">
                View, add, edit and delete your client's details. 
                <span className="learn-more">Learn more</span>
              </p>
            </div>
            <div className="header-actions-block">
              <div className="dropdown-options">
                <button
                  onClick={() => setShowOptions(!showOptions)}
                  className="dropdown-toggle"
                >
                  <span>Options</span>
                  <ChevronDown className="icon-small" />
                </button>
                {showOptions && (
                  <div className="dropdown-list">
                    <button className="dropdown-link">Export</button>
                    <button className="dropdown-link">Import</button>
                    <button className="dropdown-link">Settings</button>
                  </div>
                )}
              </div>
              <button onClick={addNewClient} className="btn-add-client">
                <Plus className="icon-small" />
                <span className="btn-text">Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="directory-search-filters">
          <div className="search-input-box">
            <Search className="icon-search" />
            <input
              type="text"
              placeholder="Name, email or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-search"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-filters"
          >
            <Filter className="icon-small" />
            <span>Filters</span>
          </button>
          <div className="sort-toggle">
            <span className="sort-text">Created at (newest first)</span>
            <button onClick={toggleSort} className="sort-btn">
              <ChevronDown className="icon-small" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="client-table-container">
          <div className="client-table-header">
            <div className="table-row-client">
              <div className="table-col-checkbox">
                <input
                  type="checkbox"
                  checked={selectedClients.length === filteredAndSortedClients.length && filteredAndSortedClients.length > 0}
                  onChange={handleSelectAll}
                  className="checkbox-client"
                />
              </div>
              <div className="table-col-name">Client name</div>
              <div className="table-col-phone">Mobile number</div>
              <div className="table-col-reviews">Reviews</div>
              <div className="table-col-sales">Sales</div>
              <div className="table-col-created">
                Created at
                <ChevronDown className="icon-tiny" />
              </div>
            </div>
          </div>
          <div className="client-table-body">
            {filteredAndSortedClients.map((client) => (
              <div key={client.id} className="table-row-client">
                <div className="table-col-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedClients.includes(client.id)}
                    onChange={() => handleSelectClient(client.id)}
                    className="checkbox-client"
                  />
                </div>
                <div className="table-col-name">
                  <div className="client-avatar-name">
                    <div className={`avatar-color avatar-${client.color}`}>
                      {client.initial}
                    </div>
                    <div className="client-meta">
                      <div className="client-full-name">{client.name}</div>
                      <div className="client-secondary-phone">{client.mobile}</div>
                    </div>
                  </div>
                </div>
                <div className="table-col-phone">{client.mobile}</div>
                <div className="table-col-reviews">{client.reviews}</div>
                <div className="table-col-sales">{client.sales}</div>
                <div className="table-col-created">
                  <span className="created-date-full">{client.createdAt}</span>
                  <span className="created-date-short">{client.createdAt.split(' ')[0]} {client.createdAt.split(' ')[1]}</span>
                  <button className="btn-more">
                    <MoreVertical className="icon-small" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredAndSortedClients.length === 0 && (
            <div className="client-no-results">
              <p>No clients found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDirectory;
