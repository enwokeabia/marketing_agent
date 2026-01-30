# Marketing Agent - Delegation-First Outreach Platform

A delegation-first AI agent that transforms natural language outreach requests into targeted, personalized campaigns. Built for the hackathon, this platform demonstrates how AI can handle the entire outreach workflow—from target discovery to message generation—while keeping the human in the loop for final approval.

## What It Does

Marketing Agent accepts plain-English instructions like:
- "Reach out to 10 boutique hotels in NYC about wellness retreats"
- "Contact 15 boutique hotels in NYC for influencer collaborations"
- "Email 30 startup founders hiring sales reps"
- "DM 10 creators in the fitness niche about brand deals"

And automatically:
1. **Parses your intent** - Understands channel, target type, location, niche, and purpose
2. **Discovers targets** - Finds relevant contacts using web intelligence
3. **Generates personalized messages** - Creates tailored outreach for each target
4. **Presents drafts for approval** - Shows you high-quality drafts to review
5. **Enables easy sending** - Send now, schedule, or export with one click

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Delegation-First Outreach Agent               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │   User      │    │   AI Agent      │    │   Approval      │  │
│  │   Input     │───▶│   Orchestrator  │───▶│   Workflow      │  │
│  │  (Natural   │    │   (LangGraph)   │    │   UI            │  │
│  │   Language) │    └────────┬────────┘    └────────┬────────┘  │
│  └─────────────┘             │                       │           │
│                              ▼                       ▼           │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │   Results   │    │   Intelligence  │    │   Actions       │  │
│  │   Dashboard │◀───│   Engine        │◀───│   (Send/Export/ │  │
│  │   UI        │    │   (Search+Enrich)│    │    Schedule)   │  │
│  └─────────────┘    └─────────────────┘    └─────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Natural Language Understanding
- **Intent Parsing**: Automatically extracts channel, target type, purpose, location, and count from your instructions
- **Channel Detection**: Determines Email, DM, WhatsApp, or generic outreach based on context
- **Target Recognition**: Identifies restaurant owners, hoteliers, founders, creators, real estate brokers, and more

### Multi-Domain Targeting
- **B2B**: Restaurants, hotels, real estate, professional services
- **Startups**: Founders, hiring managers, growth teams
- **Creator Economy**: Fitness, fashion, lifestyle, and niche influencers

### Channel-Aware Message Generation
- **Email Templates**: Professional, detailed messages with subject lines
- **DM Templates**: Concise, casual messages for social platforms
- **WhatsApp Templates**: Conversational, friendly outreach
- **Personalization**: Company references, niche specifics, location context

### User-Centric Workflow
- **Delegation UX**: Simple input with helpful examples
- **Approval Queue**: Review, edit, and approve messages
- **One-Click Actions**: Send, schedule, or export in seconds
- **Visual Progress**: Track campaign status and results

### Follow-up Automation
- **Smart Triggers**: Unopened after days, opened no reply, clicked no reply
- **Automated Scheduling**: Set delays and max attempts
- **Template Library**: Pre-built follow-up templates

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI/ML**: LangGraph, LangChain, OpenAI
- **Database**: Supabase (PostgreSQL)
- **Visualization**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key (for AI features)
- Supabase account (optional, for persistence)

### Installation

```bash
# Navigate to project directory
cd marketing-agent

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Configure your environment variables
# Edit .env.local with your API keys
```

### Environment Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration (optional)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Web Search (Serper or Tavily)
SERPER_API_KEY=your_serper_api_key
TAVILY_API_KEY=your_tavily_api_key

# Email Integration (Resend)
RESEND_API_KEY=your_resend_api_key

# Automation Webhooks
N8N_WEBHOOK_URL=your_n8n_webhook_url
ZAPIER_WEBHOOK_URL=your_zapier_webhook_url
```

### Running the Application

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit `http://localhost:3000` to see the application.

## Demo Flow

### 1. Input Your Goal
Visit the homepage and describe your outreach goal in natural language. The system provides helpful examples to guide you.

**Example Input:**
```
Reach out to 10 boutique hotels in NYC about wellness retreats
```

### 2. Review Detected Intent
The system parses your request and shows what it understood:
- Channel: Email (auto-detected)
- Target Type: Hotel owners
- Location: New York, NY
- Purpose: Partnership/Collaboration
- Count: 10 targets

### 3. Approve Generated Messages
Review personalized message drafts for each target. You can:
- Approve individual messages
- Edit message content inline
- Reject messages that don't fit
- Bulk approve all

### 4. Send or Schedule
Once approved, choose your action:
- **Send Now**: Deliver immediately
- **Schedule**: Pick a specific date/time
- **Export**: Download as CSV/JSON for manual use

### 5. Track Results
Monitor your campaign performance:
- Messages sent/delivered
- Opens and clicks
- Reply rates
- Follow-up triggers

## Supported Use Cases

| Use Case | Example |
|----------|---------|
| B2B Partnerships | "Reach out to 20 restaurant owners in DC about partnerships" |
| Influencer Collabs | "Contact 15 boutique hotels in NYC for influencer collaborations" |
| Hiring Outreach | "Email 30 startup founders hiring sales reps" |
| Creator Deals | "DM 10 creators in the fitness niche about brand deals" |
| Referrals | "Reach out to 25 real estate brokers in Miami about referrals" |

## Project Structure

```
marketing-agent/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── agents/
│   │   │       └── outreach/
│   │   │           └── route.ts        # Main agent endpoint
│   │   ├── campaigns/
│   │   │   └── page.tsx                # Main campaign UI
│   │   ├── layout.tsx
│   │   └── page.tsx                    # Landing (redirects to campaigns)
│   ├── components/
│   │   ├── actions/
│   │   │   └── ActionButton.tsx        # Send/Export/Schedule
│   │   ├── dashboard/
│   │   │   └── Dashboard.tsx           # Campaign analytics
│   │   └── delegation/
│   │       ├── InputPanel.tsx          # Natural language input
│   │       └── ApprovalQueue.tsx       # Message approval UI
│   ├── lib/
│   │   ├── agents/
│   │   │   ├── orchestrator.ts         # LangGraph workflow
│   │   │   ├── intentParser.ts         # NLP intent extraction
│   │   │   ├── channelSelector.ts      # Channel detection
│   │   │   ├── messageGenerator.ts     # Message templates
│   │   │   └── followUpAutomation.ts   # Follow-up logic
│   │   ├── database/
│   │   │   └── supabase.ts             # Database operations
│   │   └── utils/
│   │       └── helpers.ts
│   └── types/
│       └── index.ts                    # TypeScript definitions
├── prisma/
│   └── schema.prisma                   # Database schema
├── .env.example                        # Environment template
├── package.json
├── tailwind.config.ts
└── README.md
```

## Hackathon Demo Tips

1. **Start with Clear Examples**: Use the example inputs to demonstrate different use cases
2. **Show Multi-Domain Support**: Try different target types (restaurants, hotels, creators)
3. **Highlight Personalization**: Point out company-specific details in generated messages
4. **Demonstrate Editing**: Show how easy it is to modify message content
5. **Emphasize Frictionless Actions**: One-click approve, send, and export

## Future Enhancements

- Real web search integration (Serper, Tavily)
- Data enrichment (Hunter, Apollo)
- Multi-channel sequencing
- A/B testing for messages
- Team collaboration features
- Webhook integrations (n8n, Zapier)
- Email/WhatsApp delivery

## License

MIT License - Feel free to use and modify for your projects.

---

Built with Next.js, LangGraph, and a lot of coffee.
