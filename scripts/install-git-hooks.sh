#!/bin/bash

# Install Git hooks for File Creation API enforcement

HOOKS_DIR=".git/hooks"
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"

echo "📦 Installing Git hooks for File Creation API enforcement..."

# Check if .git directory exists
if [ ! -d ".git" ]; then
  echo "❌ Not a git repository. Please run from project root."
  exit 1
fi

# Create hooks directory if it doesn't exist
if [ ! -d "$HOOKS_DIR" ]; then
  mkdir -p "$HOOKS_DIR"
fi

# Check if pre-commit hook already exists
if [ -f "$PRE_COMMIT_HOOK" ]; then
  echo "⚠️  Pre-commit hook already exists. Creating backup..."
  cp "$PRE_COMMIT_HOOK" "$PRE_COMMIT_HOOK.backup.$(date +%Y%m%d%H%M%S)"
fi

# Create pre-commit hook
cat > "$PRE_COMMIT_HOOK" << 'EOF'
#!/bin/bash

# Pre-commit hook for File Creation API enforcement

# Run the file API check
if [ -f "scripts/pre-commit-file-api.sh" ]; then
  bash scripts/pre-commit-file-api.sh
  RESULT=$?
  
  if [ $RESULT -ne 0 ]; then
    exit $RESULT
  fi
fi

# Run other checks if needed (e.g., linting, tests)
# Add your other pre-commit checks here

exit 0
EOF

# Make hook executable
chmod +x "$PRE_COMMIT_HOOK"

echo "✅ Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will now check for direct file system access in staged files."
echo "To bypass the check (not recommended), use: git commit --no-verify"
echo ""
echo "To uninstall, run: rm $PRE_COMMIT_HOOK"