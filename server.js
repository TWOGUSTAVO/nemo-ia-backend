import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

// Carrega variáveis de ambiente
dotenv.config();

const app = express();

// Configuração CORS para aceitar seu frontend - ATUALIZADO COM SEUS DOMÍNIOS
app.use(cors({
  origin: [
    'https://innovations.github.io',  // Seu frontend
    'http://localhost:5500',          // Live Server
    'http://127.0.0.1:5500',         // Localhost
    'http://localhost:3000'          // React dev
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// ==================== ROTAS PRINCIPAIS ====================

// Rota principal de saúde
app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "Nemo AI Backend",
    version: "2.1.0",  // Atualizado
    endpoints: {
      health: "/health",
      chat: "/api/chat",
      quick: "/api/quick",
      status: "/api/status",
      models: "/api/models"
    },
    documentation: "https://nemo-ia-backend.onrender.com"
  });
});

// Rota de saúde simplificada
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ==================== ROTA DE CHAT PRINCIPAL ====================

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], model = "mistral", options = {} } = req.body;
    
    console.log(`📨 Nova mensagem: "${message.substring(0, 50)}..."`);
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Mensagem vazia",
        suggestion: "Envie uma mensagem para conversar com a IA"
      });
    }

    // Limitar tamanho da mensagem
    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "Mensagem muito longa",
        suggestion: "Limite sua mensagem a 2000 caracteres"
      });
    }

    // Escolher modelo baseado na preferência
    let aiResponse;
    switch(model.toLowerCase()) {
      case "bloom":
        aiResponse = await callBloom(message);
        break;
      case "gemini":
        aiResponse = await callGemini(message, history, options);
        break;
      case "mistral":
      default:
        aiResponse = await callMistral(message, history, options);
        break;
    }

    res.json({
      success: true,
      response: aiResponse,
      model: model,
      tokens: aiResponse.length,
      timestamp: new Date().toISOString(),
      id: generateMessageId()
    });

  } catch (error) {
    console.error("❌ Erro no chat:", error.message);
    
    // Resposta de fallback amigável
    const fallbackResponses = [
      "Olá! 😊 Estou passando por uma manutenção rápida. Enquanto isso, posso te dizer que o Nemo System é incrível!",
      "Ops! Estou com alguns probleminhas técnicos no momento. Tente novamente em alguns instantes!",
      "Desculpe a interrupção! Estou ajustando alguns circuitos. Que tal conversarmos sobre tecnologia em geral?",
      "Parece que meus neurônios digitais estão um pouco dispersos hoje! Vamos tentar novamente?"
    ];
    
    res.json({
      success: false,
      response: fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)],
      error: error.message,
      fallback: true,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== ROTA DE RESPOSTAS RÁPIDAS ====================

app.post("/api/quick", async (req, res) => {
  try {
    const { action } = req.body;
    
    const quickResponses = {
      "tecnologia": "💻 **Tecnologia é incrível!** Desde IA até desenvolvimento web, há sempre algo novo para aprender. Você trabalha com tech ou é só curioso?",
      "programacao": "👨‍💻 **Adoro programação!** É como mágica com código. HTML, CSS, JavaScript, Python... cada linguagem tem sua beleza!",
      "piada": "🤣 **Por que o programador ficou pobre?** Porque ele usava todo seu cache! 😂",
      "ajuda": "🆘 **Precisa de ajuda?** Posso explicar funcionalidades do Nemo System, conversar sobre tech ou apenas bater um papo amigável!",
      "nemo": "🚀 **Nemo System** é uma plataforma incrível! Tem ferramentas úteis, interface moderna e foco em segurança. Posso te ajudar a explorá-la!",
      "ola": "👋 **Olá! Tudo bem?** Que bom te ver aqui! Eu sou a Nemo AI, sua companheira virtual. Como posso ajudar hoje? 😊"
    };

    const response = quickResponses[action] || 
      "🤔 Não conheço essa ação, mas adoraria conversar! Me pergunte qualquer coisa!";

    res.json({
      success: true,
      response: response,
      action: action,
      type: "quick",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Erro em quick:", error);
    res.json({
      success: false,
      response: "Olá! 😊 Em que posso ajudar?",
      fallback: true
    });
  }
});

// ==================== ROTA DE STATUS ====================

app.get("/api/status", async (req, res) => {
  try {
    // Testar conexão com Hugging Face (ATUALIZADO para nova URL)
    const hfStatus = await testHFConnection();
    
    res.json({
      success: true,
      status: "online",
      service: "Nemo AI Backend",
      version: "2.1.0",  // Atualizado
      models: {
        mistral: hfStatus.mistral ? "available" : "unavailable",
        bloom: hfStatus.bloom ? "available" : "unavailable",
        gemini: process.env.GEMINI_API_KEY ? "available" : "not_configured"
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      }
    });

  } catch (error) {
    res.json({
      success: false,
      status: "degraded",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== ROTA DE MODELOS DISPONÍVEIS ====================

app.get("/api/models", (req, res) => {
  res.json({
    models: [
      {
        id: "mistral",
        name: "Mistral 7B",
        provider: "Hugging Face",
        description: "Modelo avançado para conversas naturais",
        max_tokens: 1000,
        languages: ["pt", "en", "es"]
      },
      {
        id: "bloom",
        name: "BLOOMZ",
        provider: "Hugging Face",
        description: "Modelo multilíngue original",
        max_tokens: 500,
        languages: ["pt", "en", "es", "fr", "de"]
      },
      {
        id: "gemini",
        name: "Gemini Pro",
        provider: "Google",
        description: "Modelo da Google para respostas criativas",
        max_tokens: 800,
        languages: ["pt", "en"],
        requires_key: true
      }
    ],
    default: "mistral",
    recommendation: "Use 'mistral' para conversas mais naturais"
  });
});

// ==================== FUNÇÕES DE CHAMADA ÀS APIs ====================

async function callMistral(message, history = [], options = {}) {
  try {
    const formattedPrompt = formatMistralPrompt(message, history);
    
    // URL ATUALIZADA para nova API da Hugging Face
    const response = await fetch(
      "https://router.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",  // ← MUDOU AQUI!
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: formattedPrompt,
          parameters: {
            max_new_tokens: options.max_tokens || 500,
            temperature: options.temperature || 0.7,
            top_p: options.top_p || 0.9,
            repetition_penalty: 1.1,
            do_sample: true,
            return_full_text: false
          },
          options: {
            use_cache: true,
            wait_for_model: true
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Extrair resposta do formato da API
    let generatedText = "";
    if (Array.isArray(data) && data[0] && data[0].generated_text) {
      generatedText = data[0].generated_text;
    } else if (data.generated_text) {
      generatedText = data.generated_text;
    }

    // Limpar a resposta (remover prompt se necessário)
    generatedText = generatedText
      .replace(formattedPrompt, "")
      .replace(/\[INST\].*?\[\/INST\]/g, "")
      .replace(/<s>|<\/s>/g, "")
      .trim();

    // Se não conseguir resposta, usar fallback
    if (!generatedText || generatedText.length < 5) {
      return getFriendlyFallback(message);
    }

    return generatedText;

  } catch (error) {
    console.error("❌ Erro no Mistral:", error.message);
    throw error;
  }
}

async function callBloom(message) {
  try {
    // URL ATUALIZADA para nova API da Hugging Face
    const response = await fetch(
      "https://router.huggingface.co/models/bigscience/bloomz",  // ← MUDOU AQUI!
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: `Pergunta: ${message}\nResposta:`,
          parameters: {
            max_new_tokens: 300,
            temperature: 0.8,
            top_p: 0.9
          }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    let generatedText = "";
    if (Array.isArray(data) && data[0] && data[0].generated_text) {
      generatedText = data[0].generated_text;
    }

    // Limpar resposta
    generatedText = generatedText
      .replace(`Pergunta: ${message}\nResposta:`, "")
      .trim();

    return generatedText || getFriendlyFallback(message);

  } catch (error) {
    console.error("Erro no BLOOM:", error);
    throw error;
  }
}

async function callGemini(message, history = [], options = {}) {
  try {
    // Verificar se a chave Gemini está configurada
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    // Formatar histórico para Gemini
    const contents = [];
    
    // Adicionar contexto do sistema
    contents.push({
      role: "user",
      parts: [{ text: "Você é a Nemo AI, uma assistente amigável e útil no Nemo System. Seja natural, simpática e ajude os usuários." }]
    });
    
    contents.push({
      role: "model",
      parts: [{ text: "Entendido! Sou a Nemo AI, pronta para ajudar de forma amigável e segura!" }]
    });
    
    // Adicionar histórico recente
    history.slice(-4).forEach(msg => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    });
    
    // Adicionar mensagem atual
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            maxOutputTokens: options.max_tokens || 500,
            temperature: options.temperature || 0.7,
            topP: options.top_p || 0.8,
            topK: 40
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
          ]
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || "Gemini API error");
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    return generatedText.trim() || getFriendlyFallback(message);

  } catch (error) {
    console.error("Erro no Gemini:", error.message);
    throw error;
  }
}

// ==================== FUNÇÕES AUXILIARES ====================

function formatMistralPrompt(message, history = []) {
  // Contexto do sistema
  let prompt = "<s>[INST] Você é a Nemo AI, uma assistente virtual amigável, divertida e útil no Nemo System.\n\n";
  prompt += "SUAS CARACTERÍSTICAS:\n";
  prompt += "- Você é simpática, acolhedora e positiva\n";
  prompt += "- Fala de forma natural como uma pessoa real\n";
  prompt += "- Usa emojis ocasionalmente para ser mais humana 😊\n";
  prompt += "- É útil mas sempre protege a privacidade dos usuários\n";
  prompt += "- Não revela informações sensíveis ou senhas\n";
  prompt += "- Foca em conversas amigáveis e construtivas\n\n";
  
  prompt += "SOBRE O NEMO SYSTEM:\n";
  prompt += "- É uma plataforma de administração web\n";
  prompt += "- Tem ferramentas como scanner, terminal, etc.\n";
  prompt += "- Interface moderna e responsiva\n";
  prompt += "- Foco em segurança e usabilidade\n\n";
  
  prompt += "SEU ESTILO:\n";
  prompt += "1. Seja natural: use 'eu', 'você', contrações\n";
  prompt += "2. Seja engajadora: mostre interesse na conversa\n";
  prompt += "3. Seja útil: ajude quando possível\n";
  prompt += "4. Seja respeitosa: sempre educada\n";
  prompt += "5. Seja você mesma: uma IA divertida que adora conversar!\n\n";
  
  prompt += "EXEMPLOS DO QUE DIZER:\n";
  prompt += "- 'Oi! Tudo bem com você hoje? 😊'\n";
  prompt += "- 'Posso te ajudar com alguma coisa no sistema?'\n";
  prompt += "- 'Que tal conversarmos sobre tecnologia?'\n";
  prompt += "- 'Eu adoro ajudar as pessoas aqui no Nemo System!'\n";
  prompt += "- 'Não sei a resposta para isso, mas podemos falar de outra coisa!'\n";
  prompt += "[/INST] Entendido! Sou a Nemo AI, uma assistente amigável e útil. Estou pronta para conversar e ajudar quando possível! 😊</s>\n";

  // Adicionar histórico de conversa
  history.forEach(msg => {
    if (msg.role === 'user') {
      prompt += `<s>[INST] ${msg.content} [/INST]`;
    } else {
      prompt += ` ${msg.content}</s>\n`;
    }
  });

  // Adicionar mensagem atual
  prompt += `<s>[INST] ${message} [/INST]`;

  return prompt;
}

function getFriendlyFallback(originalMessage) {
  const fallbacks = [
    `Olá! 😊 Que bom conversar com você! "${originalMessage.substring(0, 30)}..." é um assunto interessante! O que mais gostaria de saber?`,
    `Oi! 👋 Em que posso te ajudar hoje? Posso conversar sobre tecnologia, o Nemo System, ou apenas bater um papo amigável!`,
    `Hey! Tudo bem? Eu sou a Nemo AI, sua companheira virtual aqui no sistema. Pronto para uma conversa divertida? 🚀`,
    `Olá, amigo! 😄 Como vai? Eu adoro ajudar as pessoas aqui no Nemo System. Me pergunte qualquer coisa!`,
    `Oi! Que bom te ver! 😊 Vamos conversar? Posso falar sobre o sistema, tecnologia, ou qualquer outro assunto interessante!`
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

async function testHFConnection() {
  try {
    // Testar Mistral - URL ATUALIZADA
    const mistralTest = await fetch(
      "https://router.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",  // ← MUDOU AQUI!
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: "Test",
          parameters: { max_new_tokens: 10 }
        })
      }
    ).then(r => r.ok).catch(() => false);

    // Testar BLOOM - URL ATUALIZADA
    const bloomTest = await fetch(
      "https://router.huggingface.co/models/bigscience/bloomz",  // ← MUDOU AQUI!
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputs: "Test",
          parameters: { max_new_tokens: 10 }
        })
      }
    ).then(r => r.ok).catch(() => false);

    return {
      mistral: mistralTest,
      bloom: bloomTest
    };

  } catch (error) {
    return {
      mistral: false,
      bloom: false,
      error: error.message
    };
  }
}

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== MANIPULADOR DE ERROS GLOBAL ====================

app.use((err, req, res, next) => {
  console.error('🔥 Erro global:', err.stack);
  
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Tente novamente mais tarde',
    timestamp: new Date().toISOString()
  });
});

// Rota 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    available_endpoints: [
      "GET  /",
      "GET  /health",
      "GET  /api/status",
      "GET  /api/models",
      "POST /api/chat",
      "POST /api/quick"
    ],
    documentation: "Consulte a rota / para mais informações"
  });
});

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================

const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor IA rodando em http://${HOST}:${PORT}`);
  console.log(`📡 Endpoints disponíveis:`);
  console.log(`   • GET  /           - Informações do serviço`);
  console.log(`   • GET  /health     - Status de saúde`);
  console.log(`   • GET  /api/status - Status detalhado`);
  console.log(`   • GET  /api/models - Modelos disponíveis`);
  console.log(`   • POST /api/chat   - Chat principal`);
  console.log(`   • POST /api/quick  - Respostas rápidas`);
  console.log(`\n🔑 Variáveis necessárias:`);
  console.log(`   • HF_API_KEY=${process.env.HF_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
  console.log(`   • GEMINI_API_KEY=${process.env.GEMINI_API_KEY ? '✅ Configurada' : '❌ Opcional'}`);
  console.log(`\n🌐 Acesse: https://nemo-ia-backend.onrender.com`);
});