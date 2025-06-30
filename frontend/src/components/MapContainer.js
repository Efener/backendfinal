import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%'
};

// Default center of the map
const defaultCenter = {
    lat: 41.015137, // Istanbul
    lng: 28.979530
};

const MapContainer = ({ hotels }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
        libraries: ['geocoding'],
    });

    const [markers, setMarkers] = useState([]);
    
    useEffect(() => {
        if (isLoaded && hotels.length > 0) {
            const geocoder = new window.google.maps.Geocoder();
            const newMarkers = [];

            hotels.forEach(hotel => {
                const address = hotel.location || (hotel.hotel_name || hotel.name);
                geocoder.geocode({ 'address': address }, (results, status) => {
                    if (status === 'OK') {
                        newMarkers.push({
                            id: hotel.id,
                            position: results[0].geometry.location,
                            title: hotel.hotel_name || hotel.name
                        });
                        // Update state with all new markers
                        setMarkers([...newMarkers]);
                    } else {
                        console.error('Geocode was not successful for the following reason: ' + status);
                    }
                });
            });
        }
    }, [isLoaded, hotels]);

    const center = markers.length > 0 ? markers[0].position : defaultCenter;

    return isLoaded ? (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={markers.length > 0 ? 10 : 8}
        >
            {markers.map(marker => (
                <Marker
                    key={marker.id}
                    position={marker.position}
                    title={marker.title}
                />
            ))}
        </GoogleMap>
    ) : <p>Loading map...</p>
}

export default React.memo(MapContainer); 