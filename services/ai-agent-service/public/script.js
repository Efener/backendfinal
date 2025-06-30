document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    const sendMessage = async () => {
        const messageText = userInput.value.trim();
        if (messageText === '') return;

        // Display user message
        appendMessage(messageText, 'user-message');
        userInput.value = '';

        try {
            // Send message to backend
            const response = await fetch('/api/v1/ai/chat', { // Proxied through the gateway
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: messageText }),
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            // Display AI response
            appendMessage(data.reply, 'ai-message');
        } catch (error) {
            console.error('Error sending message:', error);
            appendMessage('Sorry, I am having trouble connecting. Please try again later.', 'ai-message');
        }
    };

    const appendMessage = (text, className) => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${className}`;
        const p = document.createElement('p');
        p.innerHTML = text; // Use innerHTML to render line breaks
        messageElement.appendChild(p);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}); 