// Voice Service for Speech Recognition and Synthesis
// Implements professional voice interaction for hands-free operation

// Type definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  confidenceThreshold: number;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  timestamp: Date;
  alternatives?: string[];
}

export interface SpeechSynthesisOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

export interface VoiceCommand {
  command: string;
  parameters?: Record<string, any>;
  confidence: number;
}

class VoiceService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis;
  private isListening = false;
  private currentStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  
  // Voice command patterns for construction context
  private commandPatterns = new Map<RegExp, string>([
    [/take\s+(a\s+)?photo/i, 'capture_photo'],
    [/analyze\s+(this\s+)?room/i, 'analyze_room'],
    [/remove\s+(the\s+)?wall/i, 'remove_wall'],
    [/add\s+(a\s+)?wall/i, 'add_wall'],
    [/change\s+(the\s+)?style/i, 'change_style'],
    [/show\s+me\s+options/i, 'show_options'],
    [/what\s+(would|will)\s+this\s+look\s+like/i, 'preview_changes'],
    [/calculate\s+(the\s+)?cost/i, 'calculate_cost'],
    [/start\s+(a\s+)?project/i, 'start_project'],
    [/get\s+help/i, 'get_help'],
    [/save\s+(this\s+)?design/i, 'save_design'],
    [/go\s+back/i, 'go_back'],
    [/cancel/i, 'cancel'],
    [/yes|okay|ok|sure/i, 'confirm'],
    [/no|nope|cancel/i, 'deny']
  ]);

  // Construction vocabulary for better recognition
  private constructionVocab = [
    'wall', 'ceiling', 'floor', 'window', 'door', 'kitchen', 'bathroom',
    'bedroom', 'living room', 'hallway', 'load bearing', 'drywall',
    'hardwood', 'tile', 'carpet', 'paint', 'renovation', 'remodel',
    'addition', 'removal', 'structural', 'electrical', 'plumbing',
    'HVAC', 'permit', 'blueprint', 'design', 'style', 'modern',
    'traditional', 'contemporary', 'budget', 'timeline', 'contractor'
  ];

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
    this.setupAudioContext();
  }

  private initializeSpeechRecognition(): void {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.configureRecognition();
  }

  private configureRecognition(): void {
    if (!this.recognition) return;

    const config: VoiceConfig = {
      language: 'en-US',
      continuous: true,
      interimResults: true,
      maxAlternatives: 3,
      confidenceThreshold: 0.7
    };

    this.recognition.lang = config.language;
    this.recognition.continuous = config.continuous;
    this.recognition.interimResults = config.interimResults;
    this.recognition.maxAlternatives = config.maxAlternatives;

    // Add construction vocabulary hints (browser-dependent)
    if ('grammars' in this.recognition) {
      const grammar = `#JSGF V1.0; grammar construction; public <construction> = ${this.constructionVocab.join(' | ')};`;
      const speechRecognitionList = new (window as any).webkitSpeechGrammarList();
      speechRecognitionList.addFromString(grammar, 1);
      this.recognition.grammars = speechRecognitionList;
    }
  }

  private setupAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('AudioContext not available:', error);
    }
  }

  async startListening(
    onTranscript: (result: TranscriptionResult) => void,
    onCommand?: (command: VoiceCommand) => void,
    onError?: (error: string) => void
  ): Promise<boolean> {
    if (!this.recognition) {
      onError?.('Speech recognition not available');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Optimize for speech recognition
          sampleRate: 16000,
          channelCount: 1
        } 
      });
      
      this.currentStream = stream;

      // Set up recognition event handlers
      this.recognition.onstart = () => {
        this.isListening = true;
        console.log('Voice recognition started');
      };

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript.trim();
          const confidence = result[0].confidence || 0.5;

          const transcriptionResult: TranscriptionResult = {
            transcript,
            confidence,
            isFinal: result.isFinal,
            timestamp: new Date(),
            alternatives: Array.from(result).slice(1, 3).map((alt: any) => alt.transcript)
          };

          onTranscript(transcriptionResult);

          // Process commands only for final results with good confidence
          if (result.isFinal && confidence > 0.6) {
            const command = this.parseCommand(transcript);
            if (command && onCommand) {
              onCommand(command);
            }
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        onError?.(event.error);
        
        // Auto-restart on certain errors
        if (event.error === 'network' || event.error === 'audio-capture') {
          setTimeout(() => this.restartRecognition(onTranscript, onCommand, onError), 1000);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        console.log('Voice recognition ended');
        
        // Auto-restart if stream is still active
        if (this.currentStream && this.currentStream.active) {
          setTimeout(() => this.restartRecognition(onTranscript, onCommand, onError), 500);
        }
      };

      // Start recognition
      this.recognition.start();
      return true;

    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      onError?.('Microphone access denied or unavailable');
      return false;
    }
  }

  private async restartRecognition(
    onTranscript: (result: TranscriptionResult) => void,
    onCommand?: (command: VoiceCommand) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    if (this.recognition && this.currentStream) {
      try {
        this.recognition.start();
      } catch (error) {
        console.warn('Failed to restart recognition:', error);
      }
    }
  }

  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }

    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    this.isListening = false;
  }

  private parseCommand(transcript: string): VoiceCommand | null {
    const lowercaseTranscript = transcript.toLowerCase().trim();
    
    for (const [pattern, command] of this.commandPatterns) {
      const match = pattern.exec(lowercaseTranscript);
      if (match) {
        const parameters = this.extractParameters(lowercaseTranscript, command);
        
        return {
          command,
          parameters,
          confidence: this.calculateCommandConfidence(transcript, pattern)
        };
      }
    }

    return null;
  }

  private extractParameters(transcript: string, command: string): Record<string, any> {
    const parameters: Record<string, any> = {};

    switch (command) {
      case 'remove_wall':
      case 'add_wall':
        // Extract wall specifications
        if (transcript.includes('load bearing') || transcript.includes('load-bearing')) {
          parameters.loadBearing = true;
        }
        if (transcript.includes('exterior')) {
          parameters.wallType = 'exterior';
        } else if (transcript.includes('interior')) {
          parameters.wallType = 'interior';
        }
        break;

      case 'change_style':
        // Extract style preferences
        const styles = ['modern', 'traditional', 'contemporary', 'rustic', 'industrial'];
        for (const style of styles) {
          if (transcript.includes(style)) {
            parameters.style = style;
            break;
          }
        }
        break;

      case 'calculate_cost':
        // Extract budget-related terms
        const budgetMatch = transcript.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
        if (budgetMatch) {
          parameters.budget = parseFloat(budgetMatch[1].replace(',', ''));
        }
        break;
    }

    return parameters;
  }

  private calculateCommandConfidence(transcript: string, pattern: RegExp): number {
    let confidence = 0.7; // Base confidence

    // Boost confidence for exact matches
    const exactMatch = pattern.test(transcript.toLowerCase());
    if (exactMatch) confidence += 0.1;

    // Boost for construction vocabulary presence
    const vocabWords = this.constructionVocab.filter(word => 
      transcript.toLowerCase().includes(word)
    );
    confidence += Math.min(0.2, vocabWords.length * 0.05);

    // Reduce confidence for very long or short transcripts
    if (transcript.length < 5 || transcript.length > 100) {
      confidence -= 0.1;
    }

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  async speak(
    text: string, 
    options: SpeechSynthesisOptions = {}
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        console.warn('Speech synthesis not available');
        resolve(false);
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice options
      utterance.rate = options.rate ?? 0.9;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 0.8;
      utterance.lang = options.language ?? 'en-US';

      // Select appropriate voice
      const voices = this.synthesis.getVoices();
      if (options.voice) {
        const selectedVoice = voices.find(voice => 
          voice.name.toLowerCase().includes(options.voice!.toLowerCase())
        );
        if (selectedVoice) utterance.voice = selectedVoice;
      } else {
        // Prefer female voices for assistant personality
        const preferredVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('karen')
        );
        if (preferredVoice) utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve(true);
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        resolve(false);
      };

      this.synthesis.speak(utterance);
    });
  }

  // Get available voices for configuration
  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis?.getVoices() || [];
  }

  // Check if currently speaking
  isSpeaking(): boolean {
    return this.synthesis?.speaking || false;
  }

  // Stop current speech
  stopSpeaking(): void {
    this.synthesis?.cancel();
  }

  // Process audio for additional analysis (noise detection, volume, etc.)
  async analyzeAudio(stream: MediaStream): Promise<{
    noiseLevel: number;
    volume: number;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
  }> {
    if (!this.audioContext) {
      return { noiseLevel: 0, volume: 0.5, quality: 'fair' };
    }

    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      return new Promise((resolve) => {
        const checkAudio = () => {
          analyser.getByteFrequencyData(dataArray);
          
          // Calculate volume (RMS)
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i] * dataArray[i];
          }
          const volume = Math.sqrt(sum / bufferLength) / 255;
          
          // Estimate noise level (high frequency content)
          let noiseSum = 0;
          for (let i = Math.floor(bufferLength * 0.7); i < bufferLength; i++) {
            noiseSum += dataArray[i];
          }
          const noiseLevel = noiseSum / (bufferLength * 0.3 * 255);
          
          // Determine quality
          let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'poor';
          if (volume > 0.3 && noiseLevel < 0.2) quality = 'excellent';
          else if (volume > 0.2 && noiseLevel < 0.4) quality = 'good';
          else if (volume > 0.1) quality = 'fair';
          
          source.disconnect();
          resolve({ noiseLevel, volume, quality });
        };
        
        // Give it a moment to gather audio data
        setTimeout(checkAudio, 100);
      });
      
    } catch (error) {
      console.error('Audio analysis failed:', error);
      return { noiseLevel: 0, volume: 0.5, quality: 'fair' };
    }
  }

  // Generate helpful voice prompts for guidance
  generateGuidancePrompt(context: string): string {
    const prompts = {
      'camera_ready': "I can see your camera is ready. Say 'take a photo' when you'd like me to analyze your space.",
      'photo_taken': "Great photo! I'm analyzing your room now. You can ask me to 'remove a wall' or 'change the style' when I'm done.",
      'analysis_complete': "Analysis complete! I can see several options for your space. Say 'show me options' to see what's possible.",
      'modification_ready': "I can help you visualize changes. Try saying 'remove the wall' or 'change to modern style'.",
      'error': "I didn't catch that clearly. Could you repeat your request? You can say things like 'take a photo' or 'analyze this room'."
    };
    
    return prompts[context as keyof typeof prompts] || "How can I help you with your remodeling project today?";
  }

  // Cleanup resources
  dispose(): void {
    this.stopListening();
    this.stopSpeaking();
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}



export const voiceService = new VoiceService();
export default voiceService;