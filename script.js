// Replace 'YOUR_OPENAI_API_KEY' and 'YOUR_AZURE_SEARCH_ENDPOINT' with your actual API key and endpoint
const openaiApiKey = 'c7af92af1357428cb38974db24462ad6';
const openaiEndpoint = 'https://sew-openai.openai.azure.com/openai/deployments/SEW-Gpt-4/chat/completions?api-version=2023-05-15';
const openaiEmbeddingsEndpoint = 'https://openaikofaxtest1.openai.azure.com/openai/deployments/embeddings/embeddings?api-version=2023-08-01-preview';
const openaiEmbeddingsApiKey = '81b698241e364fc2aef4c3a0a40c05a9';

const azureSearchEndpoint = 'https://openaikofaxtest1.openai.azure.com/';
const azureSearchApiKey = '81b698241e364fc2aef4c3a0a40c05a9';



const openAiPayload = {
    "model": "gpt-4",
    "messages": [

    ],
    "temperature": 1,
    "top_p": 1,
    "n": 1,
    "stream": false,
    "max_tokens": 250,
    "presence_penalty": 0,
    "frequency_penalty": 0
}

const aiVectorisePayload = {
    "input": "classic lodging near running trails, eateries, retail"
}

const aiSearchPayload = {
    "count": true,
    "select": "HotelId, HotelName, Description, Category",
    "vectorQueries": [
        {
            "vector": [0.01944167, 0.0040178085, -0.007816401],  
            "k": 7,
            "fields": "DescriptionVector",
            "kind": "vector",
            "exhaustive": true
        }
    ]
}

const loadingMessage = document.getElementById('loading-message');

function sendMessage() {

    // Get user input
    const userInput = document.getElementById('input-message').value;

    // Reset the field
    document.getElementById('input-message').value = '';

    // Show a loading message
    displayLoadingMessage();

    // Add user message to chat history
    updateChatHistory('User: ' + userInput);

    // Call OpenAI API for response
    callOpenAI(userInput);

    // Call OpenAI API for Embeddings
    openAiEmbeddingsApiCall(userInput);
}

async function callOpenAI(userInput) {
    // Make API request to OpenAI
    // Handle the response and call Azure Cognitive Search for additional information
    //openAiPayload.messages[0].content = userInput;

    updateOpenaiPayloadChatHistory("user", userInput);

    // Call Open AI
    var reply = await openAiApiCall();
    updateChatHistory('Kofax bot: ' + reply);
    updateOpenaiPayloadChatHistory("assistant", reply);
    hideLoadingMessage();

}

async function openAiApiCall() {
    try {
        console.log("\n\nCalling OpenAI with the payload: " + JSON.stringify(openAiPayload, null, 2) + "\n\n\n");
        const response = await fetch(openaiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': openaiApiKey,
            },
            body: JSON.stringify(openAiPayload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Handle the data from the response
        console.log("Open AI response: " + JSON.stringify(data, null, 2));

        // Extract the text value of the "content" field
        const contentText = data.choices[0].message.content;
        return contentText;

    } catch (error) {
        console.error('Fetch error:', error);
    }
}

async function openAiEmbeddingsApiCall(message) {
    aiVectorisePayload.input = message;
    try {
        console.log("\n\nCalling OpenAI Embeddings with the payload: " + JSON.stringify(aiVectorisePayload, null, 2) + "\n\n\n");
        const response = await fetch(openaiEmbeddingsEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': openaiEmbeddingsApiKey,
            },
            body: JSON.stringify(aiVectorisePayload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Handle the data from the response
        console.log("Open AI embedding response: " + JSON.stringify(data, null, 2));

        // Put the embeddings response into the payload for the next cal
        aiSearchPayload.vectorQueries[0].vector = data.data[0].embedding;

        console.log("aiSearchPayload: " + JSON.stringify(data, null, 2));


    } catch (error) {
        console.error('Fetch error:', error);
    }

}

function callAzureSearch(query) {
    // Make API request to Azure Cognitive Search
    // Handle the response and update chat history
}

function updateChatHistory(message) {
    // Update the chat history on the UI
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML += `<div>${message}</div>`;
}

function updateOpenaiPayloadChatHistory(role, message) {

    try {
        var messageCount = openAiPayload.messages.length;
        console.log(`Number of elements in the messages array: ${messageCount}`);

        // Add a new element to the messages array
        const newMessage = {
            "role": role,
            "content": message
        };

        openAiPayload.messages.push(newMessage);

    } catch (error) {
        console.error('updateOpenaiPayloadChatHistory error:', error);
    }

}



function displayLoadingMessage() {
    // Display the loading container while waiting for the response
    loadingMessage.style.display = 'flex';
}

function hideLoadingMessage() {
    // Display the loading container while waiting for the response
    loadingMessage.style.display = 'none';
}

