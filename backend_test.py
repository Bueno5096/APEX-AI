#!/usr/bin/env python3
"""
APEX AI Fitness Backend Test Suite - Review Request Scenarios
Testing URL: https://workout-fixes-branch.preview.emergentagent.com/api

Test Scenarios from Review Request:
1. Health Check (GET /api/health) — verify returns 200 OK  
2. Force Actions Coach Chat (POST /api/coach/chat with force_actions=true)
3. AI Workout Generation (POST /api/generate-workout)
"""

import asyncio
import aiohttp
import json
import sys
from typing import Dict, Any
from datetime import datetime

# Test configuration
BASE_URL = "https://workout-fixes-branch.preview.emergentagent.com/api"
TIMEOUT = 60  # 60 seconds for AI calls as specified

class BackendTester:
    def __init__(self):
        self.session = None
        self.results = []
        
    async def setup(self):
        """Initialize HTTP session"""
        timeout = aiohttp.ClientTimeout(total=TIMEOUT)
        self.session = aiohttp.ClientSession(timeout=timeout)
        
    async def cleanup(self):
        """Close HTTP session"""
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, passed: bool, details: str):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
        print(f"    {details}")
        self.results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })
        
    async def test_health_check(self):
        """Test 1: Health Check - GET /api/health — verify returns 200 OK"""
        test_name = "Health Check"
        try:
            async with self.session.get(f"{BASE_URL}/health") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("status") == "healthy" and "timestamp" in data:
                        self.log_result(test_name, True, f"Returns 200 OK with healthy status and timestamp: {data['timestamp']}")
                        return True
                    else:
                        self.log_result(test_name, False, f"Invalid response structure: {data}")
                        return False
                else:
                    self.log_result(test_name, False, f"HTTP {resp.status}")
                    return False
        except Exception as e:
            self.log_result(test_name, False, f"Request failed: {str(e)}")
            return False
    
    async def test_force_actions_coach_chat(self):
        """Test 2: Force Actions Coach Chat with fullWorkoutPlan context"""
        test_name = "Force Actions Coach Chat"
        try:
            # Exact payload from review request
            payload = {
                "message": "swap bench press for dumbbell press",
                "force_actions": True,
                "context": {
                    "activeWorkout": "Push Day",
                    "fullWorkoutPlan": [
                        {
                            "name": "Bench Press",
                            "sets": 4,
                            "reps": "8-10", 
                            "weight": 70,
                            "targetMuscles": ["Chest"]
                        },
                        {
                            "name": "Shoulder Press",
                            "sets": 3,
                            "reps": "10-12",
                            "weight": 40,
                            "targetMuscles": ["Shoulders"]
                        }
                    ],
                    "workoutExercises": [
                        {
                            "name": "Bench Press",
                            "sets": 4,
                            "reps": "8-10",
                            "weight": 70
                        },
                        {
                            "name": "Shoulder Press", 
                            "sets": 3,
                            "reps": "10-12",
                            "weight": 40
                        }
                    ]
                }
            }
            
            async with self.session.post(f"{BASE_URL}/coach/chat", 
                                       json=payload, 
                                       headers={"Content-Type": "application/json"}) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verify basic response structure
                    if not ("response" in data and "session_id" in data):
                        self.log_result(test_name, False, f"Missing required fields. Keys: {list(data.keys())}")
                        return False
                    
                    # Critical verification: Check for actions array with swap_exercise action
                    if "actions" in data and data["actions"]:
                        actions = data["actions"]
                        
                        # Look for swap_exercise action that replaces Bench Press with dumbbell variation
                        swap_found = False
                        for action in actions:
                            if action.get("type") == "swap_exercise":
                                exercise_name = action.get("exercise_name", "")
                                new_exercise = action.get("new_exercise_name", "")
                                
                                # Verify it's swapping Bench Press for dumbbell variant
                                if "bench press" in exercise_name.lower() and "dumbbell" in new_exercise.lower():
                                    details = f"✅ VERIFIED: Actions array contains swap_exercise action - '{exercise_name}' → '{new_exercise}' (force_actions working correctly)"
                                    self.log_result(test_name, True, details)
                                    swap_found = True
                                    break
                        
                        if not swap_found:
                            details = f"❌ No valid swap_exercise action found. Actions returned: {actions}"
                            self.log_result(test_name, False, details)
                            return False
                        
                        return True
                        
                    else:
                        details = f"❌ CRITICAL: No actions array returned despite force_actions=true. Response keys: {list(data.keys())}"
                        self.log_result(test_name, False, details)
                        return False
                        
                else:
                    error_text = await resp.text()
                    self.log_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            self.log_result(test_name, False, f"Request failed: {str(e)}")
            return False
    
    async def test_ai_workout_generation(self):
        """Test 3: AI Workout Generation with specified parameters"""
        test_name = "AI Workout Generation"
        try:
            # Exact payload from review request
            payload = {
                "focusMuscles": ["Chest", "Back"],
                "equipment": "full_gym",
                "duration": 45,
                "intensity": "moderate"
            }
            
            async with self.session.post(f"{BASE_URL}/generate-workout", 
                                       json=payload, 
                                       headers={"Content-Type": "application/json"}) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verify response has valid exercises array
                    if "exercises" in data and isinstance(data["exercises"], list):
                        exercises = data["exercises"]
                        if len(exercises) > 0:
                            # Verify exercise structure
                            valid_exercises = 0
                            for ex in exercises:
                                required_fields = ["name", "sets", "reps", "targetMuscles"]
                                if all(field in ex for field in required_fields):
                                    valid_exercises += 1
                            
                            # Verify focus muscles are targeted
                            target_muscles_found = set()
                            for ex in exercises:
                                if "targetMuscles" in ex:
                                    for muscle in ex["targetMuscles"]:
                                        target_muscles_found.add(muscle.lower())
                            
                            # More flexible muscle targeting verification
                            # Accept any back-related muscles (lats, rhomboids, teres, traps) as "back"
                            back_muscles = ['back', 'lats', 'latissimus', 'rhomboids', 'teres', 'trapezius', 'traps']
                            chest_muscles = ['chest', 'pectorals', 'pecs']
                            
                            chest_targeted = any(muscle in target_muscles_found for muscle in chest_muscles)
                            back_targeted = any(muscle in target_muscles_found for muscle in back_muscles)
                            
                            if valid_exercises == len(exercises) and chest_targeted and back_targeted:
                                workout_title = data.get("title", "Generated Workout")
                                details = f"✅ VERIFIED: Generated '{workout_title}' with {len(exercises)} valid exercises targeting Chest and Back muscles correctly"
                                self.log_result(test_name, True, details)
                                return True
                            else:
                                issues = []
                                if valid_exercises != len(exercises):
                                    issues.append(f"only {valid_exercises}/{len(exercises)} exercises have valid structure")
                                if not chest_targeted:
                                    issues.append("chest not targeted")
                                if not back_targeted:
                                    issues.append("back muscles not targeted")
                                details = f"❌ Issues found: {', '.join(issues)}. Target muscles found: {sorted(target_muscles_found)}"
                                self.log_result(test_name, False, details)
                                return False
                        else:
                            self.log_result(test_name, False, "❌ Empty exercises array returned")
                            return False
                    else:
                        self.log_result(test_name, False, f"❌ No valid exercises array in response. Keys: {list(data.keys())}")
                        return False
                        
                else:
                    error_text = await resp.text()
                    self.log_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            self.log_result(test_name, False, f"Request failed: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run all backend tests from the review request"""
        print("🏋️  Starting APEX AI Fitness Backend Testing - Review Request Scenarios")
        print(f"📡 Testing URL: {BASE_URL}")
        print(f"⏱️  Timeout: {TIMEOUT}s for AI calls")
        print("=" * 80)
        
        await self.setup()
        
        try:
            # Run the 3 specific tests from review request
            tests = [
                ("Test 1", self.test_health_check),
                ("Test 2", self.test_force_actions_coach_chat),
                ("Test 3", self.test_ai_workout_generation)
            ]
            
            results = []
            for test_label, test_func in tests:
                print(f"\n{test_label}: Running {test_func.__doc__.split(':')[1].split('(')[0].strip()}...")
                result = await test_func()
                results.append(result)
                print()  # Empty line between tests
            
            # Summary
            passed_count = sum(1 for r in results if r)
            total_count = len(results)
            
            print("=" * 80)
            print("📊 REVIEW REQUEST TEST SUMMARY")
            print("=" * 80)
            print(f"✅ Passed: {passed_count}/{total_count}")
            print(f"❌ Failed: {total_count - passed_count}/{total_count}")
            
            if passed_count == total_count:
                print("🎉 ALL REVIEW REQUEST TESTS PASSED!")
                print("✅ Health check endpoint working")
                print("✅ Force actions coach chat working")
                print("✅ AI workout generation working")
                return True
            else:
                print("⚠️  SOME TESTS FAILED - Issues found requiring attention")
                return False
                
        finally:
            await self.cleanup()

# Main execution
async def main():
    tester = BackendTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())