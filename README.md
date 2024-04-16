<p align="center">
<img src="https://cdn.jsdelivr.net/gh/hexagon/bundlee@main/docs/bundlee.png?v2" alt="Bundlee">
</p>

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
import { Bundlee } from "jsr:@hexagon/bundlee/mod.ts"

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
deno install --allow-read --allow-write jsr:@hexagon/bundlee
```

2. Use the bundlee command to create a bundle from a specified directory:

```sh
bundlee --bundle <path-to-your-directory> <output-bundle-file>
```

Replace <path-to-your-directory> with the path of the directory you want to bundle and <output-bundle-file> with the desired output file name (e.g., bundle.json).

Example:

```sh
bundlee --bundle static/ bundle.json
```

This command will create a bundle of the `static/` directory and save it as bundle.json. Files in the bundle will be named `static/dir/file.name` based on where the working directory where you ran the
command.

3. Restoring files from a bundle:

Given a path to a directory and a path to a bundle file, the `--restore` or `-r` option restores all files in the bundle to the specified directory, preserving their original paths and modified times.
To use this option, run the CLI command with the following syntax:

```sh
bundlee --restore <path-to-bundle-file> [<path-to-your-directory>]
```

Replace `<path-to-bundle-file>` with the path of the bundle file you want to restore from. `<path-to-your-directory>` is optional and will change where files are restored. By default, the files in the
bundle will be restored to their original paths relative to the specified directory.

Example:

```sh
bundlee --restore bundle.json
```

This command will restore the files in `bundle.json` file to the current directory, preserving their original paths and modified times.

## Example Oak Middleware

Run bundlee cli to generate a bundle, make sure to run from the root of your static files directory to get the paths correct. You can check the generated paths by opening `bundle.json` in a text
editor.

```ts
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
    const fileData = await staticFiles.get(url)
    context.response.body = fileData.content
    context.response.type = fileData.contentType
    context.response.headers.set(
      "Last-Modified",
      new Date(fileData.lastModified).toUTCString(),
    )
  } else {
    await next()
  }
})
```

## API

### Class: `Bundlee`

### _Helper factory_

#### static async **load**(fileUrl: string, importType: "import" | "fetch" | "local" = "import"): Promise<Bundlee>

Factory function that loads a bundle JSON file and creates a new instance of `Bundlee`.

- `fileUrl`: The URL of the bundle JSON file.
- `importType`: The type of import to use. Possible values are "import", "fetch", and "local". The default value is "import".

Returns a promise that resolves to a new instance of `Bundlee`.

### _Creating bundles_

#### `async` **bundle** (basePath: string, path: string, exts?: string[]) `Promise<Record<string, Metadata>>`

Bundles files from a directory into a single JSON object.

- `basePath`: The base path for file paths.
- `path`: The directory path.
- `exts`: An optional list of extensions to filter files.

Returns a promise that resolves to a JSON object containing encoded file contents.

### _Extracting files from a bundle_

#### `async` **get**(filePath: string) `Promise<Metadata>`

Gets the content of a file from a JSON bundle.

- `filePath`: The path of the file to retrieve.

Returns a promise that resolves to the metadata object for the file, containing its content, content type, and last modified time.

#### **has**(filePath: string) `boolean`

Checks if a file exists in a JSON bundle.

- `filePath`: The path of the file to retrieve.

Returns `true` if the file exists in the bundle, `false` otherwise.

### _Importing bundles_

#### `async` **import**(fileUrl: string, importType: "import" | "fetch" | "local" = "local") `Promise<void>`

Imports a bundle JSON file.

- `fileUrl`: The URL of the bundle JSON file.
- `importType`: The type of import to use. Possible values are "import", "fetch", and "local". The default value is "local".

Returns a promise that resolves when the bundle is loaded.

#### `async` **importAsModule**(fileUrl: string) `Promise<void>`

Imports a bundle JSON file using the `import()` function.

- `fileUrl`: The URL of the bundle JSON file.

Returns a promise that resolves when the bundle is loaded.

#### `async` **importLocal**(fileUrl: string): `Promise<void>`

Imports a bundle JSON file from the local filesystem.

- `fileUrl`: The path of the bundle JSON file.

Returns a promise that resolves when the bundle is loaded.

#### `async` **importRemote**(fileUrl: string) `Promise<void>`

Imports a bundle JSON file using the `fetch()` function.

- `fileUrl`: The URL of the bundle JSON file.

Returns a promise that resolves when the bundle is loaded.

#### `async` **preloadCache**() `Promise<void>`

Preloads the cache with all the files in the bundle.

Returns a promise that resolves when the cache is loaded.
