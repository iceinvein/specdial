export function globToRegex(pattern: string): RegExp {
  let source = '^';

  for (let i = 0; i < pattern.length; i++) {
    const character = pattern[i];

    if (character === '*') {
      if (pattern[i + 1] === '*') {
        i++;
        if (pattern[i + 1] === '/') {
          // A globstar followed by a slash can match zero directories.
          source += '(?:[^/]+/)*';
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
      // Everything besides glob wildcards is literal, including regex syntax.
      source += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }

  // Unlike $, this assertion cannot match before a trailing newline.
  return new RegExp(source + '(?![\\s\\S])');
}
