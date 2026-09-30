export function globToRegex(pattern: string): RegExp {
  let source = '^';

  for (let i = 0; i < pattern.length; i++) {
    const character = pattern[i];

    if (character === '*') {
      if (pattern[i + 1] === '*') {
        i++;
        if (pattern[i + 1] === '/') {
          source += '(?:[\\s\\S]*/)?';
          i++;
        } else {
          source += '[\\s\\S]*';
        }
      } else {
        source += '[^/]*';
      }
    } else if (character === '?') {
      source += '[^/]';
    } else {
      source += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }

  // The lookahead prevents $ from accepting a trailing newline.
  return new RegExp(`${source}$(?![\\s\\S])`);
}
