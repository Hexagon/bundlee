import { Bundlee } from "./mod.ts"
import { parse } from "https://deno.land/std/flags/mod.ts"

const VERSION = "0.9.1"
const HELP = `
bundlee - A CLI tool to generate a compressed JSON-bundle of multiple static assets

Usage:
  bundlee --path <path> <output>
  bundlee -p <path> <output>
  bundlee --help
  bundlee --version

Options:
  --path, -p <path>     The directory path to bundle.
  --help, -h            Show this help message and exit.
  --version, -v         Show version information and exit.
`

function printHelp() {
  console.log(HELP)
  Deno.exit(0)
}

function printVersion() {
  console.log(VERSION)
  Deno.exit(0)
}

function printErrorAndHelp(errorMessage: string) {
  console.error(`Error: ${errorMessage}`)
  console.log(HELP)
  Deno.exit(1)
}

async function run() {
  const args = parse(Deno.args, {
    alias: {
      help: ["h"],
      version: ["v"],
      path: ["p"],
    },
    boolean: ["help", "version"],
    string: ["path"],
  })

  if (args.help) {
    printHelp()
  }

  if (args.version) {
    printVersion()
  }

  const path = args.path
  const outputFile = args._[0] as string

  if (!path || args._.length !== 1) {
    printErrorAndHelp("Invalid arguments")
  }

  const basePath = Deno.cwd()
  const bundlee = new Bundlee()
  const bundle = await bundlee.bundle(basePath, path || "")
  await Deno.writeTextFile(outputFile, JSON.stringify(bundle))
  console.log(`Bundle generated and saved to '${outputFile}'`)
}

run()
