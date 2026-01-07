import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.post("/ia", async (req, res) => {
  const prompt = req.body.prompt;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt vazio" });
  }

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/bigscience/bloomz",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + process.env.HF_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt })
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Erro ao acessar a IA" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor IA rodando");
});
