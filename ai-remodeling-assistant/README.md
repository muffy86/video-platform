# AI Remodeling Assistant

## 🏠 Professional AI-Powered Home Remodeling System

A cutting-edge, AI-powered home remodeling assistant designed specifically for Android Pixel 9 Pro Fold. This system combines computer vision, multi-agent AI collaboration, voice interaction, and AR visualization to provide professional remodeling guidance and design recommendations.

![AI Remodeling Assistant](https://ai-remodeling-assistant-e87e2294.scout.site)

## ✨ Key Features

### 🤖 Multi-Agent AI Collaboration
- **Coordinator Agent**: Manages overall project flow and user interaction
- **Vision Specialist**: Analyzes images/videos to identify architectural elements
- **Design Specialist**: Provides aesthetic recommendations and style guidance
- **Structural Engineer**: Ensures safety and building code compliance
- **Project Manager**: Handles timelines, budgets, and project planning

### 📸 Advanced Computer Vision
- **Real-time Image Analysis**: Instant room analysis and element detection
- **Architectural Element Detection**: Walls, windows, doors, fixtures identification
- **AR Visualization**: Preview modifications before implementation
- **3D Room Reconstruction**: Advanced spatial understanding
- **Wall Removal Simulation**: Safe structural modification visualization

### 🎤 Voice-First Interaction
- **Hands-Free Operation**: Perfect for construction environments
- **Natural Language Commands**: "Remove the wall", "Change to modern style"
- **Construction Vocabulary**: Optimized for remodeling terminology
- **Voice Guidance**: Step-by-step spoken instructions
- **Real-time Transcription**: See what the AI understands

### 📱 Mobile-First Design
- **Android Pixel 9 Pro Fold Optimized**: Adaptive layouts for folded/unfolded states
- **Touch-Friendly UI**: 44px+ touch targets throughout
- **PWA Architecture**: Install as native app, works offline
- **High DPI Optimization**: Crystal clear on all displays
- **Safe Area Support**: Proper handling of notches and folds

## 🚀 Getting Started

### Prerequisites
- Android Pixel 9 Pro Fold (or compatible Android device)
- Camera and microphone permissions
- Internet connection for AI features
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)

### Installation

#### Option 1: Direct Access (Recommended)
1. Visit [https://ai-remodeling-assistant-e87e2294.scout.site](https://ai-remodeling-assistant-e87e2294.scout.site)
2. Tap "Add to Home Screen" when prompted
3. Grant camera and microphone permissions

#### Option 2: Local Development
```bash
# Clone the repository
git clone <repository-url>
cd ai-remodeling-assistant

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys (optional for basic functionality)

# Start development server
bun dev

# Build for production
bun build
```

## 🔧 Configuration

### Environment Variables
```env
# AI Service API Keys
REACT_APP_OPENROUTER_API_KEY=your_openrouter_key
REACT_APP_OPENAI_API_KEY=your_openai_key

# Computer Vision APIs (Optional)
REACT_APP_REMOVE_BG_API_KEY=your_remove_bg_key

# Voice Processing (Optional)
REACT_APP_DEEPGRAM_API_KEY=your_deepgram_key

# Feature Flags
REACT_APP_ENABLE_VOICE=true
REACT_APP_ENABLE_COMPUTER_VISION=true
REACT_APP_ENABLE_AR_VISUALIZATION=true
```

### API Key Setup
The system works with demo/free keys by default. For enhanced functionality:

1. **OpenRouter** (Recommended): Get free API access at [openrouter.ai](https://openrouter.ai)
2. **OpenAI**: For voice features at [platform.openai.com](https://platform.openai.com)
3. **Remove.bg**: For advanced background removal at [remove.bg](https://www.remove.bg/api)

## 📖 How to Use

### 1. Taking Photos
- Tap the **camera button** to capture your space
- Or tap the **upload button** to select existing photos
- The AI will automatically analyze architectural elements

### 2. Voice Commands
- Tap the **microphone button** to start voice interaction
- Try commands like:
  - "Take a photo"
  - "Analyze this room"
  - "Remove the wall"
  - "Change to modern style"
  - "Show me options"
  - "Calculate the cost"

### 3. AI Collaboration
- Watch the **AI Team Collaboration** panel for real-time agent status
- Each specialist provides domain-specific expertise
- The coordinator manages the overall conversation flow

### 4. Room Analysis
- After capturing a photo, tap **"Room Analysis"** for detailed insights
- View detected elements, room dimensions, and condition assessment
- Get safety recommendations and building code considerations

### 5. Project Planning
- Tap **"Start Project"** to begin formal project planning
- Get timeline estimates, budget guidance, and required permits
- Access contractor recommendations and material lists

## 🏗️ Architecture

### Frontend Stack
- **React 19** + **TypeScript**: Modern, type-safe development
- **Vite**: Lightning-fast build tool
- **TailwindCSS V4**: Utility-first styling with modern features
- **ShadCN UI**: Consistent, accessible component library
- **PWA**: Progressive web app for native-like experience

### AI Integration
- **OpenRouter API**: Multi-model AI access (DeepSeek R1, GPT-4o, Claude)
- **Streaming Responses**: Real-time AI collaboration
- **Context Management**: Persistent conversation memory
- **Fallback Systems**: Graceful degradation when APIs fail

### Computer Vision Pipeline
- **MediaPipe**: On-device processing for privacy
- **Edge Detection**: Canny algorithm for structural analysis
- **Object Detection**: Architectural element identification
- **Image Enhancement**: AI-powered quality improvement
- **AR Rendering**: WebGL/WebGPU for smooth visualizations

### Voice Processing
- **Web Speech API**: Native browser speech recognition
- **Construction Vocabulary**: Optimized for remodeling terms
- **Command Recognition**: Pattern-based voice command parsing
- **Audio Analysis**: Real-time quality and noise assessment

## 🎨 Design System

### Color Palette
- **Primary**: Steel and concrete inspired colors
- **Accent**: AI glow effects for intelligent interactions
- **Glass Morphism**: Modern transparent UI elements
- **Dark Theme**: Optimized for professional use

### Typography
- **Inter**: Primary font for excellent readability
- **System Fonts**: Fallback for performance
- **Responsive Scaling**: Adapts to device and fold state

### Animations
- **AI Thinking States**: Visual feedback for processing
- **Voice Pulse**: Real-time voice interaction feedback
- **Smooth Transitions**: 60fps animations throughout
- **Reduced Motion**: Respects accessibility preferences

## 📱 Mobile Optimizations

### Android Pixel 9 Pro Fold Specific
- **Fold Detection**: Automatic layout adaptation
- **Dual Screen Support**: Optimized for unfolded experience
- **Touch Optimization**: 44px minimum touch targets
- **Gesture Support**: Pan, pinch, and zoom gestures
- **Safe Areas**: Proper handling of camera cutouts

### Performance
- **GPU Acceleration**: Hardware-accelerated rendering
- **Image Optimization**: Automatic compression and resizing
- **Lazy Loading**: Components load as needed
- **Service Worker**: Offline functionality and caching
- **Critical CSS**: Inline styles for instant rendering

## 🔒 Privacy & Security

### Data Protection
- **On-Device Processing**: Computer vision runs locally when possible
- **No Persistent Storage**: Images processed in memory only
- **API Key Security**: Client-side keys for demo only (use server proxy in production)
- **Permission Management**: Explicit camera/microphone consent

### Security Features
- **HTTPS Only**: Secure connections required
- **Content Security Policy**: Protection against XSS
- **Input Sanitization**: Safe handling of user input
- **Rate Limiting**: API abuse prevention

## 🛠️ Development

### Project Structure
```
src/
├── components/ui/          # Reusable UI components
├── services/              # AI, CV, and voice services
│   ├── aiService.ts       # Multi-agent AI coordination
│   ├── computerVisionService.ts  # Image/video processing
│   └── voiceService.ts    # Speech recognition/synthesis
├── mobile-optimizations.css  # Mobile-specific styles
├── App.tsx               # Main application component
└── main.tsx             # Application entry point

public/
├── manifest.json         # PWA configuration
├── sw.js                # Service worker
└── icons/               # App icons (auto-generated)
```

### Key Services

#### AI Service (`aiService.ts`)
- Multi-model AI orchestration
- Agent specialization and routing
- Conversation memory management
- Streaming response handling

#### Computer Vision Service (`computerVisionService.ts`)
- Image preprocessing and enhancement
- Architectural element detection
- AR modification simulation
- Background removal and segmentation

#### Voice Service (`voiceService.ts`)
- Speech recognition with construction vocabulary
- Voice command parsing and routing
- Text-to-speech with natural voices
- Audio quality assessment

### Building and Deployment

```bash
# Development
bun dev                    # Start dev server
bun test                   # Run tests
bun type-check            # TypeScript validation

# Production
bun build                 # Build for production
bun preview              # Preview production build
```

## 🚀 Deployment

The application is automatically deployed and accessible at:
**https://ai-remodeling-assistant-e87e2294.scout.site**

### Manual Deployment
1. Build the application: `bun build`
2. Deploy the `dist/` folder to any static hosting service
3. Ensure HTTPS is enabled for camera/microphone access
4. Configure proper MIME types for PWA manifest

## 🔧 Troubleshooting

### Common Issues

#### Camera Not Working
- Ensure HTTPS connection
- Grant camera permissions in browser settings
- Check if camera is being used by another app
- Try refreshing the page

#### Voice Recognition Not Responding
- Grant microphone permissions
- Check browser compatibility (Chrome recommended)
- Ensure good audio quality and minimal background noise
- Try speaking more clearly or closer to microphone

#### AI Responses Slow/Failed
- Check internet connection
- Verify API keys are configured correctly
- Try refreshing to reset conversation state
- Fallback to manual input if voice fails

#### Mobile Performance Issues
- Ensure sufficient device memory
- Close other apps for better performance
- Check for browser updates
- Clear browser cache if needed

### Browser Compatibility
- ✅ Chrome 90+ (Recommended)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Samsung Internet 14+
- ❌ Internet Explorer (Not supported)

## 🤝 Contributing

This is a personal AI system designed for individual use. The codebase serves as a reference implementation for:
- Multi-agent AI systems
- Computer vision in web applications
- Voice-first mobile interfaces
- Progressive Web App development

## 📄 License

This project is for personal use and educational purposes. Please respect API terms of service when using external services.

## 🙏 Acknowledgments

- **OpenRouter**: Multi-model AI access
- **MediaPipe**: Computer vision capabilities
- **React Team**: Excellent framework development
- **Tailwind CSS**: Beautiful utility-first styling
- **Vite**: Lightning-fast development experience

---

## 📞 Support

For issues or questions about this implementation:
1. Check the troubleshooting section above
2. Verify your environment configuration
3. Test with the live demo at the deployment URL
4. Check browser console for detailed error messages

**Live Demo**: [https://ai-remodeling-assistant-e87e2294.scout.site](https://ai-remodeling-assistant-e87e2294.scout.site)

Built with ❤️ for the future of home remodeling.