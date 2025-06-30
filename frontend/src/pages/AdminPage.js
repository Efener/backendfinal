import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import './AdminPage.css';

const AdminPage = () => {
    const [hotels, setHotels] = useState([]);
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    const fetchHotels = async () => {
        try {
            const response = await API.get('/admin/hotels');
            setHotels(response.data);
        } catch (err) {
            setError('Failed to fetch hotels.');
        }
    };

    useEffect(() => {
        fetchHotels();
    }, []);

    const handleAddHotel = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await API.post('/admin/hotels', { name, location, description });
            // Reset form and refetch hotels
            setName('');
            setLocation('');
            setDescription('');
            fetchHotels();
        } catch (err) {
            setError('Failed to add hotel.');
        }
    };

    return (
        <div className="admin-container">
            <div className="hotel-list-container">
                <h3>Existing Hotels</h3>
                <div className="hotel-list">
                    {hotels.length > 0 ? hotels.map(hotel => (
                        <div key={hotel.id} className="hotel-item">
                            <div className="hotel-item-info">
                                <h4>{hotel.name}</h4>
                                <p>{hotel.location}</p>
                            </div>
                            <Link to={`/admin/hotel/${hotel.id}/rooms`}>Manage Rooms</Link>
                        </div>
                    )) : <p>No hotels found. Add one to get started!</p>}
                </div>
            </div>
            
            <div className="add-hotel-container">
                <h3>Add New Hotel</h3>
                <div className="add-hotel-form">
                    <form onSubmit={handleAddHotel}>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hotel Name" required />
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (e.g., Istanbul)" required />
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"></textarea>
                        <button type="submit">Add Hotel</button>
                    </form>
                    {error && <p className="error-message">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default AdminPage; 