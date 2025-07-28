import React from 'react';
import './Todayandbody.css';

const appointments = [
    {
        date: '20 Jun',
        time: 'Fri, 20 Jun 2025 16 : 15',
        status: 'Booked',
        title: 'Lava Stone Massage',
        type: 'Walk-In, 1 h with Dayu',
        payment: 'cash',
        price: 'AED 300',
    },
    {
        date: '15 Jun',
        time: 'Sun, 15 Jun 2025 17 : 30',
        status: 'Completed',
        title: 'Relaxing Massage',
        type: 'Walk-In, 1 h with Sarita',
        payment: '',
        price: 'AED 250',
    },
    {
        date: '15 Jun',
        time: 'Sun, 15 Jun 2025 21 : 40',
        status: 'Completed',
        title: 'Relaxing Massage',
        type: 'Samar, 1 h with Putri',
        payment: '',
        price: 'AED 200',
    },
    {
        date: '20 Jun',
        time: 'Fri, 20 Jun 2025 16 : 15',
        status: 'Booked',
        title: 'Lava Stone Massage',
        type: 'Walk-In, 1 h with Dayu',
        payment: 'cash',
        price: 'AED 300',
    },
    {
        date: '15 Jun',
        time: 'Sun, 15 Jun 2025 17 : 30',
        status: 'Completed',
        title: 'Relaxing Massage',
        type: 'Walk-In, 1 h with Sarita',
        payment: '',
        price: 'AED 250',
    },
    {
        date: '20 Jun',
        time: 'Fri, 20 Jun 2025 16 : 15',
        status: 'Booked',
        title: 'Lava Stone Massage',
        type: 'Walk-In, 1 h with Dayu',
        payment: 'cash',
        price: 'AED 300',
    },
    {
        date: '15 Jun',
        time: 'Sun, 15 Jun 2025 17 : 30',
        status: 'Completed',
        title: 'Relaxing Massage',
        type: 'Walk-In, 1 h with Sarita',
        payment: '',
        price: 'AED 250',
    },
    {
        date: '15 Jun',
        time: 'Sun, 15 Jun 2025 21 : 40',
        status: 'Completed',
        title: 'Relaxing Massage',
        type: 'Samar, 1 h with Putri',
        payment: '',
        price: 'AED 200',
    },
    {
        date: '20 Jun',
        time: 'Fri, 20 Jun 2025 16 : 15',
        status: 'Booked',
        title: 'Lava Stone Massage',
        type: 'Walk-In, 1 h with Dayu',
        payment: 'cash',
        price: 'AED 300',
    },
    {
        date: '20 Jun',
        time: 'Fri, 20 Jun 2025 16 : 15',
        status: 'Booked',
        title: 'Lava Stone Massage',
        type: 'Walk-In, 1 h with Dayu',
        payment: 'cash',
        price: 'AED 300',
    },
    {
        date: '15 Jun',
        time: 'Sun, 15 Jun 2025 17 : 30',
        status: 'Completed',
        title: 'Relaxing Massage',
        type: 'Walk-In, 1 h with Sarita',
        payment: '',
        price: 'AED 250',
    },
    {
        date: '15 Jun',
        time: 'Sun, 15 Jun 2025 21 : 40',
        status: 'Completed',
        title: 'Relaxing Massage',
        type: 'Samar, 1 h with Putri',
        payment: '',
        price: 'AED 200',
    },
    {
        date: '20 Jun',
        time: 'Fri, 20 Jun 2025 16 : 15',
        status: 'Booked',
        title: 'Lava Stone Massage',
        type: 'Walk-In, 1 h with Dayu',
        payment: 'cash',
        price: 'AED 300',
    },
];

const AppointmentsRedesign = () => {
    return (
        <div className='appointments-layout'>
            <div className="appointments-left-section">
                <div className="activity-container">
                    <h2>Appointments Activity</h2>

                    <div className="activity-scroll-wrapper">
                        <div className="activity-list">
                            {appointments.map((app, index) => (
                                <div key={index} className="activity-card">
                                    <div className="activity-date">{app.date}</div>

                                    <div className="activity-details">
                                        <div className="activity-time-status">
                                            <span className="activity-time">{app.time}</span>
                                            <span className={`activity-status ${app.status.toLowerCase()}`}>
                                                {app.status}
                                            </span>
                                        </div>

                                        <div className="activity-title">{app.title}</div>
                                        <div className="activity-type">{app.type}</div>
                                        {app.payment && <div className="activity-payment">{app.payment}</div>}
                                    </div>

                                    <div className="activity-price">{app.price}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="appointments-right-section">
                <div className="next-appointment-container">
                    <div>
                        <h3 className="next-appointment-heading">Today's Next Appointments</h3>
                    </div>
                    <div className='next-appointment-box'>
                        <div className="next-date-box">
                            <div className="next-date">21</div>
                            <div className="next-month">Jun</div>
                        </div>
                        <div className="next-details">
                            <div className="next-time-status">
                                <span className="next-time">Sat 15:30</span>
                                <span className="next-status">Booked</span>
                            </div>
                            <div className="next-title">Relaxing Massage</div>
                            <div className="next-info">Adna, 1h with Dayu</div>
                            <div className="next-location">In fairmont wet cupping</div>
                        </div>
                        <div className="next-price">AED 250</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentsRedesign;
