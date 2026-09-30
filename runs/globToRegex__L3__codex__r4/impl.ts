export function globToRegex(pattern: string): RegExp {
  let source = "^";

  for (let i = 0; i < pattern.length; i++) {
    const character = pattern[i];

    if (character === "*") {
      if (pattern[i + 1] === "*") {
        i++;
        if (pattern[i + 1] === "/") {
          // The directory prefix is optional, including its trailing slash.
          source += "(?:[\\s\\S]*/)?";
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
      source += /[.*+?^${}()|[\]\\]/.test(character)
        ? `\\${character}`
        : character;
    }
  }

  // `$` alone also matches before a final newline; require the actual end.
  return new RegExp(`${source}$(?![\\s\\S])`);
}
