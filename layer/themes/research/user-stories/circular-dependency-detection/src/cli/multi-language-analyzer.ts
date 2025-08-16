/**
 * Multi-language analyzer that coordinates different language analyzers
 */

import { TypeScriptAnalyzer } from '../typescript/ts-analyzer';
import { CppAnalyzer } from '../cpp/cpp-analyzer';
import { PythonAnalyzer } from '../python/python-analyzer';
import { LanguageAnalyzer, AnalysisResult, AnalysisOptions, ConfigurationFile } from '../core/types';

export class MultiLanguageAnalyzer {
  private analyzers: Map<string, LanguageAnalyzer>;
  private config?: ConfigurationFile;

  constructor(config?: ConfigurationFile) {
    this.config = config;
    this.analyzers = new Map() as Map<string, LanguageAnalyzer>;
    this.analyzers.set("typescript", new TypeScriptAnalyzer());
    this.analyzers.set('cpp', new CppAnalyzer());
    this.analyzers.set('python', new PythonAnalyzer());
  }

  /**
   * Analyze a codebase using multiple language analyzers
   */
  async analyzeMultiLanguage(
    rootPath: string,
    languages: string[],
    globalOptions: AnalysisOptions = {}
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    // Validate requested languages
    const availableLanguages = Array.from(this.analyzers.keys());
    const invalidLanguages = languages.filter(lang => !availableLanguages.includes(lang));
    
    if (invalidLanguages.length > 0) {
      throw new Error(`Unsupported languages: ${invalidLanguages.join(', ')}. Available: ${availableLanguages.join(', ')}`);
    }

    // Run analysis for each language
    const analysisPromises = languages.map(async (language) => {
      const analyzer = this.analyzers.get(language);
      if (!analyzer) {
        return {
          success: false,
          language,
          total_files: 0,
          total_dependencies: 0,
          circular_dependencies: [],
          analysis_time_ms: 0,
          errors: [`Analyzer not found for language: ${language}`],
          warnings: []
        };
      }

      // Merge global options with language-specific config
      const languageOptions = this.mergeOptions(globalOptions, language);

      // Validate options
      if (!analyzer.validateOptions(languageOptions)) {
        return {
          success: false,
          language,
          total_files: 0,
          total_dependencies: 0,
          circular_dependencies: [],
          analysis_time_ms: 0,
          errors: [`Invalid options for ${language} analyzer`],
          warnings: []
        };
      }

      try {
        return await analyzer.analyze(rootPath, languageOptions);
      } catch (error) {
        return {
          success: false,
          language,
          total_files: 0,
          total_dependencies: 0,
          circular_dependencies: [],
          analysis_time_ms: 0,
          errors: [`Analysis failed: ${error instanceof Error ? error.message : String(error)}`],
          warnings: []
        };
      }
    });

    // Wait for all analyses to complete
    const analysisResults = await Promise.allSettled(analysisPromises);

    // Process results
    for (let i = 0; i < analysisResults.length; i++) {
      const result = analysisResults[i];
      const language = languages[i];

      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          language,
          total_files: 0,
          total_dependencies: 0,
          circular_dependencies: [],
          analysis_time_ms: 0,
          errors: [`Analysis failed with error: ${result.reason}`],
          warnings: []
        });
      }
    }

    return results;
  }

  /**
   * Get statistics about available analyzers
   */
  getAnalyzerInfo(): Record<string, { name: string; extensions: string[] }> {
    const info: Record<string, { name: string; extensions: string[] }> = {};

    for (const [key, analyzer] of this.analyzers) {
      info[key] = {
        name: analyzer.getName(),
        extensions: analyzer.getSupportedExtensions()
      };
    }

    return info;
  }

  /**
   * Check if a language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.analyzers.has(language.toLowerCase());
  }

  /**
   * Add a custom analyzer
   */
  addAnalyzer(language: string, analyzer: LanguageAnalyzer): void {
    this.analyzers.set(language.toLowerCase(), analyzer);
  }

  /**
   * Remove an analyzer
   */
  removeAnalyzer(language: string): void {
    this.analyzers.delete(language.toLowerCase());
  }

  private mergeOptions(globalOptions: AnalysisOptions, language: string): AnalysisOptions {
    const languageConfig = this.config?.languages?.[language as keyof typeof this.config.languages];
    
    return {
      // Start with global config defaults
      ...this.config?.global,
      // Override with language-specific config
      ...languageConfig,
      // Override with runtime global options
      ...globalOptions,
      // Ensure some properties are properly merged rather than replaced
      include_patterns: [
        ...(this.config?.global?.include_patterns || []),
        ...(languageConfig?.include_patterns || []),
        ...(globalOptions.include_patterns || [])
      ].filter((pattern, index, array) => array.indexOf(pattern) === index), // Remove duplicates

      exclude_patterns: [
        ...(this.config?.global?.exclude_patterns || []),
        ...(languageConfig?.exclude_patterns || []),
        ...(globalOptions.exclude_patterns || [])
      ].filter((pattern, index, array) => array.indexOf(pattern) === index) // Remove duplicates
    };
  }
}