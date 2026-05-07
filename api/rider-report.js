import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import twilio from 'twilio';
import OpenAI from 'openai';

// --- Firebase Init ---
const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = null;
let db = null;

try {
  if (serviceAccountRaw) {
    let raw = serviceAccountRaw;
    if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
    else if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
    serviceAccount = JSON.parse(raw);
    if (serviceAccount.private_key)
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
} catch (e) {
  console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
}

try {
  if (!getApps().length && serviceAccount?.private_key) {
    initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore();
  } else if (getApps().length) {
    db = getFirestore();
  }
} catch (e) {
  console.error('Failed to initialize Firebase:', e.message);
}

// --- OpenAI Init ---
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// --- Helpers ---
const istDate = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

const getTip = async (rider, successRate) => {
  if (!openai) return getRuleTip(successRate);

  try {
    const prompt = `
You are WinOps, a delivery operations coach. Write a short WhatsApp motivational message (2-3 sentences max) in English for a delivery rider.

Rider: ${rider.riderName}
Today: Assigned ${rider.assigned}, Completed ${rider.completed}, Success Rate ${successRate}%
Team Goal: 90%

Tiers:
- < 75%: Needs serious attention. Be firm but encouraging about calling customers multiple times.
- 75% - 80%: OK, but can be better. 
- 80% - 90%: Good job. Motivate to hit the 90% team goal.
- > 90%: Very good! Celebrate the excellence.

Rules:
- Be warm, brief, and personal (use their first name)
- End with one emoji only
- No hashtags, no corporate fluff
`;
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 120,
      temperature: 0.8
    });
    return resp.choices[0].message.content.trim();
  } catch (err) {
    console.warn('OpenAI tip failed, using rule-based:', err.message);
    return getRuleTip(successRate);
  }
};

const getRuleTip = (rate) => {
  if (rate >= 90) return "Very good! Outstanding performance today! You're setting the standard for the whole team. Keep it up! 🏆";
  if (rate >= 80) return `Good job! You're so close to our 90% goal. Push through the remaining deliveries! 💪`;
  if (rate >= 75) return `OK performance today, but let's aim higher tomorrow. You can hit that 80%+ mark! 🚀`;
  return "Need attention! Don't give up! Call the customer a second time if they don't answer. Before you close any failed delivery, try once more — every parcel counts! ⚠️";
};

// --- Handler ---
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!db) return res.status(500).json({ error: 'Database not configured.' });
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.WHATSAPP_FROM_NUMBER) {
    return res.status(500).json({ error: 'Missing Twilio environment variables.' });
  }

  const today = istDate();
  const displayDate = formatDate(today);

  try {
    // 1. Get today's daily record
    const snapshot = await db.collection('daily_records').where('date', '==', today).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: `No daily record found for ${today}` });
    }

    const record = snapshot.docs[0].data();
    const todayRiders = record.riders || [];

    if (todayRiders.length === 0) {
      return res.status(200).json({ message: 'No riders in today\'s record.' });
    }

    // 2. Get all riders from DB to find phone numbers and notification settings
    const ridersSnapshot = await db.collection('riders').get();
    const riderConfigs = {};
    ridersSnapshot.forEach(doc => {
      const d = doc.data();
      const key = d.name.toLowerCase().trim();
      riderConfigs[key] = {
        phone: d.phone,
        whatsappEnabled: d.whatsappEnabled !== false // Default to true if not set
      };
    });

    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const fromNumber = process.env.WHATSAPP_FROM_NUMBER.trim();
    const results = [];

    // 3. Send message to each rider
    for (const riderEntry of todayRiders) {
      const assignedRiderName = riderEntry.riderName || '';
      const actualWorkerName = riderEntry.actualRiderName || assignedRiderName;
      
      const lookupName = actualWorkerName.toLowerCase().trim();
      const config = riderConfigs[lookupName];

      if (!config || !config.phone) {
        results.push({ rider: actualWorkerName, status: 'skipped', reason: 'No phone number found' });
        continue;
      }

      if (config.whatsappEnabled === false) {
        results.push({ rider: actualWorkerName, status: 'skipped', reason: 'WhatsApp notifications disabled for this rider' });
        continue;
      }

      const phone = config.phone;

      const assigned = (Number(riderEntry.assignedDelivery) || 0) + (Number(riderEntry.assignedPickup) || 0);
      const completed = (Number(riderEntry.completedDelivery) || 0) + (Number(riderEntry.completedPickup) || 0);
      const successRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
      const failed = Number(riderEntry.failed) || 0;

      const riderStats = { riderName: actualWorkerName, assigned, completed, successRate };
      const aiTip = await getTip(riderStats, successRate);

      const rateEmoji = successRate >= 90 ? '🏆' : successRate >= 80 ? '✅' : '⚠️';

      const message =
`🚚 *Win Express — Daily Status*
📅 ${displayDate}

Hi ${actualWorkerName.split(' ')[0]}! 👋

📦 Assigned: *${assigned}*
✅ Completed: *${completed}*
❌ Failed: *${failed}*
🎯 Your Rate: *${successRate}%* ${rateEmoji}
🏁 Team Goal: *90%*

💬 ${aiTip}

_— Win Express Ops Team_`;

      try {
        const toNumber = phone.startsWith('+') ? phone : `+91${phone}`;
        const resp = await twilioClient.messages.create({
          body: message,
          from: `whatsapp:${fromNumber}`,
          to: `whatsapp:${toNumber}`
        });
        console.log(`✅ Sent to ${actualWorkerName} (${toNumber}): ${resp.sid}`);
        results.push({ rider: actualWorkerName, phone: toNumber, status: 'sent', sid: resp.sid });
      } catch (err) {
        console.error(`❌ Failed to send to ${actualWorkerName}:`, err.message);
        results.push({ rider: actualWorkerName, phone, status: 'failed', error: err.message });
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }

    return res.status(200).json({
      success: true,
      date: today,
      totalRiders: todayRiders.length,
      sent: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
      results
    });

  } catch (error) {
    console.error('Rider report error:', error);
    return res.status(500).json({ error: error.message });
  }
}
