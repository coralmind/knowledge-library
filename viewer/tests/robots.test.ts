import { describe, expect, it } from 'vitest';
import { isAiUserAgent } from '../src/lib/robots';

describe('isAiUserAgent', () => {
  it.each([
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
    'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
    'CCBot/2.0 (https://commoncrawl.org/faq/)',
    'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)',
    'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
    'perplexitybot/1.0',
  ])('blocks %s', (ua) => {
    expect(isAiUserAgent(ua)).toBe(true);
  });

  it.each([
    null,
    '',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  ])('allows %s', (ua) => {
    expect(isAiUserAgent(ua)).toBe(false);
  });
});
