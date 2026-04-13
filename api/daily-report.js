import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import twilio from 'twilio';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = null;
try {
  if (serviceAccountRaw) {
    serviceAccount = JSON.parse(serviceAccountRaw);
  }
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT json string in daily report.", e.message);
}

if (!getApps().length && serviceAccount) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}
const db = serviceAccount ? getFirestore() : null;

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Ensure the environment variables are set up
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.WHATSAPP_TO_NUMBER || !process.env.WHATSAPP_FROM_NUMBER) {
    return res.status(500).json({ error: 'Missing necessary environment variables' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Database not securely configured.' });
  }

  try {
    const today = new Date().toLocaleDateString('en-CA');
    const snapshot = await db.collection('daily_records').where('date', '==', today).get();
    
    let messageBody = '';
    if (snapshot.empty) {
      messageBody = `*WinOps Daily Automated Report - ${today}*\n\nNo records found for today. Operations either paused or not inputted.`;
    } else {
      const record = snapshot.docs[0].data();
      messageBody = `*WinOps Daily Automated Report - ${today}*\n\n📦 Total Assigned: ${record.totalAssigned || 0}\n✅ Completed: ${record.totalCompleted || 0}\n⏳ Pending: ${record.totalPending || 0}\n💰 Collection: ₹${(record.totalAmount || 0).toLocaleString()}\n🎯 Overall Success Rate: ${record.successRate || 0}%\n\n_Have a great evening! Type 'help' for more commands._`;
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // In a real environment, WHATSAPP_TO_NUMBER could be a list separated by commas
    const phoneNumbers = process.env.WHATSAPP_TO_NUMBER.split(',');

    for (const number of phoneNumbers) {
      await client.messages.create({
        body: messageBody,
        from: `whatsapp:${process.env.WHATSAPP_FROM_NUMBER.trim()}`,
        to: `whatsapp:${number.trim()}`
      });
    }

    res.status(200).json({ success: true, message: 'Daily report sent.' });

  } catch (error) {
    console.error("Daily report error:", error);
    res.status(500).json({ error: error.message });
  }
}
