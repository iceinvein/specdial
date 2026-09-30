export function globToRegex(pattern: string): RegExp {
  let source = "^";

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (char === "*") {
      if (pattern[i + 1] === "*") {
        i++;
        if (pattern[i + 1] === "/") {
          source += "(?:[\\s\\S]*/)?";
          i++;
        } else {
          source += "[\\s\\S]*";
        }
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
    }
  }

  // `$` alone also matches before a final newline; require the actual end.
  return new RegExp(source + "$(?![\\s\\S])");
}
