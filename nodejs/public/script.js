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
        const response = await fetch('http://localhost:3000/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showStatus(`✅ ${data.message}`, 'success');
            documentLoaded = true;
            messageInput.disabled = false;
            sendBtn.disabled = false;
            if (welcomeMessage) {
                welcomeMessage.style.display = 'none';
            }
        } else {
            showStatus(`❌ ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`❌ Error: ${error.message}`, 'error');
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
        const response = await fetch('http://localhost:3000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // Remove loading indicator
        removeLoading(loadingId);

        if (data.answer) {
            addMessage(data.answer, 'assistant', data.sources);
        } else {
            addMessage(`Error: ${data.error}`, 'assistant');
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
            sourceItem.textContent = `Source ${index + 1}: ${source.content}`;
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
    try {
        await fetch('http://localhost:3000/clear', {
            method: 'POST'
        });
        
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.innerHTML = '';
        showStatus('Chat history cleared', 'success');
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    }
}

function showStatus(message, type) {
    const uploadStatus = document.getElementById('uploadStatus');
    uploadStatus.textContent = message;
    uploadStatus.className = type;
    
    setTimeout(() => {
        uploadStatus.style.display = 'none';
    }, 5000);
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}
