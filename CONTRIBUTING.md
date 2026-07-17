# Contributing to Aether OS

Thank you for your interest in contributing to Aether OS! This document provides guidelines and instructions for contributing.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Making Changes](#making-changes)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Submitting Changes](#submitting-changes)
8. [Reporting Issues](#reporting-issues)

---

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. We expect everyone to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

**Be Respectful**: Treat everyone with respect.
**Be Inclusive**: Welcome diverse perspectives.
**Be Constructive**: Give and receive feedback gracefully.
**Be Collaborative**: Work together toward common goals.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Git
- Rust (for Tauri development)

### Repository Structure

```
aether-os/
├── spatial-canvas/          # Main web application
│   ├── src/
│   │   ├── core/           # Core engine
│   │   ├── intelligence/    # AI components
│   │   ├── memory/          # Memory graph
│   │   ├── plugins/         # Plugin system
│   │   ├── enterprise/      # Enterprise features
│   │   ├── performance/     # Performance optimizations
│   │   ├── ai/              # Advanced AI
│   │   ├── ecosystem/        # Marketplace
│   │   └── mobile/          # Mobile support
│   ├── public/             # Static assets
│   ├── docs/                # Documentation
│   └── src-tauri/           # Tauri desktop app
```

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/Aether-OS.git
cd Aether-OS/spatial-canvas

# Add upstream remote
git remote add upstream https://github.com/antono4/Aether-OS.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 4. Run Tests

```bash
npm test
```

### 5. Build for Production

```bash
npm run build
```

---

## Making Changes

### 1. Create a Branch

```bash
# Create a new branch for your feature/fix
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Write code following our [coding standards](#coding-standards)
- Add/update tests as needed
- Update documentation if required

### 3. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature"
```

**Commit Message Format:**

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(core): add new physics simulation
fix(ai): resolve token overflow issue
docs(api): update AI Integration docs
```

### 4. Keep Your Branch Updated

```bash
# Fetch latest changes
git fetch upstream

# Rebase on main
git rebase upstream/main
```

### 5. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` type - use proper typing
- Use interfaces over type aliases for object shapes
- Export types that are used externally

```typescript
// Good
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export function getUser(id: string): Promise<UserProfile> {
  // ...
}

// Avoid
function getUser(id: any): any {
  // ...
}
```

### Naming Conventions

- **Classes**: PascalCase (`SpatialScene`, `MemoryGraph`)
- **Interfaces**: PascalCase (`NodeData`, `EdgeConnection`)
- **Methods/Functions**: camelCase (`createNode`, `searchNodes`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_NODES`, `DEFAULT_FOV`)
- **Files**: kebab-case (`spatial-scene.ts`, `memory-graph.ts`)

### Code Organization

```typescript
// File structure order
1. Imports (external, then internal)
2. Type definitions
3. Interfaces
4. Constants
5. Classes/Functions
6. Exports
```

### Documentation

- Add JSDoc comments for public methods
- Document complex algorithms
- Include usage examples for complex functions

```typescript
/**
 * Creates a new node in the memory graph.
 * 
 * @param data - Node configuration
 * @param data.type - Type of node (text, image, code, etc.)
 * @param data.content - The node's content
 * @param data.tags - Optional tags for categorization
 * @returns The created node with generated ID
 * 
 * @example
 * const node = memoryGraph.createNode({
 *   type: 'text',
 *   content: 'Hello World',
 *   tags: ['greeting']
 * });
 */
function createNode(data: NodeConfig): Node {
  // implementation
}
```

---

## Testing

### Writing Tests

- Write tests for all new features
- Include edge cases
- Test error conditions

```typescript
import { describe, it, expect } from 'vitest';

describe('MemoryGraph', () => {
  it('should create nodes with unique IDs', () => {
    const graph = new MemoryGraph(eventBus, storage);
    const node = graph.createNode({ type: 'text', content: 'test' });
    
    expect(node.id).toBeDefined();
    expect(typeof node.id).toBe('string');
  });
  
  it('should throw error for invalid node type', () => {
    const graph = new MemoryGraph(eventBus, storage);
    
    expect(() => {
      graph.createNode({ type: 'invalid' as any, content: 'test' });
    }).toThrow();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/core/MemoryGraph.test.ts

# Watch mode
npm run test:watch
```

---

## Submitting Changes

### Pull Request Process

1. **Create Pull Request** to the `main` branch
2. **Fill PR Template** with:
   - Description of changes
   - Related issue (if any)
   - Testing performed
   - Screenshots (for UI changes)

3. **Review Process**:
   - Maintainers will review your code
   - Address any feedback
   - Ensure CI passes

4. **Merge**:
   - Squash and merge for clean history
   - Delete branch after merge

### PR Template

```markdown
## Description
Brief description of your changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Fixes #(issue number)

## Testing
Describe testing performed.

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed self-review
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to documentation
- [ ] My changes generate no new warnings
- [ ] Tests pass locally
- [ ] Tests added/updated for new features
```

---

## Reporting Issues

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment (browser, OS, version)
- Error messages/logs
- Screenshots if applicable

### Feature Requests

Include:
- Clear description of the feature
- Use case / motivation
- Proposed solution (if any)
- Alternative solutions considered

---

## Questions?

- **GitHub Discussions**: For questions and discussions
- **Issues**: For bugs and feature requests
- **Discord**: For real-time chat (link in README)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Aether OS! 🚀
