const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();
const { generateRtcToken, generateRtmToken } = require('./tokenGenerator');
const cloudinary = require('./cloudinaryConfig');
const { createClient } = require('@deepgram/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({origin: '*'}));
app.use(express.json());

// for monitoring in UptimeRobot 
app.head('/', (req, res) => {
    res.status(200).end();
});

// for testing in browser
app.get('/', (req, res) => {
res.status(200).send('Server is running!');
});

const upload = multer();

app.post('/token', (req, res) => {
    const { uid, room } = req.body;
    if (!uid || !room) return res.status(400).json({ error: 'uid and room are required' });
    const rtcToken = generateRtcToken(room, uid);
    const rtmToken = generateRtmToken(uid);
    res.json({ rtcToken, rtmToken });
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    let cld_upload_stream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return res.status(500).json({ error: 'Upload failed' });
          }
          res.json({ url: result.secure_url });
        }
    );

    cld_upload_stream.end(req.file.buffer);
});

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);


app.post('/api/meeting-summary/summary', async (req, res) => {
    try {
        const { audioUrl } = req.body;
        if (!audioUrl) return res.status(400).json({ error: 'audioUrl is required' });
        const response = await deepgram.transcription.preRecorded(
            { url: audioUrl },
            { punctuate: true }
        );
        const transcript = response.results.channels[0].alternatives[0].transcript;
        const sentences = transcript.split('.').map(s => s.trim()).filter(Boolean);
        const summary = sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '.' : '');
        res.json({ summary, transcript });
    } catch (error) {
        console.error('Meeting Summary Error:', error);
        res.status(500).json({ error: 'Failed to generate AI summary' });
    }
});

app.post('/api/meeting-summary/live', (req, res) => {
    try {
        const { transcript } = req.body;
        if (!transcript) {
            return res.status(400).json({ error: 'Transcript text is required' });
        }
        const sentences = transcript.split('.').map(s => s.trim()).filter(Boolean);
        const summary = sentences.slice(0, 3).join('. ') + (sentences.length > 3 ? '.' : '');
        res.json({ summary });
    } catch (error) {
        console.error('Live Meeting Summary Error:', error);
        res.status(500).json({ error: 'Failed to generate live meeting summary' });
    }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/meeting-summary/gemini', async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required.' });
  }
  
  // Clean and preprocess the transcript
  let cleanedTranscript = transcript
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/([.!?])\s*([.!?])/g, '$1') // Remove duplicate punctuation
    .trim();
  
  // If transcript is too short or seems garbled, return an error
  if (cleanedTranscript.length < 20) {
    return res.status(400).json({ 
      error: 'Transcript is too short or unclear. Please ensure there is sufficient speech content for summarization.' 
    });
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Generate summary with better prompt
    const summaryPrompt = `Please analyze the following meeting transcript and provide a coherent summary in 3-5 sentences. If the transcript appears garbled or unclear, please note this limitation:

Transcript: ${cleanedTranscript}

Please provide a clear, coherent summary of the meeting content:`;
    
    const summaryResult = await model.generateContent(summaryPrompt);
    const summary = summaryResult.response.text();
    
    res.json({ summary });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (clientSocket, req) => {
    console.log('New client connected for live transcription');
    
    if (!process.env.DEEPGRAM_API_KEY) {
        console.error('DEEPGRAM_API_KEY not found in environment variables');
        clientSocket.send(JSON.stringify({ 
            error: 'Server configuration error: Missing API key' 
        }));
        clientSocket.close();
        return;
    }
    
    let dgSocket = null;
    
    try {
        dgSocket = new WebSocket('wss://api.deepgram.com/v1/listen?encoding=linear16&sample_rate=16000&channels=1', {
            headers: {
                Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`
            }
        });
        
        dgSocket.on('open', () => {
            console.log('Connected to Deepgram API');
            clientSocket.send(JSON.stringify({ status: 'Deepgram connected' }));
        });
        
        dgSocket.on('error', (error) => {
            console.error('Deepgram WebSocket error:', error);
            clientSocket.send(JSON.stringify({ 
                error: 'Speech API connection error',
                details: error.message
            }));
        });
        
        dgSocket.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                
                if (Math.random() < 0.05) { 
                    console.log('Deepgram sample response:', JSON.stringify(data));
                }
                
                if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
                    const transcriptChunk = data.channel.alternatives[0].transcript;
                    if (transcriptChunk && transcriptChunk.trim()) {
                        console.log('Transcript chunk:', transcriptChunk);
                        clientSocket.send(JSON.stringify({ transcript: transcriptChunk }));
                    }
                } else if (data.error) {
                    console.error('Deepgram returned error:', data.error);
                    clientSocket.send(JSON.stringify({ error: `Deepgram: ${data.error}` }));
                }
            } catch (error) {
                console.error('Error processing Deepgram message:', error);
            }
        });
        
        clientSocket.on('message', (audioData) => {
            if (dgSocket && dgSocket.readyState === WebSocket.OPEN) {
                try {
                    if (audioData instanceof Buffer && audioData.length > 0) {
                        dgSocket.send(audioData);
                    } else {
                        console.warn('Received invalid audio data type:', typeof audioData);
                    }
                } catch (error) {
                    console.error('Error sending audio to Deepgram:', error);
                }
            }
        });
        
        clientSocket.on('close', (code, reason) => {
            console.log(`Client disconnected: ${code} - ${reason || 'No reason provided'}`);
            if (dgSocket) {
                dgSocket.close();
            }
        });
        
        dgSocket.on('close', (code, reason) => {
            console.log(`Deepgram connection closed: ${code} - ${reason || 'No reason provided'}`);
            clientSocket.close();
        });
        
    } catch (error) {
        console.error('Error setting up transcription:', error);
        clientSocket.send(JSON.stringify({ error: 'Failed to initialize transcription service' }));
        clientSocket.close();
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});