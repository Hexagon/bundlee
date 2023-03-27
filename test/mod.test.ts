import { Bundlee } from "../mod.ts"
import { join } from "../deps.ts"

import { assertEquals, assertRejects } from "https://deno.land/std/testing/asserts.ts"

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

  const originalContent = await Deno.readTextFile(join(basePath, targetFile))

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
