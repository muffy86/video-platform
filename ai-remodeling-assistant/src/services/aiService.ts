import OpenAI from 'openai';

// Agent types for specialized AI models
export type AgentType = 'coordinator' | 'vision' | 'design' | 'structural' | 'project-manager';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentType?: AgentType;
  timestamp?: Date;
}

export interface AgentResponse {
  content: string;
  agentType: AgentType;
  confidence: number;
  suggestions?: string[];
  requiresInput?: boolean;
}

export interface ProjectContext {
  projectType?: string;
  budget?: number;
  roomType?: string;
  userPreferences?: string[];
  previousMessages?: AgentMessage[];
}

class AIService {
  private openRouter: OpenAI;
  private rateLimiter: Map<string, number> = new Map();
  private messageHistory: Map<AgentType, AgentMessage[]> = new Map();

  constructor() {
    // Use OpenRouter with free models as primary
    this.openRouter = new OpenAI({
      apiKey: process.env.REACT_APP_OPENROUTER_API_KEY || 'sk-or-v1-demo-key',
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AI Home Remodeling Assistant'
      },
      dangerouslyAllowBrowser: true
    });

    // Initialize message history for each agent
    this.initializeAgents();
  }

  private initializeAgents(): void {
    const agentTypes: AgentType[] = ['coordinator', 'vision', 'design', 'structural', 'project-manager'];
    
    agentTypes.forEach(type => {
      this.messageHistory.set(type, [
        {
          role: 'system',
          content: this.getAgentSystemPrompt(type),
          timestamp: new Date()
        }
      ]);
    });
  }

  private getAgentSystemPrompt(agentType: AgentType): string {
    const basePrompt = `You are a specialized AI agent in a home remodeling collaboration team. 
      Keep responses concise but helpful. Always consider safety, building codes, and budget constraints.`;

    switch (agentType) {
      case 'coordinator':
        return `${basePrompt} You are the Coordinator Agent - the team leader who manages project flow, 
          coordinates with other agents, and guides users through the process. You should ask clarifying 
          questions and direct users to appropriate next steps. Be warm and professional.`;
          
      case 'vision':
        return `${basePrompt} You are the Vision Specialist - expert in computer vision and spatial analysis. 
          You analyze images/videos to identify walls, structural elements, room layouts, and potential 
          modifications. Provide detailed technical analysis with confidence scores.`;
          
      case 'design':
        return `${basePrompt} You are the Design Specialist - expert in interior design, aesthetics, and 
          style recommendations. You suggest design options, color schemes, materials, and layouts that 
          match user preferences and space constraints.`;
          
      case 'structural':
        return `${basePrompt} You are the Structural Engineer - expert in building safety, load-bearing 
          analysis, and structural modifications. Always prioritize safety and building code compliance. 
          Identify potential structural issues and safe modification approaches.`;
          
      case 'project-manager':
        return `${basePrompt} You are the Project Manager - expert in project planning, timelines, 
          budgets, and coordination. You help break down projects into phases, estimate costs and 
          timeframes, and identify required permits and contractors.`;
          
      default:
        return basePrompt;
    }
  }

  private selectOptimalModel(agentType: AgentType, messageLength: number): string {
    // Use free models primarily, upgrade for complex tasks
    const tokenEstimate = messageLength * 1.3; // Rough token estimation
    
    switch (agentType) {
      case 'vision':
        // Vision analysis needs more capable models
        return tokenEstimate > 4000 ? 'openai/gpt-4o-mini' : 'deepseek/deepseek-r1';
        
      case 'coordinator':
        // Coordinator handles complex orchestration
        return tokenEstimate > 6000 ? 'openai/gpt-4o-mini' : 'deepseek/deepseek-r1';
        
      case 'design':
        // Design needs creativity
        return 'anthropic/claude-3.5-haiku';
        
      case 'structural':
      case 'project-manager':
        // These can use efficient models for most tasks
        return 'deepseek/deepseek-r1';
        
      default:
        return 'deepseek/deepseek-r1';
    }
  }

  private async checkRateLimit(agentType: AgentType): Promise<boolean> {
    const now = Date.now();
    const lastCall = this.rateLimiter.get(agentType) || 0;
    
    // Minimum 2 seconds between calls per agent to avoid rate limits
    if (now - lastCall < 2000) {
      await new Promise(resolve => setTimeout(resolve, 2000 - (now - lastCall)));
    }
    
    this.rateLimiter.set(agentType, Date.now());
    return true;
  }

  async processMessage(
    message: string,
    agentType: AgentType,
    context: ProjectContext = {},
    imageData?: string
  ): Promise<AgentResponse> {
    try {
      await this.checkRateLimit(agentType);

      // Get conversation history for this agent
      const history = this.messageHistory.get(agentType) || [];
      
      // Add context if provided
      const contextualMessage = this.addContext(message, context, imageData);
      
      // Add user message to history
      const userMessage: AgentMessage = {
        role: 'user',
        content: contextualMessage,
        agentType,
        timestamp: new Date()
      };
      
      history.push(userMessage);

      // Select optimal model for this agent and task
      const model = this.selectOptimalModel(agentType, contextualMessage.length);

      // Make API call
      const completion = await this.openRouter.chat.completions.create({
        model,
        messages: history.slice(-10), // Keep last 10 messages for context
        max_tokens: 1024,
        temperature: this.getTemperatureForAgent(agentType),
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, but I encountered an issue processing your request.';
      
      // Add assistant response to history
      const assistantMessage: AgentMessage = {
        role: 'assistant',
        content: response,
        agentType,
        timestamp: new Date()
      };
      
      history.push(assistantMessage);
      this.messageHistory.set(agentType, history);

      // Parse response for additional metadata
      const suggestions = this.extractSuggestions(response);
      const confidence = this.assessConfidence(response, agentType);
      const requiresInput = this.checkIfInputRequired(response);

      return {
        content: response,
        agentType,
        confidence,
        suggestions,
        requiresInput
      };

    } catch (error) {
      console.error(`AI Service error for ${agentType}:`, error);
      return this.getFallbackResponse(agentType, message);
    }
  }

  private addContext(message: string, context: ProjectContext, imageData?: string): string {
    let contextualMessage = message;
    
    if (imageData) {
      contextualMessage += '\n\nImage provided for analysis.';
    }
    
    if (context.projectType) {
      contextualMessage += `\n\nProject type: ${context.projectType}`;
    }
    
    if (context.budget) {
      contextualMessage += `\nBudget: $${context.budget.toLocaleString()}`;
    }
    
    if (context.roomType) {
      contextualMessage += `\nRoom: ${context.roomType}`;
    }
    
    if (context.userPreferences?.length) {
      contextualMessage += `\nPreferences: ${context.userPreferences.join(', ')}`;
    }
    
    return contextualMessage;
  }

  private getTemperatureForAgent(agentType: AgentType): number {
    switch (agentType) {
      case 'design': return 0.8; // More creative
      case 'coordinator': return 0.6; // Balanced
      case 'vision': return 0.3; // More analytical
      case 'structural': return 0.2; // Very precise
      case 'project-manager': return 0.4; // Structured
      default: return 0.5;
    }
  }

  private extractSuggestions(response: string): string[] {
    // Simple pattern matching for suggestions
    const suggestionPatterns = [
      /consider\s+([^.!?]+)/gi,
      /you\s+could\s+([^.!?]+)/gi,
      /try\s+([^.!?]+)/gi,
      /recommend\s+([^.!?]+)/gi
    ];
    
    const suggestions: string[] = [];
    
    suggestionPatterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        suggestions.push(...matches.slice(0, 3)); // Limit to 3 per pattern
      }
    });
    
    return suggestions.slice(0, 5); // Max 5 suggestions total
  }

  private assessConfidence(response: string, agentType: AgentType): number {
    // Simple heuristic for confidence assessment
    let confidence = 0.7; // Base confidence
    
    // Boost confidence for agent expertise areas
    const expertiseKeywords = {
      vision: ['see', 'identify', 'detect', 'analyze', 'visible'],
      design: ['style', 'color', 'aesthetic', 'beautiful', 'design'],
      structural: ['safe', 'structural', 'load-bearing', 'code', 'engineering'],
      coordinator: ['recommend', 'next', 'step', 'process', 'plan'],
      'project-manager': ['timeline', 'budget', 'phase', 'schedule', 'cost']
    };
    
    const keywords = expertiseKeywords[agentType] || [];
    const keywordCount = keywords.filter(keyword => 
      response.toLowerCase().includes(keyword)
    ).length;
    
    confidence += keywordCount * 0.05;
    
    // Reduce confidence for uncertainty indicators
    const uncertaintyWords = ['might', 'maybe', 'possibly', 'unclear', 'unsure'];
    const uncertaintyCount = uncertaintyWords.filter(word => 
      response.toLowerCase().includes(word)
    ).length;
    
    confidence -= uncertaintyCount * 0.1;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private checkIfInputRequired(response: string): boolean {
    const questionPatterns = [
      /\?/g,
      /what\s+type/gi,
      /which\s+/gi,
      /how\s+much/gi,
      /would\s+you\s+like/gi,
      /can\s+you\s+tell\s+me/gi
    ];
    
    return questionPatterns.some(pattern => pattern.test(response));
  }

  private getFallbackResponse(agentType: AgentType, originalMessage: string): AgentResponse {
    const fallbackResponses = {
      coordinator: "I'm here to help with your remodeling project. Could you tell me more about what you'd like to accomplish?",
      vision: "I'd be happy to analyze your space once you share an image. Please describe what you're hoping to change.",
      design: "I can help you explore design options. What style or aesthetic are you drawn to for this project?",
      structural: "For structural modifications, I recommend starting with photos of the area you want to change. Safety is our top priority.",
      'project-manager': "Let's break down your project into manageable phases. What's your timeline and budget for this remodeling work?"
    };
    
    return {
      content: fallbackResponses[agentType] || "I'm experiencing technical difficulties. Please try again in a moment.",
      agentType,
      confidence: 0.5,
      requiresInput: true
    };
  }

  // Stream processing for real-time responses
  async *streamMessage(
    message: string,
    agentType: AgentType,
    context: ProjectContext = {}
  ): AsyncGenerator<string, void, unknown> {
    try {
      await this.checkRateLimit(agentType);
      
      const history = this.messageHistory.get(agentType) || [];
      const contextualMessage = this.addContext(message, context);
      
      history.push({
        role: 'user',
        content: contextualMessage,
        agentType,
        timestamp: new Date()
      });

      const model = this.selectOptimalModel(agentType, contextualMessage.length);

      const stream = await this.openRouter.chat.completions.create({
        model,
        messages: history.slice(-10),
        max_tokens: 1024,
        temperature: this.getTemperatureForAgent(agentType),
        stream: true
      });

      let fullResponse = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield content;
        }
      }

      // Save complete response to history
      history.push({
        role: 'assistant',
        content: fullResponse,
        agentType,
        timestamp: new Date()
      });
      
      this.messageHistory.set(agentType, history);

    } catch (error) {
      console.error(`Streaming error for ${agentType}:`, error);
      yield this.getFallbackResponse(agentType, message).content;
    }
  }

  // Get conversation history for an agent
  getConversationHistory(agentType: AgentType): AgentMessage[] {
    return this.messageHistory.get(agentType) || [];
  }

  // Clear conversation history for an agent
  clearHistory(agentType: AgentType): void {
    this.messageHistory.set(agentType, [
      {
        role: 'system',
        content: this.getAgentSystemPrompt(agentType),
        timestamp: new Date()
      }
    ]);
  }

  // Multi-agent collaboration
  async collaborateAgents(
    userMessage: string,
    primaryAgent: AgentType,
    context: ProjectContext
  ): Promise<{ [key in AgentType]?: AgentResponse }> {
    const relevantAgents = this.determineRelevantAgents(userMessage, primaryAgent);
    const responses: { [key in AgentType]?: AgentResponse } = {};

    // Process with primary agent first
    responses[primaryAgent] = await this.processMessage(userMessage, primaryAgent, context);

    // Get input from other relevant agents
    for (const agentType of relevantAgents) {
      if (agentType !== primaryAgent) {
        const collaborationMessage = `The user asked: "${userMessage}". The ${primaryAgent} agent responded: "${responses[primaryAgent]?.content}". Please provide your specialized input.`;
        responses[agentType] = await this.processMessage(collaborationMessage, agentType, context);
      }
    }

    return responses;
  }

  private determineRelevantAgents(message: string, primaryAgent: AgentType): AgentType[] {
    const allAgents: AgentType[] = ['coordinator', 'vision', 'design', 'structural', 'project-manager'];
    const messageLower = message.toLowerCase();
    
    // Always include coordinator unless they're primary
    const relevant: AgentType[] = primaryAgent !== 'coordinator' ? ['coordinator'] : [];
    
    // Add primary agent
    if (!relevant.includes(primaryAgent)) {
      relevant.push(primaryAgent);
    }
    
    // Determine other relevant agents based on message content
    if (messageLower.includes('wall') || messageLower.includes('remove') || messageLower.includes('structural')) {
      if (!relevant.includes('structural')) relevant.push('structural');
    }
    
    if (messageLower.includes('design') || messageLower.includes('style') || messageLower.includes('color')) {
      if (!relevant.includes('design')) relevant.push('design');
    }
    
    if (messageLower.includes('image') || messageLower.includes('photo') || messageLower.includes('see')) {
      if (!relevant.includes('vision')) relevant.push('vision');
    }
    
    if (messageLower.includes('budget') || messageLower.includes('timeline') || messageLower.includes('cost')) {
      if (!relevant.includes('project-manager')) relevant.push('project-manager');
    }
    
    return relevant.slice(0, 3); // Limit to 3 agents to avoid complexity
  }
}

export const aiService = new AIService();
export default aiService;