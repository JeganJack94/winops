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

    const reportType = req.query.type || 'daily'; // daily, pending, recap
    
    let messageBody = '';
    
    if (reportType === 'pending') {
      messageBody = `⏳ *WinOps 4 PM Pending Alert - ${istDate}*\n\n`;
    } else if (reportType === 'recap') {
      messageBody = `📅 *WinOps Weekly Recap (Sunday) - ${istDate}*\n\n`;
    } else {
      messageBody = `*WinOps Daily Status - ${istDate}*\n\n`;
    }

    if (reportType === 'recap') {
      // 2a. Weekly Recap Logic
      const today = new Date();
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      const lastWeekStr = new Intl.DateTimeFormat('en-CA', options).format(lastWeek);

      const weeklySnapshot = await db.collection('daily_records')
        .where('date', '>=', lastWeekStr)
        .where('date', '<=', istDate)
        .get();

      if (weeklySnapshot.empty) {
        messageBody += `⚠️ *No operational records found for the past week.*`;
      } else {
        let totalReceived = 0;
        let totalDelivered = 0;
        let successRates = [];
        const riderAggregates = {};

        weeklySnapshot.docs.forEach(doc => {
          const data = doc.data();
          totalReceived += (Number(data.receivedDelivery) || 0) + (Number(data.receivedPickup) || 0);
          totalDelivered += Number(data.totalCompleted) || 0;
          if (data.successRate) successRates.push(Number(data.successRate));

          (data.riders || []).forEach(r => {
            if (!riderAggregates[r.riderName]) {
              riderAggregates[r.riderName] = { completed: 0, assigned: 0 };
            }
            riderAggregates[r.riderName].completed += (Number(r.completedDelivery) || 0) + (Number(r.completedPickup) || 0);
            riderAggregates[r.riderName].assigned += (Number(r.assignedDelivery) || 0) + (Number(r.assignedPickup) || 0);
          });
        });

        const avgSuccessRate = successRates.length > 0 ? Math.round(successRates.reduce((a, b) => a + b, 0) / successRates.length) : 0;

        messageBody += `📈 *WEEKLY STATS*\n`;
        messageBody += `📦 Total Volume: ${totalReceived}\n`;
        messageBody += `✅ Total Delivered: ${totalDelivered}\n`;
        messageBody += `🎯 Avg Success: ${avgSuccessRate}%\n\n`;

        const topPerformers = Object.entries(riderAggregates)
          .map(([name, stats]) => ({
            name,
            rate: stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0
          }))
          .sort((a, b) => b.rate - a.rate)
          .slice(0, 3);

        messageBody += `🌟 *STAR PERFORMERS*\n`;
        topPerformers.forEach((p, i) => {
          messageBody += `${i === 0 ? '👑' : i === 1 ? '⭐' : '✨'} ${p.name}: ${p.rate}%\n`;
        });
      }
    } else {
      // 2b. Daily or Pending Logic
      const summarySnapshot = await db.collection('daily_records').where('date', '==', istDate).get();
      
      if (summarySnapshot.empty) {
        messageBody += `⚠️ *No operational records found for today.*`;
      } else {
        const record = summarySnapshot.docs[0].data();
        const riders = record.riders || [];
        
        if (reportType === 'pending') {
          const pending = Number(record.totalPending) || 0;
          messageBody += `⚠️ *Action Required: ${pending} items pending at hub.*\n\n`;
          
          const ridersWithPending = riders.filter(r => (Number(r.assignedDelivery) || 0) - (Number(r.completedDelivery) || 0) > 0);
          if (ridersWithPending.length > 0) {
            messageBody += `⏳ *Pending by Rider:*\n`;
            ridersWithPending.forEach(r => {
              const p = (Number(r.assignedDelivery) || 0) - (Number(r.completedDelivery) || 0);
              messageBody += `• ${r.riderName}: ${p} items\n`;
            });
          }
        } else {
          // ORIGINAL DAILY LOGIC (10 PM)
          const received = (Number(record.receivedDelivery) || 0) + (Number(record.receivedPickup) || 0);
          const delivered = Number(record.totalCompleted) || 0;
          const pending = Number(record.totalPending) || 0;
          const successRate = record.successRate || 0;

          messageBody += `📊 *OVERALL SUMMARY*\n`;
          messageBody += `📦 Received: ${received}\n`;
          messageBody += `✅ Delivered: ${delivered}\n`;
          messageBody += `⏳ Pending: ${pending}\n`;
          messageBody += `🎯 Overall Success: ${successRate}%\n\n`;

          if (riders.length > 0) {
            const sortedRiders = [...riders].sort((a, b) => (Number(b.successRate) || 0) - (Number(a.successRate) || 0));
            const topPerformers = sortedRiders.filter(r => (Number(r.assignedDelivery) || 0) + (Number(r.assignedPickup) || 0) > 0).slice(0, 3);
            
            if (topPerformers.length > 0) {
              messageBody += `⭐ *TOP PERFORMANCE*\n`;
              topPerformers.forEach((r, i) => {
                messageBody += `${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} ${r.riderName}: ${r.successRate}%\n`;
              });
              messageBody += `\n`;
            }

            let alerts = '';
            const highPerformance = riders.filter(r => r.successRate >= 80 && r.successRate <= 100);
            const lowPerformance = riders.filter(r => r.successRate >= 70 && r.successRate < 80);
            const criticalPerformance = riders.filter(r => r.successRate < 70 && ((Number(r.assignedDelivery) || 0) + (Number(r.assignedPickup) || 0) > 0));

            if (highPerformance.length > 0 || lowPerformance.length > 0 || criticalPerformance.length > 0) {
              messageBody += `🔔 *PERFORMANCE ALERTS*\n`;
              if (highPerformance.length > 0) {
                messageBody += `🔥 *High (80-100%):*\n`;
                highPerformance.forEach(r => messageBody += `• ${r.riderName} (${r.successRate}%)\n`);
              }
              if (lowPerformance.length > 0) {
                messageBody += `⚠️ *Needs Attention (70-80%):*\n`;
                lowPerformance.forEach(r => messageBody += `• ${r.riderName} (${r.successRate}%)\n`);
              }
              if (criticalPerformance.length > 0) {
                messageBody += `🚨 *Low (<70%):*\n`;
                criticalPerformance.forEach(r => messageBody += `• ${r.riderName} (${r.successRate}%)\n`);
              }
              messageBody += `\n`;
            }
          }
        }
      }
    }

    messageBody += `_Generated: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST_`;

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const phoneNumbers = process.env.WHATSAPP_TO_NUMBER.split(',');
    const results = [];

    for (const number of phoneNumbers) {
      const targetNumber = number.trim();
      if (!targetNumber) continue;

      try {
        const response = await client.messages.create({
          body: messageBody,
          from: `whatsapp:${process.env.WHATSAPP_FROM_NUMBER.trim()}`,
          to: `whatsapp:${targetNumber}`
        });
        
        console.log(`✅ WhatsApp report sent to ${targetNumber}. SID: ${response.sid}`);
        results.push({ number: targetNumber, status: 'sent', sid: response.sid });
      } catch (err) {
        console.error(`❌ Failed to send WhatsApp to ${targetNumber}:`, err.message);
        results.push({ number: targetNumber, status: 'failed', error: err.message });
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Daily report processing complete.',
      timestamp: new Date().toISOString(),
      results 
    });

  } catch (error) {
    console.error("Daily report error:", error);
    res.status(500).json({ error: error.message });
  }
}
