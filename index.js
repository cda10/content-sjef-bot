const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const SLACK_TOKEN = process.env.SLACK_BOT_TOKEN;
const processed = new Set();

const SYSTEM = `Du er en erfaren Content-sjef. Hjelp med ideer til social media og treningscontent, ferdige tekster og feedback. Svar alltid på norsk. Vær direkte og konkret.`;

app.get('/', (req, res) => {
  res.send('Bot kjører!');
});

app.post('/slack/events', async (req, res) => {
  const { type, challenge, event } = req.body;

  if (type === 'url_verification') {
    return res.json({ challenge });
  }

  res.sendStatus(200);

  if (!event || event.type !== 'message' || event.bot_id || event.subtype) {
    return;
  }

  if (processed.has(event.ts)) {
    return;
  }

  processed.add(event.ts);

  if (processed.size > 500) {
    processed.clear();
  }

  try {
    const ai = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: event.text
        }
      ]
    });

    const reply = ai.content[0].text;

    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SLACK_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: event.channel,
        text: reply
      })
    });
  } catch (e) {
    console.error(e.message);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Bot kjører!');
});
