#  ReadersChat - AI-Powered Document Q&A

ReadersChat is an intelligent chatbot application that allows you to upload text documents and ask questions about their content using AI. Built with Streamlit and LangChain, it uses OpenAI's GPT models and RAG (Retrieval-Augmented Generation) to provide accurate, context-aware answers.

##  Features

- **Document Upload**: Upload any `.txt` file to analyze
- **Smart Q&A**: Ask questions and get accurate answers based on document content
- **Conversation Memory**: Chatbot remembers previous exchanges for contextual follow-up questions
- **Source Citations**: View relevant document excerpts that support each answer
- **Clean Interface**: Simple, intuitive Streamlit-based UI

##  Getting Started

### Prerequisites

- Python 3.12 or higher
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/OpokuFrimpong/ReadersChat.git
   cd ReadersChat
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the project root:
   ```
   OPENAI_API_KEY=your-openai-api-key-here
   ```
   
   **Important**: Never commit your `.env` file to GitHub!

### Running the Application

```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8502`

##  Usage

1. **Upload a Document**
   - Click "Browse files" in the sidebar
   - Select a `.txt` file from your computer
   - Click "Process Document"

2. **Ask Questions**
   - Type your question in the chat input at the bottom
   - The AI will analyze the document and provide an answer
   - View source excerpts by expanding the "View source excerpts" section

3. **Follow-up Questions**
   - The chatbot remembers your conversation
   - You can ask follow-up questions using pronouns like "it", "that", "he/she", etc.

##  Project Structure

```
ReadersChat/
├── app.py                      # Main Streamlit application
├── .env                        # Environment variables (not tracked)
├── .gitignore                  # Git ignore file
├── requirements.txt            # Python dependencies
├── README.md                   # Project documentation
├── alice_in_wonderland.txt     # Sample document
└── knowledge_base.txt          # Sample knowledge base
```

## 🔧 Technology Stack

- **[Streamlit](https://streamlit.io/)**: Web application framework
- **[LangChain](https://www.langchain.com/)**: LLM application framework
- **[OpenAI GPT-4](https://openai.com/)**: Language model for generating responses
- **[FAISS](https://github.com/facebookresearch/faiss)**: Vector database for semantic search
- **[Python-dotenv](https://github.com/theskumar/python-dotenv)**: Environment variable management

##  Security Best Practices

- API keys are stored in `.env` file (excluded from Git)
- Never hardcode sensitive credentials in code
- The `.gitignore` file prevents accidental exposure of secrets

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

##  Author

**Opoku Frimpong**
- GitHub: [@OpokuFrimpong](https://github.com/OpokuFrimpong)

##  Acknowledgments

- OpenAI for providing the GPT models
- OpenAI APi 
- LangChain team for the excellent framework
- Streamlit for the intuitive web framework

---

If you find this project useful, please consider giving it a star!
