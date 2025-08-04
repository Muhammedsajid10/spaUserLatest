import React, { useState } from 'react';
import './Teammembers.css';
import { FiSearch, FiFilter, FiMoreHorizontal } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import { MdKeyboardArrowDown } from 'react-icons/md';

const teamMembers = [
  {
    id: 1,
    name: 'margirita',
    email: 'stjernevang@hotmail.com',
    phone: '+971 50 239 8175',
    status: 'Pending invitation',
    statusColor: '#b46900',
    avatar: 'M',
    avatarBg: '#f1e7ff',
    avatarColor: '#8846d3',
    reviews: null,
  },
  {
    id: 2,
    name: 'Icha Faradisa',
    email: 'chacha.faradisa@gmail.com',
    phone: '+971 54 496 5410',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5c5?w=40&h=40&fit=crop&crop=face',
    isImage: true,
    rating: 5.0,
    reviewCount: 2,
  },
  {
    id: 3,
    name: 'Nining',
    email: 'nining@example.com',
    phone: '+971 50 239 8175',
    status: 'Pending invitation',
    statusColor: '#b46900',
    avatar: 'N',
    avatarBg: '#f1e7ff',
    avatarColor: '#8846d3',
    reviews: null,
  },
  {
    id: 4,
    name: 'Onni',
    email: 'onni@example.com',
    phone: '+971 54 496 5410',
    avatar: 'O',
    avatarBg: '#f1e7ff',
    avatarColor: '#8846d3',
    rating: 5.0,
    reviewCount: 2,
  },
  {
    id: 5,
    name: 'Putri',
    email: 'putri@example.com',
    phone: '+971 50 239 8175',
    status: 'Pending invitation',
    statusColor: '#b46900',
    avatar: 'P',
    avatarBg: '#f1e7ff',
    avatarColor: '#8846d3',
    reviews: null,
  },
  {
    id: 6,
    name: 'Sarita',
    email: 'sarita@example.com',
    phone: '+971 54 496 5410',
    avatar: 'S',
    avatarBg: '#f1e7ff',
    avatarColor: '#8846d3',
    rating: 5.0,
    reviewCount: 2,
  },
  {
    id: 7,
    name: 'Intan',
    email: 'intan@example.com',
    phone: '+971 50 239 8175',
    status: 'Pending invitation',
    statusColor: '#b46900',
    avatar: 'I',
    avatarBg: '#f1e7ff',
    avatarColor: '#8846d3',
    reviews: null,
  },
  {
    id: 8,
    name: 'Dayu',
    email: 'dayu@example.com',
    phone: '+971 54 496 5410',
    avatar: 'D',
    avatarBg: '#f1e7ff',
    avatarColor: '#8846d3',
    rating: 5.0,
    reviewCount: 2,
  },
];

const TeamMembers = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = teamMembers.filter((member) =>
    member.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="team-members-container">
      <div className="team-members-wrapper">
        {/* Header */}
        <div className="team-header">
          <div className="team-title-section">
            <h1 className="team-title">Team members</h1>
            <span className="team-count">10</span>
          </div>
          <div className="team-header-actions">
            <button className="team-options-btn">
              <span>Options</span>
              <MdKeyboardArrowDown size={16} />
            </button>
            <button className="team-add-btn">Add</button>
          </div>
        </div>

        {/* Notification Banner */}
        <div className="team-notification-banner">
          <div className="team-notification-content">
            <div className="team-notification-text">
              <span>We're making changes to our pricing and billing structure, activate your plan to ensure uninterrupted access from 1 July 2025. </span>
              <a href="#" className="team-learn-more">Learn more</a>
            </div>
            <button className="team-activate-btn">Activate plan</button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="team-controls">
          <div className="team-search-wrapper">
            <FiSearch className="team-search-icon" size={20} />
            <input
              type="text"
              placeholder="Search team members"
              className="team-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="team-filter-btn">
            <span>Filters</span>
            <FiFilter size={16} />
          </button>
          <button className="team-sort-btn">
            <span>Custom order</span>
            <FiMoreHorizontal size={16} />
          </button>
        </div>

        {/* Table */}
        <div className="team-table-container">
          <div className="team-table-wrapper">
            <table className="team-table">
              <thead className="team-table-header">
                <tr>
                  <th className="team-th-checkbox">
                    <input type="checkbox" className="team-checkbox" />
                  </th>
                  <th className="team-th-name">
                    <div className="team-th-content">
                      Name
                      <MdKeyboardArrowDown size={16} className="team-sort-icon" />
                    </div>
                  </th>
                  <th className="team-th-contact">Contact</th>
                  <th className="team-th-rating">
                    <div className="team-th-content">
                      Rating
                      <MdKeyboardArrowDown size={16} className="team-sort-icon" />
                    </div>
                  </th>
                  <th className="team-th-actions"></th>
                </tr>
              </thead>
              <tbody className="team-table-body">
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="team-table-row">
                      <td className="team-td-checkbox">
                        <input type="checkbox" className="team-checkbox" />
                      </td>
                      <td className="team-td-name">
                        <div className="team-member-info">
                          {member.isImage ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="team-avatar-image"
                            />
                          ) : (
                            <div
                              className="team-avatar-placeholder"
                              style={{
                                backgroundColor: member.avatarBg,
                                color: member.avatarColor,
                              }}
                            >
                              {member.avatar}
                            </div>
                          )}
                          <div className="team-member-details">
                            <div className="team-member-name">{member.name}</div>
                            {member.status && (
                              <div className="team-member-status">
                                <div className="team-status-dot"></div>
                                <span style={{ color: member.statusColor }}>
                                  {member.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="team-td-contact">
                        <div className="team-contact-info">
                          <a
                            href={`mailto:${member.email}`}
                            className="team-email-link"
                          >
                            {member.email}
                          </a>
                          <div className="team-phone">{member.phone}</div>
                        </div>
                      </td>
                      <td className="team-td-rating">
                        {member.reviews === null && member.rating === undefined ? (
                          <span className="team-no-reviews">No reviews yet</span>
                        ) : (
                          <div className="team-rating-info">
                            <span className="team-rating-score">
                              {member.rating.toFixed(1)}
                            </span>
                            <FaStar size={14} className="team-rating-star" />
                            <span className="team-review-count">
                              {member.reviewCount} reviews
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="team-td-actions">
                        <button className="team-actions-btn">
                          <span>Actions</span>
                          <MdKeyboardArrowDown size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="team-empty-state">
                      No team members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamMembers;