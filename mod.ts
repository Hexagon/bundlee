import { decode, encode, join, parse, readAll, relative } from "./deps.ts"

export class Bundlee {
  private loadedBundle?: Record<string, string>

  /**
   * Recursively read a directory and return a list of files.
   * @param {string} path - The directory path.
   * @param {string[]} [extensionFilter] - An optional list of extensions to filter files.
   * @returns {Promise<string[]>} - A promise that resolves to an array of file paths.
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
   * @param {string} basePath - The base path for file paths.
   * @param {string[]} fileList - A list of file paths.
   * @returns {Promise<Record<string, string>>} - A promise that resolves to a JSON object containing encoded file contents.
   */
  private async bundleFiles(
    basePath: string,
    fileList: string[],
  ): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    for (const file of fileList) {
      const src = await Deno.open(file)
      const dst = new TransformStream()
      src.readable
        .pipeThrough(new CompressionStream("gzip"))
        .pipeTo(dst.writable)
      const relativePath = relative(basePath, file).replaceAll("\\", "/")
      result[relativePath] = encode(
        (await (dst.readable.getReader()).read()).value || "",
      )
    }
    return result
  }

  /**
   * Bundle files from a directory into a single JSON object.
   * @param {string} basePath - The base path for file paths.
   * @param {string} path - The directory path.
   * @param {string[]} [exts] - An optional list of extensions to filter files.
   * @returns {Promise<Record<string, string>>} - A promise that resolves to a JSON object containing encoded file contents.
   */
  async bundle(
    basePath: string,
    path: string,
    exts?: string[],
  ): Promise<Record<string, string>> {
    const fileList = await this.recursiveReaddir(join(basePath, path), exts)

    if (!fileList || fileList.length === 0) {
      throw new Error("No input files found")
    }

    return await this.bundleFiles(basePath, fileList)
  }

  /**
   * Checks if a file exists in a JSON bundle.
   * @param {string} filePath - The path of the file to retrieve.
   * @param {string} bundlePath - The path of the JSON bundle.
   * @returns {string} - A promise that resolves to the content of the file.
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
   * @param {string} filePath - The path of the file to retrieve.
   * @param {string} bundlePath - The path of the JSON bundle.
   * @returns {string} - A promise that resolves to the content of the file.
   */
  async get(
    filePath: string,
  ): Promise<string> {
    if (!this.loadedBundle) {
      throw new Error("No bundle loaded.")
    }

    const encodedFileContent = this.loadedBundle[filePath]
    if (encodedFileContent) {
      // Decode base64 encoded string to Uint8Array
      const compressedContent = decode(encodedFileContent)
      // Set up a stream source and feed it with the compressed data
      const src = new TransformStream<Uint8Array>()
      src.writable.getWriter().write(compressedContent)

      // Set up a stream destination
      const dest = new TransformStream<Uint8Array>()

      // Run compressed data through DecompressionStream
      src.readable
        .pipeThrough(new DecompressionStream("gzip"))
        .pipeThrough(new TextDecoderStream())

      // Decode Uint8Array to string, and return
      const decodedFileContent = new TextDecoder().decode(
        await readAll((await (dest.readable.getReader()).read()).value),
      )

      return decodedFileContent
    } else {
      throw new Error("Requested file not found in bundle.")
    }
  }

  async import(fileUrl: string) {
    this.loadedBundle = (await import(fileUrl, {
      assert: { type: "json" },
    })).default
  }

  static async load(fileUrl: string): Promise<Bundlee> {
    const inst = new Bundlee()
    await inst.import(fileUrl)
    return inst
  }
}
