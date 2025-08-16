/**
 * Visualization generator for dependency graphs
 */

import * as fs from 'fs-extra';
import { execSync } from 'child_process';
import { DependencyGraph } from '../core/dependency-graph';
import { AnalysisResult } from '../core/types';

export class VisualizationGenerator {
  
  /**
   * Generate visualization from analysis results
   */
  async generateVisualization(results: AnalysisResult[], outputPath: string): Promise<void> {
    // Build a combined dependency graph from all results
    const combinedGraph = new DependencyGraph();

    for(const result of results) {
      if(result.success && result.circular_dependencies.length > 0) {
        // Add nodes and edges for circular dependencies
        for(const cycle of result.circular_dependencies) {
          // Add nodes for each file in the cycle
          for(const filePath of cycle.affected_files) {
            try {
              combinedGraph.addNode({
                id: filePath,
                path: filePath,
                type: 'file',
                language: result.language as any,
                metadata: {
                  in_cycle: true,
                  cycle_count: cycle.cycle.length
                }
              });
            } catch (error) {
              // Node might already exist
            }
          }

          // Add edges for the cycle
          for(let i = 0; i < cycle.cycle.length; i++) {
            const from = cycle.cycle[i];
            const to = cycle.cycle[(i + 1) % cycle.cycle.length];
            
            try {
              combinedGraph.addEdge({
                from,
                to,
                type: cycle.type as any,
                metadata: {
                  in_cycle: true,
                  severity: cycle.severity
                }
              });
            } catch (error) {
              // Edge might reference non-existent nodes
            }
          }
        }
      }
    }

    // Generate DOT representation
    const dotContent = combinedGraph.toDot(true);
    
    // Determine output format from file extension
    const extension = outputPath.split('.').pop()?.toLowerCase() || 'svg';
    
    await this.generateFromDot(dotContent, outputPath, extension);
  }

  /**
   * Generate specific format from DOT content
   */
  private async generateFromDot(dotContent: string, outputPath: string, format: string): Promise<void> {
    // Try to use Graphviz if available
    const hasGraphviz = this.checkGraphvizInstallation();
    
    if(hasGraphviz) {
      await this.generateWithGraphviz(dotContent, outputPath, format);
    } else {
      // Fallback: save as DOT file and provide instructions
      const dotPath = outputPath.replace(/\.[^.]+$/, '.dot');
      await fileAPI.createFile(dotPath, dotContent, { type: FileType.DOCUMENT });
      
      console.warn(`Graphviz not found. DOT file saved to: ${dotPath}`);
      console.warn('To generate visualization, install Graphviz and run:');
      console.warn(`  dot -T${format} "${dotPath}" -o "${outputPath}"`);
    }
  }

  /**
   * Generate visualization using Graphviz
   */
  private async generateWithGraphviz(dotContent: string, outputPath: string, format: string): Promise<void> {
    // Create temporary DOT file
    const tempDotPath = `/tmp/circular-deps-${Date.now()}.dot`;
    
    try {
      await fileAPI.createFile(tempDotPath, dotContent, { type: FileType.DOCUMENT });
      
      // Run Graphviz
      const command = `dot -T${format} "${tempDotPath}" -o "${outputPath}"`;
      execSync(command);
      
      // Clean up temporary file
      await fs.remove(tempDotPath);
      
    } catch (error) {
      // Clean up on error
      if(await fs.pathExists(tempDotPath)) {
        await fs.remove(tempDotPath);
      }
      throw new Error(`Graphviz visualization generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if Graphviz is installed
   */
  private checkGraphvizInstallation(): boolean {
    try {
      execSync('dot -V', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate enhanced DOT with custom styling for circular dependencies
   */
  generateEnhancedDot(results: AnalysisResult[]): string {
    let dot = 'digraph circular_dependencies {\n';
    
    // Graph attributes
    dot += '  graph [rankdir=TB, bgcolor=white, fontname="Arial", fontsize=12];\n';
    dot += '  node [shape=box, style="rounded,filled", fontname="Arial", fontsize=10];\n';
    dot += '  edge [fontname="Arial", fontsize=8];\n\n';
    
    // Define color scheme
    const languageColors = {
      typescript: '#3178c6',
      cpp: '#00599c',
      python: '#3776ab'
    };
    
    const severityColors = {
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };

    // Add legend
    dot += '  subgraph cluster_legend {\n';
    dot += '    label="Legend";\n';
    dot += '    style="rounded,filled";\n';
    dot += '    fillcolor="#f8f9fa";\n';
    
    for (const [lang, color] of Object.entries(languageColors)) {
      dot += `    legend_${lang} [label="${lang.toUpperCase()}", fillcolor="${color}", fontcolor="white"];\n`;
    }
    
    dot += '  }\n\n';

    // Process each language result
    for(const result of results) {
      if(!result.success || result.circular_dependencies.length === 0) continue;
      
      const langColor = languageColors[result.language as keyof typeof languageColors] || '#6c757d';
      
      // Create subgraph for each language
      dot += `  subgraph cluster_${result.language} {\n`;
      dot += `    label="${result.language.toUpperCase()} Circular Dependencies";\n`;
      dot += '    style="rounded,filled";\n';
      dot += `    fillcolor="${langColor}20";\n`;
      dot += `    color="${langColor}";\n\n`;
      
      // Add nodes and cycles for this language
      const processedNodes = new Set<string>();
      
      for (let cycleIndex = 0; cycleIndex < result.circular_dependencies.length; cycleIndex++) {
        const cycle = result.circular_dependencies[cycleIndex];
        const severityColor = severityColors[cycle.severity];
        
        // Add nodes in this cycle
        for(const nodeId of cycle.cycle) {
          if (!processedNodes.has(nodeId)) {
            const nodeName = this.sanitizeNodeName(nodeId);
            const displayName = this.getDisplayName(nodeId);
            
            dot += `    "${nodeName}" [label="${displayName}", fillcolor="${severityColor}", `;
            dot += `tooltip="${cycle.description}\\nSeverity: ${cycle.severity}\\nType: ${cycle.type}"];\n`;
            
            processedNodes.add(nodeId);
          }
        }
        
        // Add edges for this cycle
        for(let i = 0; i < cycle.cycle.length; i++) {
          const from = this.sanitizeNodeName(cycle.cycle[i]);
          const to = this.sanitizeNodeName(cycle.cycle[(i + 1) % cycle.cycle.length]);
          
          dot += `    "${from}" -> "${to}" [color="${severityColor}", penwidth=2, `;
          dot += `label="${cycle.type}", tooltip="Part of ${cycle.description}"];\n`;
        }
        
        dot += '\n';
      }
      
      dot += '  }\n\n';
    }
    
    dot += '}\n';
    
    return dot;
  }

  /**
   * Sanitize node names for DOT format
   */
  private sanitizeNodeName(nodeName: string): string {
    return nodeName
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/__+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Get display name for a file path
   */
  private getDisplayName(filePath: string): string {
    const parts = filePath.split('/');
    const fileName = parts[parts.length - 1];
    
    // Show file name with parent directory for context
    if(parts.length > 1) {
      const parentDir = parts[parts.length - 2];
      return `${parentDir}/${fileName}`;
    }
    
    return fileName;
  }

  /**
   * Generate interactive HTML visualization
   */
  async generateInteractiveHtml(results: AnalysisResult[], outputPath: string): Promise<void> {
    const dotContent = this.generateEnhancedDot(results);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Circular Dependencies Visualization</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <script src="https://unpkg.com/@hpcc-js/wasm@0.3.11/dist/index.min.js"></script>
    <script src="https://unpkg.com/d3-graphviz@3.0.5/build/d3-graphviz.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .controls {
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .controls button {
            margin-right: 10px;
            padding: 8px 16px;
            border: none;
            background: #007bff;
            color: white;
            border-radius: 4px;
            cursor: pointer;
        }
        .controls button:hover {
            background: #0056b3;
        }
        #graph {
            width: 100%;
            height: 600px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        .info {
            margin-top: 20px;
            padding: 15px;
            background: #e9ecef;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Circular Dependencies Visualization</h1>
        
        <div class="controls">
            <button onclick="resetZoom()">Reset Zoom</button>
            <button onclick="fitToScreen()">Fit to Screen</button>
            <button onclick="downloadSVG()">Download SVG</button>
        </div>
        
        <div id="graph"></div>
        
        <div class="info">
            <h3>How to read this visualization:</h3>
            <ul>
                <li><strong>Nodes</strong> represent files/modules in your codebase</li>
                <li><strong>Colors</strong> indicate the language (Blue: TypeScript, Green: C++, Orange: Python)</li>
                <li><strong>Red edges</strong> indicate error-level circular dependencies</li>
                <li><strong>Yellow edges</strong> indicate warning-level circular dependencies</li>
                <li><strong>Click and drag</strong> to pan, use mouse wheel to zoom</li>
            </ul>
        </div>
    </div>

    <script>
        const dotString = \`${dotContent}\`;
        
        const graphviz = d3.select("#graph").graphviz()
            .transition(d3.transition().duration(750))
            .renderDot(dotString);
            
        async function resetZoom() {
            graphviz.resetZoom();
        }
        
        async function fitToScreen() {
            graphviz.fit();
        }
        
        async function downloadSVG() {
            const svgElement = document.querySelector('#graph svg');
            if (svgElement) {
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(svgElement);
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'circular-dependencies.svg';
                a.click();
                URL.revokeObjectURL(url);
            }
        }
    </script>
</body>
</html>`;
    
    await fileAPI.createFile(outputPath, html.trim(, { type: FileType.DOCUMENT }));
  }
}