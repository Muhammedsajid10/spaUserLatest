
// Graphs.jsx
import React from "react";
import "./Graphs.css";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const salesData = [
  { name: "Sat 14", appointments: 6200, value: 9000 },
  { name: "Sun 15", appointments: 6200, value: 9400 },
  { name: "Mon 16", appointments: 0, value: 0 },
  { name: "Tue 17", appointments: 5700, value: 3600 },
  { name: "Wed 18", appointments: 4600, value: 2800 },
  { name: "Thu 19", appointments: 2500, value: 3700 },
  { name: "Fri 20", appointments: 2700, value: 2100 },
  { name: "Sat 21", appointments: 100, value: 100 },
];

const appointmentData = [
  { day: "Sun 22", confirmed: 5 },
  { day: "Mon 23", confirmed: 0 },
  { day: "Tue 24", confirmed: 0 },
  { day: "Wed 25", confirmed: 0 },
  { day: "Thu 26", confirmed: 0 },
  { day: "Fri 27", confirmed: 0 },
  { day: "Sat 28", confirmed: 0 },
];

const Graphs = () => {
  return (
    <div className="dashboard-container">
      <div className="card">
        <div className="card-header">
          <h3>Recent sales</h3>
          <span>Last 7 days</span>
          <h1>AED 32,505.00</h1>
          <p>
            Appointments <strong>105</strong>
          </p>
          <p>
            Appointments value <strong>AED 25,625.00</strong>
          </p>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="appointments" stroke="#00C49F" />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Upcoming appointments</h3>
          <span>Next 7 days</span>
          <h1>5 booked</h1>
          <p>
            Confirmed appointments <strong>5</strong>
          </p>
          <p>
            Cancelled appointments <strong>0</strong>
          </p>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={appointmentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="confirmed" fill="#5B2EFF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Graphs;
