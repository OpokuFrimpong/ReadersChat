import os
import streamlit as st
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
import tempfile

# Load environment variables
load_dotenv()

# Page config
st.set_page_config(page_title="ReadersChat", page_icon="📚", layout="wide")

# Title
st.title("ReadersChat - AI Document Q&A")
st.markdown("Upload a document and start asking questions!")

# Initialize session state
if 'rag_chain' not in st.session_state:
    st.session_state.rag_chain = None
if 'chat_history' not in st.session_state:
    st.session_state.chat_history = []

# Sidebar for document upload
with st.sidebar:
    st.header("Upload Document")
    uploaded_file = st.file_uploader("Choose a text file", type=['txt'])
    
    if uploaded_file is not None:
        if st.button("Process Document"):
            with st.spinner("Processing document..."):
                try:
                    # Save uploaded file temporarily
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.txt', mode='w', encoding='utf-8') as tmp_file:
                        tmp_file.write(uploaded_file.getvalue().decode('utf-8'))
                        tmp_file_path = tmp_file.name
                    
                    # Load and process document
                    loader = TextLoader(tmp_file_path, encoding='utf-8')
                    docs = loader.load()
                    
                    # Split into chunks
                    splitter = RecursiveCharacterTextSplitter(
                        chunk_size=1000, 
                        chunk_overlap=150
                    )
                    splits = splitter.split_documents(docs)
                    
                    # Create embeddings and vector store
                    embeddings = OpenAIEmbeddings()
                    vectorstore = FAISS.from_documents(splits, embeddings)
                    
                    # Set up retriever
                    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
                    
                    # Create chat model - using gpt-3.5-turbo (cheaper alternative)
                    llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
                    
                    # Create RAG prompt template with chat history
                    template = """You are a helpful AI assistant. Answer the question based on the following context and our conversation history.

Context from document:
{context}

Chat History:
{chat_history}

Current Question: {question}

Answer:"""
                    prompt = ChatPromptTemplate.from_template(template)
                    
                    # Create RAG chain using LCEL
                    def format_docs(docs):
                        return "\n\n".join(doc.page_content for doc in docs)
                    
                    # Store the components separately
                    st.session_state.llm = llm
                    st.session_state.prompt = prompt
                    st.session_state.format_docs = format_docs
                    
                    rag_chain = "configured"  # Placeholder
                    
                    st.session_state.rag_chain = rag_chain
                    st.session_state.retriever = retriever
                    
                    # Clean up temp file
                    os.unlink(tmp_file_path)
                    
                    st.success(" Document processed successfully!")
                    st.session_state.chat_history = []
                    
                except Exception as e:
                    st.error(f" Error processing document: {str(e)}")
    
    st.markdown("---")
    st.markdown("### About")
    st.info("This app allows you to upload a text document and ask questions about its content using AI.")

# Main chat interface
if st.session_state.rag_chain is None:
    st.info(" Please upload a document to get started!")
else:
    # Display chat history
    for message in st.session_state.chat_history:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
    
    # Chat input
    if prompt := st.chat_input("Ask a question about your document..."):
        # Add user message to chat history
        st.session_state.chat_history.append({"role": "user", "content": prompt})
        
        # Display user message
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Get AI response
        with st.chat_message("assistant"):
            with st.spinner("Thinking..."):
                try:
                    # Format chat history
                    history_text = ""
                    if len(st.session_state.chat_history) > 1:
                        for msg in st.session_state.chat_history[-7:-1]:  # Last 3 exchanges (excluding current)
                            role = "User" if msg["role"] == "user" else "Assistant"
                            history_text += f"{role}: {msg['content']}\n"
                    
                    if not history_text:
                        history_text = "No previous conversation."
                    
                    # Get relevant documents
                    docs = st.session_state.retriever.invoke(prompt)
                    context = st.session_state.format_docs(docs)
                    
                    # Build the prompt
                    messages = st.session_state.prompt.format_messages(
                        context=context,
                        chat_history=history_text,
                        question=prompt
                    )
                    
                    # Get response from LLM
                    response = st.session_state.llm.invoke(messages)
                    answer = response.content
                    
                    # Display answer
                    st.markdown(answer)
                    
                    # Add assistant response to chat history
                    st.session_state.chat_history.append({"role": "assistant", "content": answer})
                    
                    # Optional: Show source documents
                    if hasattr(st.session_state, 'retriever'):
                        docs = st.session_state.retriever.invoke(prompt)
                        with st.expander("View source excerpts"):
                            for i, doc in enumerate(docs, 1):
                                st.markdown(f"**Source {i}:**")
                                st.text(doc.page_content[:300] + "...")
                                st.markdown("---")
                            
                except Exception as e:
                    st.error(f"Error: {str(e)}")

# Clear chat button
if st.session_state.chat_history:
    if st.sidebar.button("Clear Chat History"):
        st.session_state.chat_history = []
        st.rerun()