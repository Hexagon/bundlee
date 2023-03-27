import { Bundlee } from "./mod.ts"
import { parse } from "https://deno.land/std/flags/mod.ts"

const VERSION = "1.0.0"
const HELP = `
bundlee - A CLI tool to generate a compressed JSON-bundle of multiple static assets

Usage:
  bundlee --path <path> <output>
  bundlee --help
  bundlee --version

Options:
  --path <path>         The directory path to bundle.
  --help                Show this help message and exit.
  --version             Show version information and exit.
`

const args = parse(Deno.args)

if (args.help) {
  console.log(HELP)
  Deno.exit(0)
}

if (args.version) {
  console.log(VERSION)
  Deno.exit(0)
}

if (!args.path || args._.length !== 1) {
  console.error("Error: Invalid arguments")
  console.log(HELP)
  Deno.exit(1)
}

const basePath = Deno.cwd()
const path = args.path
const outputFile = args._[0] as string
;(async () => {
  const bundlee = new Bundlee()
  const bundle = await bundlee.bundle(basePath, path)
  await Deno.writeTextFile(outputFile, JSON.stringify(bundle))
  console.log(`Bundle generated and saved to '${outputFile}'`)
})()
