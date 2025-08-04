import React from "react";
import "./Topservices.css";

const topServices = [
  { service: "Relaxing Massage", thisMonth: 282, lastMonth: 514 },
  { service: "Deep tissue Massage", thisMonth: 13, lastMonth: 7 },
  { service: "Mini Facial", thisMonth: 5, lastMonth: 3 },
  { service: "Candle Massage", thisMonth: 5, lastMonth: 13 },
  { service: "Balinese Massage", thisMonth: 5, lastMonth: 5 },
];

const topTeamMembers = [
  { name: "sarita Lamsal", thisMonth: "AED 13,809.00", lastMonth: "AED 18,173.00" },
  { name: "Dayu Eka", thisMonth: "AED 12,250.00", lastMonth: "AED 2,825.00" },
  { name: "Icha Faradisa", thisMonth: "AED 11,440.00", lastMonth: "AED 18,700.00" },
  { name: "Employee", thisMonth: "AED 10,930.00", lastMonth: "AED 23,355.00" },
  { name: "Nining Niken", thisMonth: "AED 10,560.00", lastMonth: "AED 19,374.00" },
];

const TopStats = () => {
  return (
    <div className="top-stats-container">
      <div className="stats-card">
        <h2 className="stats-title">Top services</h2>
        <div className="stats-table">
          <div className="stats-header stats-row">
            <div className="stats-cell">Service</div>
            <div className="stats-cell">This month</div>
            <div className="stats-cell">Last month</div>
          </div>
          {topServices.map((item, index) => (
            <div className="stats-row" key={index}>
              <div className="stats-cell">{item.service}</div>
              <div className="stats-cell">{item.thisMonth}</div>
              <div className="stats-cell">{item.lastMonth}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-card">
        <h2 className="stats-title">Top team member</h2>
        <div className="stats-table">
          <div className="stats-header stats-row">
            <div className="stats-cell">Team member</div>
            <div className="stats-cell">This month</div>
            <div className="stats-cell">Last month</div>
          </div>
          {topTeamMembers.map((member, index) => (
            <div className="stats-row" key={index}>
              <div className="stats-cell">{member.name}</div>
              <div className="stats-cell">{member.thisMonth}</div>
              <div className="stats-cell">{member.lastMonth}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopStats;