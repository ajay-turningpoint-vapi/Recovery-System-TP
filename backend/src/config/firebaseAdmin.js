const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps || admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential ? admin.credential.cert(serviceAccount) : admin.cert(serviceAccount),
      databaseURL: "https://turning-point-vapi.firebaseio.com",
    });
  } catch (err) {
    const { initializeApp, cert } = require('firebase-admin/app');
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: "https://turning-point-vapi.firebaseio.com",
    });
  }
}

module.exports = admin;
