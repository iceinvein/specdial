export function toRegex(glob: string): RegExp {
  return new RegExp("^" + glob.replace(".", "\\.").replace("*", "[^/]*") + "$", "g");
}
