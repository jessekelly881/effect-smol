#!/usr/bin/env node

/* eslint-env node */
/* global console, process */

import { readdirSync, readFileSync, statSync, writeFileSync } from "fs"
import { join } from "path"

const EFFECT_IMPORT_REGEX = /^\s*\*?\s*import\s+{[^}]+}\s+from\s+["'](@?effect[^"']*?)["']/gm

function findTsFiles(dir) {
  const files = []

  function traverse(currentDir) {
    const entries = readdirSync(currentDir)

    for (const entry of entries) {
      const fullPath = join(currentDir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (!entry.startsWith(".") && entry !== "node_modules" && entry !== "dist" && entry !== "build") {
          traverse(fullPath)
        }
      } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
        files.push(fullPath)
      }
    }
  }

  traverse(dir)
  return files
}

function extractJSDocExamples(content) {
  const examples = []
  const jsdocBlocks = content.match(/\/\*\*[\s\S]*?\*\//g) || []

  for (const block of jsdocBlocks) {
    const exampleMatches = block.match(/@example[\s\S]*?(?=@\w+|$|\*\/)/g) || []

    for (const example of exampleMatches) {
      const codeBlocks = example.match(/```ts\n([\s\S]*?)```/g) || []
      for (const block of codeBlocks) {
        examples.push(block)
      }
    }
  }

  return examples
}

function findDuplicatedImports(codeBlock) {
  const imports = []
  let match

  // Reset regex
  EFFECT_IMPORT_REGEX.lastIndex = 0

  while ((match = EFFECT_IMPORT_REGEX.exec(codeBlock)) !== null) {
    const packageName = match[1]
    const fullImport = match[0]

    imports.push({
      packageName,
      fullImport,
      line: codeBlock.substring(0, match.index).split("\n").length
    })
  }

  // Group by package name and find duplicates
  const packageGroups = {}
  for (const imp of imports) {
    if (!packageGroups[imp.packageName]) {
      packageGroups[imp.packageName] = []
    }
    packageGroups[imp.packageName].push(imp)
  }

  const duplicates = []
  for (const [packageName, importList] of Object.entries(packageGroups)) {
    if (importList.length > 1) {
      duplicates.push({
        packageName,
        imports: importList,
        count: importList.length
      })
    }
  }

  return duplicates
}

function consolidateImports(codeBlock, duplicates) {
  let fixedCode = codeBlock

  // Process each package with duplicates
  for (const duplicate of duplicates) {
    const { imports } = duplicate

    // Extract all imported names from all imports of this package
    const allImportedNames = new Set()
    const importLines = []

    for (const imp of imports) {
      importLines.push(imp.fullImport)

      // Extract imported names - handle semicolons and whitespace variations
      const cleanImport = imp.fullImport.replace(/;?\s*$/, "")
      const importMatch = cleanImport.match(/import\s+\{([^}]+)\}/)
      if (importMatch) {
        const names = importMatch[1]
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name.length > 0)

        for (const name of names) {
          allImportedNames.add(name)
        }
      }
    }

    // Create consolidated import statement using the format of the first import
    const firstImport = importLines[0]
    const sortedNames = Array.from(allImportedNames).sort()
    const consolidatedImport = firstImport
      .replace(/;?\s*$/, "") // Remove trailing semicolon/whitespace
      .replace(/\{[^}]+\}/, `{ ${sortedNames.join(", ")} }`)

    // Remove all existing import lines for this package
    for (const line of importLines) {
      // Create flexible regex that handles whitespace variations
      const escapedLine = line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")
      const lineRegex = new RegExp(`^\\s*\\*?\\s*${escapedLine}\\s*$`, "gm")
      fixedCode = fixedCode.replace(lineRegex, "")
    }

    // Insert the consolidated import at the position of the first import
    const firstLineRegex = new RegExp(
      `^(\\s*\\*?\\s*)${importLines[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*")}\\s*$`,
      "m"
    )

    if (!fixedCode.includes(consolidatedImport)) {
      fixedCode = fixedCode.replace(firstLineRegex, `$1${consolidatedImport}`)
    }
  }

  // Clean up any empty lines that might have been left behind
  fixedCode = fixedCode.replace(/(\n\s*\*\s*\n)\s*\*\s*\n/g, "$1")

  return fixedCode
}

function analyzeFile(filePath, shouldFix = false) {
  try {
    const originalContent = readFileSync(filePath, "utf8")
    const examples = extractJSDocExamples(originalContent)
    const issues = []
    let modifiedContent = originalContent
    let hasChanges = false

    for (let i = 0; i < examples.length; i++) {
      const duplicates = findDuplicatedImports(examples[i])
      if (duplicates.length > 0) {
        issues.push({
          exampleIndex: i + 1,
          duplicates,
          codeBlock: examples[i]
        })

        if (shouldFix) {
          // Fix this example
          const fixedExample = consolidateImports(examples[i], duplicates)
          modifiedContent = modifiedContent.replace(examples[i], fixedExample)
          hasChanges = true
        }
      }
    }

    // Write back the fixed content if there were changes
    if (shouldFix && hasChanges) {
      writeFileSync(filePath, modifiedContent, "utf8")
    }

    return { issues, hasChanges }
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`)
    return { issues: [], hasChanges: false }
  }
}

function main() {
  const rootDir = process.cwd()
  const args = process.argv.slice(2)
  const shouldFix = args.includes("--fix")
  const tsFiles = findTsFiles(rootDir)

  let totalIssues = 0
  let filesWithIssues = 0
  let filesFixed = 0

  if (shouldFix) {
    console.log("🔧 Auto-fixing duplicated Effect imports in JSDoc examples...\n")
  } else {
    console.log("🔍 Searching for duplicated Effect imports in JSDoc examples...\n")
  }

  for (const filePath of tsFiles) {
    const result = analyzeFile(filePath, shouldFix)
    const { hasChanges, issues } = result

    if (issues.length > 0) {
      filesWithIssues++
      if (hasChanges) {
        filesFixed++
      }

      const relativePath = filePath.replace(rootDir + "/", "")

      if (shouldFix) {
        console.log(`${hasChanges ? "✅" : "⚠️"} ${relativePath}${hasChanges ? " (FIXED)" : " (SKIPPED)"}`)
      } else {
        console.log(`📁 ${relativePath}`)
      }

      if (!shouldFix) {
        for (const issue of issues) {
          totalIssues++
          console.log(`  └─ Example #${issue.exampleIndex}:`)

          for (const duplicate of issue.duplicates) {
            console.log(`     🔸 Package "${duplicate.packageName}" imported ${duplicate.count} times:`)
            for (const imp of duplicate.imports) {
              console.log(`       • Line ${imp.line}: ${imp.fullImport}`)
            }
          }

          // Show a preview of the problematic code block
          const preview = issue.codeBlock
            .replace(/```ts\n/, "")
            .replace(/```$/, "")
            .split("\n")
            .slice(0, 10)
            .map((line) => `       ${line}`)
            .join("\n")

          console.log(`     Code preview:`)
          console.log(preview)
          if (issue.codeBlock.split("\n").length > 10) {
            console.log(`       ...`)
          }
          console.log("")
        }
        console.log("")
      } else {
        // In fix mode, just count the issues
        totalIssues += issues.length
      }
    }
  }

  if (totalIssues === 0) {
    console.log("✅ No duplicated Effect imports found in JSDoc examples!")
  } else if (shouldFix) {
    console.log(`\n🔧 Auto-fix Summary:`)
    console.log(`   • Files with issues: ${filesWithIssues}`)
    console.log(`   • Files successfully fixed: ${filesFixed}`)
    console.log(`   • Total duplicated import issues fixed: ${totalIssues}`)
    console.log(`\n💡 Run the script again without --fix to verify the fixes.`)
  } else {
    console.log(`📊 Summary:`)
    console.log(`   • Files with issues: ${filesWithIssues}`)
    console.log(`   • Total duplicated import issues: ${totalIssues}`)
    console.log(`\n💡 Tips:`)
    console.log(`   • Run with --fix to automatically consolidate imports`)
    console.log(`   • Example: import { Effect, Metric, Schedule } from "effect"`)
  }
}

main()
