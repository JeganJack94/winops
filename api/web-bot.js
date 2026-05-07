import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
    if (incomingMsg === 'hi' || incomingMsg.startsWith('help')) {
      const helpMsg = `👋 *வணக்கம்! (Welcome to WinOps Monk)*

I am your operations AI assistant. I can speak both **English** and **Tamil**.

*Try asking me questions like:*
- "status today" (Today's performance)
- "யார் பெஸ்ட் ரைடர்?" (Who is the best rider?)
- "நேற்று டெலிவரி எப்படி இருந்தது?" (How was delivery yesterday?)
- "Which zone had the most pending items?"

- "Show status for rider [Name]"
- "Summary of last 3 days"

How can I help you?`
      });
    }

    if (lowerQuery.includes('status today') || lowerQuery.includes('performance today')) {
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

      const snapshot = await db.collection('daily_records').where('date', '==', today).get();
      
      if (snapshot.empty) {
        return res.status(200).json({ answer: `I couldn't find any operational records for today (${today}) yet.` });
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
          topPerformanceMsg = '\n\n🏆 **TOP PERFORMANCE**';
          const medals = ['🥇', '🥈', '🥉'];
          topRiders.forEach((r, idx) => {
            topPerformanceMsg += `\n${medals[idx]} **${r.riderName}**: ${r.successRate}%`;
          });
        }

        return res.status(200).json({
          answer: `📊 **SUMMARY FOR TODAY** (${today})\n\n📦 **Total Assigned**: ${record.totalAssigned || 0}\n✅ **Completed**: ${record.totalCompleted || 0}\n⏳ **Pending**: ${record.totalPending || 0}\n💰 **Collection**: ₹${(record.totalAmount || 0).toLocaleString()}\n🎯 **Overall Success**: ${record.successRate || 0}%${topPerformanceMsg}`
        });
      }
    }

    if (lowerQuery.includes('status for rider')) {
       const riderName = lowerQuery.split('rider').pop().trim();
       const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());

       const snapshot = await db.collection('daily_records').where('date', '==', today).get();
       if (!snapshot.empty) {
          const record = snapshot.docs[0].data();
          const rider = (record.riders || []).find(r => r.riderName.toLowerCase().includes(riderName));
          if (rider) {
             return res.status(200).json({
                answer: `👤 **Rider: ${rider.riderName}**\n\n📦 **Assigned**: ${(Number(rider.assignedDelivery)||0) + (Number(rider.assignedPickup)||0)}\n✅ **Completed**: ${(Number(rider.completedDelivery)||0) + (Number(rider.completedPickup)||0)}\n💰 **Collected**: ₹${(rider.amountCollected||0).toLocaleString()}\n🎯 **Success**: ${rider.successRate||0}%`
             });
          }
       }
    }

    // Default to AI response
    if (!openai) {
      return res.status(200).json({ answer: "I'm having trouble connecting to my brain (OpenAI). Please check the API key." });
    }

    // Fetch context (7 days) using IST
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
        assigned: (Number(ri.assignedDelivery)||0) + (Number(ri.assignedPickup)||0),
        completed: (Number(ri.completedDelivery)||0) + (Number(ri.completedPickup)||0),
        success: ri.successRate
      }))
    }));

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are the WinOps Assistant, an expert in delivery hub operations.
You help the manager analyze daily performance data.

KEY INSTRUCTIONS:
3. **Accuracy**: Do not hallucinate data. If the answer is not in the context, say you don't have enough data.
4. **Formatting**: Use bold text and lists to make metrics easy to read.`
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
