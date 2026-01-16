const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const GEMINI_API_KEY = "AIzaSyCeqdF1-O2F4rcPKurnNZXrfdwjvP230TQ";

app.post("/ask-gemini", async (req,res)=>{
  const {question} = req.body;
  if(!question) return res.status(400).json({error:"Question missing"});

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        contents: [{ parts:[{ text: question }] }],
        generationConfig: { temperature:0, maxOutputTokens:50 }
      })
    });
    const data = await response.json();
    console.log("Gemini Response:", JSON.stringify(data,null,2));
    res.json(data);
  } catch(err) {
    console.error("AI ERROR:",err);
    res.status(500).json({error:"AI request failed"});
  }
});

app.listen(3000,()=>console.log("✅ AI Server running at http://localhost:3000"));


