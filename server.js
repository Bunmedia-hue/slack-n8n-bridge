// Express.js server to handle Slack slash commands and forward to n8n
const express = require('express');
const axios = require('axios');
const app = express();

// Middleware to parse URL-encoded bodies (Slack sends data this way)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Your n8n webhook URL
const N8N_WEBHOOK_URL = 'https://florenzbm.app.n8n.cloud/webhook/d9033e6c-f367-4d49-a311-e679746fa0f7/chat';

// Basic verification for Slack (optional but recommended)
const verifySlackRequest = (req, res, next) => {
  // You can add Slack signature verification here later if needed
  next();
};

// Slack slash command endpoint
app.post('/slack/chat', verifySlackRequest, async (req, res) => {
  try {
    console.log('Received Slack request:', req.body);
    
    const { text, user_name, channel_name, user_id, team_domain } = req.body;
    
    // Validate that we have required data
    if (!text || text.trim() === '') {
      return res.json({
        response_type: 'ephemeral',
        text: 'Please provide a message to send. Usage: /chat Your message here'
      });
    }
    
    // Prepare the message for n8n
    const messageData = {
      message: text.trim(),
      sender: user_name,
      channel: channel_name,
      user_id: user_id,
      team: team_domain,
      timestamp: new Date().toISOString(),
      source: 'slack'
    };

    console.log('Sending to n8n:', messageData);

    // Send to n8n webhook
    const response = await axios.post(N8N_WEBHOOK_URL, messageData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log('n8n response:', response.status, response.data);

    // Respond back to Slack
    res.json({
      response_type: 'in_channel',
      text: 'Message sent to chat: "' + text.trim() + '"'
    });

  } catch (error) {
    console.error('Error sending to n8n:', error.message);
    res.json({
      response_type: 'ephemeral',
      text: 'Error: Could not send message to chat. Please try again.'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    n8n_webhook: N8N_WEBHOOK_URL
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Slack to n8n Bridge Server',
    endpoints: {
      health: '/health',
      slack_chat: '/slack/chat'
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
  console.log('n8n webhook: ' + N8N_WEBHOOK_URL);
});
