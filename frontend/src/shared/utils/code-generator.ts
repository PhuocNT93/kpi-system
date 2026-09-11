/**
 * Utility to auto-generate standardized codes based on entity prefix and name.
 */
export function generateCode(prefix = '', name = ''): string {
  const p = prefix.toUpperCase().trim();

  if (name && name.trim()) {
    // Remove Vietnamese accents and special characters
    const normalized = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .trim();

    const words = normalized
      .split(/[\s_-]+/)
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
      .filter(Boolean);

    let slug = '';
    if (words.length === 1) {
      slug = words[0].toUpperCase().slice(0, 10);
    } else if (words.length <= 3) {
      slug = words
        .map((w) => (w.length > 5 ? w.slice(0, 3) : w))
        .join('-')
        .toUpperCase();
    } else {
      const acronym = words
        .slice(0, -1)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
      const last = words[words.length - 1].slice(0, 4).toUpperCase();
      slug = `${acronym}-${last}`;
    }

    if (p) {
      return `${p}-${slug}`;
    }
    return slug;
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return p ? `${p}-${randomSuffix}` : `CODE-${randomSuffix}`;
}
