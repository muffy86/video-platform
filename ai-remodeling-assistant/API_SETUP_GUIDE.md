# 🔑 API Keys Configuration Guide
## Enhanced AI & Computer Vision Features

This guide will help you configure real API keys to unlock advanced features in your AI Remodeling Assistant.

## 🚀 Priority APIs (Recommended Setup Order)

### 1. OpenRouter API (Highest Priority) 🤖
**Unlocks**: Better AI models, higher rate limits, multi-model access

#### Benefits:
- Access to GPT-4o, Claude 3.5 Sonnet, and other premium models
- 10x higher rate limits than demo keys
- Better architectural analysis and design recommendations
- More accurate structural engineering advice

#### Setup:
1. Visit [https://openrouter.ai](https://openrouter.ai)
2. Sign up for a free account
3. Go to "Keys" section
4. Create a new API key
5. **Free tier includes**: $5 credit + access to many free models

#### Configuration:
```env
REACT_APP_OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

**Cost**: Free tier available, paid usage ~$0.002-0.02 per request

---

### 2. OpenAI API (High Priority) 🎤
**Unlocks**: Advanced voice features, GPT-4 Vision, DALL-E integration

#### Benefits:
- GPT-4 Vision for superior image analysis
- Realtime API for low-latency voice interaction
- DALL-E for generating design visualizations
- More natural voice synthesis

#### Setup:
1. Visit [https://platform.openai.com](https://platform.openai.com)
2. Create account and verify phone number
3. Go to API Keys section
4. Create new secret key
5. **Free tier includes**: $5 credit for new accounts

#### Configuration:
```env
REACT_APP_OPENAI_API_KEY=sk-your-openai-key-here
```

**Cost**: ~$0.01-0.10 per image analysis, $0.06/min for voice

---

### 3. Remove.bg API (Medium Priority) 🖼️
**Unlocks**: Professional background removal, better object isolation

#### Benefits:
- High-quality background removal for furniture/fixture isolation
- Better AR visualization accuracy
- Professional-grade image segmentation
- Faster processing than local algorithms

#### Setup:
1. Visit [https://www.remove.bg/api](https://www.remove.bg/api)
2. Sign up for free account
3. Get API key from dashboard
4. **Free tier includes**: 50 images/month

#### Configuration:
```env
REACT_APP_REMOVE_BG_API_KEY=your-remove-bg-key-here
```

**Cost**: Free 50/month, then $0.20-2.00 per image

---

### 4. Deepgram API (Medium Priority) 🎙️
**Unlocks**: Enhanced speech recognition, better construction vocabulary

#### Benefits:
- More accurate speech recognition in noisy environments
- Construction/architecture vocabulary optimization
- Real-time transcription with timestamps
- Better performance than Web Speech API

#### Setup:
1. Visit [https://deepgram.com](https://deepgram.com)
2. Sign up for free account
3. Create project and get API key
4. **Free tier includes**: $200 credit + 45,000 minutes

#### Configuration:
```env
REACT_APP_DEEPGRAM_API_KEY=your-deepgram-key-here
```

**Cost**: Free tier generous, then ~$0.0043/minute

---

### 5. Perplexity API (Optional) 📚
**Unlocks**: Real-time research, building codes, material prices

#### Benefits:
- Current building codes and regulations
- Real-time material pricing
- Contractor recommendations
- Code compliance research

#### Setup:
1. Visit [https://www.perplexity.ai/settings/api](https://www.perplexity.ai/settings/api)
2. Sign up and request API access
3. **Free tier includes**: Limited requests

#### Configuration:
```env
REACT_APP_PERPLEXITY_API_KEY=pplx-your-key-here
```

**Cost**: ~$0.20-2.00 per 1K tokens

## 🛠️ Configuration Steps

### Step 1: Access Your Environment File
I'll help you update your environment configuration: