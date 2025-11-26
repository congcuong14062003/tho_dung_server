import axios from "axios";

export const sendFCM = async ({ tokens = [], title, body, data = {} }) => {
  if (!tokens.length) return;

  const payload = {
    registration_ids: tokens,
    notification: { title, body },
    data,
  };

  try {
    await axios.post("https://fcm.googleapis.com/fcm/send", payload, {
      headers: {
        Authorization: `key=${process.env.FCM_SERVER_KEY}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("FCM ERROR:", error.response?.data || error.message);
  }
};
