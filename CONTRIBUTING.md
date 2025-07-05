# Contributing to BLiPS

Thank you for your interest in contributing to BLiPS (Balloon Launch Prediction Software)! This document provides guidelines and information for contributors.

## 🎯 How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to see if your problem has already been reported
2. **Check the documentation** to ensure the issue isn't user error
3. **Provide detailed information** including:
   - Operating system and version
   - Browser and version (if applicable)
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Error messages or logs

### Suggesting Features

When suggesting new features:

1. **Describe the use case** - why is this feature needed?
2. **Provide examples** - how would this feature be used?
3. **Consider implementation** - is this feasible with current technology?
4. **Check existing features** - is this already possible in a different way?

## 🛠️ Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

### Local Development

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/dhhuston/blips.git
   cd blips
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

## 📝 Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper types for all functions and variables
- Avoid `any` type - use proper typing
- Use interfaces for object shapes
- Prefer `const` over `let` when possible

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Use proper prop typing with interfaces
- Implement proper error boundaries
- Use React.memo for performance optimization when needed

### Styling

- Use Tailwind CSS classes
- Follow mobile-first responsive design
- Maintain consistent spacing and typography
- Use semantic color names from the design system

### File Organization

- Keep related files together
- Use descriptive file and folder names
- Group components by feature or functionality
- Maintain clear separation between UI and business logic

## 🧪 Testing

### Writing Tests

- Write tests for new features
- Test both success and error cases
- Use descriptive test names
- Mock external dependencies appropriately

### Running Tests

```bash
npm test
```

## 📦 Pull Request Process

### Before Submitting

1. **Ensure code quality**:
   - Run linting: `npm run lint`
   - Fix any TypeScript errors
   - Test your changes thoroughly

2. **Update documentation**:
   - Update README if needed
   - Add JSDoc comments for new functions
   - Update type definitions

3. **Commit guidelines**:
   - Use conventional commit messages
   - Keep commits focused and atomic
   - Reference issues in commit messages

### Pull Request Template

When creating a PR, please include:

- **Description**: What does this PR do?
- **Type of change**: Bug fix, feature, documentation, etc.
- **Testing**: How was this tested?
- **Screenshots**: If UI changes are involved
- **Checklist**: Confirm all requirements are met

### Review Process

- All PRs require at least one review
- Address review comments promptly
- Keep discussions focused and constructive
- Be open to feedback and suggestions

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped appropriately
- [ ] Release notes prepared

## 🤝 Community Guidelines

### Communication

- Be respectful and inclusive
- Use clear, constructive language
- Assume good intentions
- Help others learn and grow

### Code of Conduct

- Treat everyone with respect
- No harassment or discrimination
- Be inclusive and welcoming
- Focus on the code, not the person

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 🆘 Getting Help

If you need help:

1. **Check the documentation** first
2. **Search existing issues** for similar problems
3. **Ask in discussions** for general questions
4. **Create an issue** for bugs or feature requests

Thank you for contributing to BLiPS! 🎈 