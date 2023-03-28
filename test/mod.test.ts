import { assertEquals, assertRejects } from "https://deno.land/std@0.181.0/testing/asserts.ts"

import { Bundlee, Metadata } from "../mod.ts"
import { join } from "../deps.ts"

Deno.test("recursiveReaddir and bundleFiles", async () => {
  const basePath = Deno.cwd()
  const path = join("test", "test_files")
  const exts = [".txt"]

  const bundlee = new Bundlee()
  const bundle = await bundlee.bundle(basePath, path, exts)
  assertEquals(Object.keys(bundle).length, 3)
})

Deno.test("bundlePath with no matching files", async () => {
  const basePath = Deno.cwd()
  const path = join("test", "test_files")
  const exts = [".nonexistent"]

  const bundlee = new Bundlee()
  await assertRejects(
    async () => await bundlee.bundle(basePath, path, exts),
    Error,
    "No input files found",
  )
})

Deno.test("fileContentFromBundle with existing file", async () => {
  const basePath = Deno.cwd()
  const path = join("test", "test_files")
  const exts = [".txt"]
  const bundleFile = join("./test", "test_bundle.json")
  const targetFile = "test/test_files/test1.txt"

  const bundlee = new Bundlee()
  const bundle = await bundlee.bundle(basePath, path, exts)
  await Deno.writeTextFile(bundleFile, JSON.stringify(bundle))

  const loadedBundlee = await Bundlee.load("./" + bundleFile)

  const fileContent = await loadedBundlee.get(targetFile)

  const originalContent: Metadata = {
    content: await Deno.readTextFile(join(basePath, targetFile)),
    contentType: "text/plain; charset=UTF-8",
    lastModified: (await Deno.stat(join(basePath, targetFile))).mtime?.getTime() || 0,
  }

  assertEquals(fileContent, originalContent)

  await Deno.remove(bundleFile)
})

Deno.test("fileContentFromBundle with non-existing file", async () => {
  const basePath = Deno.cwd()
  const path = join("test", "test_files")
  const exts = [".txt"]
  const bundleFile = join("test", "test_files", "test_bundle.json")
  const targetFile = "test/test_files/nonexistent.txt"

  const bundlee = new Bundlee()
  const bundle = await bundlee.bundle(basePath, path, exts)
  await Deno.writeTextFile(bundleFile, JSON.stringify(bundle))

  const loadedBundlee = await Bundlee.load("./" + bundleFile)
  await assertRejects(
    async () => await loadedBundlee.get(targetFile),
    Error,
    "Requested file not found in bundle.",
  )

  await Deno.remove(bundleFile)
})

Deno.test("has() returns true for existing file", async () => {
  const basePath = Deno.cwd()
  const path = join("test", "test_files")
  const exts = [".txt"]
  const targetFile = "test/test_files/test1.txt"

  const bundlee = new Bundlee()
  const bundle = await bundlee.bundle(basePath, path, exts)

  await Deno.writeTextFile(join("./test", "test_bundle.json"), JSON.stringify(bundle))
  const loadedBundlee = await Bundlee.load(join("./test", "test_bundle.json"))

  const exists = loadedBundlee.has(targetFile)
  assertEquals(exists, true)

  await Deno.remove(join("./test", "test_bundle.json"))
})

Deno.test("has() returns false for non-existing file", async () => {
  const basePath = Deno.cwd()
  const path = join("test", "test_files")
  const exts = [".txt"]
  const targetFile = "test/test_files/nonexistent.txt"

  const bundlee = new Bundlee()
  const bundle = await bundlee.bundle(basePath, path, exts)

  await Deno.writeTextFile(join("./test", "test_bundle.json"), JSON.stringify(bundle))
  const loadedBundlee = await Bundlee.load(join("./test", "test_bundle.json"))

  const exists = loadedBundlee.has(targetFile)
  assertEquals(exists, false)

  await Deno.remove(join("./test", "test_bundle.json"))
})

Deno.test("importLocal loads bundle correctly", async () => {
  const basePath = Deno.cwd()
  const path = join("test", "test_files")
  const exts = [".txt"]
  const targetFile = "test/test_files/test1.txt"

  const bundlee = new Bundlee()
  const bundle = await bundlee.bundle(basePath, path, exts)

  await Deno.writeTextFile(join("./test", "test_bundle.json"), JSON.stringify(bundle))

  const loadedBundlee = new Bundlee()
  await loadedBundlee.import(join("./test", "test_bundle.json"), "local")

  const exists = loadedBundlee.has(targetFile)
  assertEquals(exists, true)

  await Deno.remove(join("./test", "test_bundle.json"))
})
/*
Deno.test("importRemote loads bundle correctly", async () => {
  const YOUR_SERVER_URL = "https://url.needed.here/test_bundle.json"
  const targetFile = "test/test_files/test1.txt"

  const loadedBundlee = new Bundlee()
  await loadedBundlee.import(YOUR_SERVER_URL, "fetch")

  const exists = loadedBundlee.has(targetFile)
  assertEquals(exists, true)
})
*/

Deno.test("metadata includes createTime and contentType", async () => {
  const basePath = Deno.cwd()
  const path = join("test", "test_files")
  const exts = [".txt"]
  const bundleFile = join("./test", "test_bundle.json")
  const targetFile = "test/test_files/test1.txt"

  const bundlee = new Bundlee()
  const bundle = await bundlee.bundle(basePath, path, exts)
  await Deno.writeTextFile(bundleFile, JSON.stringify(bundle))

  const loadedBundlee = await Bundlee.load("./" + bundleFile)

  const metadata = await loadedBundlee.get(targetFile)
  const fileContent = metadata.content
  const contentType = metadata.contentType
  const lastModified = metadata.lastModified

  const originalContent = await Deno.readTextFile(join(basePath, targetFile))
  const originalStat = await Deno.stat(join(basePath, targetFile))

  assertEquals(fileContent, originalContent)
  assertEquals(contentType, "text/plain; charset=UTF-8")
  assertEquals(lastModified, originalStat.mtime?.getTime() || 0)

  await Deno.remove(bundleFile)
})

Deno.test("restoreFilesFromBundle", async () => {
  const basePath = Deno.cwd()
  const path = join("test", "test_files")
  const exts = [".txt"]
  const bundleFile = join("test", "test_files", "test_bundle.json")
  const outputDir = join("test", "test_output")

  const bundlee = new Bundlee()
  const bundle = await bundlee.bundle(basePath, path, exts)
  await Deno.writeTextFile(bundleFile, JSON.stringify(bundle))

  const loadedBundlee = await Bundlee.load("./" + bundleFile)
  await loadedBundlee.restore(outputDir)

  const restoredFileContent1 = await Deno.readTextFile(join(outputDir, "test", "test_files", "test1.txt"))
  const originalContent1 = await Deno.readTextFile(join(basePath, "test", "test_files", "test1.txt"))
  assertEquals(restoredFileContent1, originalContent1)

  const restoredFileContent2 = await Deno.readTextFile(join(outputDir, "test", "test_files", "test2.txt"))
  const originalContent2 = await Deno.readTextFile(join(basePath, "test", "test_files", "test2.txt"))
  assertEquals(restoredFileContent2, originalContent2)

  const restoredFileContent3 = await Deno.readTextFile(join(outputDir, "test", "test_files", "test3.txt"))
  const originalContent3 = await Deno.readTextFile(join(basePath, "test", "test_files", "test3.txt"))
  assertEquals(restoredFileContent3, originalContent3)

  await Deno.remove(outputDir, { recursive: true })
  await Deno.remove(bundleFile)
})
