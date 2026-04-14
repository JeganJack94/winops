import handler from './api/whatsapp-webhook.js';

const req = {
  method: 'POST',
  body: {
    Body: 'help',
    From: 'whatsapp:+1234'
  }
};

const res = {
  setHeader: (k, v) => console.log(`Set header: ${k}=${v}`),
  status: (code) => ({
    json: (msg) => console.log(`Status ${code} JSON:`, msg),
    send: (msg) => console.log(`Status ${code} SEND:`, msg)
  })
};

// Fake ENV so it doesn't crash on Firebase parse
process.env.FIREBASE_SERVICE_ACCOUNT = null;

handler(req, res).catch(console.error);
