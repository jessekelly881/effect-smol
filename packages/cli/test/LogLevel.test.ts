import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import * as NodePath from "@effect/platform-node/NodePath"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Logger from "effect/logging/Logger"
import * as Layer from "effect/services/Layer"
import * as Command from "../src/Command.js"
import * as Flag from "../src/Flag.ts"
import * as HelpFormatter from "../src/HelpFormatter.ts"

// Create a test logger that captures log messages
const makeTestLogger = () => {
  const capturedLogs: Array<{
    message: unknown
    level: string
    timestamp: Date
  }> = []

  const testLogger = Logger.make((options) => {
    // Extract the actual message from the array wrapper
    const message = Array.isArray(options.message) && options.message.length === 1
      ? options.message[0]
      : options.message

    capturedLogs.push({
      message,
      level: options.logLevel,
      timestamp: options.date
    })
  })

  return { testLogger, capturedLogs }
}

// Create a test layer with the test logger
const makeTestLayer = (testLogger: Logger.Logger<unknown, void>) =>
  Layer.mergeAll(
    NodeFileSystem.layer,
    NodePath.layer,
    HelpFormatter.layer(HelpFormatter.defaultHelpRenderer({ colors: false })),
    Logger.layer([testLogger])
  )

describe("LogLevel", () => {
  // All possible logs in severity order
  const allLogs = [
    { level: "Fatal", message: "fatal" },
    { level: "Error", message: "error" },
    { level: "Warn", message: "warn" },
    { level: "Info", message: "info" },
    { level: "Debug", message: "debug" },
    { level: "Info", message: "trace" } // Effect.log() creates Info level
  ]

  // Log level severity order (higher index = less severe)
  const severityOrder = ["Fatal", "Error", "Warn", "Info", "Debug", "Trace"]

  // Filter logs based on minimum level
  const filterLogs = (minLevel: string) => {
    if (minLevel === "none") return []
    if (minLevel === "all") return allLogs.slice().reverse()

    const minSeverity = severityOrder.indexOf(
      minLevel === "warning" ? "Warn" : minLevel.charAt(0).toUpperCase() + minLevel.slice(1)
    )
    return allLogs
      .filter((log) => severityOrder.indexOf(log.level) <= minSeverity)
      .reverse()
  }

  // Test helper that logs at all levels and returns captured logs
  const testLogLevels = (logLevel?: string) =>
    Effect.gen(function*() {
      const { capturedLogs, testLogger } = makeTestLogger()
      const TestLayer = makeTestLayer(testLogger)

      const testCommand = Command.make("test", {}, () =>
        Effect.gen(function*() {
          // Log at all levels to test filtering
          yield* Effect.log("trace") // Info level by default
          yield* Effect.logDebug("debug")
          yield* Effect.logInfo("info")
          yield* Effect.logWarning("warn")
          yield* Effect.logError("error")
          yield* Effect.logFatal("fatal")
        }))

      const runCommand = Command.run(testCommand, { name: "test", version: "1.0.0" })
      const args = logLevel ? ["--log-level", logLevel] : []

      yield* runCommand(args).pipe(Effect.provide(TestLayer))

      return capturedLogs.map((log) => ({
        level: log.level,
        message: log.message
      }))
    })

  // Test cases
  const testCases = [
    "all",
    "trace",
    "debug",
    "info",
    "warn",
    "warning",
    "error",
    "fatal",
    "none"
  ]

  testCases.forEach((level) => {
    const testName = level === "warning"
      ? "should support log level alias 'warning' for 'warn'"
      : `should filter logs correctly with --log-level=${level}`

    it.effect(testName, () =>
      Effect.gen(function*() {
        const logs = yield* testLogLevels(level)
        assert.deepStrictEqual(logs, filterLogs(level))
      }))
  })

  it.effect("should use default log level when --log-level is not provided", () =>
    Effect.gen(function*() {
      const logs = yield* testLogLevels()
      // Default minimum log level filters out Debug but keeps Info and above
      const expected = allLogs.filter((log) => log.message !== "debug").reverse()
      assert.deepStrictEqual(logs, expected)
    }))

  it.effect("should apply log level to subcommands", () =>
    Effect.gen(function*() {
      const { capturedLogs, testLogger } = makeTestLogger()
      const TestLayer = makeTestLayer(testLogger)

      const parentCommand = Command.make("parent", {
        verbose: Flag.boolean("verbose")
      })

      const childCommand = Command.make("child", {}, () =>
        Effect.gen(function*() {
          yield* Effect.logDebug("debug from child")
          yield* Effect.logInfo("info from child")
          yield* Effect.logError("error from child")
        }))

      const combined = parentCommand.pipe(Command.withSubcommands(childCommand))
      const runCommand = Command.run(combined, { name: "test", version: "1.0.0" })

      yield* runCommand(["--log-level", "info", "child"]).pipe(Effect.provide(TestLayer))

      assert.deepStrictEqual(
        capturedLogs.map((l) => ({ level: l.level, message: l.message })),
        [
          { level: "Info", message: "info from child" },
          { level: "Error", message: "error from child" }
        ]
      )
    }))

  it.effect("should fail with InvalidValue for invalid log levels", () =>
    Effect.gen(function*() {
      const { capturedLogs, testLogger } = makeTestLogger()
      const TestLayer = makeTestLayer(testLogger)

      const testCommand = Command.make("test", {}, () => Effect.logInfo("Should not see this"))

      const runCommand = Command.run(testCommand, { name: "test", version: "1.0.0" })

      const result = yield* Effect.flip(
        runCommand(["--log-level", "invalid"]).pipe(Effect.provide(TestLayer))
      )

      assert.strictEqual(result._tag, "InvalidValue")
      if (result._tag === "InvalidValue") {
        assert.strictEqual(result.option, "log-level")
        assert.strictEqual(result.value, "invalid")
      }
      assert.strictEqual(capturedLogs.length, 0)
    }))
})
