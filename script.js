// Replace 'YOUR_OPENAI_API_KEY' and 'YOUR_AZURE_SEARCH_ENDPOINT' with your actual API key and endpoint
const openaiApiKey = 'c7af92af1357428cb38974db24462ad6';
const openaiEndpoint = 'https://sew-openai.openai.azure.com/openai/deployments/SEW-Gpt-4/chat/completions?api-version=2023-05-15';
const openaiEmbeddingsEndpoint = 'https://openaikofaxtest1.openai.azure.com/openai/deployments/embeddings/embeddings?api-version=2023-08-01-preview';
const openaiEmbeddingsApiKey = '81b698241e364fc2aef4c3a0a40c05a9';

const azureSearchEndpoint = 'https://ai-search-tsc.search.windows.net/indexes/hotels-vector-quickstart/docs/search?api-version=2023-11-01';
const azureSearchApiKey = 'Cd1qBeD9EmhiZjC1dMeHneoVlmKV08pp5sCaONltTtAzSeBYUp1V';



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

var aiSearchResponse = {}

const loadingMessage = document.getElementById('loading-message');

async function sendMessage() {

    // Get user input
    const userInput = document.getElementById('input-message').value;

    // Reset the field
    document.getElementById('input-message').value = '';

    // Show a loading message
    displayLoadingMessage();

    // Add user message to chat history
    updateChatHistory('User: ' + userInput);

    // Call OpenAI API for Embeddings
    await openAiEmbeddingsApiCall(userInput);

    // Get the context information from 
    await callAzureSearch();


    // TODO - update the payload with some context from the AI Search call
    updateOpenaiPayloadChatHistory("system", "Use the provided articles delimited by ### to answer questions. If the answer cannot be found in the articles, write \"I could not find an answer.\"")

    // Access the "value" array in the JSON
    const results = aiSearchResponse.value;

    var chat_context_article = "";
    // Loop through each search result and map the description to the open ai chat payload
    for (const result of results) {
        //const description = result.Description;
        //console.log(description);
        // TODO make this generic so it is not tightly coupled to the json results from search...
        chat_context_article += "Hotel name: " + result.HotelName + ". " + result.Description + "###";
  
    }
    updateOpenaiPayloadChatHistory("user", chat_context_article)

    // Call OpenAI API for response
    await callOpenAI(userInput);
}

async function callOpenAI(userInput) {
    console.log("Calling the OpenAI completions api");
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
        //console.log("\n\nCalling OpenAI with the payload: " + JSON.stringify(openAiPayload, null, 2) + "\n\n\n");
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
        //console.log("Open AI response: " + JSON.stringify(data, null, 2));

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
        //console.log("\n\nCalling OpenAI Embeddings with the payload: " + JSON.stringify(aiVectorisePayload, null, 2) + "\n\n\n");
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
        //console.log("Open AI embedding response: " + JSON.stringify(data, null, 2));
        console.log("Response recieved from OpenAI embeddings");

        // Put the embeddings response into the payload for the next cal
        aiSearchPayload.vectorQueries[0].vector = data.data[0].embedding;

        //console.log("aiSearchPayload: " + JSON.stringify(aiSearchPayload, null, 2));

    } catch (error) {
        console.error('Fetch error:', error);
    }

}

async function callAzureSearch() {
    // Make API request to Azure Cognitive Search
    try {
        console.log("\n\nCalling AI Search with the payload: " + JSON.stringify(aiSearchPayload, null, 2) + "\n\n\n");
        const response = await fetch(azureSearchEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': azureSearchApiKey,
            },
            body: JSON.stringify(aiSearchPayload),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Handle the data from the response
        // console.log("AI search response: " + JSON.stringify(data, null, 2));

        // Map the response data to a global var
        aiSearchResponse = data;

    } catch (error) {
        console.error('Fetch error:', error);
    }

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

