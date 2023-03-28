import { Bundlee } from "./mod.ts"
import { join, parseFlags } from "./deps.ts"

const VERSION = "0.9.6"
const HELP = `
bundlee - A CLI tool to generate a compressed JSON-bundle of multiple static assets and restore them

Usage:
  bundlee --bundle <target_path> <output_bundle_file>
  bundlee -b <target_path> <output_bundle_file>
  bundlee --restore <bundle_file> <target_path>
  bundlee -r <bundle_file> <target_path>
  bundlee --help
  bundlee --version

Options:
  --bundle, -b <path>   Bundle files from the specified path.
  --restore, -r <path>  Restore a bundle to the filesystem.
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
  const args = parseFlags(Deno.args, {
    alias: {
      help: ["h"],
      version: ["v"],
      restore: ["r"],
      bundle: ["b"],
    },
    boolean: ["help", "version"],
    string: ["bundle", "restore"],
  })

  if (args.help) {
    printHelp()
  }

  if (args.version) {
    printVersion()
  }

  if (!args.bundle && !args.restore) {
    console.error("No action specified, provide either --bundle or --restore.")
    Deno.exit(1)
  }

  const path = args.bundle || args.restore
  const outputFile = args._[0] as string
  const basePath = Deno.cwd()
  const bundlee = new Bundlee()

  if (args.bundle && path && outputFile) {
    const bundle = await bundlee.bundle(basePath, path)
    await Deno.writeTextFile(outputFile, JSON.stringify(bundle))
    console.log(`Bundle generated and saved to '${outputFile}'`)
  } else if (args.restore && path) {
    await bundlee.importLocal(path)
    await bundlee.restore(join(Deno.cwd(), outputFile || ""))
    console.log(`Bundle restored to ${outputFile || "current directory."}`)
  } else {
    printErrorAndHelp("Invalid arguments")
  }
}

run()
