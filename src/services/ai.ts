import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export type RewriteAction =
  | 'add-metrics'
  | 'simplify'
  | 'make-actionable'
  | 'tone-executive'
  | 'tone-engineering'
  | 'tone-stakeholder';

const SYSTEM_PROMPT = `<role>
You are an expert product management documentation specialist with deep knowledge of PRDs, user stories, roadmaps, and stakeholder communication. Your task is to rewrite product documentation according to specific instructions.
</role>

<context>
You work with documents like PRDs (Product Requirements Documents), user stories, feature specifications, roadmaps, release notes, and stakeholder presentations in technology product teams.
</context>

<guidelines>
- Maintain technical accuracy and product-specific details
- Preserve all metrics, dates, feature names, and specific requirements
- Keep the same language as the input
- Return ONLY the rewritten text with no explanations, preamble, or metadata
- Do not add quotation marks around the output
- Match the original formatting style
</guidelines>`;

function buildUserPrompt(text: string, action: RewriteAction): string {
  const actionInstructions: Record<RewriteAction, string> = {
    'add-metrics': `<instruction>
Enhance this product text by adding relevant success metrics, KPIs, and measurable outcomes. Include specific numbers where appropriate (e.g., "increase conversion by 15%", "reduce load time to under 2 seconds"). Add metrics that logically apply to the features or goals mentioned.
</instruction>`,

    'simplify': `<instruction>
Rewrite this text in simpler, more accessible language. Remove technical jargon, use shorter sentences, and focus on the key message. Make it easy to understand for anyone regardless of their technical background. Keep the essential information but present it more clearly.
</instruction>`,

    'make-actionable': `<instruction>
Rewrite this text to be more actionable and results-oriented. Convert passive descriptions into clear action items, add specific next steps, define ownership where possible, and include clear timelines or deadlines. Make it easy to understand what needs to happen and by when.
</instruction>`,

    'tone-executive': `<instruction>
Adjust the tone for executive leadership communication. Focus on business impact, strategic alignment, and ROI. Use concise language, lead with the most important information, highlight risks and opportunities, and connect features to business outcomes. Avoid technical implementation details.
</instruction>`,

    'tone-engineering': `<instruction>
Adjust the tone for the engineering team. Include relevant technical considerations, be specific about requirements and constraints, mention integration points and dependencies, and frame requirements in terms of acceptance criteria. Use precise technical language where appropriate.
</instruction>`,

    'tone-stakeholder': `<instruction>
Adjust the tone for external stakeholders (customers, partners, investors). Focus on user benefits and value proposition, use clear and professional language, emphasize competitive advantages, and highlight the positive impact on their goals. Avoid internal jargon and implementation details.
</instruction>`,
  };

  return `${actionInstructions[action]}

<input>
${text}
</input>

<output>`;
}

export async function rewriteText(
  text: string,
  action: RewriteAction
): Promise<string> {
  console.log('[AI Service] rewriteText called with action:', action);
  console.log('[AI Service] Input text length:', text.length);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildUserPrompt(text, action),
        },
      ],
    });

    console.log('[AI Service] Response received:', response);

    const content = response.content[0];
    if (content.type === 'text') {
      console.log('[AI Service] Text content:', content.text.substring(0, 100));
      return content.text.trim();
    }

    throw new Error('Unexpected response format');
  } catch (error) {
    console.error('[AI Service] API error:', error);
    throw error;
  }
}
