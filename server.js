

const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const { GoogleAuth } = require("google-auth-library"); // for service account auth

const app = express();
app.use(express.json());
app.use(cors());

// ================== SERVICE ACCOUNT AUTH ==================
const auth = new GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
  scopes: ["https://www.googleapis.com/auth/cloud-platform"]
});

app.post("/ask-gemini", async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "Question missing" });

  try {
    // get access token from service account
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken.token}` // use token instead of API key
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: question }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 50 }
        })
      }
    );

    const data = await response.json();
    console.log("Gemini Response:", JSON.stringify(data, null, 2));
    res.json(data);
  } catch (err) {
    console.error("AI ERROR:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

app.listen(3000, () =>
  console.log("✅ AI Server running at http://localhost:3000")
); 



