export function globToRegex(pattern: string): RegExp {
  let source = '^';

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (char === '*') {
      if (pattern[i + 1] === '*') {
        i++;
        if (pattern[i + 1] === '/') {
          // A globstar followed by a slash also matches zero directories.
          source += '(?:[^/]+/)*';
          i++;
        } else {
          source += '[\\s\\S]*';
        }
      } else {
        source += '[^/]*';
      }
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    }
  }

  // Require the actual end of the path, including paths ending in a newline.
  return new RegExp(source + '(?![\\s\\S])');
}
