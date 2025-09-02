import * as Option from "../../../../src/data/Option.js"
import * as Effect from "../../../../src/Effect.js"
import * as Argument from "../../../../src/unstable/cli/Argument.js"
import * as Command from "../../../../src/unstable/cli/Command.js"
import * as Flag from "../../../../src/unstable/cli/Flag.js"
import type { TestActions } from "./TestActions.js"
import { logAction } from "./TestActions.js"

/**
 * A comprehensive CLI tool demonstrating all features.
 * Used across multiple test files to ensure consistent behavior.
 */
export const comprehensiveCli = (() => {
  // Deeply nested admin commands
  const usersList = Command.make("list", {
    // Optional option with default
    format: Flag.string("format").pipe(
      Flag.withDescription("Output format (json, table, csv)"),
      Flag.withDefault("table")
    ),
    // Boolean flag
    active: Flag.boolean("active").pipe(
      Flag.withDescription("Show only active users")
    ),
    // Option with both short and long aliases
    verbose: Flag.boolean("verbose").pipe(
      Flag.withAlias("v"),
      Flag.withDescription("Show detailed information")
    )
  }, (config) =>
    logAction("users list", {
      format: config.format,
      active: config.active,
      verbose: config.verbose
    })).pipe(
      Command.withDescription("List all users in the system")
    )

  const usersCreate = Command.make("create", {
    // Required positional argument
    username: Argument.string("username").pipe(
      Argument.withDescription("Username for the new user")
    ),
    // Optional positional argument
    email: Argument.string("email").pipe(
      Argument.withDescription("Email address (optional)"),
      Argument.optional
    ),
    // Required option
    role: Flag.string("role").pipe(
      Flag.withDescription("User role (admin, user, guest)")
    ),
    // Boolean with explicit value support
    notify: Flag.boolean("notify").pipe(
      Flag.withAlias("n"),
      Flag.withDescription("Send notification email")
    )
  }, (config) =>
    logAction("users create", {
      username: config.username,
      email: config.email,
      role: config.role,
      notify: config.notify
    })).pipe(
      Command.withDescription("Create a new user account")
    )

  const users = Command.make("users").pipe(
    Command.withDescription("User management commands"),
    Command.withSubcommands(usersList, usersCreate)
  )

  const configSet = Command.make("set", {
    // Variadic positional arguments
    pairs: Argument.string("key=value").pipe(
      Argument.withDescription("Configuration key-value pairs"),
      Argument.variadic({ min: 1 })
    ),
    // File path option
    file: Flag.file("config-file").pipe(
      Flag.withAlias("f"),
      Flag.withDescription("Write to specific config file"),
      Flag.optional
    )
  }, (config) =>
    logAction("config set", {
      pairs: config.pairs,
      file: config.file
    })).pipe(
      Command.withDescription("Set configuration values")
    )

  const configGet = Command.make("get", {
    // Single required positional
    key: Argument.string("key").pipe(
      Argument.withDescription("Configuration key to retrieve")
    ),
    // Options with different types
    source: Flag.string("source").pipe(
      Flag.withDescription("Configuration source (local, global, system)"),
      Flag.withDefault("local")
    )
  }, (config) =>
    logAction("config get", {
      key: config.key,
      source: config.source
    })).pipe(
      Command.withDescription("Get configuration value")
    )

  const config = Command.make("config", {
    // Parent command options
    profile: Flag.string("profile").pipe(
      Flag.withAlias("p"),
      Flag.withDescription("Configuration profile to use"),
      Flag.optional
    )
  }).pipe(
    Command.withDescription("Manage application configuration"),
    Command.withSubcommands(configSet, configGet)
  )

  const admin = Command.make("admin", {
    // Boolean that can be set to false explicitly
    sudo: Flag.boolean("sudo").pipe(
      Flag.withDescription("Run with elevated privileges")
    )
  }).pipe(
    Command.withDescription("Administrative commands"),
    Command.withSubcommands(users, config)
  )

  // File operations commands
  const copy = Command.make("copy", {
    // Multiple required positional arguments (do not require actual filesystem presence in tests)
    source: Argument.file("source", { mustExist: false }).pipe(
      Argument.withDescription("Source file or directory")
    ),
    destination: Argument.file("destination", { mustExist: false }).pipe(
      Argument.withDescription("Destination path")
    ),
    // Boolean flags with short aliases
    recursive: Flag.boolean("recursive").pipe(
      Flag.withAlias("r"),
      Flag.withDescription("Copy directories recursively")
    ),
    force: Flag.boolean("force").pipe(
      Flag.withAlias("f"),
      Flag.withDescription("Overwrite existing files")
    ),
    // Integer option
    buffer: Flag.integer("buffer-size").pipe(
      Flag.withDescription("Buffer size in KB"),
      Flag.withDefault(64)
    )
  }, (config) =>
    logAction("copy", {
      source: config.source,
      destination: config.destination,
      recursive: config.recursive,
      force: config.force,
      bufferSize: config.buffer
    })).pipe(
      Command.withDescription("Copy files or directories")
    )

  const move = Command.make("move", {
    // Variadic sources with at least 2 items
    paths: Argument.string("paths").pipe(
      Argument.withDescription("Source path(s) and destination"),
      Argument.variadic({ min: 2 })
    ),
    // Options
    interactive: Flag.boolean("interactive").pipe(
      Flag.withAlias("i"),
      Flag.withDescription("Prompt before overwrite")
    )
  }, (config) =>
    logAction("move", {
      paths: config.paths,
      interactive: config.interactive
    })).pipe(
      Command.withDescription("Move or rename files")
    )

  const remove = Command.make("remove", {
    // Variadic with no upper limit
    files: Argument.string("files").pipe(
      Argument.withDescription("Files to remove"),
      Argument.variadic({ min: 1 })
    ),
    // Multiple boolean options
    recursive: Flag.boolean("recursive").pipe(
      Flag.withAlias("r"),
      Flag.withDescription("Remove directories and contents")
    ),
    force: Flag.boolean("force").pipe(
      Flag.withAlias("f"),
      Flag.withDescription("Force removal without prompts")
    ),
    verbose: Flag.boolean("verbose").pipe(
      Flag.withAlias("v"),
      Flag.withDescription("Explain what is being done")
    )
  }, (config) =>
    logAction("remove", {
      files: config.files,
      recursive: config.recursive,
      force: config.force,
      verbose: config.verbose
    })).pipe(
      Command.withDescription("Remove files or directories")
    )

  // Build command for testing option aliases
  const build = Command.make("build", {
    output: Flag.string("output").pipe(
      Flag.withAlias("o"),
      Flag.withDescription("Output directory")
    ),
    verbose: Flag.boolean("verbose").pipe(
      Flag.withAlias("v"),
      Flag.withDescription("Enable verbose output")
    ),
    configFile: Flag.string("config-file").pipe(
      Flag.withAlias("f"),
      Flag.withDescription("Configuration file path"),
      Flag.optional
    )
  }, (config) =>
    logAction("build", {
      output: config.output,
      verbose: config.verbose,
      config: Option.getOrElse(config.configFile, () => "none")
    })).pipe(
      Command.withDescription("Build the project")
    )

  // Git-style commands for testing subcommands and context sharing
  const gitClone = Command.make("clone", {
    repository: Argument.string("repository").pipe(
      Argument.withDescription("Repository URL or path")
    ),
    branch: Flag.string("branch").pipe(
      Flag.withDefault("main"),
      Flag.withDescription("Branch to clone")
    )
  }, (config) =>
    logAction("git clone", {
      repository: config.repository,
      branch: config.branch
    })).pipe(
      Command.withDescription("Clone a repository")
    )

  const gitAdd = Command.make("add", {
    files: Argument.string("files").pipe(
      Argument.withDescription("Files to add")
    ),
    update: Flag.boolean("update").pipe(
      Flag.withDescription("Update tracked files")
    )
  }, (config) =>
    logAction("git add", {
      files: config.files,
      update: config.update
    })).pipe(
      Command.withDescription("Add files to staging")
    )

  const gitStatus = Command.make("status", {
    short: Flag.boolean("short").pipe(
      Flag.withDescription("Show short format")
    )
  }, (config) =>
    logAction("git status", {
      short: config.short
    })).pipe(
      Command.withDescription("Show repository status")
    )

  const git = Command.make("git", {
    verbose: Flag.boolean("verbose").pipe(
      Flag.withDescription("Enable verbose output")
    )
  }, (config) =>
    logAction("git", {
      verbose: config.verbose
    })).pipe(
      Command.withDescription("Git version control"),
      Command.withSubcommands(gitClone, gitAdd, gitStatus)
    )

  // Commands for testing error handling
  const testRequired = Command.make("test-required", {
    required: Flag.string("required").pipe(
      Flag.withDescription("A required option for testing")
    )
  }, (config) =>
    logAction("test-required", {
      required: config.required
    })).pipe(
      Command.withDescription("Test command with required option")
    )

  const testFailing: Command.Command<
    "test-failing",
    { readonly input: string },
    string,
    TestActions
  > = Command.make("test-failing", {
    input: Flag.string("input").pipe(
      Flag.withDescription("Input that will cause handler to fail")
    )
  }, (config) =>
    Effect.gen(function*() {
      yield* logAction("test-failing", { input: config.input })
      return yield* Effect.fail("Handler error")
    })).pipe(
      Command.withDescription("Test command that always fails")
    )

  // Deploy command for testing complex nested structures
  const deployCommand = Command.make("deploy", {
    service: Argument.string("service").pipe(
      Argument.withDescription("Service to deploy")
    ),
    environment: Argument.string("environment").pipe(
      Argument.withDescription("Target environment")
    ),
    database: {
      host: Flag.string("db-host").pipe(
        Flag.withDescription("Database host")
      ),
      port: Flag.integer("db-port").pipe(
        Flag.withDescription("Database port")
      )
    },
    dryRun: Flag.boolean("dry-run").pipe(
      Flag.withDescription("Perform a dry run")
    )
  }, (config) =>
    logAction("deploy", {
      service: config.service,
      environment: config.environment,
      database: config.database,
      dryRun: config.dryRun
    })).pipe(
      Command.withDescription("Deploy a service")
    )

  const app = Command.make("app", {
    env: Flag.string("env").pipe(
      Flag.withDescription("Environment setting"),
      Flag.optional
    )
  }, (config) =>
    logAction("app", {
      env: config.env
    })).pipe(
      Command.withDescription("Application management"),
      Command.withSubcommands(deployCommand)
    )

  // Service command for nested context sharing tests
  const serviceCommand = Command.make("service", {
    name: Flag.string("name").pipe(
      Flag.withDescription("Service name")
    )
  }, (config) =>
    logAction("service", {
      name: config.name
    })).pipe(
      Command.withDescription("Service management"),
      Command.withSubcommands(deployCommand)
    )

  const appWithService = Command.make("app-nested", {
    env: Flag.string("env").pipe(
      Flag.withDescription("Environment setting")
    )
  }, (config) =>
    logAction("app-nested", {
      env: config.env
    })).pipe(
      Command.withDescription("Application with nested services"),
      Command.withSubcommands(serviceCommand)
    )

  // Main command with global options
  return Command.make("mycli", {
    // Global options available to all subcommands
    debug: Flag.boolean("debug").pipe(
      Flag.withAlias("d"),
      Flag.withDescription("Enable debug logging")
    ),
    config: Flag.file("config").pipe(
      Flag.withAlias("c"),
      Flag.withDescription("Path to configuration file"),
      Flag.optional
    ),
    quiet: Flag.boolean("quiet").pipe(
      Flag.withAlias("q"),
      Flag.withDescription("Suppress non-error output")
    )
  }, (config) =>
    logAction("mycli", {
      debug: config.debug,
      config: config.config,
      quiet: config.quiet
    })).pipe(
      Command.withDescription("A comprehensive CLI tool demonstrating all features"),
      Command.withSubcommands(admin, copy, move, remove, build, git, testRequired, testFailing, app, appWithService)
    )
})()

export const runComprehensiveCli = Command.run(comprehensiveCli, { name: "mycli", version: "1.0.0" })
