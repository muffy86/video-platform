import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Mic, MicOff, Brain, Home, Zap, Upload, Loader2 } from "lucide-react";
import aiService, { AgentType, AgentResponse } from './services/aiService';
import computerVisionService, { RoomAnalysis } from './services/computerVisionService';
import voiceService, { TranscriptionResult, VoiceCommand } from './services/voiceService';
import './mobile-optimizations.css';

export default function AIRemodelingAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // AI Agent State
  const [currentAgent, setCurrentAgent] = useState<AgentType>('coordinator');
  const [agentMessage, setAgentMessage] = useState('Welcome! I\'m your AI remodeling assistant. Let\'s start by taking some photos of your space.');
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);
  const [roomAnalysis, setRoomAnalysis] = useState<RoomAnalysis | null>(null);
  
  // Voice Recognition State
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [lastVoiceCommand, setLastVoiceCommand] = useState<VoiceCommand | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  
  // Project Context
  const [projectContext, setProjectContext] = useState({
    projectType: 'room_renovation',
    roomType: 'unknown'
  });

  useEffect(() => {
    initializeCamera();
    initializeServices();
    
    return () => {
      // Cleanup on unmount
      voiceService.dispose();
      computerVisionService.dispose();
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const initializeServices = async () => {
    try {
      // Initialize computer vision
      await computerVisionService.initializeMediaPipe();
      console.log('Computer vision service initialized');
      
      // Enable voice service
      setVoiceEnabled(true);
      console.log('Voice service ready');
    } catch (error) {
      console.error('Service initialization failed:', error);
    }
  };

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, max: 4096 },
          height: { ideal: 1080, max: 2160 },
          facingMode: 'environment'
        }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
    }
  };

  const toggleVoiceRecognition = useCallback(async () => {
    if (!voiceEnabled) {
      await speakMessage("Voice recognition is not available on this device.");
      return;
    }
    
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      setCurrentTranscript('');
    } else {
      const success = await voiceService.startListening(
        handleTranscription,
        handleVoiceCommand,
        handleVoiceError
      );
      
      if (success) {
        setIsListening(true);
        await speakMessage("I'm listening. How can I help with your remodeling project?");
      } else {
        await speakMessage("I couldn't access your microphone. Please check your permissions.");
      }
    }
  }, [isListening, voiceEnabled]);
  
  const handleTranscription = useCallback((result: TranscriptionResult) => {
    setCurrentTranscript(result.transcript);
    
    if (result.isFinal && result.confidence > 0.6) {
      processUserMessage(result.transcript, currentAgent, 'voice');
      setCurrentTranscript('');
    }
  }, []);
  
  const handleVoiceCommand = useCallback(async (command: VoiceCommand) => {
    setLastVoiceCommand(command);
    console.log('Voice command received:', command);
    
    switch (command.command) {
      case 'capture_photo':
        await capturePhoto();
        break;
      case 'analyze_room':
        if (roomAnalysis) {
          await processUserMessage('Please analyze this room in detail', 'vision');
        } else {
          await speakMessage("Please take a photo first so I can analyze your room.");
        }
        break;
      case 'remove_wall':
        await processUserMessage('I want to remove a wall', 'structural');
        break;
      case 'change_style':
        const style = command.parameters?.style || 'modern';
        await processUserMessage(`Change the style to ${style}`, 'design');
        break;
      case 'show_options':
        await processUserMessage('Show me design options for this space', 'coordinator');
        break;
      case 'get_help':
        await speakMessage(voiceService.generateGuidancePrompt('help'));
        break;
      default:
        await processUserMessage(command.command.replace('_', ' '), currentAgent);
    }
  }, [roomAnalysis, currentAgent]);
  
  const handleVoiceError = useCallback(async (error: string) => {
    console.error('Voice recognition error:', error);
    setIsListening(false);
    await speakMessage("I had trouble hearing you. Please try again.");
  }, []);
  
  const speakMessage = async (message: string): Promise<void> => {
    if (voiceEnabled && !voiceService.isSpeaking()) {
      await voiceService.speak(message, {
        rate: 0.9,
        pitch: 1.0,
        volume: 0.8
      });
    }
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !cameraStream) {
      await speakMessage("Camera is not ready. Please check your camera permissions.");
      return;
    }
    
    setIsProcessingImage(true);
    setIsAIThinking(true);
    
    try {
      // Capture frame from video
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Analyze image with computer vision
      const analysis = await computerVisionService.analyzeImage(imageData);
      setRoomAnalysis(analysis);
      
      // Update project context
      setProjectContext(prev => ({
        ...prev,
        roomType: analysis.roomType
      }));
      
      // Get AI analysis
      const analysisMessage = `I captured a photo of what appears to be a ${analysis.roomType}. 
        The room is approximately ${analysis.dimensions.width}x${analysis.dimensions.height} feet (${analysis.dimensions.area} sq ft).
        I detected ${analysis.elements.length} architectural elements including ${analysis.elements.filter(e => e.type === 'wall').length} walls.
        The lighting appears to be ${analysis.lighting} and the overall condition looks ${analysis.condition}.
        What would you like to modify or explore?`;
      
      const response = await aiService.processMessage(
        analysisMessage,
        'vision',
        { projectType: 'room_renovation', roomType: analysis.roomType }
      );
      
      setCurrentAgent('vision');
      setAgentMessage(response.content);
      
      // Add to conversation history
      setConversationHistory(prev => [...prev, `Photo captured and analyzed: ${analysis.roomType}`, response.content]);
      
      await speakMessage("Great photo! I've analyzed your space. " + response.content);
      
    } catch (error) {
      console.error('Photo capture failed:', error);
      await speakMessage("I had trouble analyzing your photo. Please try again.");
    } finally {
      setIsProcessingImage(false);
      setIsAIThinking(false);
    }
  }, [cameraStream]);
  
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsProcessingImage(true);
    setIsAIThinking(true);
    
    try {
      const analysis = await computerVisionService.analyzeImage(file);
      setRoomAnalysis(analysis);
      
      const response = await aiService.processMessage(
        `I uploaded an image of a ${analysis.roomType}. Please analyze it and suggest remodeling options.`,
        'vision',
        { projectType: 'room_renovation', roomType: analysis.roomType }
      );
      
      setCurrentAgent('vision');
      setAgentMessage(response.content);
      await speakMessage(response.content);
      
    } catch (error) {
      console.error('File upload analysis failed:', error);
      await speakMessage("I had trouble analyzing your uploaded image.");
    } finally {
      setIsProcessingImage(false);
      setIsAIThinking(false);
    }
  }, []);
  
  const processUserMessage = useCallback(async (message: string, targetAgent: AgentType = 'coordinator', source: 'voice' | 'text' = 'text') => {
    setIsAIThinking(true);
    
    try {
      const context = {
        projectType: projectContext.projectType,
        roomType: projectContext.roomType
      };
      
      const response = await aiService.processMessage(message, targetAgent, context);
      
      setCurrentAgent(targetAgent);
      setAgentMessage(response.content);
      
      // Add to conversation history
      setConversationHistory(prev => [...prev, `User (${source}): ${message}`, `${targetAgent}: ${response.content}`]);
      
      // Speak response if voice was used
      if (source === 'voice') {
        await speakMessage(response.content);
      }
      
    } catch (error) {
      console.error('Message processing failed:', error);
      const fallbackMessage = "I'm having trouble processing that request. Could you try again?";
      setAgentMessage(fallbackMessage);
      
      if (source === 'voice') {
        await speakMessage(fallbackMessage);
      }
    } finally {
      setIsAIThinking(false);
    }
  }, [projectContext, conversationHistory]);
  
  const startRoomAnalysis = useCallback(async () => {
    if (!roomAnalysis) {
      await speakMessage("Please take a photo first so I can analyze your room.");
      return;
    }
    
    await processUserMessage(
      `Please provide a detailed analysis of this ${roomAnalysis.roomType} including structural recommendations and design possibilities.`,
      'coordinator'
    );
  }, [roomAnalysis, processUserMessage]);
  
  const startProject = useCallback(async () => {
    await processUserMessage(
      "I'm ready to start a remodeling project. What are the first steps?",
      'project-manager'
    );
  }, [processUserMessage]);

  return (
    <div className="min-h-screen bg-background mobile-optimized mobile-safe-area">
      {/* Camera/AR Viewport */}
      <div className="relative h-[60vh] camera-viewport gpu-accelerated">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* AR Overlay */}
        <div className="ar-overlay">
          {isAIThinking && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="ai-thinking p-4 glass-surface">
                <Brain className="w-8 h-8 mx-auto mb-2 text-accent-ai-glow" />
                <p className="text-sm text-center">AI Analyzing...</p>
              </div>
            </div>
          )}
          
          {/* Photo Capture Button */}
          <div className="camera-controls-mobile">
            <Button
              onClick={capturePhoto}
              disabled={isProcessingImage}
              size="lg"
              className="rounded-full w-16 h-16 p-0 bg-white/20 hover:bg-white/30 disabled:opacity-50 touch-friendly"
            >
              {isProcessingImage ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Camera className="w-6 h-6" />
              )}
            </Button>
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingImage}
              size="lg"
              className="rounded-full w-16 h-16 p-0 bg-white/20 hover:bg-white/30 disabled:opacity-50 touch-friendly"
            >
              <Upload className="w-6 h-6" />
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Voice Interface Panel */}
      <Card className="glass-surface m-4 p-4 fold-responsive">
        <div className="flex items-center gap-4">
          <Button
            onClick={toggleVoiceRecognition}
            className={`voice-trigger touch-friendly ${isListening ? 'listening' : ''}`}
            size="sm"
          >
            {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                isAIThinking ? 'bg-yellow-500' : 'bg-accent-ai-glow'
              }`} />
              <span className="text-sm font-medium capitalize">{currentAgent} Agent</span>
              {isAIThinking && <span className="text-xs text-yellow-500">Thinking...</span>}
            </div>
            <p className="text-sm text-muted-foreground">{agentMessage}</p>
            {currentTranscript && (
              <p className="text-xs text-blue-400 mt-1 italic">Listening: "{currentTranscript}"</p>
            )}
            {lastVoiceCommand && (
              <p className="text-xs text-green-400 mt-1">Command: {lastVoiceCommand.command.replace('_', ' ')}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-4 p-4 fold-layout">
        <Button 
          variant="outline" 
          className="flex-1 glass-surface touch-friendly"
          onClick={startRoomAnalysis}
          disabled={isAIThinking || !roomAnalysis}
        >
          <Home className="w-4 h-4 mr-2" />
          Room Analysis
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 glass-surface touch-friendly"
          onClick={startProject}
          disabled={isAIThinking}
        >
          <Zap className="w-4 h-4 mr-2" />
          Start Project
        </Button>
      </div>
      
      {/* Agent Collaboration Display */}
      <Card className="glass-surface m-4 p-4 fold-responsive">
        <h3 className="font-semibold mb-3">AI Team Collaboration</h3>
        <div className="space-y-2 agent-collaboration-grid">
          {roomAnalysis && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-accent-vision/10">
              <div className="w-3 h-3 rounded-full bg-accent-vision" />
              <span className="text-sm">
                Vision: Detected {roomAnalysis.elements.length} elements in {roomAnalysis.roomType}
              </span>
            </div>
          )}
          
          <div className={`flex items-center gap-3 p-2 rounded-lg ${
            currentAgent === 'coordinator' ? 'bg-accent-ai-glow/20' : 'bg-accent-ai-glow/10'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              isAIThinking && currentAgent === 'coordinator' ? 'bg-yellow-500 animate-pulse' : 'bg-accent-ai-glow'
            }`} />
            <span className="text-sm">
              Coordinator: {currentAgent === 'coordinator' && isAIThinking ? 'Processing...' : 'Ready to assist'}
            </span>
          </div>
          
          <div className={`flex items-center gap-3 p-2 rounded-lg ${
            currentAgent === 'structural' ? 'bg-red-500/20' : 'bg-red-500/10'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              isAIThinking && currentAgent === 'structural' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-sm">
              Structural: {currentAgent === 'structural' && isAIThinking ? 'Analyzing...' : 'Monitoring safety'}
            </span>
          </div>
          
          <div className={`flex items-center gap-3 p-2 rounded-lg ${
            currentAgent === 'design' ? 'bg-purple-500/20' : 'bg-purple-500/10'
          }`}>
            <div className={`w-3 h-3 rounded-full ${
              isAIThinking && currentAgent === 'design' ? 'bg-yellow-500 animate-pulse' : 'bg-purple-500'
            }`} />
            <span className="text-sm">
              Design: {currentAgent === 'design' && isAIThinking ? 'Creating...' : 'Exploring aesthetics'}
            </span>
          </div>
          
          {voiceEnabled && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-500/10">
              <div className={`w-3 h-3 rounded-full ${
                isListening ? 'bg-blue-500 animate-pulse' : 'bg-blue-500'
              }`} />
              <span className="text-sm">
                Voice: {isListening ? 'Listening...' : 'Ready for commands'}
              </span>
            </div>
          )}
        </div>
      </Card>
      
      {/* Development Info */}
      {process.env.NODE_ENV === 'development' && conversationHistory.length > 0 && (
        <Card className="glass-surface m-4 p-4">
          <h3 className="font-semibold mb-3">Conversation History</h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {conversationHistory.slice(-6).map((message, index) => (
              <p key={index} className="text-xs text-muted-foreground">
                {message}
              </p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
