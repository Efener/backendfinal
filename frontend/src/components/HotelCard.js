import React from 'react';
import { Link } from 'react-router-dom';
import './HotelCard.css';

const HotelCard = ({ hotel }) => {
    return (
        <div className="hotel-card">
            <div className="hotel-card-image">
                {/* In a real app, you would have an image here */}
                <div className="placeholder-image">
                    <span>{hotel.name.charAt(0)}</span>
                </div>
            </div>
            <div className="hotel-card-content">
                <h3>{hotel.name}</h3>
                <p>{hotel.location}</p>
                <Link to={`/hotel/${hotel.id}`} className="details-button">
                    View Details
                </Link>
            </div>
        </div>
    );
};

export default HotelCard; 