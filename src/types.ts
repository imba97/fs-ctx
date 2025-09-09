export interface FSContextOptions {
  /**
   * Temporary file directory
   */
  tempDir?: string

  /**
   * Whether to automatically clean up the temp file on dispose
   */
  cleanup?: boolean
}
