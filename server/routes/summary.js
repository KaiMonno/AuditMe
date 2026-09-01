const { Router } = require('express');
const { generateSummary } = require('../../lib/llmSummary');

const router = Router();

// Deliberately separate from POST /api/audits rather than auto-generating a
// summary on every audit: on-demand keeps audits fast/deterministic and
// avoids spending API quota when nobody asked for a summary.
router.post('/summary', async (req, res) => {
  const result = req.body?.result;

  if (!result || !Array.isArray(result.findings)) {
    return res.status(400).json({
      error:
        '"result" is required and must include a findings array ' +
        '(the audit result returned by POST /api/audits)',
    });
  }

  // generateSummary never throws — it always resolves to a string, either
  // the real summary or a "(LLM summary unavailable: ...)" message.
  const summary = await generateSummary(result);
  res.json({ summary });
});

module.exports = router;
