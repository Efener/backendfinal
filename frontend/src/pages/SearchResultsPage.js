import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../services/api';
import SearchResultCard from '../components/SearchResultCard';
import './SearchResultsPage.css';

const SearchResultsPage = () => {
    const [searchParams] = useSearchParams();
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const destination = searchParams.get('destination');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const people = searchParams.get('people');

    useEffect(() => {
        const fetchResults = async () => {
            if (!destination || !startDate || !endDate || !people) {
                setError('Missing search parameters.');
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const response = await API.get(`/search/search`, {
                    params: { destination, startDate, endDate, people }
                });
                setResults(response.data);
                setError('');
            } catch (err) {
                setError('Failed to fetch search results.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [searchParams]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>{error}</div>;
    }

    return (
        <div className="search-results-container">
            <h2>Available rooms in {destination}</h2>
            <div className="results-list">
                {results.length > 0 ? (
                    results.map((room) => (
                        <SearchResultCard 
                            key={room.id} 
                            room={room}
                            startDate={startDate}
                            endDate={endDate}
                        />
                    ))
                ) : (
                    <p>No available rooms found for your search criteria.</p>
                )}
            </div>
        </div>
    );
};

export default SearchResultsPage; 