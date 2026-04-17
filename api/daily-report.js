import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import twilio from 'twilio';

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
let serviceAccount = null;
let db = null;

try {
  if (serviceAccountRaw) {
    let raw = serviceAccountRaw;
    if (raw.startsWith("'") && raw.endsWith("'")) {
      raw = raw.slice(1, -1);
    } else if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1);
    }
    serviceAccount = JSON.parse(raw);
    if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  }
} catch (e) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT json string in daily report.", e.message);
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
  console.error("Failed to initialize Firebase app in daily report.", e.message);
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.WHATSAPP_TO_NUMBER || !process.env.WHATSAPP_FROM_NUMBER) {
    return res.status(500).json({ error: 'Missing necessary environment variables' });
  }

  if (!db) {
    return res.status(500).json({ error: 'Database not securely configured.' });
  }

  try {
    // 1. Get Today's Date (IST Adjustment for UTC Server)
    const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
    const istDate = new Intl.DateTimeFormat('en-CA', options).format(new Date());
    
    // 2. Fetch Overall Summary
    const summarySnapshot = await db.collection('daily_records').where('date', '==', istDate).get();
    
    // 3. Fetch Rider Entries for breakdown and Zone analysis
    // We'll filter in memory as Firestore complex queries might be missing indexes
    const ridersSnapshot = await db.collection('rider_entries')
      .where('timestamp', '>=', `${istDate}T00:00:00`)
      .where('timestamp', '<=', `${istDate}T23:59:59`)
      .get();

    let messageBody = `*WinOps Automated Status Report - ${istDate}*\n\n`;

    if (summarySnapshot.empty) {
      messageBody += `⚠️ *No operational records found for today.*\n\nOperations might be paused or data entry is pending.`;
    } else {
      const record = summarySnapshot.docs[0].data();
      
      // I. OVERALL SUMMARY
      messageBody += `📈 *OVERALL SUMMARY*\n`;
      messageBody += `📦 Total Assigned: ${record.totalAssigned || 0}\n`;
      messageBody += `✅ Total Completed: ${record.totalCompleted || 0}\n`;
      messageBody += `⏳ Total Pending: ${record.totalPending || 0}\n`;
      messageBody += `💰 Total Collection: ₹${(record.totalAmount || 0).toLocaleString()}\n`;
      messageBody += `🎯 Overall Success: ${record.successRate || 0}%\n\n`;

      // II. RIDER PERFORMANCE
      if (!ridersSnapshot.empty) {
        messageBody += `🚴 *RIDER PERFORMANCE*\n`;
        const riderStats = {};
        const zoneStats = {};

        ridersSnapshot.forEach(doc => {
          const data = doc.data();
          const name = data.riderName || 'Unknown';
          const zone = data.zone || 'Unknown';
          const assigned = (Number(data.assignedDelivery) || 0) + (Number(data.assignedPickup) || 0);
          const completed = (Number(data.completedDelivery) || 0) + (Number(data.completedPickup) || 0);

          // Rider Aggregation
          if (!riderStats[name]) riderStats[name] = { assigned: 0, completed: 0 };
          riderStats[name].assigned += assigned;
          riderStats[name].completed += completed;

          // Zone Aggregation (CNR Analysis)
          if (!zoneStats[zone]) zoneStats[zone] = { assigned: 0, pending: 0 };
          zoneStats[zone].assigned += assigned;
          zoneStats[zone].pending += (assigned - completed);
        });

        // Format Rider List
        Object.entries(riderStats).forEach(([name, stats]) => {
          const rate = stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0;
          const emoji = rate >= 90 ? '⭐' : rate >= 70 ? '✅' : '🔴';
          messageBody += `${emoji} ${name}: ${stats.completed}/${stats.assigned} (${rate}%)\n`;
        });
        messageBody += `\n`;

        // III. CNR ANALYSIS (Zone)
        messageBody += `📍 *ZONE ANALYSIS (CNR)*\n`;
        const highCnrZone = Object.entries(zoneStats)
          .map(([zone, stats]) => ({
            zone,
            rate: stats.assigned > 0 ? Math.round((stats.pending / stats.assigned) * 100) : 0
          }))
          .sort((a, b) => b.rate - a.rate)[0];

        if (highCnrZone && highCnrZone.rate > 0) {
          messageBody += `🚩 High CNR Zone: *${highCnrZone.zone}* (${highCnrZone.rate}% Pending)\n`;
        } else {
          messageBody += `✅ All zones performing efficiently.\n`;
        }
      }
    }

    messageBody += `\n_Generated automatically at 10:00 PM IST_`;

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const phoneNumbers = process.env.WHATSAPP_TO_NUMBER.split(',');

    for (const number of phoneNumbers) {
      await client.messages.create({
        body: messageBody,
        from: `whatsapp:${process.env.WHATSAPP_FROM_NUMBER.trim()}`,
        to: `whatsapp:${number.trim()}`
      });
    }

    res.status(200).json({ success: true, message: 'Enhanced daily report sent.' });

  } catch (error) {
    console.error("Daily report error:", error);
    res.status(500).json({ error: error.message });
  }
}
