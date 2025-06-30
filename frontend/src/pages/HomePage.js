import React, { useState, useEffect } from 'react';
import SearchBar from '../components/SearchBar';
import HotelCard from '../components/HotelCard';
import MapContainer from '../components/MapContainer';
import API from '../services/api';
import './HomePage.css';

const HomePage = () => {
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHotels = async () => {
            try {
                const response = await API.get('/admin/hotels');
                // Show a selection of hotels, e.g., the first 6
                setHotels(response.data.slice(0, 6));
            } catch (error) {
                console.error("Failed to fetch featured hotels:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHotels();
    }, []);

    return (
        <div className="home-page">
            <div className="hero-section">
                <h1>Find your next stay</h1>
                <p>Search low prices on hotels, homes and much more...</p>
                <SearchBar />
            </div>

            <div className="main-content-area">
                <div className="featured-hotels">
                    <h2>Featured Hotels</h2>
                    {loading ? (
                        <p>Loading hotels...</p>
                    ) : (
                        <div className="hotels-grid">
                            {hotels.map(hotel => (
                                <HotelCard key={hotel.id} hotel={hotel} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="home-map-container">
                    <MapContainer hotels={hotels} />
                </div>
            </div>
        </div>
    );
};

export default HomePage; 