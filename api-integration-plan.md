# Comprehensive API Integration Plan: AI Home Remodeling System

## Integration Architecture Overview

The system integrates 15+ specialized APIs across AI reasoning, computer vision, voice processing, and data management. Each integration is designed for optimal performance, cost efficiency, and graceful fallback handling.

## Core AI Model Integration

### OpenRouter API (Primary Gateway)
**Purpose**: Unified access to multiple AI models with cost optimization
**Endpoint**: `https://openrouter.ai/api/v1/chat/completions`

```typescript
interface OpenRouterConfig {
  apiKey: string;
  baseURL: 'https://openrouter.ai/api/v1';
  defaultModel: 'deepseek/deepseek-r1'; // Free tier
  fallbackModels: ['gpt-4o', 'claude-3.5-sonnet', 'gemini-pro-2.0'];
  maxTokens: 4096;
  temperature: 0.7;
  stream: true;
}

class OpenRouterIntegration {
  private client: OpenAI;
  private rateLimiter: RateLimiter;
  private costTracker: CostTracker;
  
  constructor(config: OpenRouterConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      defaultHeaders: {
        'HTTP-Referer': process.env.SITE_URL,
        'X-Title': 'AI Home Remodeling Assistant'
      }
    });
    
    this.rateLimiter = new RateLimiter({
      tokensPerMinute: 60000, // DeepSeek R1 limit
      requestsPerMinute: 30
    });
  }
  
  async streamCompletion(
    messages: ChatMessage[],
    agentType: AgentType,
    options?: CompletionOptions
  ): Promise<AsyncIterable<ChatCompletionChunk>> {
    await this.rateLimiter.waitForToken();
    
    const modelConfig = this.selectOptimalModel(agentType, messages);
    
    try {
      const stream = await this.client.chat.completions.create({
        model: modelConfig.model,
        messages: this.formatMessages(messages, agentType),
        stream: true,
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        ...options
      });
      
      return this.processStream(stream, agentType);
      
    } catch (error) {
      return await this.handleAPIError(error, messages, agentType);
    }
  }
  
  private selectOptimalModel(
    agentType: AgentType,
    messages: ChatMessage[]
  ): ModelConfig {
    const tokenCount = this.estimateTokens(messages);
    
    // Route based on agent expertise and complexity
    switch (agentType) {
      case 'coordinator':
        return tokenCount > 8000 
          ? { model: 'gpt-4o', maxTokens: 4096, temperature: 0.3 }
          : { model: 'deepseek/deepseek-r1', maxTokens: 2048, temperature: 0.3 };
          
      case 'vision':
        return { model: 'gpt-4o', maxTokens: 1024, temperature: 0.1 }; // Vision requires GPT-4o
        
      case 'design':
        return { model: 'claude-3.5-sonnet', maxTokens: 2048, temperature: 0.8 };
        
      case 'structural':
        return { model: 'deepseek/deepseek-r1', maxTokens: 2048, temperature: 0.1 };
        
      case 'project-manager':
        return { model: 'gpt-4o', maxTokens: 1024, temperature: 0.5 };
        
      default:
        return { model: 'deepseek/deepseek-r1', maxTokens: 1024, temperature: 0.5 };
    }
  }
}
```

### Direct AI Provider Integration

#### OpenAI Realtime API (Voice)
**Purpose**: Low-latency voice interaction
**Endpoint**: `wss://api.openai.com/v1/realtime`

```typescript
class OpenAIRealtimeIntegration {
  private websocket: WebSocket;
  private audioProcessor: AudioProcessor;
  
  async initializeRealtimeSession(): Promise<RealtimeSession> {
    this.websocket = new WebSocket('wss://api.openai.com/v1/realtime', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });
    
    await this.sendSessionUpdate({
      model: 'gpt-4o-realtime-preview',
      voice: 'nova', // Professional, clear voice
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      instructions: `You are an expert home remodeling assistant. 
        Speak conversationally and provide helpful, specific guidance. 
        Keep responses concise but informative.`,
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    });
    
    return { websocket: this.websocket, status: 'connected' };
  }
  
  async processVoiceInput(audioData: AudioBuffer): Promise<void> {
    const base64Audio = this.audioProcessor.encodeBase64(audioData);
    
    await this.sendMessage({
      type: 'input_audio_buffer.append',
      audio: base64Audio
    });
    
    await this.sendMessage({
      type: 'input_audio_buffer.commit'
    });
  }
}
```

#### Perplexity API (Research & Context)
**Purpose**: Real-time web research and context gathering
**Endpoint**: `https://api.perplexity.ai/chat/completions`

```typescript
class PerplexityIntegration {
  private client: PerplexityClient;
  
  async searchRelevantInformation(
    query: string,
    context: ProjectContext
  ): Promise<ResearchResult> {
    const enhancedQuery = this.enhanceQuery(query, context);
    
    const response = await this.client.chat.completions.create({
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [
        {
          role: 'system',
          content: `You are a research assistant for home remodeling projects. 
            Provide current, accurate information about building codes, materials, 
            costs, and best practices. Include relevant sources.`
        },
        {
          role: 'user',
          content: enhancedQuery
        }
      ],
      temperature: 0.1,
      max_tokens: 1024,
      top_p: 0.9,
      search_domain_filter: ['building-codes.com', 'homedepot.com', 'lowes.com'],
      return_citations: true,
      return_images: false
    });
    
    return {
      information: response.choices[0].message.content,
      sources: response.citations,
      relevanceScore: this.calculateRelevance(response, context),
      timestamp: new Date()
    };
  }
}
```

## Computer Vision API Integration

### Primary CV Processing Stack

#### MediaPipe Integration (On-Device)
**Purpose**: Real-time object detection and segmentation
**Model**: Local processing for privacy and speed

```typescript
class MediaPipeIntegration {
  private vision: Vision;
  private imageSegmenter: ImageSegmenter;
  private objectDetector: ObjectDetector;
  
  async initializeModels(): Promise<void> {
    // Initialize segmentation model
    this.imageSegmenter = await ImageSegmenter.createFromOptions(this.vision, {
      baseOptions: {
        modelAssetPath: '/models/deeplab_v3.tflite',
        delegate: 'GPU'
      },
      outputCategoryMask: true,
      outputConfidenceMasks: true,
      runningMode: 'IMAGE'
    });
    
    // Initialize object detection for architectural elements
    this.objectDetector = await ObjectDetector.createFromOptions(this.vision, {
      baseOptions: {
        modelAssetPath: '/models/architectural_detector.tflite',
        delegate: 'GPU'
      },
      scoreThreshold: 0.5,
      maxResults: 20,
      runningMode: 'IMAGE'
    });
  }
  
  async analyzeArchitecturalElements(
    imageData: ImageData
  ): Promise<ArchitecturalAnalysis> {
    // Segment the image into regions
    const segmentationResult = await this.imageSegmenter.segment(imageData);
    
    // Detect architectural objects
    const detectionResult = await this.objectDetector.detect(imageData);
    
    // Combine results for comprehensive analysis
    const analysis = await this.combineResults(segmentationResult, detectionResult);
    
    return {
      walls: analysis.walls,
      windows: analysis.windows,
      doors: analysis.doors,
      fixtures: analysis.fixtures,
      confidence: analysis.overallConfidence,
      processingTime: analysis.processingTime
    };
  }
}
```

#### Remove.bg API (Background Removal)
**Purpose**: Professional background removal for complex scenes
**Endpoint**: `https://api.remove.bg/v1.0/removebg`

```typescript
class RemoveBGIntegration {
  private apiKey: string;
  private rateLimiter: RateLimiter;
  
  constructor() {
    this.rateLimiter = new RateLimiter({
      requestsPerMonth: 50, // Free tier limit
      requestsPerSecond: 0.5
    });
  }
  
  async removeBackground(
    imageData: ImageData,
    options: BackgroundRemovalOptions = {}
  ): Promise<ProcessedImage> {
    await this.rateLimiter.waitForToken();
    
    const formData = new FormData();
    formData.append('image_file', this.imageDataToBlob(imageData));
    formData.append('format', 'png');
    formData.append('channels', 'rgba');
    
    // Optimize for architectural photography
    if (options.architectural) {
      formData.append('bg_color', 'transparent');
      formData.append('crop', 'false');
      formData.append('scale', 'original');
    }
    
    try {
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Remove.bg API error: ${response.status}`);
      }
      
      const resultBuffer = await response.arrayBuffer();
      const resultImage = await this.bufferToImageData(resultBuffer);
      
      return {
        image: resultImage,
        quality: await this.assessBackgroundRemovalQuality(resultImage),
        apiCalls: await this.rateLimiter.getRemainingCalls(),
        processingTime: performance.now() - startTime
      };
      
    } catch (error) {
      // Fallback to local processing
      return await this.fallbackToLocalProcessing(imageData, options);
    }
  }
}
```

### Runware API (Cost-Effective Cloud Processing)
**Purpose**: Advanced image processing and generation
**Endpoint**: `https://api.runware.ai/v1`

```typescript
class RunwareIntegration {
  private client: RunwareClient;
  
  async enhanceImage(
    imageData: ImageData,
    enhancement: EnhancementType
  ): Promise<EnhancedImage> {
    const taskId = await this.client.submitTask({
      type: 'image_enhancement',
      input: {
        image: await this.imageDataToBase64(imageData),
        enhancement_type: enhancement,
        quality: 'high',
        preserve_aspect_ratio: true
      }
    });
    
    // Poll for completion (async processing)
    const result = await this.pollForCompletion(taskId);
    
    return {
      enhancedImage: await this.base64ToImageData(result.output.image),
      enhancement: enhancement,
      qualityImprovement: result.metrics.quality_improvement,
      cost: result.cost
    };
  }
  
  async generateArchitecturalVisualization(
    prompt: string,
    referenceImage?: ImageData
  ): Promise<GeneratedVisualization> {
    const task = {
      type: 'image_generation',
      input: {
        prompt: `architectural visualization: ${prompt}`,
        style: 'photorealistic',
        resolution: { width: 1024, height: 768 },
        reference_image: referenceImage ? 
          await this.imageDataToBase64(referenceImage) : undefined,
        negative_prompt: 'cartoon, anime, abstract, low quality'
      }
    };
    
    return await this.executeTask(task);
  }
}
```

## Voice Processing Integration

### Multi-Provider Voice Strategy

#### Deepgram API (Primary Speech Recognition)
**Purpose**: Real-time speech-to-text with construction vocabulary
**Endpoint**: `wss://api.deepgram.com/v1/listen`

```typescript
class DeepgramIntegration {
  private websocket: WebSocket;
  private apiKey: string;
  
  async initializeLiveTranscription(): Promise<TranscriptionSession> {
    const wsUrl = `wss://api.deepgram.com/v1/listen?${new URLSearchParams({
      model: 'nova-2',
      language: 'en-US',
      smart_format: 'true',
      interim_results: 'true',
      endpointing: '300',
      vad_events: 'true',
      // Construction/architecture vocabulary boost
      keywords: 'wall:2,room:2,kitchen:2,bathroom:2,floor:2,ceiling:2,door:2,window:2'
    })}`;
    
    this.websocket = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Token ${this.apiKey}`
      }
    });
    
    this.websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'Results') {
        this.handleTranscriptionResult(data);
      }
    };
    
    return { websocket: this.websocket, status: 'connected' };
  }
  
  private handleTranscriptionResult(data: DeepgramResult): void {
    const transcript = data.channel.alternatives[0];
    
    if (transcript.confidence > 0.8) {
      this.emitTranscription({
        text: transcript.transcript,
        confidence: transcript.confidence,
        isFinal: data.is_final,
        timestamp: new Date()
      });
    }
  }
}
```

#### AssemblyAI Integration (Fallback & Analysis)
**Purpose**: Free tier backup and advanced audio analysis
**Endpoint**: `https://api.assemblyai.com/v2`

```typescript
class AssemblyAIIntegration {
  private client: AssemblyAIClient;
  
  async transcribeAudioFile(
    audioBuffer: ArrayBuffer,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    // Upload audio file
    const uploadResponse = await this.client.files.upload(audioBuffer);
    
    // Submit for transcription with construction-specific features
    const transcript = await this.client.transcripts.submit({
      audio_url: uploadResponse.upload_url,
      language_detection: true,
      speaker_labels: true,
      format_text: true,
      punctuate: true,
      custom_vocabulary: [
        'load-bearing', 'drywall', 'subflooring', 'HVAC', 
        'electrical', 'plumbing', 'permitting', 'renovation'
      ],
      boost_param: 'high',
      redact_pii: true,
      filter_profanity: false
    });
    
    // Poll for completion
    const result = await this.pollTranscription(transcript.id);
    
    return {
      text: result.text,
      confidence: result.confidence,
      speakers: result.speakers,
      wordTimestamps: result.words,
      processingTime: result.processing_time
    };
  }
}
```

## Memory & Data Integration

### Vector Database: Pinecone
**Purpose**: AI agent memory and similarity search
**Endpoint**: `https://api.pinecone.io`

```typescript
class PineconeIntegration {
  private client: PineconeClient;
  private index: Index;
  
  async initializeIndex(): Promise<void> {
    const indexName = 'ai-remodeling-memory';
    
    // Create index if it doesn't exist
    const existingIndexes = await this.client.listIndexes();
    if (!existingIndexes.includes(indexName)) {
      await this.client.createIndex({
        name: indexName,
        dimension: 1536, // OpenAI embedding dimension
        metric: 'cosine',
        pods: 1,
        replicas: 1,
        podType: 'p1.x1'
      });
    }
    
    this.index = this.client.Index(indexName);
  }
  
  async storeProjectMemory(
    projectData: ProjectData,
    embedding: number[]
  ): Promise<void> {
    await this.index.upsert([{
      id: projectData.id,
      values: embedding,
      metadata: {
        projectType: projectData.type,
        budget: projectData.budget,
        satisfaction: projectData.userSatisfaction,
        completion: projectData.completionDate,
        lessons: projectData.lessonsLearned
      }
    }]);
  }
  
  async findSimilarProjects(
    currentProject: ProjectDescription,
    limit: number = 5
  ): Promise<SimilarProject[]> {
    const embedding = await this.generateEmbedding(currentProject);
    
    const queryResult = await this.index.query({
      vector: embedding,
      topK: limit,
      includeMetadata: true,
      filter: {
        projectType: currentProject.type
      }
    });
    
    return queryResult.matches.map(match => ({
      project: match.metadata,
      similarity: match.score,
      relevantLessons: this.extractRelevantLessons(match.metadata)
    }));
  }
}
```

### Redis Integration (Real-time & Cache)
**Purpose**: Session management, real-time collaboration, API caching
**Endpoint**: Redis cloud or local instance

```typescript
class RedisIntegration {
  private client: RedisClient;
  private publisher: RedisClient;
  private subscriber: RedisClient;
  
  async initializeCollaboration(): Promise<void> {
    // Initialize pub/sub for real-time collaboration
    this.subscriber.on('message', (channel, message) => {
      this.handleCollaborationMessage(channel, JSON.parse(message));
    });
    
    await this.subscriber.subscribe('agent-collaboration');
    await this.subscriber.subscribe('user-updates');
  }
  
  async cacheAPIResponse(
    endpoint: string,
    params: any,
    response: any,
    ttl: number = 3600
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    await this.client.setEx(cacheKey, ttl, JSON.stringify(response));
  }
  
  async getCachedResponse(
    endpoint: string,
    params: any
  ): Promise<any | null> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    const cached = await this.client.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }
  
  async storeAgentState(
    agentId: string,
    state: AgentState
  ): Promise<void> {
    await this.client.hSet(`agent:${agentId}`, {
      state: JSON.stringify(state),
      lastUpdate: Date.now(),
      status: state.status
    });
    
    // Publish state change to other agents
    await this.publisher.publish('agent-collaboration', JSON.stringify({
      type: 'state_change',
      agentId,
      state
    }));
  }
}
```

## Error Handling & Fallback Systems

### Comprehensive Error Recovery
```typescript
class APIErrorHandler {
  private fallbackStrategies: Map<string, FallbackStrategy>;
  
  constructor() {
    this.fallbackStrategies.set('openrouter', {
      primary: 'openai-direct',
      secondary: 'anthropic-direct',
      final: 'local-model'
    });
    
    this.fallbackStrategies.set('remove-bg', {
      primary: 'u2net-local',
      secondary: 'manual-selection',
      final: 'skip-background-removal'
    });
  }
  
  async handleAPIFailure(
    service: string,
    error: APIError,
    originalRequest: any
  ): Promise<any> {
    const strategy = this.fallbackStrategies.get(service);
    
    // Log error for monitoring
    await this.logError(service, error, originalRequest);
    
    // Try fallback strategies in order
    for (const fallback of [strategy.primary, strategy.secondary, strategy.final]) {
      try {
        return await this.executeFallback(fallback, originalRequest);
      } catch (fallbackError) {
        continue; // Try next fallback
      }
    }
    
    // All fallbacks failed - graceful degradation
    return await this.gracefulDegradation(service, originalRequest);
  }
  
  private async gracefulDegradation(
    service: string,
    request: any
  ): Promise<any> {
    switch (service) {
      case 'openrouter':
        return { 
          content: "I'm experiencing technical difficulties. Please try again.", 
          fallback: true 
        };
        
      case 'computer-vision':
        return { 
          message: "Image processing is temporarily unavailable. You can still describe your project verbally.",
          manualMode: true 
        };
        
      default:
        return { error: "Service temporarily unavailable", retry: true };
    }
  }
}
```

### Rate Limiting & Cost Control
```typescript
class CostControlManager {
  private budgets: Map<string, Budget>;
  private rateLimiters: Map<string, RateLimiter>;
  
  async checkBudget(service: string, estimatedCost: number): Promise<boolean> {
    const budget = this.budgets.get(service);
    return budget.remaining >= estimatedCost;
  }
  
  async trackAPIUsage(
    service: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    // Update usage tracking
    await this.updateUsageMetrics(service, tokens, cost);
    
    // Check for budget alerts
    const budget = this.budgets.get(service);
    if (budget.remaining < budget.alertThreshold) {
      await this.sendBudgetAlert(service, budget);
    }
    
    // Implement cost-saving measures if approaching limits
    if (budget.remaining < budget.total * 0.1) {
      await this.enableCostSavingMode(service);
    }
  }
}
```

This comprehensive API integration plan ensures robust, cost-effective, and performant integration of all required services while providing graceful fallback mechanisms for reliability.