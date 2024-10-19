const express = require("express");
const bodyParser = require("body-parser");
const Groq = require('groq-sdk');
const isAuthenticated = require('../middleware/athenticateUser');
const natural = require('natural');
const Task = require('../models/Todo')

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
        content: 'You are an expert on plants, crops, and agriculture. Only answer questions related to these topics. If the question is about something else, politely refuse to answer. When giving response always answer in Tagalog.'
      },
      { 
        role: 'user', content 
      }
    ],
    model: 'llama3-8b-8192',  
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
app.post('/tasks/complete', async (req, res) => {
  const { taskId } = req.body;

  try {
      // Find the task by ID and update it as complete
      await Task.findByIdAndUpdate(taskId, { completed: true });

      // Respond with a success message
      res.json({ success: true });
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'An error occurred while updating the task.' });
  }
});


module.exports = app;