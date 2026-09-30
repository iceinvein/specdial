export function globToRegex(pattern: string): RegExp {
  let source = "";

  for (let i = 0; i < pattern.length; i++) {
    const character = pattern[i];

    if (character === "*") {
      if (pattern[i + 1] === "*") {
        i++;
        if (pattern[i + 1] === "/") {
          // A globstar followed by a slash includes zero directories.
          source += "(?:[^/]+/)*";
          i++;
        } else {
          source += "[\\s\\S]*";
        }
      } else {
        source += "[^/]*";
      }
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    }
  }

  // Unlike $, this end assertion cannot match before a trailing newline.
  return new RegExp(`^${source}(?![\\s\\S])`);
}
