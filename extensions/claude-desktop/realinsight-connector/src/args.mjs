export function parse_args(args) {
  const options = {};
  const positionals = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--") {
      positionals.push(...args.slice(i + 1));
      break;
    }

    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    if (arg.startsWith("--no-")) {
      options[arg.slice(5)] = false;
      options[arg.slice(2)] = true;
      continue;
    }

    const equals_index = arg.indexOf("=");

    if (equals_index >= 0) {
      options[arg.slice(2, equals_index)] = arg.slice(equals_index + 1);
      continue;
    }

    const key = arg.slice(2);
    const next = args[i + 1];

    if (next && !next.startsWith("--")) {
      options[key] = next;
      i++;
    }
    else {
      options[key] = true;
    }
  }

  return { options, positionals };
}

export function option_value(options, name, fallback) {
  const value = options[name];

  if (value === undefined || value === null || value === "") return fallback;

  return String(value);
}

export function option_bool(options, name, fallback) {
  if (options[name] === undefined) return fallback;

  if (typeof options[name] === "boolean") return options[name];

  return ["1", "true", "yes", "on"].includes(String(options[name]).toLowerCase());
}

export function option_bool_if_present(options, name) {
  if (options[name] === undefined) return undefined;

  return option_bool(options, name, false);
}
