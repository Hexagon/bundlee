# Bundlee

Bundlee is a Deno library designed to consolidate static files from a specified folder into a single JSON file. The library compresses these files using gzip and stores them in base64 format. Bundlee
can then decompress and retrieve the content of the bundled files when required.

This library is particularly useful for serving **all your static files** from a CDN. Bundlee downloads one bundle (a json file) from a URL at server start, then a middleware extracts the correct file
for the appropriate URL from the bundle when needed.

## Features

- Combine multiple static files into a single JSON file, suitable for serving via CDN
- Uses gzip for smaller bundles
- No external dependencies
- Developed specifically for Deno

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

## Example Oak Middleware

Run bundlee cli to generate a bundle, make sure to run from the root of your static files directory to get the paths correct. You can check the generated paths by opening `bundle.json` in a text
editor.

```ts
// contentType from std is needed
import { contentType } from "https://deno.land/std@0.181.0/media_types/content_type.ts"

// Generate an url to bundle.json, relative to current file path
// this is to make everything work later when code and bundle is published to a cdn.
//
// You can of course set the pathToBundleJson to a fixed
// url, like https://deno.land/x/mymod@0.0.1/bundle.json too
//
const pathToBundleJson = dirname(import.meta.url) + "/bundle.json"

// Load the bundle
const staticFiles = await Bundlee.load(pathToBundleJson)

// Now, in your oak initialization code, add this middleware
this.app.use(async (context: any, next: any) => {
  // Extract path from request, example: /css/default.css
  // remove leading slash to get css/default.css which should match the name in
  // bundle.json
  const url = context.request.url.pathname.slice(1)

  // Serve!
  if (staticFiles.has(url)) {
    context.response.headers.set("Content-Type", contentType(context.request.url.pathname))
    context.response.body = await staticFiles.get(url)
  } else {
    next()
  }
})
```
