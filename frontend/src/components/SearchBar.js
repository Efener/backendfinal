import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SearchBar.css';

const SearchBar = () => {
    const [destination, setDestination] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [people, setPeople] = useState(1);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!destination || !startDate || !endDate) {
            setError('Please fill in all fields.');
            return;
        }
        setError('');

        try {
            // The search logic will be implemented here, 
            // for now, we just navigate with the query params
            navigate(`/search?destination=${destination}&startDate=${startDate}&endDate=${endDate}&people=${people}`);
        } catch (err) {
            setError('Search failed. Please try again.');
            console.error(err);
        }
    };

    return (
        <div className="search-bar-container">
            <form onSubmit={handleSearch} className="search-form">
                <div className="form-group">
                    <label>Destination</label>
                    <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g., Istanbul"
                    />
                </div>
                <div className="form-group">
                    <label>Check-in</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>Check-out</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label>People</label>
                    <input
                        type="number"
                        value={people}
                        onChange={(e) => setPeople(e.target.value)}
                        min="1"
                    />
                </div>
                <button type="submit" className="search-button">Search</button>
            </form>
            {error && <p className="error-message">{error}</p>}
        </div>
    );
};

export default SearchBar; 