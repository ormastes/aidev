# Know-How: Lessons Learned from Development

This document captures lessons learned and best practices discovered during development.

## Testing

### Test Interface Design
- **Learning**: When creating interfaces, consider testing requirements upfront
- **Example**: Make methods public if they need unit testing (e.g., `mapPythonLevel` in PythonLogParser)
- **Best Practice**: Design interfaces with both production use and testing in mind

### Coverage-Driven Development
- **Learning**: Address coverage gaps immediately after each test level
- **Example**: JSON parsing branch coverage revealed untested edge cases
- **Best Practice**: Run coverage after unit, integration, and system tests separately

### Mock Management
- **Learning**: Complex mocks require careful setup and maintenance
- **Example**: ProcessManager mock needed activeProcesses Set and proper method signatures
- **Best Practice**: Create factory functions for complex mocks, verify interface contracts

## Architecture

### Parser Extension Pattern
- **Learning**: Extend parsers through composition with fallback chains
- **Example**: PythonExternalLogLib extends ExternalLogLib with fallback to parent parser
- **Best Practice**: Always provide fallback mechanisms for unrecognized formats

### Process Integration
- **Learning**: Carefully design integration points between components
- **Example**: Avoid duplicate process spawning when integrating LogCaptureSession with ProcessManager
- **Best Practice**: Clearly define component responsibilities and ownership

## Implementation

### Regex Pattern Design
- **Learning**: Make regex patterns specific enough to avoid false matches
- **Example**: Python logging format regex includes logger name pattern to avoid matching similar text
- **Best Practice**: Test regex patterns with both valid and invalid inputs

### Error Handling
- **Learning**: Handle malformed input gracefully with sensible defaults
- **Example**: Invalid JSON falls back to plain text parsing
- **Best Practice**: Never throw exceptions for invalid input in parsers

## Development Workflow

### Directory Structure
- **Learning**: Keep documentation synchronized with project structure
- **Example**: TASK_QUEUE.vf.json referencing outdated `40.docs/` path
- **Best Practice**: Update all documentation when changing directory structure

### TDD Benefits
- **Learning**: Writing tests first reveals design issues early
- **Example**: Testing PythonLogParser revealed need for public `mapPythonLevel`
- **Best Practice**: Always write tests before implementation

## Performance Considerations

### Stream Processing
- **Learning**: Process log streams line by line for real-time output
- **Example**: LogCapturer splits buffer by newlines and processes immediately
- **Best Practice**: Don't buffer entire output before processing

### Resource Management
- **Learning**: Always clean up resources (listeners, processes)
- **Example**: Remove event listeners in capturer.stop()
- **Best Practice**: Implement proper cleanup in stop/destroy methods