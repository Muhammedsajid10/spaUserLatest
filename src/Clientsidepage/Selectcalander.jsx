import React from "react";
import "./Selectcalander.css";

const staff = [
  { name: "margrita", initials: "M" },
  { name: "Icha Faradisa",initials: "I",  },
  { name: "Nining Niken", initials: "N" },
  { name: "Onni", initials: "O" },
  { name: "Putri Dahlia", initials: "PD" },
  { name: "Employee", initials: "E" },
  { name: "sarita Lamsal", initials: "S" },
  { name: "Intan Amella", initials: "M" },
  { name: "Dayu Eka", initials: "D" },
  { name: "Allora Spa Dubal", initials: "A"},
];

const times = ["11:00", "12:00", "13:00", "14:00"];

const ScheduleGrid = () => {
  const currentTime = "12:51";

  return (
    <div className="schedule-container">
      <div className="schedule-header">
        {staff.map((s, i) => (
          <div className="staff-card" key={i}>
            {s.image ? (
              <img src={s.image} alt={s.name} className="staff-img" />
            ) : s.logo ? (
              <img src={s.logo} alt={s.name} className="staff-img logo-img" />
            ) : (
              <div className="staff-initials">{s.initials}</div>
            )}
            <div className="staff-name">{s.name}</div>
          </div>
        ))}
      </div>

      <div className="schedule-grid">
        {times.map((time, index) => (
          <div className="time-row" key={index}>
            <div className="time-label">{time}</div>
            <div className="time-slots">
              {staff.map((_, i) => (
                <div
                  key={i}
                  className={`slot-cell ${
                    time === "12:00" && (i === 3 || i === 4 || i === 5) ? "unavailable" : ""
                  }`}
                ></div>
              ))}
            </div>
          </div>
        ))}

        {/* Red current time line */}
        <div className="current-time-line" style={{ top: "101px" }}>
          <span className="current-time-label">{currentTime}</span>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;
