require('dotenv').config();
const express = require('express');
const { MessagingResponse } = require('twilio').twiml;
const axios = require('axios');

const app = express();
app.use(express.urlencoded({ extended: false }));

const PORT = process.env.PORT || 3000;

// Função para escolher o modelo certo com base na pergunta
function selectModel(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('traduz') || lowerPrompt.includes('como se diz')) {
        return process.env.MODEL_FLAN;
    } else if (lowerPrompt.includes('regra') || lowerPrompt.includes('gramática')) {
        return process.env.MODEL_FLAN;
    } else if (lowerPrompt.includes('resuma') || lowerPrompt.includes('resuma isso')) {
        return process.env.MODEL_FALCON;
    } else {
        return process.env.MODEL_MISTRAL;
    }
}

// Função para chamar o modelo selecionado
async function callAI(prompt) {
    const model = selectModel(prompt);

    try {
        const response = await axios.post(
            `https://api-inference.huggingface.co/models/ ${model}`,
            {
                inputs: prompt,
                options: { wait_for_model: true }
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data[0].generated_text || 'Não consegui gerar resposta.';
    } catch (error) {
        console.error('Erro chamando IA:', error.message);
        return 'Erro ao processar sua solicitação.';
    }
}

// Rota do WhatsApp
app.post('/whatsapp', async (req, res) => {
    const incomingMsg = req.body.Body;
    const chatType = req.body.ChatType; // Grupo ou privado

    const twiml = new MessagingResponse();

    if (chatType === 'group') {
        const reply = await callAI(incomingMsg);
        twiml.message(reply);
    } else {
        twiml.message('Este bot só responde em grupos.');
    }

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
});

app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});