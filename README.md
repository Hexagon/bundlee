# Bundlee

Bundlee is a Deno library that takes all static files from a given folder and bundles them into a single JSON file. It compresses the files using gzip and stores them in base64 format. Bundlee can
then uncompress and retrieve the contents of the bundled files when needed.

## Features

- Bundle multiple static files into a single JSON object
- Compresses files using gzip
- Zero dependencies
- Built for Deno

## Installation

To install Bundlee, simply import it directly from deno.land:

```ts
import { bundlePath, fileContentFromBundle } from "https://deno.land/x/bundlee/mod.ts";
```

## Example Usage

### Creating a Bundle

```typescript
import { bundlePath } from "https://deno.land/x/bundlee/mod.ts";

const outFile = "bundle.json";

const bundle = await bundlePath(Deno.cwd(), "plugins/web-interface/static", [".html", ".css", ".js"]);

await Deno.writeTextFile(outFile, JSON.stringify(bundle));

console.log(`${Object.keys(bundle).length} files bundled and written to '${outFile}'`);
```

### Getting files from a bundle

```typescript
import { fileContentFromBundle } from "https://deno.land/x/bundlee/mod.ts";
import { join } from "https://deno.land/std/path/mod.ts"

const bundleFile = join(Deno.cwd(), "./bundle.json")
const getFile = "plugins/web-interface/static/web-interface.html"

const fileContent = await fileContentFromBundle(getFile, bundleFile)

console.log(`${getFile} extracted from ${bundleFile}:\n\n${fileContent}`)
```
