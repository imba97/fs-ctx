export interface FSContextOptions<T = any> {
  /**
   * Temporary file directory
   */
  tempDir?: string

  /**
   * Whether to automatically clean up the temp file on dispose
   */
  cleanup?: boolean

  /**
   * Initial data for the context
   */
  data?: T
}
