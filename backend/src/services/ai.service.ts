import OpenAI from 'openai';
import { logger } from '../utils/logger';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are an expert IT Support Assistant for an enterprise helpdesk system. Your role is to:
1. Understand the user's IT issue clearly
2. Provide step-by-step troubleshooting guidance
3. Ask clarifying questions when needed
4. Detect urgency and priority (Critical/High/Medium/Low)
5. Suggest relevant knowledge base solutions
6. Determine if the issue needs human escalation

You support these categories:
- Windows issues (crashes, errors, updates, BSOD)
- Printer problems (not printing, offline, driver issues)
- Wi-Fi/Network issues (no connectivity, slow speed, VPN)
- Email issues (Outlook, access, configuration)
- VPN problems (connection, credentials, server)
- Software installation (permissions, license, compatibility)
- Laptop performance (slow, overheating, battery)
- Password reset (Windows, email, applications)
- Hardware complaints (keyboard, monitor, mouse, USB)
- Other IT issues

Response format:
- Be concise and professional
- Use numbered steps for instructions
- If you cannot resolve the issue after 2-3 attempts, recommend escalation
- Always end with: "Did this resolve your issue? [Yes] [No - Escalate to Engineer]"

Escalation triggers (mention "ESCALATE" in your response when these occur):
- Hardware failure requiring physical intervention
- Security breach or data loss
- System-wide outage
- User has tried all troubleshooting steps
- Issue requires admin access or software installation`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResult {
  message: string;
  shouldEscalate: boolean;
  suggestedPriority: string;
  suggestedCategory: string;
  ticketTitle?: string;
}

class AIService {
  async chat(userMessage: string, history: ChatMessage[], user: { name: string; id: string }): Promise<ChatResult> {
    if (!process.env.OPENAI_API_KEY) {
      return this.getFallbackResponse(userMessage);
    }

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage },
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 800,
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, I could not process your request. Please try again or escalate to a human engineer.';
      const shouldEscalate = response.toUpperCase().includes('ESCALATE') || response.toUpperCase().includes('HUMAN ENGINEER');
      const priority = this.detectPriority(userMessage + ' ' + response);
      const category = this.detectCategory(userMessage);
      const ticketTitle = await this.generateTicketTitle(userMessage);

      return { message: response, shouldEscalate, suggestedPriority: priority, suggestedCategory: category, ticketTitle };
    } catch (err) {
      logger.error('OpenAI error:', err);
      return this.getFallbackResponse(userMessage);
    }
  }

  async getSuggestedReply(ticket: { title: string; description: string; messages: Array<{ content: string; type: string }> }): Promise<string> {
    if (!process.env.OPENAI_API_KEY) return 'Thank you for reaching out. I am looking into this issue and will get back to you shortly.';

    try {
      const context = `Ticket: ${ticket.title}\nDescription: ${ticket.description}\nRecent messages:\n${ticket.messages.slice(-5).map(m => `${m.type}: ${m.content}`).join('\n')}`;
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an IT support engineer. Generate a professional, helpful reply to this IT support ticket. Keep it concise and actionable.' },
          { role: 'user', content: context },
        ],
        temperature: 0.5,
        max_tokens: 300,
      });
      return completion.choices[0]?.message?.content || '';
    } catch {
      return '';
    }
  }

  async generateTicketTitle(description: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY) return description.substring(0, 60);
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Generate a concise IT ticket title (max 60 chars) from this description. Return only the title.' },
          { role: 'user', content: description },
        ],
        temperature: 0.3,
        max_tokens: 30,
      });
      return completion.choices[0]?.message?.content?.trim() || description.substring(0, 60);
    } catch {
      return description.substring(0, 60);
    }
  }

  private detectPriority(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('critical') || lower.includes('server down') || lower.includes('data loss') || lower.includes('security breach') || lower.includes('outage')) return 'CRITICAL';
    if (lower.includes('urgent') || lower.includes('cannot work') || lower.includes('blocked') || lower.includes('not working')) return 'HIGH';
    if (lower.includes('slow') || lower.includes('intermittent') || lower.includes('sometimes')) return 'MEDIUM';
    return 'LOW';
  }

  private detectCategory(text: string): string {
    const lower = text.toLowerCase();
    if (lower.match(/password|login|locked|credentials/)) return 'PASSWORD_RESET';
    if (lower.match(/printer|print|scanning/)) return 'PRINTER';
    if (lower.match(/wifi|wi-fi|internet|network|connectivity|ethernet/)) return 'NETWORK_WIFI';
    if (lower.match(/vpn|remote|tunnel/)) return 'VPN';
    if (lower.match(/email|outlook|mail|smtp/)) return 'EMAIL';
    if (lower.match(/install|software|application|app|license/)) return 'SOFTWARE_INSTALL';
    if (lower.match(/slow|performance|lag|hang|freeze|ram|memory/)) return 'PERFORMANCE';
    if (lower.match(/windows|os|update|crash|bsod|blue screen/)) return 'WINDOWS_ISSUE';
    if (lower.match(/laptop|keyboard|mouse|monitor|screen|hardware|usb|charger/)) return 'HARDWARE';
    return 'OTHER';
  }

  private getFallbackResponse(message: string): ChatResult {
    const lower = message.toLowerCase();
    let response = '';

    if (lower.match(/password|locked/)) {
      response = `I can help with password issues!\n\n**Steps to reset your Windows password:**\n1. Press Ctrl+Alt+Delete\n2. Click "Change a password"\n3. Follow the prompts\n\nIf you're locked out completely, please escalate to an IT engineer who can reset it from the Active Directory.\n\nDid this resolve your issue? [Yes] [No - Escalate to Engineer]`;
    } else if (lower.match(/printer|print/)) {
      response = `Let me help with your printer issue!\n\n**Quick troubleshooting:**\n1. Check if the printer is ON and connected\n2. Restart the Print Spooler service: Services → Print Spooler → Restart\n3. Clear the print queue\n4. Try printing a test page\n\nDid this resolve your issue? [Yes] [No - Escalate to Engineer]`;
    } else if (lower.match(/wifi|internet|network/)) {
      response = `Network connectivity issue detected.\n\n**Troubleshooting steps:**\n1. Restart your router/switch\n2. Run: ipconfig /release then ipconfig /renew\n3. Try: netsh winsock reset\n4. Check if others are affected (could be outage)\n\nDid this resolve your issue? [Yes] [No - Escalate to Engineer]`;
    } else {
      response = `Thank you for contacting IT Support! I've received your issue and I'm analyzing it.\n\nTo help you better, could you please provide:\n1. What exactly is happening?\n2. When did this start?\n3. Have you tried restarting your device?\n4. Is it affecting only you or multiple users?\n\nDid this resolve your issue? [Yes] [No - Escalate to Engineer]`;
    }

    return {
      message: response,
      shouldEscalate: false,
      suggestedPriority: this.detectPriority(message),
      suggestedCategory: this.detectCategory(message),
    };
  }
}

export const aiService = new AIService();
