const express = require("express");
const bodyParser = require("body-parser");
const Groq = require('groq-sdk');
const isAuthenticated = require('../middleware/athenticateUser');
const natural = require('natural');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY});
// Function to get chat completion from Groq
async function getGroqChatCompletion(content) {
  const chatCompletion = await groq.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are an expert on plants, crops, and agriculture. Only answer questions related to these topics. If the question is about something else, politely refuse to answer. And when giving response always in Tagalog.'
      },
      { 
        role: 'user', content 
      }
    ],
    model: 'mixtral-8x7b-32768',
    temperature: 0.5,
    max_tokens: 1024,
    top_p: 1,
    stream: false,
    stop: null
  });
  return chatCompletion;
}

app.post("/chat", isAuthenticated, async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required.' });
  }
  try {
    const chatCompletion = await getGroqChatCompletion(content);
    let response = chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't understand that.";

    console.log(response);
    res.json({ response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

module.exports = app;