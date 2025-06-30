import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import API from '../services/api';
import AuthContext from '../context/AuthContext';
import MapContainer from '../components/MapContainer';
import './HotelDetailPage.css';

const HotelDetailPage = () => {
    const { id: hotelId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    
    const [hotel, setHotel] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State for the new date pickers and availability
    const [startDate, setStartDate] = useState(location.state?.startDate || '');
    const [endDate, setEndDate] = useState(location.state?.endDate || '');
    const [availableRoomIds, setAvailableRoomIds] = useState(new Set());

    const [newCommentText, setNewCommentText] = useState('');
    const [ratings, setRatings] = useState({ cleanliness: 5, location: 5, service: 5, value_for_money: 5 });

    // Fetch hotel details and comments
    useEffect(() => {
        const fetchHotelDetails = async () => {
            setLoading(true);
            try {
                const hotelRes = await API.get(`/search/hotels/${hotelId}`);
                setHotel(hotelRes.data);
                
                const commentsRes = await API.get(`/comments/hotels/${hotelId}/comments`);
                setComments(commentsRes.data);
            } catch (err) {
                setError('Failed to load hotel details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHotelDetails();
    }, [hotelId]);

    // Check availability when dates change
    useEffect(() => {
        const checkAvailability = async () => {
            if (startDate && endDate && new Date(startDate) < new Date(endDate)) {
                try {
                    const response = await API.get(`/search/${hotelId}/availability`, {
                        params: { startDate, endDate }
                    });
                    setAvailableRoomIds(new Set(response.data));
                } catch (error) {
                    console.error("Failed to check availability", error);
                    setAvailableRoomIds(new Set());
                }
            } else {
                 setAvailableRoomIds(new Set());
            }
        };
        checkAvailability();
    }, [startDate, endDate, hotelId]);

    const handleBooking = async (roomId) => {
        if (!user) return navigate('/login');
        if (!availableRoomIds.has(roomId)) {
            return alert("This room is not available for the selected dates. Please choose different dates.");
        }
        try {
            await API.post('/booking/bookings', { room_id: roomId, start_date: startDate, end_date: endDate });
            alert('Booking successful!');
            navigate('/');
        } catch (err) {
            alert(err.response?.data?.message || 'Booking failed.');
        }
    };
    
    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newCommentText.trim()) return alert("Please write a comment.");
        try {
            await API.post(`/comments/hotels/${hotelId}/comments`, { comment_text: newCommentText, ratings });
            setNewCommentText('');
            // Refetch comments
            const commentsRes = await API.get(`/comments/hotels/${hotelId}/comments`);
            setComments(commentsRes.data);
        } catch (err) {
            alert('Failed to post comment.');
        }
    };

    if (loading) return <div>Loading hotel details...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;
    if (!hotel) return <div>Hotel not found.</div>;

    return (
        <div className="detail-page-container">
            <div className="hotel-main-content">
                <h2>{hotel.name}</h2>
                <p>{hotel.location}</p>
                <p>{hotel.description}</p>
                
                <div className="comments-section">
                    <h3>Comments</h3>
                    {comments.length > 0 ? (
                        <ul>
                            {comments.map(comment => (
                                <li key={comment._id || comment.id} className="comment-item">
                                    <p>{comment.comment_text}</p>
                                    <small>Ratings - Cleanliness: {comment.ratings.cleanliness}, Service: {comment.ratings.service}</small>
                                </li>
                            ))}
                        </ul>
                    ) : <p>No comments yet. Be the first to comment!</p>}
                </div>
                
                {user ? (
                    <div className="new-comment-form">
                        <h4>Leave a Comment</h4>
                        <form onSubmit={handlePostComment}>
                            <textarea value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Share your experience..." />
                            {/* Simplified ratings for now */}
                            <button type="submit">Post Comment</button>
                        </form>
                    </div>
                ) : <p><Link to="/login">Log in</Link> to leave a comment.</p>}
            </div>

            <div className="sidebar-content">
                <div className="detail-map-container">
                    <MapContainer hotels={[hotel]} />
                </div>
                <div className="rooms-container">
                     <h3>Check Availability & Book</h3>
                     <div className="date-picker-container">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                     </div>
                     <ul className="room-list">
                        {hotel.rooms && hotel.rooms.length > 0 ? hotel.rooms.map(room => (
                            <li key={room.id} className="room-item-detail">
                                <div className="info">
                                    <h4>{room.type}</h4>
                                    <p>Room {room.room_number} - Capacity: {room.capacity}</p>
                                </div>
                                <button 
                                    onClick={() => handleBooking(room.id)} 
                                    className="book-now-btn"
                                    disabled={!availableRoomIds.has(room.id)}
                                >
                                    {availableRoomIds.has(room.id) ? `Book for $${room.price_per_night}` : 'Unavailable'}
                                </button>
                            </li>
                        )) : <p>No rooms found for this hotel.</p>}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default HotelDetailPage; 