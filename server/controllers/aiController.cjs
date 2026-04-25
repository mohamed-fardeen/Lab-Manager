const supabaseAdmin = require('../config/supabaseAdmin.cjs');

exports.generateRecord = async (req, res) => {
    try {
        const { programName, programNumber, date, language, inputType, algorithmType, constraints, content, userName, userRrn } = req.body;
        
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'Intelligence engine key missing' });
        }

        const prompt = `
            You are an AI Academic Assistant for a laboratory management system.
            Generate a detailed lab record for the following experiment:
            
            Experiment Title: ${programName}
            Experiment No: ${programNumber}
            Language: ${language}
            Input Type: ${inputType}
            Algorithm Type: ${algorithmType}
            Researcher: ${userName} (${userRrn})
            Additional Constraints: ${constraints}
            ${content ? `Existing Content/Context: ${content}` : ''}

            Return your response in PURE JSON format with the following keys:
            - title: string
            - programNumber: string
            - date: string
            - aim: string (clear and concise)
            - algorithm: string (step-by-step or pseudocode as requested)
            - code: string (ready to run code)
            - output: string (sample execution output)
            - result: string (conclusion)
            - vivaQuestions: string (5-7 questions with answers in markdown format)

            DO NOT include any text outside the JSON object.
        `;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'You are a technical laboratory record generator. Output ONLY valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GROQ API Error:', errorText);
            return res.status(response.status).json({ success: false, message: 'Intelligence engine error' });
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Empty AI Response:', data);
            return res.status(500).json({ success: false, message: 'Intelligence engine returned empty sequencing' });
        }

        let aiOutput;
        try {
            aiOutput = JSON.parse(data.choices[0].message.content);
        } catch (e) {
            console.error('JSON Parse Error:', data.choices[0].message.content);
            return res.status(500).json({ success: false, message: 'Intelligence engine returned malformed JSON' });
        }

        // Ensure all required keys exist to prevent frontend crashes
        const finalOutput = {
            title: aiOutput.title || programName,
            programNumber: aiOutput.programNumber || programNumber,
            date: aiOutput.date || date,
            aim: aiOutput.aim || 'Experimentation Aim Sequence',
            algorithm: aiOutput.algorithm || 'Algorithm Sequencing in Progress',
            code: aiOutput.code || aiOutput.programCode || '# No code generated',
            output: aiOutput.output || 'No sample output available',
            result: aiOutput.result || 'Experimentation sequence concluded.',
            vivaQuestions: Array.isArray(aiOutput.vivaQuestions) ? aiOutput.vivaQuestions : []
        };

        res.json(finalOutput);
    } catch (error) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate record intelligence' });
    }
};

exports.processAiAction = async (req, res) => {
    try {
        const { action, fileName, content, language, history, model, message } = req.body;
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'Intelligence engine key missing' });
        }

        let systemPrompt = 'You are a helpful laboratory assistant.';
        let userPrompt = '';

        if (action === 'explain') {
            userPrompt = `Explain this file named "${fileName}" (${language}):\n\n${content}`;
        } else if (action === 'summarize') {
            userPrompt = `Summarize this file named "${fileName}":\n\n${content}`;
        } else if (action === 'viva') {
            userPrompt = `Generate 5 viva questions and answers for this file named "${fileName}":\n\n${content}`;
        } else if (action === 'chat') {
            userPrompt = message || 'Tell me about this laboratory environment.';
            if (content) {
                userPrompt = `Context (File: ${fileName}):\n${content}\n\nUser Question: ${message}`;
            }
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...((history && Array.isArray(history)) ? history.slice(-5).map(m => ({ role: m.role, content: m.content })) : []),
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.2
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GROQ Chat API Error:', errorText);
            return res.status(response.status).json({ success: false, message: 'Intelligence engine error' });
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error('Empty AI Chat Response:', data);
            return res.status(500).json({ success: false, message: 'Intelligence engine returned empty response' });
        }

        const aiResponse = data.choices[0].message.content || 'Intelligence sequencing complete, but no data was generated. Please try re-phrasing your request.';
        res.json({ response: aiResponse });
    } catch (error) {
        console.error('AI Action Error:', error);
        res.status(500).json({ success: false, message: 'Failed to process AI request' });
    }
};
