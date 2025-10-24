const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { ChatOpenAI, OpenAIEmbeddings } = require('@langchain/openai');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { TextLoader } = require('langchain/document_loaders/fs/text');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Global storage for RAG components
let vectorStore = null;
let llm = null;
let chatHistory = [];

// Initialize LLM
llm = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY
});

// Route: Upload and process document
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        
        // Load document
        const loader = new TextLoader(filePath);
        const docs = await loader.load();

        // Split into chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 150
        });
        const splits = await textSplitter.splitDocuments(docs);

        // Create embeddings and vector store
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY
        });
        
        vectorStore = await FaissStore.fromDocuments(splits, embeddings);

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        // Reset chat history
        chatHistory = [];

        res.json({ 
            success: true, 
            message: 'Document processed successfully',
            chunks: splits.length 
        });

    } catch (error) {
        console.error('Error processing document:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route: Chat with document
app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!vectorStore) {
            return res.status(400).json({ 
                error: 'No document loaded. Please upload a document first.' 
            });
        }

        // Retrieve relevant documents
        const retriever = vectorStore.asRetriever({ k: 3 });
        const relevantDocs = await retriever.getRelevantDocuments(message);

        // Format context
        const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');

        // Format chat history
        let historyText = '';
        if (chatHistory.length > 0) {
            historyText = chatHistory.slice(-6).map(msg => 
                `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
            ).join('\n');
        } else {
            historyText = 'No previous conversation.';
        }

        // Create prompt
        const prompt = ChatPromptTemplate.fromTemplate(`You are a helpful AI assistant. Answer the question based on the following context and our conversation history.

Context from document:
{context}

Chat History:
{chat_history}

Current Question: {question}

Answer:`);

        const formattedPrompt = await prompt.format({
            context: context,
            chat_history: historyText,
            question: message
        });

        // Get response
        const response = await llm.invoke(formattedPrompt);
        const answer = response.content;

        // Update chat history
        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: answer });

        res.json({
            answer: answer,
            sources: relevantDocs.map(doc => ({
                content: doc.pageContent.substring(0, 300) + '...'
            }))
        });

    } catch (error) {
        console.error('Error in chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route: Clear chat history
app.post('/clear', (req, res) => {
    chatHistory = [];
    res.json({ success: true, message: 'Chat history cleared' });
});

// Route: Get chat history
app.get('/history', (req, res) => {
    res.json({ history: chatHistory });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 ReadersChat server running on http://localhost:${PORT}`);
});
