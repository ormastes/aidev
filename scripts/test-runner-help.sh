#!/bin/bash

# Test Runner Help and Quick Guide

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

clear

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}              AI Development Platform - Test Runner Guide${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${CYAN}📋 Available Test Runners:${NC}"
echo ""
echo -e "  ${GREEN}1. run-all-tests.sh${NC} - Standard test runner"
echo -e "     • Direct execution on host system"
echo -e "     • Faster performance"
echo -e "     • Use for local development"
echo ""
echo -e "  ${GREEN}2. run-all-tests-with-virtual-environment.sh${NC} - Virtual environment runner"
echo -e "     • Isolated execution in Docker/subprocess"
echo -e "     • Automatically skips dangerous operations"
echo -e "     • Recommended for CI/CD and production"
echo ""

echo -e "${CYAN}🚀 Quick Commands:${NC}"
echo ""
echo -e "  ${YELLOW}Development:${NC}"
echo -e "    bun run test:all                  # Run all tests"
echo -e "    bun run test:all:unit             # Unit tests only"
echo -e "    bun run test:all:integration      # Integration tests only"
echo -e "    bun run test:all:coverage         # With coverage report"
echo ""
echo -e "  ${YELLOW}Safe Testing:${NC}"
echo -e "    bun run test:all:virtual          # Virtual environment mode"
echo -e "    bun run test:all:safe             # Virtual + skip dangerous"
echo -e "    bun run test:all:system:virtual   # System tests in virtual env"
echo ""
echo -e "  ${YELLOW}CI/CD:${NC}"
echo -e "    bun run test:all:ci               # Optimized for CI/CD"
echo ""

echo -e "${CYAN}⚙️  Options:${NC}"
echo ""
echo -e "  --theme PATTERN      Filter themes by pattern"
echo -e "  --type TYPE         Test types (unit,integration,system)"
echo -e "  --parallel          Run tests in parallel"
echo -e "  --coverage          Generate coverage report"
echo -e "  --fail-fast         Stop on first failure"
echo -e "  --verbose           Detailed output"
echo ""

echo -e "${CYAN}📊 Test Reports:${NC}"
echo ""
echo -e "  Reports are saved to: ${GREEN}gen/doc/test-reports/${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}For detailed help on each runner:${NC}"
echo -e "  ./scripts/run-all-tests.sh --help"
echo -e "  ./scripts/run-all-tests-with-virtual-environment.sh --help"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"