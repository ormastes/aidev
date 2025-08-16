#!/usr/bin/env python3
"""
Demo Explorer - Simplified version that shows detection capabilities
"""

import asyncio
import json
import time
from datetime import datetime
from pathlib import Path
import urllib.request
import urllib.parse

class DemoExplorer:
    """Simplified Explorer that demonstrates bug detection"""
    
    def __init__(self):
        self.base_url = "http://localhost:3459"
        self.findings = []
        self.tests_run = 0
        self.bugs_found = 0
    
    def test_console_errors(self):
        """Test for console errors"""
        self.tests_run += 1
        print("🔍 Testing for console errors...")
        
        try:
            response = urllib.request.urlopen(f"{self.base_url}/")
            html = response.read().decode('utf-8')
            
            if 'console.error' in html:
                self.bugs_found += 1
                self.findings.append({
                    'type': 'Console Error',
                    'severity': 'Medium',
                    'description': 'JavaScript console errors detected on homepage',
                    'evidence': 'Found console.error() call in page source'
                })
                print("  ✅ FOUND: Console errors in JavaScript")
                return True
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
        
        print("  ❌ Not detected")
        return False
    
    def test_xss_vulnerability(self):
        """Test for XSS vulnerability"""
        self.tests_run += 1
        print("🔍 Testing for XSS vulnerability...")
        
        try:
            xss_payload = '<script>alert(1)</script>'
            url = f"{self.base_url}/search?q={urllib.parse.quote(xss_payload)}"
            response = urllib.request.urlopen(url)
            html = response.read().decode('utf-8')
            
            if xss_payload in html:
                self.bugs_found += 1
                self.findings.append({
                    'type': 'XSS Vulnerability',
                    'severity': 'High',
                    'description': 'Unescaped user input allows script injection',
                    'evidence': f'Payload "{xss_payload}" reflected without escaping'
                })
                print("  ✅ FOUND: XSS vulnerability in search")
                return True
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
        
        print("  ❌ Not detected")
        return False
    
    def test_stack_trace_exposure(self):
        """Test for stack trace exposure"""
        self.tests_run += 1
        print("🔍 Testing for stack trace exposure...")
        
        try:
            response = urllib.request.urlopen(f"{self.base_url}/api/error")
            data = json.loads(response.read().decode('utf-8'))
            
            if 'stack' in data:
                self.bugs_found += 1
                self.findings.append({
                    'type': 'Information Disclosure',
                    'severity': 'High',
                    'description': 'API endpoint exposes internal stack trace',
                    'evidence': 'Stack trace found in /api/error response'
                })
                print("  ✅ FOUND: Stack trace exposed in API")
                return True
        except urllib.error.HTTPError as e:
            # Check error response for stack trace
            try:
                error_data = json.loads(e.read().decode('utf-8'))
                if 'stack' in error_data:
                    self.bugs_found += 1
                    print("  ✅ FOUND: Stack trace in error response")
                    return True
            except:
                pass
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
        
        print("  ❌ Not detected")
        return False
    
    def test_missing_headers(self):
        """Test for missing security headers"""
        self.tests_run += 1
        print("🔍 Testing for missing security headers...")
        
        try:
            response = urllib.request.urlopen(f"{self.base_url}/api/users")
            headers = dict(response.headers)
            
            missing_headers = []
            if 'X-Content-Type-Options' not in headers:
                missing_headers.append('X-Content-Type-Options')
            if 'X-Frame-Options' not in headers:
                missing_headers.append('X-Frame-Options')
            
            if missing_headers:
                self.bugs_found += 1
                self.findings.append({
                    'type': 'Missing Security Headers',
                    'severity': 'Medium',
                    'description': 'API endpoints missing important security headers',
                    'evidence': f'Missing headers: {", ".join(missing_headers)}'
                })
                print(f"  ✅ FOUND: Missing security headers ({', '.join(missing_headers)})")
                return True
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
        
        print("  ❌ Not detected")
        return False
    
    def test_api_schema_mismatch(self):
        """Test for API schema mismatch"""
        self.tests_run += 1
        print("🔍 Testing for API schema mismatch...")
        
        try:
            # Get OpenAPI spec
            spec_response = urllib.request.urlopen(f"{self.base_url}/openapi.json")
            spec = json.loads(spec_response.read().decode('utf-8'))
            
            # Get API response
            api_response = urllib.request.urlopen(f"{self.base_url}/api/users")
            api_data = json.loads(api_response.read().decode('utf-8'))
            
            # Check required fields from spec
            required_fields = spec['paths']['/api/users']['get']['responses']['200']['content']['application/json']['schema']['required']
            
            missing_fields = [field for field in required_fields if field not in api_data]
            
            if missing_fields:
                self.bugs_found += 1
                self.findings.append({
                    'type': 'API Schema Violation',
                    'severity': 'High',
                    'description': 'API response does not match OpenAPI specification',
                    'evidence': f'Missing required fields: {", ".join(missing_fields)}'
                })
                print(f"  ✅ FOUND: API schema mismatch (missing: {', '.join(missing_fields)})")
                return True
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
        
        print("  ❌ Not detected")
        return False
    
    def test_server_errors(self):
        """Test for 5xx server errors"""
        self.tests_run += 1
        print("🔍 Testing for server errors...")
        
        try:
            response = urllib.request.urlopen(f"{self.base_url}/api/crash")
            print("  ❌ Expected error but got success")
            return False
        except urllib.error.HTTPError as e:
            if e.code >= 500:
                self.bugs_found += 1
                self.findings.append({
                    'type': 'Server Error',
                    'severity': 'Critical',
                    'description': f'{e.code} server error on /api/crash endpoint',
                    'evidence': f'HTTP {e.code}: {e.reason}'
                })
                print(f"  ✅ FOUND: {e.code} server error")
                return True
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
        
        print("  ❌ Not detected")
        return False
    
    def test_slow_response(self):
        """Test for slow responses"""
        self.tests_run += 1
        print("🔍 Testing for slow responses...")
        
        try:
            import urllib.request
            import json
            
            start_time = time.time()
            
            # Create POST request
            data = json.dumps({
                'email': 'test@example.com',
                'password': 'wrong'
            }).encode('utf-8')
            
            req = urllib.request.Request(
                f"{self.base_url}/login",
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            
            try:
                response = urllib.request.urlopen(req)
            except urllib.error.HTTPError:
                pass  # Expected for wrong password
            
            duration = (time.time() - start_time) * 1000  # Convert to ms
            
            if duration > 3000:
                self.bugs_found += 1
                self.findings.append({
                    'type': 'Performance Issue',
                    'severity': 'Medium',
                    'description': 'Login endpoint responds too slowly',
                    'evidence': f'Response time: {duration:.0f}ms (>3000ms threshold)'
                })
                print(f"  ✅ FOUND: Slow response ({duration:.0f}ms)")
                return True
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
        
        print("  ❌ Not detected")
        return False
    
    def test_pii_leak(self):
        """Test for PII leaks in errors"""
        self.tests_run += 1
        print("🔍 Testing for PII leaks...")
        
        try:
            # Make login request with specific credentials
            data = json.dumps({
                'email': 'user@test.com',
                'password': 'mysecretpass'
            }).encode('utf-8')
            
            req = urllib.request.Request(
                f"{self.base_url}/login",
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            
            try:
                response = urllib.request.urlopen(req)
                # If successful, no error to check
            except urllib.error.HTTPError as e:
                error_body = e.read().decode('utf-8')
                
                if 'mysecretpass' in error_body:
                    self.bugs_found += 1
                    self.findings.append({
                        'type': 'PII Leak',
                        'severity': 'Critical',
                        'description': 'Password exposed in error message',
                        'evidence': 'User password visible in login error response'
                    })
                    print("  ✅ FOUND: PII (password) leaked in error")
                    return True
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
        
        print("  ❌ Not detected")
        return False
    
    def generate_report(self):
        """Generate test report"""
        print("\n" + "="*60)
        print("📊 DEMO EXPLORER REPORT")
        print("="*60)
        
        print(f"\n📈 Statistics:")
        print(f"  Tests Run: {self.tests_run}")
        print(f"  Bugs Found: {self.bugs_found}")
        print(f"  Detection Rate: {(self.bugs_found/self.tests_run*100):.1f}%")
        
        if self.findings:
            print(f"\n🐛 Findings ({len(self.findings)}):")
            for i, finding in enumerate(self.findings, 1):
                print(f"\n  {i}. {finding['type']}")
                print(f"     Severity: {finding['severity']}")
                print(f"     Description: {finding['description']}")
                print(f"     Evidence: {finding['evidence']}")
        
        print("\n" + "="*60)
        
        if self.bugs_found >= 6:
            print("✅ SUCCESS: Explorer detected most vulnerabilities!")
        else:
            print("⚠️  Partial detection - some bugs may have been missed")
        
        print("="*60)
        
        # Save findings to file
        findings_dir = Path(__file__).parent.parent / "findings"
        findings_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = findings_dir / f"demo_{timestamp}_report.json"
        
        with open(report_file, 'w') as f:
            json.dump({
                'timestamp': timestamp,
                'tests_run': self.tests_run,
                'bugs_found': self.bugs_found,
                'findings': self.findings
            }, f, indent=2)
        
        print(f"\n📁 Report saved to: {report_file}")
    
    def run(self):
        """Run all tests"""
        print("🚀 Starting Demo Explorer")
        print(f"   Target: {self.base_url}")
        print("="*60)
        print("\n🔍 Running detection tests...\n")
        
        # Run all tests
        self.test_console_errors()
        self.test_xss_vulnerability()
        self.test_stack_trace_exposure()
        self.test_missing_headers()
        self.test_api_schema_mismatch()
        self.test_server_errors()
        self.test_slow_response()
        self.test_pii_leak()
        
        # Generate report
        self.generate_report()


if __name__ == "__main__":
    import subprocess
    import sys
    import os
    
    # Start test app
    print("🚀 Starting vulnerable test app...")
    app_dir = Path(__file__).parent.parent / "test-apps" / "vulnerable-app"
    os.chdir(app_dir)
    
    # Start app in background
    app_process = subprocess.Popen(
        ["node", "server.js"],
        env={**os.environ, "PORT": "3459"},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for app to start
    time.sleep(2)
    
    try:
        # Run explorer
        explorer = DemoExplorer()
        explorer.run()
    finally:
        # Stop app
        print("\n🛑 Stopping test app...")
        app_process.terminate()
        app_process.wait(timeout=2)