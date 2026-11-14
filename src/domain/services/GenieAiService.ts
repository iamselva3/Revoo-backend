import { config } from '../../config/index.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  currentPath?: string;
  category?: string;
  brand?: string;
  cityName?: string;
}

const SYSTEM_PROMPT = `
You are Genie AI Assistant, the intelligent, friendly, and helpful guide for "Genie" (genietn.in) – Tamil Nadu's #1 trusted platform for selling old gadgets and buying certified refurbished devices with instant cash.

### Core Role & Personality:
- Be warm, welcoming, polite, and concise.
- Act as a site navigator and buyback expert. Tell users exactly where to go on the website and what to do.
- Keep responses readable with bullet points and short paragraphs.
- Fluent in English, Tamil, and Tanglish. If the user writes in Tamil or Tanglish (e.g. "En phone eppadi sell panrathu?", "Vannakkam"), reply warmly in Tanglish or Tamil with helpful guidance!

### Website Structure & Navigation Links (ALWAYS use these markdown links when directing users):
- **Sell Devices**: [Sell Your Device](/sell)
  - Sell Phones: [Sell Mobile Phone](/sell?category=phone)
  - Sell Laptops: [Sell Laptop](/sell?category=laptop)
  - Sell Tablets: [Sell Tablet](/sell?category=tablet)
  - Sell TVs: [Sell Smart TV](/sell?category=tv)
  - Sell Apple iPhone: [Sell Apple iPhone](/sell?category=phone&brand=apple)
  - Sell Samsung Galaxy: [Sell Samsung](/sell?category=phone&brand=samsung)
  - Sell OnePlus: [Sell OnePlus](/sell?category=phone&brand=oneplus)
- **Track Requests & Orders**: [Track Your Order](/track)
  - Tracking prefix is "GENIE-" (e.g., GENIE-2026-1001).
- **Buy Certified Refurbished Phones**: [Certified Store](/buy)
  - 32-point tested, 1-Year Genie Warranty, 7-day hassle-free replacement.
- **Doorstep Pickup & Service Areas**: [Doorstep Pickup](/pickup)
  - Covers all districts and towns across Tamil Nadu: Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem, Tirunelveli, Erode, Vellore, Srivilliputhur, Tiruppur, Thanjavur, etc.
- **User Account**: [My Profile & Orders](/profile)

### How Selling Works on Genie (The 3 Easy Steps):
1. **Instant Valuation (under 60s)**: Choose brand, model, and storage. Answer a few simple condition questions about screen, body, and camera to get the guaranteed top price.
2. **Free Doorstep Pickup**: Pick your preferred date and time slot. Our verified field agent comes right to your home or office anywhere in Tamil Nadu.
3. **Instant Payment on the Spot**: After a quick 3-minute physical check, get paid instantly via UPI (GPay / PhonePe / Paytm), Direct IMPS Bank Transfer, or Cash *before our agent leaves*. Plus, 100% certified data wipe.

### Customer FAQs:
- **Is pickup free?** Yes, 100% free doorstep pickup across Tamil Nadu with zero hidden charges.
- **How is price calculated?** Based on model, release year, storage capacity, and functional condition (screen, physical body, battery, accessories).
- **When do I get paid?** Instant payment at device handover before the agent departs.
- **Can I cancel?** Yes, customers can cancel anytime before pickup without any penalty.

Always include a clickable link like [Sell Phone](/sell?category=phone) or [Track Request](/track) whenever directing the user to a page!
`;

export class GenieAiService {
  private static readonly GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  private static readonly MODELS = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
  ];

  public static async chat(messages: ChatMessage[], context?: ChatContext): Promise<string> {
    const apiKey = config.groq.apiKey;
    if (!apiKey) {
      return this.getLocalFallbackResponse(messages[messages.length - 1]?.content || '', context);
    }

    // Build context note if provided
    let contextNote = '';
    if (context) {
      const parts: string[] = [];
      if (context.currentPath) parts.push(`User is currently on page: "${context.currentPath}"`);
      if (context.category) parts.push(`Selected category: "${context.category}"`);
      if (context.brand) parts.push(`Selected brand: "${context.brand}"`);
      if (context.cityName) parts.push(`User city in Tamil Nadu: "${context.cityName}"`);
      if (parts.length > 0) {
        contextNote = `\n[Current User Context: ${parts.join(', ')}]`;
      }
    }

    const fullMessages = [
      { role: 'system', content: SYSTEM_PROMPT + contextNote },
      // Keep only recent conversation history (max 8 messages)
      ...messages.slice(-8).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    // Try candidate models in order of quality
    for (const model of this.MODELS) {
      try {
        const response = await fetch(this.GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: fullMessages,
            temperature: 0.6,
            max_tokens: 450,
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && typeof content === 'string' && content.trim().length > 0) {
            return content.trim();
          }
        } else {
          console.warn(`[GenieAiService] Model ${model} returned status ${response.status}`);
        }
      } catch (err) {
        console.warn(`[GenieAiService] Error invoking model ${model}:`, err);
      }
    }

    // Fallback if all API attempts fail
    return this.getLocalFallbackResponse(messages[messages.length - 1]?.content || '', context);
  }

  /** Smart offline rule-based fallback answering common customer inquiries */
  private static getLocalFallbackResponse(query: string, context?: ChatContext): string {
    const q = query.toLowerCase();

    if (q.includes('sell') || q.includes('phone') || q.includes('mobile') || q.includes('old') || q.includes('price')) {
      return (
        `You can sell your device in just 3 quick steps on Genie:\n\n` +
        `1. Choose your device and get an **instant valuation** in under 60 seconds.\n` +
        `2. Book a **100% Free Doorstep Pickup** at your preferred date and time anywhere in Tamil Nadu.\n` +
        `3. Get **Instant Payment** via UPI, Bank Transfer, or Cash right before our agent leaves.\n\n` +
        `👉 Start right here: [Sell Your Device](/sell)`
      );
    }

    if (q.includes('track') || q.includes('order') || q.includes('status') || q.includes('request') || q.includes('genie-')) {
      return (
        `You can track your buyback request anytime!\n\n` +
        `• Enter your Request Number (e.g. \`GENIE-2026-XXXX\`) or registered mobile number.\n` +
        `• View live pickup status, assigned collector details, and scheduled inspection time.\n\n` +
        `👉 Click here to check: [Track Your Order](/track)`
      );
    }

    if (q.includes('pickup') || q.includes('doorstep') || q.includes('city') || q.includes('tamil') || q.includes('location')) {
      return (
        `🚚 **Doorstep Pickup is 100% Free** across Tamil Nadu!\n\n` +
        `Our verified executives cover all major cities including Chennai, Coimbatore, Madurai, Tiruchirappalli, Salem, Tirunelveli, Erode, Vellore, Srivilliputhur, and all surrounding areas.\n\n` +
        `👉 Learn more or book: [Doorstep Pickup Information](/pickup)`
      );
    }

    if (q.includes('buy') || q.includes('refurbished') || q.includes('used') || q.includes('store')) {
      return (
        `Looking for a top-quality phone at unbeatable prices? Check out our certified store:\n\n` +
        `• 32-point hardware and software inspection\n` +
        `• 1-Year Comprehensive Genie Warranty\n` +
        `• 7-day hassle-free replacement guarantee\n\n` +
        `👉 Explore now: [Buy Certified Phones](/buy)`
      );
    }

    return (
      `Hello! I'm your **Genie AI Assistant** ✨\n\n` +
      `I can help you navigate Genie, check instant valuations, book free doorstep pickups, or track orders:\n\n` +
      `• [Sell Your Mobile Phone](/sell?category=phone)\n` +
      `• [Track Your Buyback Request](/track)\n` +
      `• [Explore Certified Phones Store](/buy)\n\n` +
      `What would you like assistance with today?`
    );
  }
}

