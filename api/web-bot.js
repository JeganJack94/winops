import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import OpenAI from 'openai';

// Initialize Firebase Admin securely using environment variables
let serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = null;
let db = null;

try {
  if (serviceAccountRaw) {
    if (serviceAccountRaw.startsWith("'") && serviceAccountRaw.endsWith("'")) {
      serviceAccountRaw = serviceAccountRaw.slice(1, -1);
    } else if (serviceAccountRaw.startsWith('"') && serviceAccountRaw.endsWith('"')) {
      serviceAccountRaw = serviceAccountRaw.slice(1, -1);
    }
    serviceAccount = JSON.parse(serviceAccountRaw);
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query } = req.body;
  const incomingMsg = query?.trim().toLowerCase() || '';

  if (!incomingMsg) {
    return res.status(400).json({ text: "Please ask me a question!" });
  }

  if (!db) {
    return res.status(500).json({ text: "⚠️ System Error: Database is not configured. Please add FIREBASE_SERVICE_ACCOUNT to Vercel Environment Variables." });
  }

  if (!openai) {
    return res.status(500).json({ text: "Brain offline 🧠. Please setup the OpenAI API Key in Vercel to ask natural language questions." });
  }

  try {
    // Quick keyword overrides for speed
    if (incomingMsg.startsWith('help')) {
      return res.status(200).json({ text: "👋 **WinOps Monk Help**\n\nTry asking me:\n- *status today*: Get today's total operations stats\n- *status [rider]*: Get stats for a specific rider (e.g. status john)\n- *Or ask any Analytics question!* (e.g. 'How did the South zone do today?' or 'Who delivered the most yesterday?')" });
    } 
    
    if (incomingMsg === 'status today') {
      const today = new Date().toLocaleDateString('en-CA');
      const snapshot = await db.collection('daily_records').where('date', '==', today).get();
      
      if (snapshot.empty) {
        return res.status(200).json({ text: `*Status for Today (${today})*\n\nNo records found yet.` });
      } else {
        const record = snapshot.docs[0].data();
        return res.status(200).json({ text: `*Summary for Today (${today})*\n\n📦 Total Assigned: ${record.totalAssigned || 0}\n✅ Completed: ${record.totalCompleted || 0}\n⏳ Pending: ${record.totalPending || 0}\n💰 Collection: ₹${(record.totalAmount || 0).toLocaleString()}\n🎯 Success Rate: ${record.successRate || 0}%` });
      }
    } 
    
    if (incomingMsg.startsWith('status ')) {
      const riderName = incomingMsg.replace('status ', '').trim();
      const today = new Date().toLocaleDateString('en-CA');
      const snapshot = await db.collection('daily_records').where('date', '==', today).get();
      
      if (snapshot.empty) {
        return res.status(200).json({ text: `No records found for today.` });
      } else {
        const record = snapshot.docs[0].data();
        const ridersList = record.riders || [];
        const rider = ridersList.find(r => r.riderName.toLowerCase().includes(riderName));
        
        if (rider) {
           return res.status(200).json({ text: `*Rider: ${rider.riderName}*\n\n📦 Assigned: ${(Number(rider.assignedDelivery)||0) + (Number(rider.assignedPickup)||0)}\n✅ Completed: ${(Number(rider.completedDelivery)||0) + (Number(rider.completedPickup)||0)}\n💰 Collected: ₹${(rider.amountCollected||0).toLocaleString()}\n🎯 Success: ${rider.successRate||0}%` });
        } else {
           return res.status(200).json({ text: `Did not find rider matching "${riderName}" today.` });
        }
      }
    }

    // Natural Language Query relying on OpenAI
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
          content: `You are Monk, an internal AI assistant for the WinOps delivery hub tracking system.
Your goal is to answer the user's question accurately based STRICTLY on the JSON database context provided.
Format your responses smoothly using standard UI markdown (e.g., **bold**, *italic*, lists). 
Be concise, smart, and insightful. If the data is missing or doesn't answer the question, state it clearly.
Do not hallucinate data that is not in the JSON context.`
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
    return res.status(200).json({ text: aiResponse });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).json({ text: "Sorry, I encountered an error while processing your request. Please try again later.", error: error.message });
  }
}
