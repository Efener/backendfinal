import React from 'react';
import { Link } from 'react-router-dom';
import './SearchResultCard.css';

const SearchResultCard = ({ room, startDate, endDate }) => {
    return (
        <div className="search-result-card">
            <div className="card-image-placeholder">
                <span>{room.hotel_name.charAt(0)}</span>
            </div>
            <div className="card-content">
                <h3 className="hotel-name">{room.hotel_name}</h3>
                <p className="room-type">{room.type} - Room {room.room_number}</p>
                <p className="room-capacity">Capacity: {room.capacity} people</p>
                {room.discount_applied && <p className="discount-info">15% discount applied!</p>}
            </div>
            <div className="card-actions">
                <div className="price-section">
                    <span className="price">${room.price_per_night}</span>
                    <span className="per-night">/ night</span>
                </div>
                <Link
                    to={`/hotel/${room.hotel_id}`}
                    state={{ startDate, endDate }}
                    className="view-deal-button"
                >
                    View Deal
                </Link>
            </div>
        </div>
    );
};

export default SearchResultCard; 