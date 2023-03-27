# Bundlee

Bundlee is a Deno library that takes all static files from a given folder and bundles them into a single JSON file. It compresses the files using gzip and stores them in base64 format. Bundlee can
then uncompress and retrieve the contents of the bundled files when needed.

## Features

- Bundle multiple static files into a single JSON object
- Compresses files using gzip
- Zero dependencies
- Built for Deno

## Example Usage

### Getting files from a bundle

```typescript
import { Bundlee } from "https://deno.land/x/bundlee/mod.ts"

// Bundlee.load is a static factory function returning a ready to use instance
const staticFiles = await Bundlee.load("url")

// Implement this in a middleware in your web framework,
// ... or use it for something completely different!
if (staticFiles.has("static/index.html")) {
  const fileContent = staticFiles.get("static/index.html")
}
```

### Creating a Bundle

To create a bundle using the `bundlee` CLI command, follow these steps:

1. Install `bundlee` as a command-line tool:

```sh
deno install --allow-read --allow-write https://deno.land/x/bundlee/bundlee.ts
```

2. Use the bundlee command to create a bundle from a specified directory:

```sh
bundlee --path <path-to-your-directory> <output-bundle-file>
```

Replace <path-to-your-directory> with the path of the directory you want to bundle and <output-bundle-file> with the desired output file name (e.g., bundle.json).

Example:

```sh
bundlee --path static/ bundle.json
```

This command will create a bundle of the `static/` directory and save it as bundle.json. Files in the bundle will be named `static/dir/file.name` based on where the working directory where you ran the
command.
