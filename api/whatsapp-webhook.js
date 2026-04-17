import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import twilio from 'twilio';
import OpenAI from 'openai';

// Initialize Firebase Admin securely using environment variables
let serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = null;
let db = null;

try {
  if (serviceAccountRaw) {
    // Trim accidental surrounding quotes from .env parsing
    if (serviceAccountRaw.startsWith("'") && serviceAccountRaw.endsWith("'")) {
      serviceAccountRaw = serviceAccountRaw.slice(1, -1);
    } else if (serviceAccountRaw.startsWith('"') && serviceAccountRaw.endsWith('"')) {
      serviceAccountRaw = serviceAccountRaw.slice(1, -1);
    }
    
    serviceAccount = JSON.parse(serviceAccountRaw);

    // Fix literal newline characters in private_key if they exist
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  }
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT json string.", e.message);
}

try {
  if (!getApps().length && serviceAccount && serviceAccount.private_key) {
    initializeApp({
      credential: cert(serviceAccount)
    });
    db = getFirestore();
  } else if (getApps().length) {
    db = getFirestore();
  }
} catch (e) {
  console.error("Failed to initialize Firebase app.", e.message);
}

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
    if (incomingMsg === 'hi' || incomingMsg.startsWith('help')) {
      twiml.message(`👋 *வணக்கம்!* (Welcome to WinOps Assistant)

I am your operations AI. I can speak both *English* and *Tamil*.

*Try asking me:*
- "status today" (Today's performance)
- "யார் பெஸ்ட் ரைடர்?" (Who is the best rider?)
- "நேற்று டெலிவரி எப்படி இருந்தது?" (How was delivery yesterday?)
- "Which zone had the most pending items?"

_How can I help you today?_`);
      
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
         totalPending: r.totalPending,
         totalAmount: r.totalAmount,
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
            content: `You are WinOps AI, the expert operations assistant for WinOps delivery hub.
Your goal is to answer the user's question accurately based STRICTLY on the JSON database context provided.

KEY INSTRUCTIONS:
1. **Language**: Detect the user's language. If they use Tamil, respond in professional and clear Tamil. If they use English, respond in English.
2. **Platform**: You are on WhatsApp. Use bold (*text*), bullet points, and appropriate emojis. Keep paragraphs short.
3. **Accuracy**: Do not hallucinate data. If the answer is not in the context, say you don't have enough data.
4. **Tone**: Be helpful, concise, and insightful.`
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
