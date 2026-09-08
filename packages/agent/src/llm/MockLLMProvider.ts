import { LLMMessage, LLMProvider, LLMResponse, LLMToolCall, ToolDeclaration } from './types.js';
import { SupportedRegion, TransactionStatus } from '@voiceops/shared';

export type CustomMockHandler = (
  messages: LLMMessage[],
  tools?: ToolDeclaration[],
  signal?: AbortSignal
) => Promise<LLMResponse> | LLMResponse;

export class MockLLMProvider implements LLMProvider {
  public readonly name = 'mock-llm-provider';
  private customHandler?: CustomMockHandler;

  constructor(customHandler?: CustomMockHandler) {
    this.customHandler = customHandler;
  }

  public setHandler(handler?: CustomMockHandler): void {
    this.customHandler = handler;
  }

  public async generate(
    messages: LLMMessage[],
    tools?: ToolDeclaration[],
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    if (signal?.aborted) {
      throw new DOMException('LLM generation aborted', 'AbortError');
    }

    if (this.customHandler) {
      return this.customHandler(messages, tools, signal);
    }

    // Default: Interpret user utterance and produce structured tool call
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const toolCall = this.parseUtteranceToToolCall(lastUserMessage);

    if (toolCall) {
      return {
        toolCalls: [toolCall]
      };
    }

    return {
      text: "I'm your VoiceOps assistant. How can I help with transaction analytics?"
    };
  }

  private parseUtteranceToToolCall(text: string): LLMToolCall | null {
    const lower = text.toLowerCase();
    const queryParams: Record<string, unknown> = {};

    // 1. Regions
    const matchedRegions: SupportedRegion[] = [];
    if (lower.includes('bangalore') || lower.includes('bengaluru')) matchedRegions.push('Bangalore');
    if (lower.includes('mumbai') || lower.includes('bombay')) matchedRegions.push('Mumbai');
    if (lower.includes('delhi')) matchedRegions.push('Delhi');
    if (lower.includes('hyderabad')) matchedRegions.push('Hyderabad');
    if (lower.includes('chennai') || lower.includes('madras')) matchedRegions.push('Chennai');

    if (matchedRegions.length > 0) {
      queryParams.region = matchedRegions;
    }

    // 2. Statuses
    const matchedStatuses: TransactionStatus[] = [];
    if (lower.includes('fail') || lower.includes('error') || lower.includes('declined') || lower.includes('decline')) {
      matchedStatuses.push('FAILED');
    }
    if (lower.includes('success') || lower.includes('successful') || lower.includes('passed')) {
      matchedStatuses.push('SUCCESS');
    }
    if (lower.includes('pending')) {
      matchedStatuses.push('PENDING');
    }
    if (lower.includes('dispute') || lower.includes('chargeback')) {
      matchedStatuses.push('DISPUTED');
    }

    if (matchedStatuses.length > 0) {
      queryParams.status = matchedStatuses;
    }

    // 3. Amounts (Numbers and words)
    const amount = this.extractAmount(text);
    if (amount !== undefined) {
      if (
        lower.includes('above') ||
        lower.includes('over') ||
        lower.includes('greater than') ||
        lower.includes('more than') ||
        lower.includes('exceeding') ||
        lower.includes('at least')
      ) {
        queryParams.minAmount = amount;
      } else if (
        lower.includes('below') ||
        lower.includes('under') ||
        lower.includes('less than') ||
        lower.includes('at most')
      ) {
        queryParams.maxAmount = amount;
      } else {
        queryParams.minAmount = amount;
      }
    }

    // 4. Payment Methods
    if (lower.includes('upi')) queryParams.paymentMethod = 'UPI';
    else if (lower.includes('credit card') || lower.includes('card')) queryParams.paymentMethod = 'CREDIT_CARD';
    else if (lower.includes('net banking') || lower.includes('netbanking')) queryParams.paymentMethod = 'NET_BANKING';
    else if (lower.includes('wallet')) queryParams.paymentMethod = 'WALLET';

    // 5. Merchants
    const matchedMerchants: string[] = [];
    if (lower.includes('swiggy')) matchedMerchants.push('MERCH_SWIGGY');
    if (lower.includes('flipkart')) matchedMerchants.push('MERCH_FLIPKART');
    if (lower.includes('amazon')) matchedMerchants.push('MERCH_AMAZON_IN');
    if (lower.includes('zomato')) matchedMerchants.push('MERCH_ZOMATO');
    if (lower.includes('makemytrip')) matchedMerchants.push('MERCH_MAKEMYTRIP');
    if (lower.includes('reliance')) matchedMerchants.push('MERCH_RELIANCE');

    if (matchedMerchants.length > 0) {
      queryParams.merchantId = matchedMerchants;
    }

    // 6. Time Range
    const hourMatch = lower.match(/(?:last|past)\s+(\d+)\s+hours?/);
    if (hourMatch) {
      queryParams.timeRange = { hours: parseInt(hourMatch[1], 10) };
    }

    // If any parameters were extracted or intent is transaction querying
    if (
      Object.keys(queryParams).length > 0 ||
      lower.includes('transaction') ||
      lower.includes('show') ||
      lower.includes('query')
    ) {
      return {
        name: 'query_transactions',
        args: queryParams
      };
    }

    return null;
  }

  private extractAmount(text: string): number | undefined {
    const lower = text.toLowerCase();

    // Word based numbers
    const wordMultipliers: Record<string, number> = {
      'thousand': 1000,
      'k': 1000,
      'lakh': 100000,
      'lac': 100000,
      'crore': 10000000
    };

    const wordNumbers: Record<string, number> = {
      'one': 1,
      'two': 2,
      'three': 3,
      'four': 4,
      'five': 5,
      'six': 6,
      'seven': 7,
      'eight': 8,
      'nine': 9,
      'ten': 10,
      'twenty': 20,
      'thirty': 30,
      'forty': 40,
      'fifty': 50,
      'hundred': 100
    };

    // Check patterns like "ten thousand"
    const wordPattern = /\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|hundred)\s+(thousand|lakh|lac|crore)\b/i;
    const wordMatch = lower.match(wordPattern);
    if (wordMatch) {
      const base = wordNumbers[wordMatch[1].toLowerCase()] || 1;
      const mult = wordMultipliers[wordMatch[2].toLowerCase()] || 1;
      return base * mult;
    }

    // Check patterns like "10k" or "10 thousand" or "₹10,000" or "10000"
    const numWordPattern = /(\d+)\s*(k|thousand|lakh|lac|crore)\b/i;
    const numWordMatch = lower.match(numWordPattern);
    if (numWordMatch) {
      const val = parseFloat(numWordMatch[1]);
      const mult = wordMultipliers[numWordMatch[2].toLowerCase()] || 1;
      return val * mult;
    }

    const digitPattern = /(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i;
    const digitMatch = lower.match(digitPattern);
    if (digitMatch && digitMatch[1]) {
      const cleaned = digitMatch[1].replace(/,/g, '');
      const val = parseFloat(cleaned);
      if (!isNaN(val) && val > 0) {
        return val;
      }
    }

    return undefined;
  }
}
