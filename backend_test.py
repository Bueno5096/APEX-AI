#!/usr/bin/env python3
"""
Goal Layering Validation Tests for AI Coach Endpoint
Tests the new secondary goal context functionality
"""

import asyncio
import aiohttp
import json
import sys
from typing import Dict, Any

# Backend URL from environment
BACKEND_URL = "https://draggable-fitness-ui.preview.emergentagent.com"

class GoalLayeringTester:
    def __init__(self):
        self.session = None
        self.results = []
        
    async def setup(self):
        """Initialize HTTP session"""
        timeout = aiohttp.ClientTimeout(total=30)
        self.session = aiohttp.ClientSession(timeout=timeout)
        
    async def cleanup(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
            
    async def test_health_check(self):
        """Test 1: GET /api/health - should return 200"""
        print("🔍 Test 1: Health Check Endpoint")
        try:
            async with self.session.get(f"{BACKEND_URL}/api/health") as response:
                status_code = response.status
                data = await response.json()
                
                success = status_code == 200
                print(f"   Status: {status_code}")
                print(f"   Response: {data}")
                print(f"   ✅ PASS" if success else f"   ❌ FAIL")
                
                self.results.append({
                    "test": "Health Check",
                    "status": "PASS" if success else "FAIL",
                    "details": f"Status {status_code}, Response: {data}"
                })
                return success
                
        except Exception as e:
            print(f"   ❌ FAIL - Exception: {e}")
            self.results.append({
                "test": "Health Check", 
                "status": "FAIL",
                "details": f"Exception: {e}"
            })
            return False
            
    async def test_coach_with_secondary_goal(self):
        """Test 2: POST /api/coach/chat with secondary goal context"""
        print("\n🔍 Test 2: Coach Chat with Secondary Goal Context")
        
        payload = {
            "message": "How should I adjust my training this week?",
            "context": {
                "coachStyle": "neutral",
                "userProfile": {
                    "name": "Alex Johnson",
                    "fitnessGoals": ["Build Muscle"],
                    "trainingExperience": "intermediate"
                },
                "secondaryGoal": {
                    "type": "reduce_bodyfat",
                    "targetValue": 15,
                    "startingValue": 25,
                    "currentValue": 22,
                    "timeframeWeeks": 13,
                    "startDate": "2025-01-01T00:00:00Z",
                    "isActive": True
                }
            }
        }
        
        try:
            async with self.session.post(
                f"{BACKEND_URL}/api/coach/chat",
                json=payload,
                headers={'Content-Type': 'application/json'}
            ) as response:
                status_code = response.status
                data = await response.json()
                
                print(f"   Status: {status_code}")
                print(f"   Response length: {len(data.get('response', ''))}")
                print(f"   Session ID: {data.get('session_id', 'None')}")
                
                # Validation checks
                checks = []
                
                # Check 1: Status 200
                status_ok = status_code == 200
                checks.append(f"Status 200: {'✅' if status_ok else '❌'}")
                
                # Check 2: Response mentions both building muscle AND fat loss/body fat
                response_text = data.get('response', '').lower()
                mentions_muscle = any(term in response_text for term in ['muscle', 'build', 'strength', 'hypertrophy'])
                mentions_fat = any(term in response_text for term in ['fat', 'body fat', 'lean', 'composition', 'cutting'])
                dual_goal_awareness = mentions_muscle and mentions_fat
                checks.append(f"Mentions both muscle building AND fat loss: {'✅' if dual_goal_awareness else '❌'}")
                
                # Check 3: Response does NOT include diet or nutrition advice
                no_diet_advice = not any(term in response_text for term in ['diet', 'nutrition', 'calorie', 'eat', 'food', 'meal'])
                checks.append(f"No diet/nutrition advice: {'✅' if no_diet_advice else '❌'}")
                
                # Check 4: Response is concise (under 150 words)
                word_count = len(data.get('response', '').split())
                is_concise = word_count <= 150
                checks.append(f"Concise (≤150 words): {'✅' if is_concise else '❌'} ({word_count} words)")
                
                all_pass = status_ok and dual_goal_awareness and no_diet_advice and is_concise
                
                print(f"   Validation Checks:")
                for check in checks:
                    print(f"     {check}")
                    
                print(f"\n   Response Preview:")
                print(f"   \"{data.get('response', '')[:200]}...\"")
                print(f"   {'✅ PASS' if all_pass else '❌ FAIL'}")
                
                self.results.append({
                    "test": "Coach with Secondary Goal",
                    "status": "PASS" if all_pass else "FAIL", 
                    "details": f"Status {status_code}, Word count: {word_count}, Dual awareness: {dual_goal_awareness}, No diet: {no_diet_advice}"
                })
                return all_pass
                
        except Exception as e:
            print(f"   ❌ FAIL - Exception: {e}")
            self.results.append({
                "test": "Coach with Secondary Goal",
                "status": "FAIL",
                "details": f"Exception: {e}"
            })
            return False
            
    async def test_coach_without_secondary_goal(self):
        """Test 3: POST /api/coach/chat WITHOUT secondary goal context"""
        print("\n🔍 Test 3: Coach Chat WITHOUT Secondary Goal Context")
        
        payload = {
            "message": "What's a good chest exercise?"
        }
        
        try:
            async with self.session.post(
                f"{BACKEND_URL}/api/coach/chat",
                json=payload,
                headers={'Content-Type': 'application/json'}
            ) as response:
                status_code = response.status
                data = await response.json()
                
                print(f"   Status: {status_code}")
                print(f"   Response length: {len(data.get('response', ''))}")
                print(f"   Session ID: {data.get('session_id', 'None')}")
                
                # Basic validation
                success = status_code == 200 and len(data.get('response', '')) > 0
                
                print(f"   Response Preview:")
                print(f"   \"{data.get('response', '')[:150]}...\"")
                print(f"   {'✅ PASS' if success else '❌ FAIL'}")
                
                self.results.append({
                    "test": "Coach without Secondary Goal",
                    "status": "PASS" if success else "FAIL",
                    "details": f"Status {status_code}, Response length: {len(data.get('response', ''))}"
                })
                return success
                
        except Exception as e:
            print(f"   ❌ FAIL - Exception: {e}")
            self.results.append({
                "test": "Coach without Secondary Goal",
                "status": "FAIL", 
                "details": f"Exception: {e}"
            })
            return False
            
    async def run_all_tests(self):
        """Run all validation tests"""
        print(f"🚀 Starting Goal Layering Validation Tests")
        print(f"📡 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        await self.setup()
        
        try:
            # Run all tests
            test1 = await self.test_health_check()
            test2 = await self.test_coach_with_secondary_goal()
            test3 = await self.test_coach_without_secondary_goal()
            
            # Summary
            print("\n" + "=" * 60)
            print("📊 TEST SUMMARY:")
            
            all_passed = True
            for result in self.results:
                status_icon = "✅" if result["status"] == "PASS" else "❌"
                print(f"   {status_icon} {result['test']}: {result['status']}")
                if result["status"] == "FAIL":
                    all_passed = False
                    
            print(f"\n🎯 OVERALL: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
            return all_passed
            
        finally:
            await self.cleanup()

async def main():
    """Main test runner"""
    tester = GoalLayeringTester()
    success = await tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())