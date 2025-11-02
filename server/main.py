"""
ReadersChat FastAPI Server
A FastAPI-based document Q&A chatbot using LangChain and OpenAI
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict
import os
from pathlib import Path
import shutil
from dotenv import load_dotenv

# LangChain imports
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="ReadersChat API",
    description="AI-powered document Q&A using RAG",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount client files as static
client_path = Path(__file__).parent.parent / "client"
app.mount("/static", StaticFiles(directory=str(client_path)), name="static")

# Global variables
vector_store = None
chat_history: List[Dict[str, str]] = []
MAX_HISTORY = 6  # Store last 3 exchanges

# Initialize OpenAI - using gpt-3.5-turbo (cheaper alternative to gpt-4o)
llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
embeddings = OpenAIEmbeddings()

# Request/Response models
class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]

class HistoryResponse(BaseModel):
    history: List[Dict[str, str]]


@app.get("/")
async def read_root():
    """Serve the main HTML page"""
    return FileResponse(str(client_path / "index.html"))


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Upload and process a text document
    Creates vector embeddings and stores them in FAISS
    """
    global vector_store, chat_history
    
    # Validate file type
    if not file.filename.endswith('.txt'):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")
    
    try:
        # Save uploaded file
        upload_dir = Path("uploads")
        upload_dir.mkdir(exist_ok=True)
        file_path = upload_dir / file.filename
        
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Read and process the document
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        chunks = text_splitter.split_text(text)
        
        # Create vector store
        vector_store = FAISS.from_texts(
            texts=chunks,
            embedding=embeddings
        )
        
        # Reset chat history
        chat_history = []
        
        return {
            "message": f"Successfully processed {file.filename}",
            "chunks": len(chunks),
            "filename": file.filename
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Ask a question about the uploaded document
    Uses RAG with conversation history
    """
    global vector_store, chat_history
    
    if vector_store is None:
        raise HTTPException(status_code=400, detail="Please upload a document first")
    
    try:
        # Get relevant documents
        retriever = vector_store.as_retriever(search_kwargs={"k": 3})
        relevant_docs = retriever.invoke(request.question)
        
        # Format chat history
        history_text = ""
        if chat_history:
            history_text = "\n".join([
                f"Human: {msg['question']}\nAssistant: {msg['answer']}"
                for msg in chat_history[-MAX_HISTORY:]
            ])
        
        # Create prompt template
        template = """You are a helpful assistant answering questions about a document.
Use the following context and chat history to answer the question.
If you don't know the answer, say so - don't make up information.

Chat History:
{chat_history}

Context from document:
{context}

Question: {question}

Answer:"""
        
        prompt = ChatPromptTemplate.from_template(template)
        
        # Create RAG chain
        def format_docs(docs):
            return "\n\n".join(doc.page_content for doc in docs)
        
        rag_chain = (
            {
                "context": lambda x: format_docs(relevant_docs),
                "chat_history": lambda x: history_text,
                "question": lambda x: x["question"]
            }
            | prompt
            | llm
            | StrOutputParser()
        )
        
        # Get answer
        answer = rag_chain.invoke({"question": request.question})
        
        # Update chat history
        chat_history.append({
            "question": request.question,
            "answer": answer
        })
        
        # Keep only recent history
        if len(chat_history) > MAX_HISTORY:
            chat_history = chat_history[-MAX_HISTORY:]
        
        # Extract source texts
        sources = [doc.page_content for doc in relevant_docs]
        
        return ChatResponse(answer=answer, sources=sources)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")


@app.get("/history", response_model=HistoryResponse)
async def get_history():
    """Get conversation history"""
    return HistoryResponse(history=chat_history)


@app.delete("/history")
async def clear_history():
    """Clear conversation history"""
    global chat_history
    chat_history = []
    return {"message": "History cleared"}


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "vector_store_loaded": vector_store is not None,
        "history_length": len(chat_history)
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    print(f"\n ReadersChat Server starting on http://localhost:{port}")
    print(f"API Documentation: http://localhost:{port}/docs\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
