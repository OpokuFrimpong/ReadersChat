# ReadersChat - Node.js Version

This is the Node.js implementation of ReadersChat with Express.js backend and vanilla JavaScript frontend.

## Setup Instructions

### 1. Install Dependencies

```bash
cd nodejs
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `nodejs` folder:

```
OPENAI_API_KEY=your-openai-api-key-here
PORT=3000
```

### 3. Run the Application

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
nodejs/
├── server.js              # Express.js backend server
├── package.json           # Node.js dependencies
├── .env                   # Environment variables (not tracked)
├── .env.example           # Example environment file
├── public/
│   ├── index.html        # Main HTML file
│   ├── styles.css        # Styling
│   └── script.js         # Frontend JavaScript
└── uploads/              # Temporary file uploads (auto-created)
```

## 🔧 API Endpoints

- `POST /upload` - Upload and process document
- `POST /chat` - Send message and get AI response
- `POST /clear` - Clear chat history
- `GET /history` - Get chat history

## ⚙️ Technology Stack

- **Backend**: Express.js, LangChain, OpenAI
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Vector Store**: FAISS
- **File Upload**: Multer

---

For more information, see the main [README.md](../README.md)
