// Minimal domain normalizer (copy of backend classifier for Vercel functions)
export function normalizeDomain(raw) {
  if (!raw) return 'General';
  const s = raw.toString().trim();
  const mappings = [
    [/csis|cs\/it|cs|it\b|computer science|information tech/i, 'CSIS'],
    [/ee|ece|electrical|electronics/i, 'Electrical'],
    [/me\b|mech|mechanical/i, 'Mechanical'],
    [/chem|chemical/i, 'Chemical'],
    [/finance|fin\b|economics|finance and mgmt/i, 'Finance'],
    [/consult/i, 'Consulting'],
    [/pharma|bio|life science/i, 'Biotech'],
    [/civil|env|environ|infrastructure/i, 'Infrastructure'],
    [/design|ux|ui/i, 'Design'],
    [/management|mba|business/i, 'Management'],
  ];
  for (const [regex, normalized] of mappings) {
    if (regex.test(s)) return normalized;
  }
  return s;
}
