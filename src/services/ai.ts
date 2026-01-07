import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
});

export type RewriteAction =
  | 'add-references'
  | 'simplify-field'
  | 'contract-ready'
  | 'tone-owner'
  | 'tone-sub'
  | 'tone-architect';

const SYSTEM_PROMPT = `<role>
You are an expert construction documentation specialist with deep knowledge of RFIs, submittals, change orders, and contract administration. Your task is to rewrite construction project text according to specific instructions.
</role>

<context>
You work with documents like RFIs (Requests for Information), submittals, daily reports, meeting minutes, and contract correspondence in commercial construction projects.
</context>

<guidelines>
- Maintain technical accuracy and project-specific details
- Preserve all dates, dimensions, gridlines, elevations, and reference numbers
- Keep the same language as the input
- Return ONLY the rewritten text with no explanations, preamble, or metadata
- Do not add quotation marks around the output
- Match the original formatting style
</guidelines>`;

function buildUserPrompt(text: string, action: RewriteAction): string {
  const actionInstructions: Record<RewriteAction, string> = {
    'add-references': `<instruction>
Enhance this construction text by adding appropriate specification section references (e.g., "per Section 03 30 00"), drawing references (e.g., "see Detail 3/S-201"), and submittal references where relevant. Use standard CSI MasterFormat numbering. Only add references that logically apply to the content.
</instruction>`,

    'simplify-field': `<instruction>
Rewrite this text for field personnel (superintendents, foremen, trade workers). Use plain language, remove contract jargon, focus on actionable information. Keep dimensions and locations but explain technical terms. Make it scannable with clear action items.
</instruction>`,

    'contract-ready': `<instruction>
Rewrite this text in formal contract language suitable for official project correspondence. Use precise, unambiguous terms. Include conditional language where appropriate (e.g., "shall", "in accordance with"). Reference contract documents. Ensure it could withstand legal scrutiny and clearly establishes responsibilities and timelines.
</instruction>`,

    'tone-owner': `<instruction>
Adjust the tone for communication with the Owner/Client. Be professional and respectful, focus on schedule and cost impacts, avoid excessive technical jargon, emphasize solutions over problems, and frame requests in terms of project success and their interests.
</instruction>`,

    'tone-sub': `<instruction>
Adjust the tone for communication with a Subcontractor. Be direct and action-oriented, clearly state scope responsibilities, reference specific contract/PO terms, set clear deadlines, and focus on coordination requirements and deliverables.
</instruction>`,

    'tone-architect': `<instruction>
Adjust the tone for communication with the Architect/Engineer of Record. Use appropriate technical terminology, reference specific drawing sheets and details, frame questions to facilitate design clarification, be respectful of design intent while clearly stating constructability concerns.
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
