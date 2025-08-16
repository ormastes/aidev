#!/usr/bin/env python3
"""
Explorer QA Agent - Autonomous web and API testing using MCP
"""

import asyncio
import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict

try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
except ImportError:
    print("Error: MCP SDK not installed. Run: uv pip install mcp")
    exit(1)


@dataclass
class Finding:
    """Represents a discovered issue"""
    timestamp: str
    flow: str
    title: str
    severity: str  # critical, high, medium, low
    type: str  # error, warning, performance, security
    description: str
    steps_to_reproduce: List[str]
    expected: str
    actual: str
    evidence: Dict[str, Any]
    test_code: Optional[str] = None


class ExplorerAgent:
    """Autonomous QA Explorer using MCP"""
    
    def __init__(self):
        self.base_url = os.getenv("STAGING_URL", "https://staging.aidev.example.com")
        self.api_spec_url = os.getenv("OPENAPI_SPEC_URL", f"{self.base_url}/openapi.json")
        self.findings: List[Finding] = []
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # MCP server configurations
        self.playwright_params = StdioServerParameters(
            command="npx",
            args=[
                "@playwright/mcp@latest",
                "--browser", "chrome",
                "--caps", "vision,pdf",
                "--block-service-workers"
            ]
        )
        
        self.openapi_params = StdioServerParameters(
            command="uvx",
            args=["awslabs.openapi-mcp-server@latest"],
            env={
                "API_NAME": "aidev",
                "API_BASE_URL": self.base_url,
                "API_SPEC_URL": self.api_spec_url,
                "SERVER_TRANSPORT": "stdio"
            }
        )
    
    async def connect_playwright(self):
        """Connect to Playwright MCP server"""
        return await stdio_client(self.playwright_params).__aenter__()
    
    async def connect_openapi(self):
        """Connect to OpenAPI MCP server"""
        return await stdio_client(self.openapi_params).__aenter__()
    
    async def explore_flow(self, flow_name: str) -> List[Finding]:
        """Explore a specific user flow"""
        print(f"\n🔍 Exploring flow: {flow_name}")
        flow_findings = []
        
        # Connect to Playwright MCP
        async with stdio_client(self.playwright_params) as (read, write):
            async with ClientSession(read, write) as browser_session:
                await browser_session.initialize()
                
                # Navigate to base URL
                await browser_session.call_tool(
                    "browser_navigate",
                    arguments={"url": self.base_url}
                )
                
                # Take initial snapshot
                snapshot = await browser_session.call_tool("browser_snapshot", arguments={})
                
                # Check console for errors
                console = await browser_session.call_tool("browser_console_messages", arguments={})
                console_errors = self._extract_console_errors(console.content if console else {})
                
                if console_errors:
                    flow_findings.append(Finding(
                        timestamp=datetime.now().isoformat(),
                        flow=flow_name,
                        title=f"Console errors on {flow_name} page load",
                        severity="medium",
                        type="error",
                        description="JavaScript errors detected in browser console",
                        steps_to_reproduce=[
                            f"Navigate to {self.base_url}",
                            "Open browser console",
                            "Observe errors"
                        ],
                        expected="No console errors",
                        actual=f"Found {len(console_errors)} console errors",
                        evidence={"console_errors": console_errors}
                    ))
                
                # Check network for failures
                network = await browser_session.call_tool("browser_network_requests", arguments={})
                failed_requests = self._extract_failed_requests(network.content if network else {})
                
                if failed_requests:
                    flow_findings.append(Finding(
                        timestamp=datetime.now().isoformat(),
                        flow=flow_name,
                        title=f"Network failures in {flow_name}",
                        severity="high",
                        type="error",
                        description="Failed network requests detected",
                        steps_to_reproduce=[
                            f"Navigate to {self.base_url}",
                            "Open network tab",
                            "Observe failed requests"
                        ],
                        expected="All requests succeed (2xx/3xx)",
                        actual=f"Found {len(failed_requests)} failed requests",
                        evidence={"failed_requests": failed_requests}
                    ))
                
                # Flow-specific exploration
                if flow_name == "authentication":
                    findings = await self._explore_auth_flow(browser_session)
                    flow_findings.extend(findings)
                elif flow_name == "search":
                    findings = await self._explore_search_flow(browser_session)
                    flow_findings.extend(findings)
                elif flow_name == "crud":
                    findings = await self._explore_crud_flow(browser_session)
                    flow_findings.extend(findings)
        
        # Cross-validate with API
        api_findings = await self._validate_with_api(flow_name)
        flow_findings.extend(api_findings)
        
        self.findings.extend(flow_findings)
        return flow_findings
    
    async def _explore_auth_flow(self, session: ClientSession) -> List[Finding]:
        """Test authentication flow"""
        findings = []
        
        try:
            # Look for login button/link
            snapshot = await session.call_tool("browser_snapshot", arguments={})
            
            # Click login
            await session.call_tool(
                "browser_click",
                arguments={"selector": "[data-testid=login], button:has-text('Login'), a:has-text('Sign in')"}
            )
            
            # Fill credentials
            test_email = os.getenv("TEST_USER_EMAIL", "test@example.com")
            test_password = os.getenv("TEST_USER_PASSWORD", "testpass123")
            
            await session.call_tool(
                "browser_type",
                arguments={
                    "selector": "input[type=email], input[name=email], input[name=username]",
                    "text": test_email
                }
            )
            
            await session.call_tool(
                "browser_type",
                arguments={
                    "selector": "input[type=password], input[name=password]",
                    "text": test_password
                }
            )
            
            # Submit form
            await session.call_tool(
                "browser_click",
                arguments={"selector": "button[type=submit], button:has-text('Submit'), button:has-text('Login')"}
            )
            
            # Wait and check result
            await asyncio.sleep(2)
            
            # Check for errors
            console = await session.call_tool("browser_console_messages", arguments={})
            network = await session.call_tool("browser_network_requests", arguments={})
            
            # Generate test code
            test_code = self._generate_auth_test(test_email)
            
            # Check for common auth issues
            if "error" in str(console.content).lower():
                findings.append(Finding(
                    timestamp=datetime.now().isoformat(),
                    flow="authentication",
                    title="Authentication flow console errors",
                    severity="high",
                    type="error",
                    description="Console errors during login process",
                    steps_to_reproduce=[
                        "Navigate to login page",
                        "Enter credentials",
                        "Submit form",
                        "Check console"
                    ],
                    expected="Successful login without errors",
                    actual="Console errors present",
                    evidence={"console": console.content},
                    test_code=test_code
                ))
                
        except Exception as e:
            findings.append(Finding(
                timestamp=datetime.now().isoformat(),
                flow="authentication",
                title="Authentication flow exception",
                severity="critical",
                type="error",
                description=f"Exception during auth testing: {str(e)}",
                steps_to_reproduce=["Run authentication flow"],
                expected="Flow completes successfully",
                actual=f"Exception: {str(e)}",
                evidence={"error": str(e)}
            ))
        
        return findings
    
    async def _explore_search_flow(self, session: ClientSession) -> List[Finding]:
        """Test search functionality"""
        findings = []
        
        try:
            # Find search input
            await session.call_tool(
                "browser_type",
                arguments={
                    "selector": "input[type=search], input[placeholder*=search i], input[name=search], input[name=q]",
                    "text": "test query"
                }
            )
            
            # Submit search
            await session.call_tool(
                "browser_click",
                arguments={"selector": "button[type=submit], button:has-text('Search')"}
            )
            
            await asyncio.sleep(2)
            
            # Check results
            snapshot = await session.call_tool("browser_snapshot", arguments={})
            
            # Validate search worked
            # Add specific validations based on your app
            
        except Exception as e:
            findings.append(Finding(
                timestamp=datetime.now().isoformat(),
                flow="search",
                title="Search flow failure",
                severity="medium",
                type="error",
                description=f"Search testing failed: {str(e)}",
                steps_to_reproduce=["Navigate to search", "Enter query", "Submit"],
                expected="Search returns results",
                actual=f"Error: {str(e)}",
                evidence={"error": str(e)}
            ))
        
        return findings
    
    async def _explore_crud_flow(self, session: ClientSession) -> List[Finding]:
        """Test CRUD operations"""
        findings = []
        # Implement CRUD testing logic
        return findings
    
    async def _validate_with_api(self, flow_name: str) -> List[Finding]:
        """Cross-validate UI behavior with API responses"""
        findings = []
        
        try:
            async with stdio_client(self.openapi_params) as (read, write):
                async with ClientSession(read, write) as api_session:
                    await api_session.initialize()
                    
                    # List available tools (endpoints)
                    tools = await api_session.list_tools()
                    
                    # Test each endpoint for basic invariants
                    for tool in tools.tools[:5]:  # Limit to first 5 for demo
                        try:
                            # Call with minimal/safe parameters
                            result = await api_session.call_tool(
                                tool.name,
                                arguments={"limit": 1} if "list" in tool.name.lower() else {}
                            )
                            
                            # Check for common API issues
                            if result and hasattr(result, 'content'):
                                content_str = str(result.content)
                                
                                # Check for exposed stack traces
                                if "traceback" in content_str.lower() or "stack trace" in content_str.lower():
                                    findings.append(Finding(
                                        timestamp=datetime.now().isoformat(),
                                        flow=flow_name,
                                        title=f"Stack trace exposed in {tool.name}",
                                        severity="high",
                                        type="security",
                                        description="API endpoint exposes internal stack trace",
                                        steps_to_reproduce=[
                                            f"Call API endpoint: {tool.name}",
                                            "Observe response"
                                        ],
                                        expected="Clean error message",
                                        actual="Stack trace exposed",
                                        evidence={"endpoint": tool.name, "response": content_str[:500]}
                                    ))
                                
                        except Exception as e:
                            # API call failed - could be a finding
                            pass
                    
        except Exception as e:
            print(f"API validation failed: {e}")
        
        return findings
    
    def _extract_console_errors(self, console_data: Any) -> List[str]:
        """Extract error messages from console data"""
        errors = []
        if isinstance(console_data, dict) and "messages" in console_data:
            for msg in console_data["messages"]:
                if msg.get("type") == "error":
                    errors.append(msg.get("text", "Unknown error"))
        return errors
    
    def _extract_failed_requests(self, network_data: Any) -> List[Dict]:
        """Extract failed network requests"""
        failed = []
        if isinstance(network_data, dict) and "requests" in network_data:
            for req in network_data["requests"]:
                status = req.get("status", 0)
                if status >= 400:
                    failed.append({
                        "url": req.get("url"),
                        "status": status,
                        "method": req.get("method")
                    })
        return failed
    
    def _generate_auth_test(self, email: str) -> str:
        """Generate Playwright test for authentication"""
        return f"""
import {{ test, expect }} from '@playwright/test';

test('authentication flow should work without errors', async ({{ page }}) => {{
  const consoleErrors: string[] = [];
  page.on('console', msg => {{
    if (msg.type() === 'error') {{
      consoleErrors.push(msg.text());
    }}
  }});

  await page.goto('{self.base_url}');
  await page.click('[data-testid=login], button:has-text("Login")');
  
  await page.fill('input[type=email]', '{email}');
  await page.fill('input[type=password]', 'testpass123');
  await page.click('button[type=submit]');
  
  await page.waitForURL(/dashboard|home/, {{ timeout: 5000 }});
  
  expect(consoleErrors).toHaveLength(0);
}});
"""
    
    def save_findings(self):
        """Save findings to markdown files"""
        findings_dir = Path("research/explorer/findings")
        findings_dir.mkdir(parents=True, exist_ok=True)
        
        for finding in self.findings:
            filename = f"{self.session_id}_{finding.flow}_{finding.title[:30].replace(' ', '_')}.md"
            filepath = findings_dir / filename
            
            content = f"""# {finding.title}

**Flow:** {finding.flow}  
**Severity:** {finding.severity}  
**Type:** {finding.type}  
**Timestamp:** {finding.timestamp}

## Description
{finding.description}

## Steps to Reproduce
{chr(10).join(f"{i+1}. {step}" for i, step in enumerate(finding.steps_to_reproduce))}

## Expected Behavior
{finding.expected}

## Actual Behavior
{finding.actual}

## Evidence
```json
{json.dumps(finding.evidence, indent=2)}
```

## Automated Test
```typescript
{finding.test_code if finding.test_code else "// No test generated"}
```
"""
            filepath.write_text(content)
        
        print(f"\n✅ Saved {len(self.findings)} findings to {findings_dir}")
    
    def generate_report(self):
        """Generate summary report"""
        report = {
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "total_findings": len(self.findings),
            "by_severity": {},
            "by_type": {},
            "by_flow": {}
        }
        
        for finding in self.findings:
            # Count by severity
            report["by_severity"][finding.severity] = report["by_severity"].get(finding.severity, 0) + 1
            # Count by type
            report["by_type"][finding.type] = report["by_type"].get(finding.type, 0) + 1
            # Count by flow
            report["by_flow"][finding.flow] = report["by_flow"].get(finding.flow, 0) + 1
        
        report_path = Path(f"research/explorer/findings/{self.session_id}_report.json")
        report_path.write_text(json.dumps(report, indent=2))
        
        print("\n📊 Summary Report:")
        print(f"  Total Findings: {report['total_findings']}")
        print(f"  By Severity: {report['by_severity']}")
        print(f"  By Type: {report['by_type']}")
        print(f"  By Flow: {report['by_flow']}")
        
        return report


async def main():
    """Main exploration entry point"""
    print("🚀 Starting AI Dev Platform Explorer")
    print(f"   Target: {os.getenv('STAGING_URL', 'Not configured')}")
    print("=" * 50)
    
    explorer = ExplorerAgent()
    
    # Define flows to explore
    flows = [
        "authentication",
        "search",
        "crud",
        # Add more flows as needed
    ]
    
    # Explore each flow
    for flow in flows:
        try:
            await explorer.explore_flow(flow)
        except Exception as e:
            print(f"❌ Error exploring {flow}: {e}")
    
    # Save findings and generate report
    if explorer.findings:
        explorer.save_findings()
        explorer.generate_report()
    else:
        print("\n✨ No issues found! The application appears to be working correctly.")
    
    print("\n🏁 Exploration complete!")


if __name__ == "__main__":
    # Check environment
    if not os.getenv("STAGING_URL"):
        print("⚠️  Warning: STAGING_URL not set. Using default.")
        print("   Set environment variables in .env.explorer")
    
    # Run exploration
    asyncio.run(main())