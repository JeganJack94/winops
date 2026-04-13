import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import twilio from 'twilio';
import OpenAI from 'openai';

// Initialize Firebase Admin securely using environment variables
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = null;
try {
  if (serviceAccountRaw) {
    serviceAccount = JSON.parse(serviceAccountRaw);
  }
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT json string in webhook.", e.message);
}

if (!getApps().length && serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = serviceAccount ? getFirestore() : null;

// Initialize OpenAI using environment variables
const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export default async function handler(req, res) {
  // Twilio sends a POST request with the message data
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const twiml = new twilio.twiml.MessagingResponse();
  const incomingMsg = req.body.Body?.trim().toLowerCase() || '';
  const senderId = req.body.From;

  console.log(`Received message from ${senderId}: ${incomingMsg}`);

  if (!db) {
     twiml.message("⚠️ *System Error*: Database is not configured. Please add FIREBASE_SERVICE_ACCOUNT to Vercel Environment Variables.");
     res.setHeader('Content-Type', 'text/xml');
     return res.status(200).send(twiml.toString());
  }

  if (!openai) {
     console.warn("OpenAI API Key is missing. Natural language analysis will not work.");
  }

  try {
    if (incomingMsg.startsWith('help')) {
      twiml.message("👋 *WinOps Assistant Help*\n\nTry sending:\n- *status today*: Get today's total operations stats\n- *status [rider]*: Get stats for a specific rider (e.g. status john)\n- *Or ask any Analytics question!* (e.g. 'How did the South zone do today?' or 'Who delivered the most yesterday?')");
      
    } else if (incomingMsg === 'status today') {
      const today = new Date().toLocaleDateString('en-CA'); // e.g., YYYY-MM-DD
      const snapshot = await db.collection('daily_records').where('date', '==', today).get();
      
      if (snapshot.empty) {
        twiml.message(`*Status for Today (${today})*\n\nNo records found yet.`);
      } else {
        const record = snapshot.docs[0].data();
        twiml.message(`*Summary for Today (${today})*\n\n📦 Total Assigned: ${record.totalAssigned || 0}\n✅ Completed: ${record.totalCompleted || 0}\n⏳ Pending: ${record.totalPending || 0}\n💰 Collection: ₹${(record.totalAmount || 0).toLocaleString()}\n🎯 Success Rate: ${record.successRate || 0}%`);
      }
      
    } else if (incomingMsg.startsWith('status ')) {
      const riderName = incomingMsg.replace('status ', '').trim();
      const today = new Date().toLocaleDateString('en-CA');
      const snapshot = await db.collection('daily_records').where('date', '==', today).get();
      
      if (snapshot.empty) {
        twiml.message(`No records found for today.`);
      } else {
        const record = snapshot.docs[0].data();
        const ridersList = record.riders || [];
        const rider = ridersList.find(r => r.riderName.toLowerCase().includes(riderName));
        
        if (rider) {
           twiml.message(`*Rider: ${rider.riderName}*\n\n📦 Assigned: ${(Number(rider.assignedDelivery)||0) + (Number(rider.assignedPickup)||0)}\n✅ Completed: ${(Number(rider.completedDelivery)||0) + (Number(rider.completedPickup)||0)}\n💰 Collected: ₹${(rider.amountCollected||0).toLocaleString()}\n🎯 Success: ${rider.successRate||0}%`);
        } else {
           twiml.message(`Did not find rider matching "${riderName}" today.`);
        }
      }
      
    } else {
      // Natural Language Query relying on OpenAI
      if (!openai) {
        twiml.message("Brain offline 🧠. Please setup the OpenAI API Key to ask natural language questions.");
        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(twiml.toString());
      }

      // Fetch recent context (Last 7 days)
      const lastWeekDateDate = new Date();
      lastWeekDateDate.setDate(lastWeekDateDate.getDate() - 7);
      const lastWeekDate = lastWeekDateDate.toLocaleDateString('en-CA');
      
      const snapshot = await db.collection('daily_records')
          .where('date', '>=', lastWeekDate)
          .orderBy('date', 'desc')
          .limit(7)
          .get();
          
      const records = snapshot.docs.map(doc => doc.data());
      
      // Reduce the context size string roughly to only important fields to save tokens
      const compactContext = records.map(r => ({
         date: r.date,
         totalAssigned: r.totalAssigned,
         totalCompleted: r.totalCompleted,
         successRate: r.successRate,
         riders: (r.riders || []).map(ri => ({
            name: ri.riderName,
            zone: ri.zone || 'None',
            assigned: (Number(ri.assignedDelivery)||0) + (Number(ri.assignedPickup)||0),
            completed: (Number(ri.completedDelivery)||0) + (Number(ri.completedPickup)||0),
            successRate: ri.successRate
         }))
      }));

      // Query OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are WinOps AI, a helpful operations assistant for a delivery hub tracking system.
Your goal is to answer the user's question accurately based STRICTLY on the JSON database context provided.
Format your responses for a clean WhatsApp reading experience. Use appropriate emojis, short paragraphs, and bullet points. Avoid using complex markdown, stick to Whatsapp compatible text (e.g., *bold*, _italic_, ~strikethrough~).
If the data is missing or doesn't answer the question, state it clearly. Keep the response concise but informative.
Do not hallucinate data that is not in the JSON context.
`
          },
          {
            role: "system",
            content: `DATABASE CONTEXT (Last 7 Days):\n${JSON.stringify(compactContext)}`
          },
          {
             role: "user",
             content: incomingMsg
          }
        ]
      });

      const aiResponse = completion.choices[0].message.content;
      twiml.message(aiResponse);
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    twiml.message("Sorry, I encountered an error while processing your request. Please try again later.");
  }

  res.setHeader('Content-Type', 'text/xml');
  res.status(200).send(twiml.toString());
}
