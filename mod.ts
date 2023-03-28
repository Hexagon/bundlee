import { contentType, decode, dirname, encode, join, parse, relative } from "./deps.ts"
import { readAll, readerFromStreamReader } from "https://deno.land/std@0.181.0/streams/mod.ts"

export interface Metadata {
  content: string
  contentType: string
  lastModified: number
}

export class Bundlee {
  private loadedBundle?: Record<string, Metadata>
  private cache: Record<string, Metadata> = {}

  /**
   * Factory function that loads a bundle JSON file and creates a new instance of `Bundlee`.
   * @param fileUrl The URL of the bundle JSON file.
   * @param importType The type of import to use. Possible values are "import", "fetch", and "local". The default value is "local".
   * @returns A promise that resolves to a new instance of `Bundlee`.
   */
  static async load(
    fileUrl: string,
    importType: "import" | "fetch" | "local" = "local",
  ): Promise<Bundlee> {
    const inst = new Bundlee()
    await inst.import(fileUrl, importType)
    return inst
  }

  /**
   * Recursively read a directory and return a list of files.
   * @param path The directory path.
   * @param extensionFilter An optional list of extensions to filter files.
   * @returns A promise that resolves to an array of file paths.
   */
  private async recursiveReaddir(
    path: string,
    extensionFilter?: string[],
  ): Promise<string[]> {
    const files: string[] = []
    const getFiles = async (path: string) => {
      for await (const dirEntry of Deno.readDir(path)) {
        if (dirEntry.isDirectory) {
          await getFiles(join(path, dirEntry.name))
        } else if (dirEntry.isFile) {
          const pathInfo = parse(dirEntry.name)
          if (!extensionFilter || extensionFilter.includes(pathInfo.ext)) {
            files.push(join(path, dirEntry.name))
          }
        }
      }
    }
    await getFiles(path)
    return files
  }

  /**
   * Bundle files into a single JSON object.
   * @param basePath The base path for file paths.
   * @param fileList A list of file paths.
   * @returns A promise that resolves to a JSON object containing encoded file contents.
   */
  private async bundleFiles(
    basePath: string,
    fileList: string[],
  ): Promise<Record<string, Metadata>> {
    const result: Record<string, Metadata> = {}
    for (const file of fileList) {
      const src = await Deno.open(file)
      const dst = new TransformStream()
      src.readable
        .pipeThrough(new CompressionStream("gzip"))
        .pipeTo(dst.writable)
      const relativePath = relative(basePath, file).replaceAll("\\", "/")
      const content = encode(
        await readAll(readerFromStreamReader(dst.readable.getReader())),
      )

      const contentType = await this.getContentType(file)
      const lastModified = (await Deno.stat(file)).mtime?.getTime() || 0

      result[relativePath] = { content, contentType, lastModified }
    }
    return result
  }

  private getContentType(filePath: string): string {
    const filePathInParts = parse(filePath)
    return contentType(filePathInParts.ext) || "application/octet-stream"
  }

  /**
   * Bundle files from a directory into a single JSON object.
   * @param {string} basePath - The base path for file paths.
   * @param {string} path - The directory path.
   * @param {string[]} [exts] - An optional list of extensions to filter files.
   * @returns {Promise<Record<string, Metadata>>} - A promise that resolves to a JSON object containing encoded file contents.
   */
  async bundle(
    basePath: string,
    path: string,
    exts?: string[],
  ): Promise<Record<string, Metadata>> {
    const fileList = await this.recursiveReaddir(join(basePath, path), exts)

    if (!fileList || fileList.length === 0) {
      throw new Error("No input files found")
    }

    return await this.bundleFiles(basePath, fileList)
  }

  /**
   * Checks if a file exists in a JSON bundle.
   * @param filePath The path of the file to retrieve.
   * @returns true if the file exists in the bundle, false otherwise.
   */
  has(filePath: string): boolean {
    if (this.loadedBundle && (this.loadedBundle[filePath] !== undefined)) {
      return true
    } else {
      return false
    }
  }

  /**
   * Get the content of a file from a JSON bundle.
   * @param filePath The path of the file to retrieve.
   * @returns A promise that resolves to the metadata object for the file, containing its content, content type, and last modified time.
   */
  async get(filePath: string): Promise<Metadata> {
    if (!this.loadedBundle) {
      throw new Error("No bundle loaded.")
    }

    if (this.cache[filePath]) {
      return this.cache[filePath]
    }

    const metadata = this.loadedBundle[filePath]
    if (metadata) {
      // Decode base64 encoded string to Uint8Array
      const compressedContent = decode(metadata.content)

      // Set up a stream source
      const src = new TransformStream<Uint8Array>()

      // Set up a stream destination
      const dest = new TransformStream<Uint8Array>()

      // Run compressed data through DecompressionStream
      src.readable
        .pipeThrough(new DecompressionStream("gzip"))
        .pipeTo(dest.writable)

      // Feed the source
      const writer = src.writable.getWriter()
      const reader = dest.readable.getReader()

      writer.write(compressedContent)

      await writer.close()

      // Decode Uint8Array to string
      const text = new TextDecoder().decode(
        await readAll(readerFromStreamReader(reader)),
      )

      // Update the content in the Metadata object and cache it
      const updatedMetadata: Metadata = {
        content: text,
        contentType: metadata.contentType,
        lastModified: metadata.lastModified,
      }
      this.cache[filePath] = updatedMetadata

      return updatedMetadata
    } else {
      throw new Error("Requested file not found in bundle.")
    }
  }

  /**
   * Imports a bundle JSON file.
   *
   * Used by the load()-factory
   *
   * @param fileUrl The URL of the bundle JSON file.
   * @param importType The type of import to use. Possible values are "import", "fetch", and "local". The default value is "local".
   * @returns A promise that resolves when the bundle is loaded.
   */
  async import(
    fileUrl: string,
    importType: "import" | "fetch" | "local" = "import",
  ) {
    if (importType === "fetch") {
      await this.importRemote(fileUrl)
    } else if (importType === "import") {
      await this.importAsModule(fileUrl)
    } else {
      await this.importLocal(fileUrl)
    }
  }

  /**
   * Imports a bundle JSON file using the `fetch()` function.
   * @param fileUrl The URL of the bundle JSON file.
   * @returns A promise that resolves when the bundle is loaded.
   */
  async importRemote(fileUrl: string) {
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch bundle from ${fileUrl}`)
    }
    this.loadedBundle = await response.json()
  }

  /**
   * Imports a bundle JSON file from the local filesystem.
   * @param fileUrl The path of the bundle JSON file.
   * @returns A promise that resolves when the bundle is loaded.
   */

  async importLocal(fileUrl: string) {
    const fileContent = await Deno.readTextFile(fileUrl)
    this.loadedBundle = JSON.parse(fileContent)
  }

  /**
   * Imports a bundle JSON file using the `import()` function.
   * @param fileUrl The URL of the bundle JSON file.
   * @returns A promise that resolves when the bundle is loaded.
   */
  async importAsModule(fileUrl: string) {
    this.loadedBundle = (await import(fileUrl, {
      assert: { type: "json" },
    })).default
  }

  /**
   * Preloads the cache with all the files in the bundle.
   * @returns A promise that resolves when the cache is loaded.
   */
  async preloadCache(): Promise<void> {
    if (!this.loadedBundle) {
      throw new Error("No bundle loaded.")
    }

    const fileKeys = Object.keys(this.loadedBundle)
    for (const key of fileKeys) {
      await this.get(key)
    }
  }

  /**
   * Restores all files in the bundle to the filesystem, including their modified time.
   * @param targetPath The path to restore files to.
   * @returns A promise that resolves when all files are restored.
   */
  async restore(targetPath: string): Promise<void> {
    if (!this.loadedBundle) {
      throw new Error("No bundle loaded.")
    }

    const fileKeys = Object.keys(this.loadedBundle)

    // Create a promise array to wait for all file write and utime operations
    const writePromises: Promise<void>[] = []

    for (const key of fileKeys) {
      const metadata = await this.get(key)
      const restoredFilePath = join(targetPath, key)

      // Ensure the target directory exists
      await Deno.mkdir(dirname(restoredFilePath), { recursive: true })

      // Write the content to the file
      const contentArrayBuffer = new TextEncoder().encode(metadata.content)
      const writePromise = Deno.writeFile(restoredFilePath, contentArrayBuffer)
      writePromises.push(writePromise)

      // Update the modified and access times
      const utimePromise = writePromise.then(() => Deno.utime(restoredFilePath, metadata.lastModified / 1000, metadata.lastModified / 1000))
      writePromises.push(utimePromise)
    }

    // Wait for all file write and utime operations to complete
    await Promise.all(writePromises)
  }
}
