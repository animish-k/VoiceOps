import { TurnContext } from './TurnContext.js';
import { QueryTransactionsResult } from '../tools/queryTransactions.js';
import { AgentEventLogger, defaultAgentEventLogger } from '../observability/EventLogger.js';

export class ResponseGenerator {
  private logger: AgentEventLogger;

  constructor(logger: AgentEventLogger = defaultAgentEventLogger) {
    this.logger = logger;
  }

  public generateResponse(
    context: TurnContext,
    toolName: string,
    result: unknown
  ): string {
    const startTime = Date.now();
    let spokenText = '';

    if (toolName === 'query_transactions') {
      const qResult = result as QueryTransactionsResult;
      const count = qResult?.totalMatching ?? 0;
      const filters = qResult?.appliedFilters || {};

      const regions = filters.region
        ? (Array.isArray(filters.region) ? filters.region.join(' and ') : filters.region)
        : '';
      const status = filters.status
        ? (Array.isArray(filters.status) ? filters.status.join(', ').toLowerCase() : String(filters.status).toLowerCase())
        : '';
      const minAmount = filters.minAmount;

      const parts: string[] = [];

      if (count === 0) {
        spokenText = `No ${status || ''} transactions found${regions ? ` in ${regions}` : ''}${minAmount ? ` above ₹${minAmount.toLocaleString('en-IN')}` : ''}.`;
      } else {
        parts.push(`I found ${count}`);
        if (regions) {
          parts.push(regions);
        }
        if (status) {
          parts.push(status === 'failed' ? 'failures' : `${status} transactions`);
        } else {
          parts.push('transactions');
        }

        if (minAmount) {
          parts.push(`above ₹${minAmount.toLocaleString('en-IN')}`);
        }

        const totalVol = qResult?.metrics?.totalVolumeRupees ?? 0;
        if (totalVol > 0) {
          parts.push(`totalling ₹${totalVol.toLocaleString('en-IN')}`);
        }

        spokenText = parts.join(' ') + '.';
      }
    } else {
      spokenText = `Processed ${toolName} successfully.`;
    }

    context.assistantSpokenText = spokenText;
    const durationMs = Date.now() - startTime;

    this.logger.emit({
      type: 'response_generated',
      turnId: context.turnId,
      requestId: context.requestId,
      timestamp: Date.now(),
      spokenText,
      durationMs
    });

    return spokenText;
  }
}

export const defaultResponseGenerator = new ResponseGenerator();
