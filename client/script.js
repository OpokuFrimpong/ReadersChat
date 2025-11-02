let documentLoaded = false;

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
            showStatus(` ${data.message}`, 'success');
            documentLoaded = true;
            messageInput.disabled = false;
            sendBtn.disabled = false;
            if (welcomeMessage) {
                welcomeMessage.style.display = 'none';
            }
        } else {
            showStatus(` ${data.detail || 'Error uploading file'}`, 'error');
        }
    } catch (error) {
        showStatus(` Error: ${error.message}`, 'error');
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

    // Show loading indicator
    const loadingId = showLoading();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: message })
        });

        const data = await response.json();

        // Remove loading indicator
        removeLoading(loadingId);

        if (response.ok && data.answer) {
            addMessage(data.answer, 'assistant', data.sources);
        } else {
            addMessage(`Error: ${data.detail || 'Unknown error'}`, 'assistant');
        }
    } catch (error) {
        removeLoading(loadingId);
        addMessage(`Error: ${error.message}`, 'assistant');
    }
}

function addMessage(text, role, sources = null) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;

    const icon = document.createElement('div');
    icon.className = `message-icon ${role}-icon`;
    icon.textContent = role === 'user' ? '👤' : '🤖';

    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;

    messageDiv.appendChild(icon);
    messageDiv.appendChild(content);

    // Add sources if available
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'sources';
        sourcesDiv.innerHTML = '<h4>📄 Source Excerpts:</h4>';
        
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
