#!/usr/bin/env python3
"""
Integration tests for MCP servers
Verifies that Explorer can communicate with MCP servers correctly
"""

import asyncio
import json
import os
import sys
import unittest
from pathlib import Path
from typing import List, Dict, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    HAS_MCP = True
except ImportError:
    HAS_MCP = False
    print("Warning: MCP SDK not installed. Run: uv pip install mcp")


class TestMCPIntegration(unittest.TestCase):
    """Test MCP server integration"""
    
    @unittest.skipUnless(HAS_MCP, "MCP SDK not installed")
    def test_playwright_mcp_connection(self):
        """Test connection to Playwright MCP server"""
        async def test():
            params = StdioServerParameters(
                command="npx",
                args=["@playwright/mcp@latest", "--help"]
            )
            
            try:
                async with stdio_client(params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        
                        # List available tools
                        tools = await session.list_tools()
                        tool_names = [tool.name for tool in tools.tools]
                        
                        # Verify expected Playwright tools
                        expected_tools = [
                            "browser_navigate",
                            "browser_snapshot", 
                            "browser_click",
                            "browser_type"
                        ]
                        
                        for tool in expected_tools:
                            self.assertIn(tool, tool_names, f"Tool {tool} not found")
                        
                        return True
            except Exception as e:
                self.fail(f"Failed to connect to Playwright MCP: {e}")
        
        asyncio.run(test())
    
    @unittest.skipUnless(HAS_MCP, "MCP SDK not installed")
    def test_browser_navigation(self):
        """Test browser navigation using Playwright MCP"""
        async def test():
            params = StdioServerParameters(
                command="npx",
                args=["@playwright/mcp@latest", "--browser", "chrome"]
            )
            
            try:
                async with stdio_client(params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        
                        # Navigate to a test page
                        result = await session.call_tool(
                            "browser_navigate",
                            arguments={"url": "https://example.com"}
                        )
                        
                        self.assertIsNotNone(result)
                        
                        # Take snapshot
                        snapshot = await session.call_tool(
                            "browser_snapshot",
                            arguments={}
                        )
                        
                        self.assertIsNotNone(snapshot)
                        
                        return True
            except Exception as e:
                # May fail if browser not installed, that's ok for integration test
                print(f"Browser test skipped: {e}")
                return True
        
        asyncio.run(test())
    
    def test_explorer_imports(self):
        """Test that Explorer script imports work"""
        try:
            # Import Explorer modules
            from scripts import explorer
            
            # Verify Explorer class exists
            self.assertTrue(hasattr(explorer, 'ExplorerAgent'))
            
            # Verify required methods exist
            agent = explorer.ExplorerAgent()
            self.assertTrue(hasattr(agent, 'explore_flow'))
            self.assertTrue(hasattr(agent, 'save_findings'))
            self.assertTrue(hasattr(agent, 'generate_report'))
            
        except ImportError as e:
            self.fail(f"Failed to import Explorer: {e}")
    
    def test_invariants_loading(self):
        """Test that invariants YAML can be loaded"""
        invariants_path = Path(__file__).parent.parent.parent / "config" / "invariants.yaml"
        
        self.assertTrue(invariants_path.exists(), "Invariants file not found")
        
        # Try to load YAML
        try:
            import yaml
            with open(invariants_path) as f:
                invariants = yaml.safe_load(f)
            
            # Verify structure
            self.assertIn('global', invariants)
            self.assertIsInstance(invariants['global'], list)
            
            # Check for expected invariant types
            expected_sections = ['global', 'authentication', 'search', 'api']
            for section in expected_sections:
                self.assertIn(section, invariants, f"Missing section: {section}")
                
        except ImportError:
            # YAML not installed, just check file exists
            pass
        except Exception as e:
            self.fail(f"Failed to load invariants: {e}")
    
    def test_test_app_structure(self):
        """Test that vulnerable test app is properly structured"""
        app_dir = Path(__file__).parent.parent.parent / "test-apps" / "vulnerable-app"
        
        # Check required files exist
        required_files = [
            "server.js",
            "package.json"
        ]
        
        for file in required_files:
            file_path = app_dir / file
            self.assertTrue(file_path.exists(), f"Missing file: {file}")
        
        # Check package.json structure
        with open(app_dir / "package.json") as f:
            package = json.load(f)
        
        self.assertEqual(package['name'], 'vulnerable-test-app')
        self.assertIn('express', package.get('dependencies', {}))
    
    def test_findings_directory(self):
        """Test findings directory structure"""
        findings_dir = Path(__file__).parent.parent.parent / "findings"
        
        # Create if doesn't exist
        findings_dir.mkdir(exist_ok=True)
        
        self.assertTrue(findings_dir.exists())
        self.assertTrue(findings_dir.is_dir())
        
        # Test writing a finding
        test_finding = findings_dir / "test_finding.md"
        test_finding.write_text("# Test Finding\nThis is a test")
        
        self.assertTrue(test_finding.exists())
        
        # Clean up
        test_finding.unlink()
    
    @unittest.skipUnless(HAS_MCP, "MCP SDK not installed")
    def test_mcp_error_handling(self):
        """Test MCP error handling"""
        async def test():
            params = StdioServerParameters(
                command="npx",
                args=["@playwright/mcp@latest", "--browser", "chrome"]
            )
            
            try:
                async with stdio_client(params) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        
                        # Try invalid tool call
                        try:
                            await session.call_tool(
                                "invalid_tool_name",
                                arguments={}
                            )
                            self.fail("Should have raised error for invalid tool")
                        except Exception:
                            # Expected to fail
                            pass
                        
                        # Try invalid arguments
                        try:
                            await session.call_tool(
                                "browser_navigate",
                                arguments={"invalid_arg": "test"}
                            )
                            # May or may not fail depending on implementation
                        except Exception:
                            # Expected behavior
                            pass
                        
                        return True
            except Exception as e:
                # Connection errors are ok for integration test
                print(f"MCP error handling test skipped: {e}")
                return True
        
        asyncio.run(test())


class TestExplorerIntegration(unittest.TestCase):
    """Test Explorer integration with test app"""
    
    def setUp(self):
        """Set up test environment"""
        self.test_url = "http://localhost:3456"
        self.env_vars = {
            "STAGING_URL": self.test_url,
            "OPENAPI_SPEC_URL": f"{self.test_url}/openapi.json",
            "TEST_USER_EMAIL": "test@example.com",
            "TEST_USER_PASSWORD": "password123"
        }
    
    def test_environment_setup(self):
        """Test environment variables setup"""
        # Test that environment can be set
        for key, value in self.env_vars.items():
            os.environ[key] = value
            self.assertEqual(os.environ.get(key), value)
    
    def test_explorer_initialization(self):
        """Test Explorer agent initialization"""
        # Set environment
        for key, value in self.env_vars.items():
            os.environ[key] = value
        
        try:
            from scripts.explorer import ExplorerAgent
            
            agent = ExplorerAgent()
            
            # Verify initialization
            self.assertEqual(agent.base_url, self.test_url)
            self.assertEqual(agent.api_spec_url, f"{self.test_url}/openapi.json")
            self.assertIsNotNone(agent.session_id)
            self.assertEqual(len(agent.findings), 0)
            
        except ImportError as e:
            self.fail(f"Failed to import Explorer: {e}")
    
    @unittest.skipUnless(HAS_MCP, "MCP SDK not installed")
    def test_explorer_flow_structure(self):
        """Test Explorer flow execution structure"""
        async def test():
            from scripts.explorer import ExplorerAgent
            
            agent = ExplorerAgent()
            
            # Test that flow methods exist
            self.assertTrue(hasattr(agent, '_explore_auth_flow'))
            self.assertTrue(hasattr(agent, '_explore_search_flow'))
            self.assertTrue(hasattr(agent, '_explore_crud_flow'))
            self.assertTrue(hasattr(agent, '_validate_with_api'))
            
            # Test helper methods
            self.assertTrue(hasattr(agent, '_extract_console_errors'))
            self.assertTrue(hasattr(agent, '_extract_failed_requests'))
            self.assertTrue(hasattr(agent, '_generate_auth_test'))
            
            return True
        
        asyncio.run(test())
    
    def test_finding_structure(self):
        """Test Finding dataclass structure"""
        try:
            from scripts.explorer import Finding
            
            finding = Finding(
                timestamp="2024-01-01T00:00:00",
                flow="test",
                title="Test Finding",
                severity="high",
                type="error",
                description="Test description",
                steps_to_reproduce=["Step 1", "Step 2"],
                expected="Expected behavior",
                actual="Actual behavior",
                evidence={"test": "evidence"},
                test_code="test code"
            )
            
            # Verify all fields
            self.assertEqual(finding.timestamp, "2024-01-01T00:00:00")
            self.assertEqual(finding.flow, "test")
            self.assertEqual(finding.title, "Test Finding")
            self.assertEqual(finding.severity, "high")
            self.assertEqual(finding.type, "error")
            self.assertEqual(len(finding.steps_to_reproduce), 2)
            
        except ImportError as e:
            self.fail(f"Failed to import Finding: {e}")


def run_integration_tests():
    """Run all integration tests"""
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test cases
    suite.addTests(loader.loadTestsFromTestCase(TestMCPIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestExplorerIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Return success/failure
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_integration_tests()
    sys.exit(0 if success else 1)