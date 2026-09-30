export function globToRegex(pattern: string): RegExp {
  let source = '^';

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];

    if (character === '*') {
      if (pattern[index + 1] === '*') {
        index++;

        if (pattern[index + 1] === '/') {
          // A globstar followed by a slash matches zero or more directories.
          source += '(?:[^/]+/)*';
          index++;
        } else {
          source += '[\\s\\S]*';
        }
      } else {
        source += '[^/]*';
      }
    } else if (character === '?') {
      source += '[^/]';
    } else {
      // Treat all other characters literally, including regex metacharacters.
      source += character.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
    }
  }

  // Unlike $, this end assertion cannot match before a final newline.
  return new RegExp(source + '(?![\\s\\S])');
}
