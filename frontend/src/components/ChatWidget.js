import React, { useState } from 'react';
import API from '../services/api';
import HotelCard from './HotelCard';
import './ChatWidget.css';

// Simple chat bubble icon
const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([{ from: 'ai', type: 'text', content: "Hi! How can I help you find a hotel?" }]);
    const [input, setInput] = useState('');

    const toggleChat = () => setIsOpen(!isOpen);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { from: 'user', type: 'text', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        try {
            const response = await API.post('/ai/chat', { message: input });
            const aiResponse = response.data.reply;

            let aiMessage;
            if (typeof aiResponse === 'object' && aiResponse.type === 'hotel_list') {
                aiMessage = { from: 'ai', type: 'hotel_list', content: aiResponse.data };
            } else {
                aiMessage = { from: 'ai', type: 'text', content: aiResponse };
            }
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            const errorMessage = { from: 'ai', type: 'text', content: "Sorry, I'm having trouble connecting." };
            setMessages(prev => [...prev, errorMessage]);
        }
    };

    return (
        <div className="chat-widget">
            {isOpen && (
                <div className="chat-window">
                    <div className="chat-header">
                        <h3>AI Assistant</h3>
                        <button onClick={toggleChat} className="close-btn">&times;</button>
                    </div>
                    <div className="chat-body">
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.from}`}>
                                {msg.type === 'text' ? (
                                    <p dangerouslySetInnerHTML={{ __html: msg.content }} />
                                ) : (
                                    <div className="hotel-cards-container">
                                        {msg.content.map(hotel => (
                                            <HotelCard key={hotel.id} hotel={{...hotel, name: hotel.hotel_name}} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="chat-footer">
                        <form onSubmit={handleSendMessage}>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything..."
                            />
                            <button type="submit">Send</button>
                        </form>
                    </div>
                </div>
            )}
            <button onClick={toggleChat} className="chat-bubble">
                <ChatIcon />
            </button>
        </div>
    );
};

export default ChatWidget; 