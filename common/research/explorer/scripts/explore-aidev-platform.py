#!/usr/bin/env python3
"""
Explorer QA Agent for AI Dev Platform
Finds bugs in all web applications including GUI selector, AI IDE, monitoring dashboards
"""

import json
import time
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

class AIDevPlatformExplorer:
    """Explorer for AI Dev Platform web components"""
    
    def __init__(self):
        self.findings = []
        self.components = {
            "gui_selector": {
                "name": "GUI Selector Portal",
                "ports": [3456, 3356],
                "path": "release/gui-selector-portal",
                "critical": True
            },
            "gui_server": {
                "name": "Multi-Agent GUI Generation Server",
                "ports": [3456],
                "path": "_aidev/50.src/51.ui",
                "critical": True
            },
            "monitoring_dashboard": {
                "name": "Performance Monitoring Dashboard",
                "ports": [3000, 3001, 3002],
                "path": "monitoring",
                "critical": True
            },
            "aidev_portal": {
                "name": "AI Dev Portal",
                "ports": [3456],
                "path": "release/aidev_portal_beautiful_20250814_074613",
                "critical": True
            },
            "vscode_extension": {
                "name": "VSCode Extension Web UI",
                "ports": [9000],
                "path": "demo/vscode-extension-cdoctest",
                "critical": False
            }
        }
        self.test_results = {}
        
    def test_all_components(self):
        """Test all web components for vulnerabilities"""
        print("="*60)
        print("🔍 AI DEV PLATFORM EXPLORER - WEB BUG DETECTION")
        print("="*60)
        print(f"\n📅 Started: {datetime.now().isoformat()}\n")
        
        for component_id, config in self.components.items():
            print(f"\n{'='*60}")
            print(f"🎯 Testing: {config['name']}")
            print(f"   Path: {config['path']}")
            print(f"   Ports: {config['ports']}")
            print(f"   Critical: {'Yes' if config['critical'] else 'No'}")
            print("="*60)
            
            self.test_results[component_id] = {
                "name": config['name'],
                "tests_run": 0,
                "bugs_found": 0,
                "findings": []
            }
            
            # Test each port
            for port in config['ports']:
                base_url = f"http://localhost:{port}"
                print(f"\n🔍 Testing {base_url}...")
                
                # Run all tests
                self.test_console_errors(base_url, component_id)
                self.test_xss_vulnerability(base_url, component_id)
                self.test_security_headers(base_url, component_id)
                self.test_api_errors(base_url, component_id)
                self.test_authentication(base_url, component_id)
                self.test_csrf_protection(base_url, component_id)
                self.test_rate_limiting(base_url, component_id)
                self.test_cors_configuration(base_url, component_id)
                self.test_sensitive_data_exposure(base_url, component_id)
                self.test_performance(base_url, component_id)
    
    def test_console_errors(self, base_url: str, component: str):
        """Test for JavaScript console errors"""
        self.test_results[component]["tests_run"] += 1
        print("  🔍 Testing for console errors...")
        
        try:
            response = urllib.request.urlopen(base_url, timeout=5)
            html = response.read().decode('utf-8')
            
            # Check for common error patterns
            error_patterns = [
                'console.error',
                'throw new Error',
                'uncaught',
                'undefined',
                'TypeError',
                'ReferenceError'
            ]
            
            for pattern in error_patterns:
                if pattern.lower() in html.lower():
                    self.add_finding(
                        component=component,
                        type="Console Error",
                        severity="Medium",
                        description=f"Potential JavaScript error: {pattern} found",
                        url=base_url,
                        evidence=f"Pattern '{pattern}' detected in page source"
                    )
                    print(f"    ✅ FOUND: {pattern}")
                    return
                    
        except urllib.error.URLError:
            print(f"    ⚠️  Component not running on {base_url}")
        except Exception as e:
            print(f"    ❌ Error: {e}")
    
    def test_xss_vulnerability(self, base_url: str, component: str):
        """Test for XSS vulnerabilities"""
        self.test_results[component]["tests_run"] += 1
        print("  🔍 Testing for XSS vulnerabilities...")
        
        xss_payloads = [
            '<script>alert(1)</script>',
            '"><script>alert(1)</script>',
            "';alert(1);//",
            '<img src=x onerror=alert(1)>',
            '<svg onload=alert(1)>'
        ]
        
        # Test common endpoints
        test_paths = ['/', '/search', '/login', '/api/search', '/query']
        
        for path in test_paths:
            for payload in xss_payloads:
                try:
                    test_url = f"{base_url}{path}?q={urllib.parse.quote(payload)}"
                    response = urllib.request.urlopen(test_url, timeout=3)
                    html = response.read().decode('utf-8')
                    
                    if payload in html:
                        self.add_finding(
                            component=component,
                            type="XSS Vulnerability",
                            severity="Critical",
                            description=f"Unescaped user input on {path}",
                            url=test_url,
                            evidence=f"Payload reflected: {payload}"
                        )
                        print(f"    ✅ FOUND: XSS on {path}")
                        return
                        
                except:
                    continue
    
    def test_security_headers(self, base_url: str, component: str):
        """Test for missing security headers"""
        self.test_results[component]["tests_run"] += 1
        print("  🔍 Testing security headers...")
        
        required_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=',
            'Content-Security-Policy': 'default-src'
        }
        
        try:
            response = urllib.request.urlopen(base_url, timeout=5)
            headers = dict(response.headers)
            
            missing_headers = []
            for header, expected in required_headers.items():
                if header not in headers:
                    missing_headers.append(header)
                elif isinstance(expected, list):
                    if not any(exp in headers[header] for exp in expected):
                        missing_headers.append(f"{header} (invalid value)")
                elif isinstance(expected, str) and expected not in headers.get(header, ''):
                    missing_headers.append(f"{header} (invalid value)")
            
            if missing_headers:
                self.add_finding(
                    component=component,
                    type="Missing Security Headers",
                    severity="High",
                    description="Critical security headers are missing",
                    url=base_url,
                    evidence=f"Missing: {', '.join(missing_headers)}"
                )
                print(f"    ✅ FOUND: Missing headers: {', '.join(missing_headers[:3])}")
                
        except Exception as e:
            pass
    
    def test_api_errors(self, base_url: str, component: str):
        """Test for API error handling issues"""
        self.test_results[component]["tests_run"] += 1
        print("  🔍 Testing API error handling...")
        
        # Test common API endpoints
        api_paths = [
            '/api/users',
            '/api/error',
            '/api/test',
            '/api/v1/status',
            '/api/health'
        ]
        
        for path in api_paths:
            try:
                url = f"{base_url}{path}"
                response = urllib.request.urlopen(url, timeout=3)
                data = response.read().decode('utf-8')
                
                # Check for sensitive information in responses
                if any(pattern in data.lower() for pattern in ['stack', 'trace', 'error at', '/home/', '/usr/', 'c:\\']):
                    self.add_finding(
                        component=component,
                        type="Information Disclosure",
                        severity="High",
                        description=f"Stack trace or path disclosure in {path}",
                        url=url,
                        evidence="Sensitive information in API response"
                    )
                    print(f"    ✅ FOUND: Information disclosure on {path}")
                    return
                    
            except urllib.error.HTTPError as e:
                if e.code >= 500:
                    self.add_finding(
                        component=component,
                        type="Server Error",
                        severity="Medium",
                        description=f"5xx error on {path}",
                        url=f"{base_url}{path}",
                        evidence=f"HTTP {e.code}"
                    )
                    print(f"    ✅ FOUND: Server error {e.code} on {path}")
            except:
                continue
    
    def test_authentication(self, base_url: str, component: str):
        """Test authentication security"""
        self.test_results[component]["tests_run"] += 1
        print("  🔍 Testing authentication...")
        
        # Test for common auth issues
        auth_endpoints = ['/login', '/auth', '/signin', '/api/login', '/api/auth']
        
        for endpoint in auth_endpoints:
            try:
                # Test for default credentials
                data = json.dumps({
                    'username': 'admin',
                    'password': 'admin'
                }).encode('utf-8')
                
                req = urllib.request.Request(
                    f"{base_url}{endpoint}",
                    data=data,
                    headers={'Content-Type': 'application/json'}
                )
                
                response = urllib.request.urlopen(req, timeout=3)
                
                # If it succeeds with default creds, that's bad
                self.add_finding(
                    component=component,
                    type="Weak Authentication",
                    severity="Critical",
                    description="Default credentials accepted",
                    url=f"{base_url}{endpoint}",
                    evidence="admin/admin credentials work"
                )
                print(f"    ✅ FOUND: Default credentials on {endpoint}")
                return
                
            except:
                continue
    
    def test_csrf_protection(self, base_url: str, component: str):
        """Test for CSRF protection"""
        self.test_results[component]["tests_run"] += 1
        print("  🔍 Testing CSRF protection...")
        
        # Check if forms have CSRF tokens
        try:
            response = urllib.request.urlopen(base_url, timeout=5)
            html = response.read().decode('utf-8')
            
            if '<form' in html.lower():
                if 'csrf' not in html.lower() and 'token' not in html.lower():
                    self.add_finding(
                        component=component,
                        type="Missing CSRF Protection",
                        severity="High",
                        description="Forms without CSRF tokens detected",
                        url=base_url,
                        evidence="No CSRF tokens in forms"
                    )
                    print("    ✅ FOUND: Missing CSRF tokens")
                    
        except:
            pass
    
    def test_rate_limiting(self, base_url: str, component: str):
        """Test for rate limiting"""
        self.test_results[component]["tests_run"] += 1
        print("  🔍 Testing rate limiting...")
        
        # Make rapid requests
        requests_made = 0
        start_time = time.time()
        
        try:
            for i in range(50):
                urllib.request.urlopen(f"{base_url}/api/test", timeout=1)
                requests_made += 1
                
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print("    ✅ Rate limiting is active")
                return
        except:
            pass
        
        duration = time.time() - start_time
        
        if requests_made >= 40 and duration < 2:
            self.add_finding(
                component=component,
                type="Missing Rate Limiting",
                severity="Medium",
                description="No rate limiting on API endpoints",
                url=base_url,
                evidence=f"{requests_made} requests in {duration:.1f}s"
            )
            print(f"    ✅ FOUND: No rate limiting ({requests_made} requests allowed)")
    
    def test_cors_configuration(self, base_url: str, component: str):
        """Test CORS configuration"""
        self.test_results[component]["tests_run"] += 1
        print("  🔍 Testing CORS configuration...")
        
        try:
            req = urllib.request.Request(
                base_url,
                headers={'Origin': 'https://evil.com'}
            )
            response = urllib.request.urlopen(req, timeout=5)
            headers = dict(response.headers)
            
            if 'Access-Control-Allow-Origin' in headers:
                if headers['Access-Control-Allow-Origin'] == '*':
                    self.add_finding(
                        component=component,
                        type="Insecure CORS",
                        severity="High",
                        description="CORS allows all origins (*)",
                        url=base_url,
                        evidence="Access-Control-Allow-Origin: *"
                    )
                    print("    ✅ FOUND: Insecure CORS (allows *)")
                    
        except:
            pass
    
    def test_sensitive_data_exposure(self, base_url: str, component: str):
        """Test for sensitive data exposure"""
        self.test_results[component]["tests_run"] += 1
        print("  🔍 Testing for sensitive data exposure...")
        
        # Check common files that shouldn't be exposed
        sensitive_files = [
            '/.env',
            '/.git/config',
            '/config.json',
            '/package.json',
            '/composer.json',
            '/.htaccess',
            '/web.config',
            '/database.yml',
            '/secrets.json'
        ]
        
        for file in sensitive_files:
            try:
                url = f"{base_url}{file}"
                response = urllib.request.urlopen(url, timeout=3)
                
                self.add_finding(
                    component=component,
                    type="Sensitive File Exposure",
                    severity="Critical",
                    description=f"Sensitive file accessible: {file}",
                    url=url,
                    evidence="File is publicly accessible"
                )
                print(f"    ✅ FOUND: Exposed file {file}")
                return
                
            except urllib.error.HTTPError as e:
                if e.code != 404:
                    # Non-404 error might indicate something interesting
                    pass
            except:
                continue
    
    def test_performance(self, base_url: str, component: str):
        """Test for performance issues"""
        self.test_results[component]["tests_run"] += 1
        print("  🔍 Testing performance...")
        
        try:
            start_time = time.time()
            response = urllib.request.urlopen(base_url, timeout=10)
            load_time = (time.time() - start_time) * 1000
            
            if load_time > 3000:
                self.add_finding(
                    component=component,
                    type="Performance Issue",
                    severity="Low",
                    description="Slow page load time",
                    url=base_url,
                    evidence=f"Load time: {load_time:.0f}ms"
                )
                print(f"    ✅ FOUND: Slow load ({load_time:.0f}ms)")
                
        except:
            pass
    
    def add_finding(self, component: str, type: str, severity: str, 
                    description: str, url: str, evidence: str):
        """Add a finding to the results"""
        finding = {
            "component": self.components[component]["name"],
            "type": type,
            "severity": severity,
            "description": description,
            "url": url,
            "evidence": evidence,
            "timestamp": datetime.now().isoformat()
        }
        
        self.findings.append(finding)
        self.test_results[component]["findings"].append(finding)
        self.test_results[component]["bugs_found"] += 1
    
    def generate_report(self):
        """Generate comprehensive bug report"""
        print("\n" + "="*60)
        print("📊 AI DEV PLATFORM - BUG DETECTION REPORT")
        print("="*60)
        
        # Summary statistics
        total_tests = sum(r["tests_run"] for r in self.test_results.values())
        total_bugs = len(self.findings)
        critical_bugs = len([f for f in self.findings if f["severity"] == "Critical"])
        high_bugs = len([f for f in self.findings if f["severity"] == "High"])
        
        print(f"\n📈 Summary Statistics:")
        print(f"  Total Components Tested: {len(self.components)}")
        print(f"  Total Tests Run: {total_tests}")
        print(f"  Total Bugs Found: {total_bugs}")
        print(f"  Critical Issues: {critical_bugs}")
        print(f"  High Priority Issues: {high_bugs}")
        
        # Component breakdown
        print(f"\n🎯 Component Breakdown:")
        for component_id, results in self.test_results.items():
            if results["bugs_found"] > 0:
                print(f"\n  {results['name']}:")
                print(f"    Tests Run: {results['tests_run']}")
                print(f"    Bugs Found: {results['bugs_found']}")
                
                # List bugs by severity
                for severity in ["Critical", "High", "Medium", "Low"]:
                    bugs = [f for f in results["findings"] if f["severity"] == severity]
                    if bugs:
                        print(f"    {severity}: {len(bugs)} issues")
                        for bug in bugs[:3]:  # Show first 3
                            print(f"      - {bug['type']}: {bug['description'][:50]}...")
        
        # Critical findings detail
        if critical_bugs > 0:
            print(f"\n🚨 CRITICAL FINDINGS:")
            for finding in self.findings:
                if finding["severity"] == "Critical":
                    print(f"\n  Component: {finding['component']}")
                    print(f"  Type: {finding['type']}")
                    print(f"  Description: {finding['description']}")
                    print(f"  URL: {finding['url']}")
                    print(f"  Evidence: {finding['evidence']}")
        
        # Save detailed report
        report_dir = Path("research/explorer/findings")
        report_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = report_dir / f"aidev_platform_bugs_{timestamp}.json"
        
        with open(report_file, 'w') as f:
            json.dump({
                "timestamp": timestamp,
                "summary": {
                    "components_tested": len(self.components),
                    "total_tests": total_tests,
                    "total_bugs": total_bugs,
                    "critical_bugs": critical_bugs,
                    "high_bugs": high_bugs
                },
                "components": self.test_results,
                "findings": self.findings
            }, f, indent=2)
        
        print(f"\n📁 Detailed report saved to: {report_file}")
        
        # Recommendations
        print("\n🔧 Recommendations:")
        if critical_bugs > 0:
            print("  ❗ Fix critical security issues immediately")
        if high_bugs > 0:
            print("  ⚠️  Address high priority issues before production")
        print("  📋 Implement security headers on all endpoints")
        print("  🔒 Add CSRF protection to all forms")
        print("  ⏱️  Implement rate limiting on APIs")
        print("  🛡️  Review and fix CORS configurations")
        
        print("\n" + "="*60)
        
        if total_bugs > 0:
            print(f"⚠️  FOUND {total_bugs} BUGS - Review and fix before deployment!")
        else:
            print("✅ No major bugs found - Platform appears secure")
        
        print("="*60)

def main():
    """Main entry point"""
    print("🚀 Starting AI Dev Platform Explorer")
    print("   This will test all web components for vulnerabilities")
    print("   Components: GUI Selector, AI IDE, Monitoring, Portals")
    print()
    
    explorer = AIDevPlatformExplorer()
    
    # Test all components
    explorer.test_all_components()
    
    # Generate report
    explorer.generate_report()
    
    print("\n🏁 Explorer scan complete!")

if __name__ == "__main__":
    main()