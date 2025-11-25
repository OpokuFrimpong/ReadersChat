let documentLoaded = false;
let socket = null;
let currentMessageId = null;
let currentMessage = '';

// Initialize WebSocket connection
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
        console.log('✅ WebSocket connected');
    };
    
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'start') {
            // Create new assistant message container
            currentMessageId = 'msg-' + Date.now();
            const chatContainer = document.getElementById('chatContainer');
            const messageDiv = document.createElement('div');
            messageDiv.id = currentMessageId;
            messageDiv.className = 'message assistant-message';
            messageDiv.innerHTML = `
                <div class="message-icon assistant-icon">AI</div>
                <div class="message-content"></div>
            `;
            chatContainer.appendChild(messageDiv);
            currentMessage = '';
        }
        else if (data.type === 'token') {
            // Append token to current message
            currentMessage += data.content;
            const messageDiv = document.getElementById(currentMessageId);
            if (messageDiv) {
                const contentDiv = messageDiv.querySelector('.message-content');
                contentDiv.textContent = currentMessage;
                
                // Auto-scroll to bottom
                const chatContainer = document.getElementById('chatContainer');
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }
        else if (data.type === 'end') {
            // Message complete
            console.log('✅ Message complete');
        }
        else if (data.type === 'sources') {
            // Add sources to the message
            const messageDiv = document.getElementById(currentMessageId);
            if (messageDiv && data.sources && data.sources.length > 0) {
                const contentDiv = messageDiv.querySelector('.message-content');
                const sourcesDiv = document.createElement('div');
                sourcesDiv.className = 'sources';
                sourcesDiv.innerHTML = '<h4>Source Excerpts:</h4>';
                
                data.sources.forEach((source, index) => {
                    const sourceItem = document.createElement('div');
                    sourceItem.className = 'source-item';
                    sourceItem.textContent = `Source ${index + 1}: ${source}`;
                    sourcesDiv.appendChild(sourceItem);
                });
                
                contentDiv.appendChild(sourcesDiv);
            }
            
            // Reset current message
            currentMessage = '';
            currentMessageId = null;
        }
        else if (data.type === 'error') {
            // Show error message
            if (currentMessageId) {
                const messageDiv = document.getElementById(currentMessageId);
                if (messageDiv) {
                    messageDiv.remove();
                }
            }
            addMessage(`Error: ${data.content}`, 'assistant');
            currentMessage = '';
            currentMessageId = null;
        }
    };
    
    socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        addMessage('Connection error. Please refresh the page.', 'assistant');
    };
    
    socket.onclose = () => {
        console.log('🔌 WebSocket closed');
        socket = null;
    };
}

async function uploadDocument() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadStatus = document.getElementById('uploadStatus');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const welcomeMessage = document.getElementById('welcomeMessage');

    if (!fileInput.files[0]) {
        showStatus('Please select a file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Processing...';

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showStatus(`${data.message}`, 'success');
            documentLoaded = true;
            messageInput.disabled = false;
            sendBtn.disabled = false;
            if (welcomeMessage) {
                welcomeMessage.style.display = 'none';
            }
            
            // Initialize WebSocket connection
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                connectWebSocket();
            }
        } else {
            showStatus(`${data.detail || 'Error uploading file'}`, 'error');
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Process Document';
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message || !documentLoaded) return;

    // Add user message to chat
    addMessage(message, 'user');
    messageInput.value = '';

    // Ensure WebSocket is connected
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        connectWebSocket();
        
        // Wait for connection
        await new Promise((resolve) => {
            const checkConnection = setInterval(() => {
                if (socket && socket.readyState === WebSocket.OPEN) {
                    clearInterval(checkConnection);
                    resolve();
                }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkConnection);
                addMessage('Failed to connect. Please refresh the page.', 'assistant');
                resolve();
            }, 5000);
        });
    }

    // Send message via WebSocket
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ question: message }));
    } else {
        addMessage('Connection not ready. Please try again.', 'assistant');
    }
}

function addMessage(text, role, sources = null) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const icon = document.createElement('div');
    icon.className = `message-icon ${role}-icon`;
    icon.textContent = role === 'user' ? 'You' : 'AI';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;

    messageDiv.appendChild(icon);
    messageDiv.appendChild(content);

    // Add sources if available
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'sources';
        sourcesDiv.innerHTML = '<h4>Source Excerpts:</h4>';
        
        sources.forEach((source, index) => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            sourceItem.textContent = `Source ${index + 1}: ${source}`;
            sourcesDiv.appendChild(sourceItem);
        });
        
        content.appendChild(sourcesDiv);
    }

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showLoading() {
    const chatContainer = document.getElementById('chatContainer');
    const loadingDiv = document.createElement('div');
    const loadingId = 'loading-' + Date.now();
    loadingDiv.id = loadingId;
    loadingDiv.className = 'message assistant-message';
    
    loadingDiv.innerHTML = `
        <div class="message-icon assistant-icon">🤖</div>
        <div class="message-content">
            <div class="loading">
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
                <div class="loading-dot"></div>
            </div>
        </div>
    `;
    
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return loadingId;
}

function removeLoading(loadingId) {
    const loadingDiv = document.getElementById(loadingId);
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

async function clearChat() {
    const chatContainer = document.getElementById('chatContainer');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    try {
        await fetch('/history', {
            method: 'DELETE'
        });
        
        // Clear chat display
        chatContainer.innerHTML = '';
        
        // Show welcome message
        const welcome = document.createElement('div');
        welcome.className = 'welcome-message';
        welcome.id = 'welcomeMessage';
        welcome.innerHTML = `
            <div style="text-align: center;">
                <h1>Chat history cleared!</h1>
                <p style="color: #a0a0a0; margin-top: 1rem;">
                    Ask another question to continue.
                </p>
            </div>
        `;
        chatContainer.appendChild(welcome);
    } catch (error) {
        console.error('Error clearing chat:', error);
    }
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function showStatus(message, type) {
    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.textContent = message;
    uploadStatus.className = type;
    uploadStatus.style.display = 'block';
}
