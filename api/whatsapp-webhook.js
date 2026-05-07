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
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      
      const snapshot = await db.collection('daily_records').where('date', '==', today).get();
      
      if (snapshot.empty) {
        twiml.message(`*Status for Today (${today})*\n\nNo operational records found yet.`);
      } else {
        const record = snapshot.docs[0].data();
        const riders = record.riders || [];
        
        // Calculate Top Performance
        const topRiders = [...riders]
          .filter(r => (Number(r.assignedDelivery) || 0) + (Number(r.assignedPickup) || 0) > 0)
          .sort((a, b) => (Number(b.successRate) || 0) - (Number(a.successRate) || 0))
          .slice(0, 3);

        let topPerformanceMsg = '';
        if (topRiders.length > 0) {
          topPerformanceMsg = '\n\n🏆 *TOP PERFORMANCE*';
          const medals = ['🥇', '🥈', '🥉'];
          topRiders.forEach((r, idx) => {
            topPerformanceMsg += `\n${medals[idx]} ${r.riderName}: ${r.successRate}%`;
          });
        }

        twiml.message(`📊 *SUMMARY FOR TODAY* (${today})\n\n📦 Total Assigned: ${record.totalAssigned || 0}\n✅ Completed: ${record.totalCompleted || 0}\n⏳ Pending: ${record.totalPending || 0}\n💰 Collection: ₹${(record.totalAmount || 0).toLocaleString()}\n🎯 Overall Success: ${record.successRate || 0}%${topPerformanceMsg}`);
      }
      
    } else if (incomingMsg.startsWith('status ')) {
      const riderName = incomingMsg.replace('status ', '').trim().toLowerCase();
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      
      const snapshot = await db.collection('daily_records').where('date', '==', today).get();
      
      if (snapshot.empty) {
        twiml.message(`No records found for today.`);
      } else {
        const record = snapshot.docs[0].data();
        const ridersList = record.riders || [];
        const rider = ridersList.find(r => r.riderName.toLowerCase().includes(riderName));
        
        if (rider) {
           twiml.message(`👤 *Rider: ${rider.riderName}*\n\n📦 Assigned: ${(Number(rider.assignedDelivery)||0) + (Number(rider.assignedPickup)||0)}\n✅ Completed: ${(Number(rider.completedDelivery)||0) + (Number(rider.completedPickup)||0)}\n💰 Collected: ₹${(rider.amountCollected||0).toLocaleString()}\n🎯 Success: ${rider.successRate||0}%`);
        } else {
           twiml.message(`Did not find rider matching "${riderName}" today.`);
        }
      }
      
    } else if (incomingMsg === 'trigger report') {
      // Manual trigger for testing - only if sender is allowed (optional check)
      twiml.message("🔄 *Triggering daily report...* Please check your WhatsApp shortly.");
      // Note: In a real serverless env, we'd call the daily-report API. 
      // For now, this confirms the bot is reachable.
      
    } else {
      // Natural Language Query relying on OpenAI
      if (!openai) {
        twiml.message("Brain offline 🧠. Please setup the OpenAI API Key to ask natural language questions.");
        res.setHeader('Content-Type', 'text/xml');
        return res.status(200).send(twiml.toString());
      }

      // Fetch recent context (Last 7 days) using IST
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffset);
      const lastWeekDateDate = new Date(istNow.getTime() - (7 * 24 * 60 * 60 * 1000));
      const lastWeekDate = lastWeekDateDate.toISOString().split('T')[0];
      
      const snapshot = await db.collection('daily_records')
          .where('date', '>=', lastWeekDate)
          .orderBy('date', 'desc')
          .limit(7)
          .get();
          
      const records = snapshot.docs.map(doc => doc.data());
      
      // Reduce the context size string roughly to only important fields to save tokens
      const compactContext = records.map(r => ({
         date: r.date,
         summary: {
            assigned: r.totalAssigned,
            completed: r.totalCompleted,
            pending: r.totalPending,
            amount: r.totalAmount,
            success: r.successRate
         },
         riders: (r.riders || []).map(ri => ({
            name: ri.riderName,
            zone: ri.zone || 'None',
            assigned: (Number(ri.assignedDelivery)||0) + (Number(ri.assignedPickup)||0),
            completed: (Number(ri.completedDelivery)||0) + (Number(ri.completedPickup)||0),
            success: ri.successRate
         }))
      }));

      // Query OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are WinOps AI, the expert operations assistant for WinOps delivery hub.
You are helping the manager track delivery performance across different riders and zones.

KEY INSTRUCTIONS:
1. **Persona**: Professional, helpful, and insightful. You are the "Monk" of operations.
2. **Language**: Detect the user's language. If they use Tamil, respond in professional and clear Tamil. If they use English, respond in English.
3. **Platform**: You are on WhatsApp. Use bold (*text*), bullet points, and appropriate emojis. Keep responses concise.
4. **Data**: Use ONLY the provided database context. If the answer isn't there, say you don't have enough data.
5. **Insights**: When asked "how is it going", highlight the overall success rate and name the top performing rider.`
          },
          {
            role: "system",
            content: `DATABASE CONTEXT (Last 7 Days - IST):\n${JSON.stringify(compactContext)}`
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
