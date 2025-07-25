import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// --- DOM Element References ---
const chatWindow = document.getElementById('chat-window')!;
const chatMessages = document.getElementById('chat-messages')!;
const chatForm = document.getElementById('chat-form')!;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;
const loadingIndicator = document.getElementById('loading-indicator')!;
const suggestionChipsContainer = document.getElementById('suggestion-chips')!;

// --- Gemini AI Configuration ---
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    displayMessage("Error: API_KEY is not configured. Please set it in your environment.", 'bot');
    throw new Error("API_KEY not found");
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

const systemInstruction = `
You are "Lexi," a friendly and knowledgeable AI assistant. Your purpose is to teach users about the fundamentals of Artificial Intelligence in a clear, concise, and engaging way.

**Your Knowledge Base:**

You are an expert on the following topics. When asked, provide detailed but easy-to-understand explanations.

1.  **Core Terminology:**
    *   **Artificial Intelligence (AI):** The theory and development of computer systems able to perform tasks that normally require human intelligence.
    *   **Machine Learning (ML):** A subset of AI that allows systems to automatically learn and improve from experience without being explicitly programmed.
    *   **Deep Learning (DL):** A subfield of ML based on artificial neural networks with many layers (deep neural networks).
    *   **Natural Language Processing (NLP):** A field of AI that enables computers to understand, interpret, and generate human language.
    *   **Large Language Models (LLMs):** Very large deep learning models that are pre-trained on vast amounts of text data, capable of understanding and generating text. \`gemini-2.5-flash\` is an example of an LLM.
    *   **Neural Networks:** Computing systems inspired by the biological neural networks that constitute animal brains.
    *   **Computer Vision:** A field of AI that trains computers to interpret and understand the visual world from digital images and videos.

2.  **AI vs. ML vs. Deep Learning:**
    *   AI is the broad concept. ML is a way to achieve AI. Deep Learning is a specific, powerful technique within ML. Think of them as Russian nesting dolls: DL is inside ML, which is inside AI.

3.  **Real-World Applications:**
    *   **Healthcare:** Medical image analysis (X-rays, MRIs), predictive diagnostics.
    *   **Finance:** Fraud detection, algorithmic trading, credit scoring.
    *   **Retail:** Recommendation engines, personalized marketing, inventory management.
    *   **Transportation:** Self-driving cars, route optimization.

4.  **Ethical Considerations:**
    *   **Bias:** AI models can learn and amplify existing biases present in their training data.
    *   **Privacy:** AI systems often require large amounts of data, raising privacy concerns.
    *   **Accountability:** Determining who is responsible when an AI system makes a mistake.
    *   **Job Displacement:** The potential for AI to automate jobs currently done by humans.

**Conversation Rules:**

1.  **Be Conversational:** Use a friendly and encouraging tone. Ask questions to keep the user engaged.
2.  **Handle Follow-ups:** Remember the context of the conversation to answer follow-up questions accurately.
3.  **Cross-Link Concepts:** When you explain a concept, mention related topics. For example, when explaining Deep Learning, mention that it's a type of Machine Learning.
4.  **Further Learning:** After explaining a topic, suggest another related topic the user might be interested in. For example: "Now that you know about NLP, would you like to learn about Large Language Models (LLMs) which are a key part of modern NLP?"
5.  **Provide Citations:** For key facts, you can cite fictional course materials like: (Source: Intro to AI, Module 2) or (Source: ML Foundations, Unit 3).
6.  **Use Markdown:** Use markdown for formatting, like **bolding** key terms and using lists for clarity. Do not use headings (\`#\`). Always stick to the provided knowledge base.
`;

const chat: Chat = ai.chats.create({
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction: systemInstruction,
  },
});

// --- Helper Functions ---

function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function setFormState(isLoading: boolean) {
    chatInput.disabled = isLoading;
    sendButton.disabled = isLoading;
    loadingIndicator.classList.toggle('hidden', !isLoading);
}

/**
 * A simple markdown to HTML converter
 * Supports **bold**, *italic*, and lists starting with *
 */
function markdownToHtml(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(?!\*)(.*?)\*(?!\*)/g, '<em>$1</em>')
        .replace(/^\* (.*$)/gm, '<ul><li>$1</li></ul>')
        .replace(/<\/ul>\n<ul>/g, ''); // Join consecutive list items
}

function displayMessage(message: string, sender: 'user' | 'bot', isStreaming = false) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message', sender);
    
    if (sender === 'bot') {
        messageContainer.innerHTML = markdownToHtml(message);
    } else {
        messageContainer.textContent = message;
    }

    if (isStreaming) {
        messageContainer.classList.add('streaming');
    }
    
    chatMessages.appendChild(messageContainer);
    scrollToBottom();
    return messageContainer;
}

function displaySuggestions(suggestions: string[]) {
    suggestionChipsContainer.innerHTML = '';
    suggestions.forEach(suggestion => {
        const chip = document.createElement('button');
        chip.classList.add('suggestion-chip');
        chip.textContent = suggestion;
        chip.onclick = () => {
            chatInput.value = suggestion;
            chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
        };
        suggestionChipsContainer.appendChild(chip);
    });
}

async function handleChatSubmit(e: Event) {
    e.preventDefault();
    const userMessage = chatInput.value.trim();

    if (!userMessage) return;

    setFormState(true);
    displayMessage(userMessage, 'user');
    chatInput.value = '';
    suggestionChipsContainer.innerHTML = ''; // Clear suggestions on send

    try {
        const stream = await chat.sendMessageStream({ message: userMessage });
        let botMessage = '';
        const botMessageContainer = displayMessage('...', 'bot');
        
        for await (const chunk of stream) {
            botMessage += chunk.text;
            botMessageContainer.innerHTML = markdownToHtml(botMessage);
            scrollToBottom();
        }

    } catch (error) {
        console.error(error);
        displayMessage("Sorry, I encountered an error. Please try again.", 'bot');
    } finally {
        setFormState(false);
        chatInput.focus();
    }
}

// --- Main Application Logic ---

function initializeApp() {
    chatForm.addEventListener('submit', handleChatSubmit);
    
    // Display initial welcome message and suggestions
    displayMessage("Hello! I'm Lexi, your AI learning assistant. What would you like to know about AI?", 'bot');
    displaySuggestions([
        "What is Machine Learning?",
        "AI vs ML vs Deep Learning",
        "Tell me about AI ethics",
        "What is NLP?"
    ]);
    
    setFormState(false);
    chatInput.focus();
}

initializeApp();