export function globToRegex(pattern: string): RegExp {
  let source = "^";

  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index];

    if (character === "*") {
      if (pattern[index + 1] === "*") {
        index++;
        if (pattern[index + 1] === "/") {
          index++;
          source += "(?:[\\s\\S]*/)?";
        } else {
          source += "[\\s\\S]*";
        }
      } else {
        source += "[^/]*";
      }
    } else if (character === "?") {
      source += "[^/]";
    } else {
      source += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }

  // Reject trailing newlines too: JavaScript's $ alone can match before one.
  return new RegExp(source + "$(?![\\s\\S])");
}
