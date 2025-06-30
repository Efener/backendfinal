import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../services/api';
import './RoomManagementPage.css';

const RoomManagementPage = () => {
    const { hotelId } = useParams();
    const [rooms, setRooms] = useState([]);
    const [roomNumber, setRoomNumber] = useState('');
    const [type, setType] = useState('');
    const [price, setPrice] = useState('');
    const [capacity, setCapacity] = useState(1);
    const [error, setError] = useState('');
    const [hotelName, setHotelName] = useState('');

    const fetchRooms = async () => {
        try {
            const response = await API.get(`/admin/hotels/${hotelId}/rooms`);
            setRooms(response.data);
        } catch (err) {
            setError('Failed to fetch rooms.');
        }
    };
    
    const fetchHotelDetails = async () => {
        try {
            const response = await API.get(`/admin/hotels/${hotelId}`);
            setHotelName(response.data.name);
        } catch (err) {
             console.error("Could not fetch hotel name");
        }
    };

    useEffect(() => {
        fetchHotelDetails();
        fetchRooms();
    }, [hotelId]);

    const handleAddRoom = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await API.post(`/admin/hotels/${hotelId}/rooms`, {
                room_number: roomNumber,
                type,
                price_per_night: price,
                capacity
            });
            // Reset form and refetch rooms
            setRoomNumber('');
            setType('');
            setPrice('');
            setCapacity(1);
            fetchRooms();
        } catch (err) {
            setError('Failed to add room.');
        }
    };

    return (
        <div className="room-management-container">
            <div className="room-list-container">
                <h3>Rooms for {hotelName}</h3>
                <div className="room-list">
                    {rooms.length > 0 ? rooms.map(room => (
                        <div key={room.id} className="room-item">
                            <div className="room-item-info">
                                <h4>Room {room.room_number} - {room.type}</h4>
                                <p>Capacity: {room.capacity}, Price: ${room.price_per_night}</p>
                            </div>
                            {/* Edit/Delete buttons can be added here */}
                        </div>
                    )) : <p>No rooms found for this hotel.</p>}
                </div>
            </div>

            <div className="add-room-container">
                <h3>Add New Room</h3>
                <div className="add-room-form">
                    <form onSubmit={handleAddRoom}>
                        <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="Room Number" required />
                        <input type="text" value={type} onChange={(e) => setType(e.target.value)} placeholder="Room Type (e.g., Deluxe)" required />
                        <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price per night" required />
                        <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Capacity" min="1" required />
                        <button type="submit">Add Room</button>
                    </form>
                    {error && <p className="error-message">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default RoomManagementPage; 