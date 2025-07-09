class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.sampleRate = 16000;
    }
    
    process(inputs, outputs) {
        try {
            const input = inputs[0]?.[0];
            
            if (input && input.length > 0) {
                const int16Data = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                    const s = Math.max(-1, Math.min(1, input[i]));
                    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }
                
                this.port.postMessage({
                    audioData: int16Data.buffer,
                    timestamp: currentTime
                }, [int16Data.buffer]);
            }
        } catch (error) {
            this.port.postMessage({ error: error.message });
        }
        
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);