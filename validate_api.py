#!/usr/bin/env python3
"""API validation script for production deployment."""

import asyncio
import httpx
import json
import sys
import time
from typing import Dict, List, Optional, Tuple
from config import get_settings


class APIValidator:
    """Validates API endpoints and configurations."""
    
    def __init__(self, base_url: str = None):
        self.settings = get_settings()
        self.base_url = base_url or f"http://{self.settings.host}:{self.settings.port}"
        self.client = httpx.AsyncClient(timeout=30.0)
        self.results = []
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def log_result(self, test_name: str, success: bool, message: str, details: Dict = None):
        """Log test result."""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": time.time(),
            "details": details or {}
        }
        self.results.append(result)
        
        status = "✓" if success else "✗"
        print(f"{status} {test_name}: {message}")
        
        if details and not success:
            for key, value in details.items():
                print(f"  {key}: {value}")
    
    async def test_health_endpoint(self) -> bool:
        """Test health check endpoint."""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_result("Health Check", True, "API is healthy")
                    return True
                else:
                    self.log_result("Health Check", False, "Unhealthy status", {"response": data})
                    return False
            else:
                self.log_result("Health Check", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Health Check", False, f"Connection failed: {str(e)}")
            return False
    
    async def test_metrics_endpoint(self) -> bool:
        """Test metrics endpoint."""
        try:
            response = await self.client.get(f"{self.base_url}/metrics")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["active_connections", "rate_limit"]
                
                for field in required_fields:
                    if field not in data:
                        self.log_result("Metrics", False, f"Missing field: {field}", {"response": data})
                        return False
                
                self.log_result("Metrics", True, "Metrics endpoint working")
                return True
            else:
                self.log_result("Metrics", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Metrics", False, f"Request failed: {str(e)}")
            return False
    
    async def test_status_endpoint(self) -> bool:
        """Test status endpoint."""
        try:
            response = await self.client.get(f"{self.base_url}/status")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["database", "external_apis", "rate_limiting"]
                
                for field in required_fields:
                    if field not in data:
                        self.log_result("Status", False, f"Missing field: {field}", {"response": data})
                        return False
                
                self.log_result("Status", True, "Status endpoint working")
                return True
            else:
                self.log_result("Status", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Status", False, f"Request failed: {str(e)}")
            return False
    
    async def test_cors_headers(self) -> bool:
        """Test CORS headers."""
        try:
            # Test preflight request
            headers = {
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type"
            }
            
            response = await self.client.options(f"{self.base_url}/health", headers=headers)
            
            cors_headers = [
                "access-control-allow-origin",
                "access-control-allow-methods",
                "access-control-allow-headers"
            ]
            
            missing_headers = []
            for header in cors_headers:
                if header not in response.headers:
                    missing_headers.append(header)
            
            if missing_headers:
                self.log_result("CORS Headers", False, "Missing CORS headers", {"missing": missing_headers})
                return False
            else:
                self.log_result("CORS Headers", True, "CORS headers present")
                return True
                
        except Exception as e:
            self.log_result("CORS Headers", False, f"Request failed: {str(e)}")
            return False
    
    async def test_security_headers(self) -> bool:
        """Test security headers."""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            
            security_headers = [
                "x-content-type-options",
                "x-frame-options",
                "x-xss-protection",
                "referrer-policy"
            ]
            
            if self.settings.is_production:
                security_headers.extend(["content-security-policy", "strict-transport-security"])
            
            missing_headers = []
            for header in security_headers:
                if header not in response.headers:
                    missing_headers.append(header)
            
            if missing_headers:
                self.log_result("Security Headers", False, "Missing security headers", {"missing": missing_headers})
                return False
            else:
                self.log_result("Security Headers", True, "Security headers present")
                return True
                
        except Exception as e:
            self.log_result("Security Headers", False, f"Request failed: {str(e)}")
            return False
    
    async def test_rate_limiting(self) -> bool:
        """Test rate limiting."""
        try:
            # Make multiple rapid requests
            tasks = []
            for i in range(15):  # Exceed typical rate limit
                tasks.append(self.client.get(f"{self.base_url}/health"))
            
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            rate_limited = False
            for response in responses:
                if isinstance(response, httpx.Response) and response.status_code == 429:
                    rate_limited = True
                    break
            
            if rate_limited:
                self.log_result("Rate Limiting", True, "Rate limiting is working")
                return True
            else:
                self.log_result("Rate Limiting", False, "Rate limiting not triggered")
                return False
                
        except Exception as e:
            self.log_result("Rate Limiting", False, f"Test failed: {str(e)}")
            return False
    
    async def test_authentication_endpoints(self) -> bool:
        """Test authentication endpoints."""
        try:
            # Test login endpoint
            login_data = {
                "username": "admin",
                "password": "admin123"
            }
            
            response = await self.client.post(f"{self.base_url}/api/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data:
                    self.log_result("Authentication", True, "Login endpoint working")
                    return True
                else:
                    self.log_result("Authentication", False, "No access token in response", {"response": data})
                    return False
            else:
                self.log_result("Authentication", False, f"Login failed: HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Authentication", False, f"Request failed: {str(e)}")
            return False
    
    async def test_database_connection(self) -> bool:
        """Test database connectivity through API."""
        try:
            response = await self.client.get(f"{self.base_url}/drugs?limit=1")
            
            if response.status_code == 200:
                self.log_result("Database Connection", True, "Database accessible")
                return True
            else:
                self.log_result("Database Connection", False, f"HTTP {response.status_code}", {"response": response.text})
                return False
                
        except Exception as e:
            self.log_result("Database Connection", False, f"Request failed: {str(e)}")
            return False
    
    async def test_external_api_connectivity(self) -> bool:
        """Test external API connectivity."""
        try:
            # Test OpenFDA connectivity
            response = await self.client.get("https://api.fda.gov/drug/ndc.json?limit=1")
            
            if response.status_code == 200:
                self.log_result("External APIs", True, "OpenFDA API accessible")
                return True
            else:
                self.log_result("External APIs", False, f"OpenFDA API: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("External APIs", False, f"OpenFDA API failed: {str(e)}")
            return False
    
    async def run_all_tests(self) -> Tuple[int, int]:
        """Run all validation tests."""
        print(f"\n🔍 Validating API at {self.base_url}")
        print(f"Environment: {self.settings.environment}")
        print("=" * 50)
        
        tests = [
            self.test_health_endpoint,
            self.test_metrics_endpoint,
            self.test_status_endpoint,
            self.test_cors_headers,
            self.test_security_headers,
            self.test_rate_limiting,
            self.test_authentication_endpoints,
            self.test_database_connection,
            self.test_external_api_connectivity
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            try:
                if await test():
                    passed += 1
            except Exception as e:
                print(f"✗ {test.__name__}: Unexpected error: {str(e)}")
        
        print("\n" + "=" * 50)
        print(f"📊 Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! API is ready for production.")
        else:
            print(f"⚠️  {total - passed} tests failed. Please review and fix issues.")
        
        return passed, total
    
    def save_report(self, filename: str = "api_validation_report.json"):
        """Save validation report to file."""
        report = {
            "timestamp": time.time(),
            "environment": self.settings.environment,
            "base_url": self.base_url,
            "results": self.results,
            "summary": {
                "total_tests": len(self.results),
                "passed": sum(1 for r in self.results if r["success"]),
                "failed": sum(1 for r in self.results if not r["success"])
            }
        }
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Report saved to {filename}")


async def main():
    """Main validation function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Validate API endpoints")
    parser.add_argument("--url", default=None, help="Base URL for API (default: from config)")
    parser.add_argument("--report", default="api_validation_report.json", help="Report filename")
    args = parser.parse_args()
    
    async with APIValidator(args.url) as validator:
        passed, total = await validator.run_all_tests()
        validator.save_report(args.report)
        
        # Exit with error code if tests failed
        if passed < total:
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())