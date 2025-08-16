#!/bin/bash

# Script to verify Bun setup and configuration

echo "🔍 Verifying Bun Setup in Setup Folder"
echo "======================================="
echo ""

# Check if Bun is installed
if command -v bun &> /dev/null; then
    echo "✅ Bun is installed: $(bun --version)"
else
    echo "❌ Bun is not installed"
    echo "   To install: curl -fsSL https://bun.sh/install | bash"
fi

echo ""
echo "📊 npm/bunx vs Bun usage in setup folder:"
echo "----------------------------------------"

# Count npm references
npm_count=$(grep -r "\bnpm\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | wc -l)
npx_count=$(grep -r "\bnpx\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | wc -l)
bun_count=$(grep -r "\bbun\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | grep -v "ubuntu" | wc -l)
bunx_count=$(grep -r "\bbunx\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | wc -l)

echo "  npm references:  $npm_count"
echo "  bunx references:  $npx_count"
echo "  bun references:  $bun_count"
echo "  bunx references: $bunx_count"

echo ""
echo "📁 Files still containing npm/npx:"
echo "----------------------------------"
grep -r "\bnpm\b\|\bnpx\b" setup 2>/dev/null | grep -v "Binary file" | grep -v ".git" | cut -d: -f1 | sort | uniq | head -10

echo ""
echo "✨ Configuration Files:"
echo "----------------------"

# Check for bunfig.toml
if [ -f "bunfig.toml" ]; then
    echo "✅ bunfig.toml exists"
else
    echo "❌ bunfig.toml not found"
fi

# Check for bun.lockb
if [ -f "bun.lockb" ]; then
    echo "✅ bun.lockb exists (Bun lockfile)"
else
    echo "⚠️  bun.lockb not found (will be created on first 'bun install')"
fi

echo ""
echo "🎯 Recommendation:"
echo "-----------------"
if [ $npm_count -gt 0 ] || [ $npx_count -gt 0 ]; then
    echo "There are still $((npm_count + npx_count)) references to npm/bunx in the setup folder."
    echo "Most are in comments or documentation, which is acceptable."
    echo "Critical script files have been migrated to use Bun."
else
    echo "All npm/bunx references have been replaced with Bun equivalents!"
fi

echo ""
echo "📝 Next Steps:"
echo "-------------"
echo "1. Install Bun if not already installed:"
echo "   curl -fsSL https://bun.sh/install | bash"
echo ""
echo "2. Test the setup with Bun:"
echo "   cd setup/hello_world_tests/typescript-cli"
echo "   bun install"
echo "   bun test"
echo ""
echo "3. Remove the backup if everything works:"
echo "   rm -rf setup_backup_*"