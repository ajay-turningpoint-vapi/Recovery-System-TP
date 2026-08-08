const firebaseAdmin = require('../config/firebaseAdmin');
const prisma = require('../config/db');

/**
 * Push Notification Service (Blueprint Page 22)
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    console.log(`[Notification Bypass] No FCM token for notification: "${title}"`);
    return { success: false, reason: 'No FCM Token' };
  }

  try {
    const message = {
      notification: { title, body },
      data: {
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        ...data,
      },
      token: fcmToken,
    };

    const response = await firebaseAdmin.messaging().send(message);
    console.log(`[FCM Notification Sent] ID: ${response} | Title: "${title}"`);
    return { success: true, messageId: response };
  } catch (err) {
    console.error('[FCM Notification Error]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send Exception Alert to Manager
 */
async function sendManagerExceptionAlert(managerUserId, title, body) {
  const user = await prisma.user.findUnique({ where: { id: managerUserId } });
  if (user && user.fcm_token) {
    return sendPushNotification(user.fcm_token, title, body, { type: 'EXCEPTION_ALERT' });
  }
}

module.exports = {
  sendPushNotification,
  sendManagerExceptionAlert,
};
