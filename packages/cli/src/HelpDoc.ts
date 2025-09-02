/**
 * @since 4.0.0
 */

/**
 * Structured representation of help documentation for a command.
 * This data structure is independent of formatting, allowing for
 * different output formats (text, markdown, JSON, etc.).
 *
 * @since 4.0.0
 * @category models
 */
export interface HelpDoc {
  /**
   * Brief description of what the command does
   */
  readonly description: string

  /**
   * Usage syntax showing how to invoke the command
   * Example: "myapp deploy [flags]"
   */
  readonly usage: string

  /**
   * List of available flags/options for this command
   */
  readonly flags: ReadonlyArray<FlagDoc>

  /**
   * List of positional arguments for this command
   */
  readonly args?: ReadonlyArray<ArgDoc>

  /**
   * Optional list of subcommands if this is a parent command
   */
  readonly subcommands?: ReadonlyArray<SubcommandDoc>
}

/**
 * Documentation for a single command-line flag/option
 *
 * @since 4.0.0
 * @category models
 */
export interface FlagDoc {
  /**
   * Primary name of the flag (e.g., "verbose")
   */
  readonly name: string

  /**
   * Alternative names/aliases for the flag (e.g., ["-v"])
   */
  readonly aliases: ReadonlyArray<string>

  /**
   * Type of the flag value (e.g., "string", "boolean", "integer")
   */
  readonly type: string

  /**
   * Description of what the flag does
   */
  readonly description: string

  /**
   * Whether this flag is required
   */
  readonly required: boolean
}

/**
 * Documentation for a subcommand
 *
 * @since 4.0.0
 * @category models
 */
export interface SubcommandDoc {
  /**
   * Name of the subcommand
   */
  readonly name: string

  /**
   * Brief description of what the subcommand does
   */
  readonly description: string
}

/**
 * Documentation for a positional argument
 *
 * @since 4.0.0
 * @category models
 */
export interface ArgDoc {
  /**
   * Name of the argument (e.g., "source", "destination")
   */
  readonly name: string

  /**
   * Type of the argument value (e.g., "string", "file", "directory")
   */
  readonly type: string

  /**
   * Description of what the argument is for
   */
  readonly description: string

  /**
   * Whether this argument is required or optional
   */
  readonly required: boolean

  /**
   * Whether this argument is variadic (accepts multiple values)
   */
  readonly variadic: boolean
}
