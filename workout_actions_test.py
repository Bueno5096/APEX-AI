#!/usr/bin/env python3
"""
AI Coach Workout Actions Test
Specifically tests the workout creation/modification actions functionality
"""

import asyncio
import aiohttp
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://smart-workout-ai-14.preview.emergentagent.com"

class WorkoutActionsTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = None
        self.results = []
        
    async def setup(self):
        """Setup HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()
    
    async def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status} {test_name}: {details}")
        
    async def test_health_check(self):
        """Test 1: Health check endpoint (200 status)"""
        try:
            async with self.session.get(f"{self.base_url}/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    await self.log_test("Health Check", True, f"Status: {data.get('status')}")
                    return True
                else:
                    await self.log_test("Health Check", False, f"HTTP {response.status}")
                    return False
        except Exception as e:
            await self.log_test("Health Check", False, f"Error: {str(e)}")
            return False
    
    async def test_workout_creation(self):
        """Test 2: Workout creation should return set_workout action with legs type"""
        try:
            payload = {
                "message": "Create me a leg day workout"
            }
            
            headers = {"Content-Type": "application/json"}
            
            async with self.session.post(
                f"{self.base_url}/api/coach/chat", 
                json=payload, 
                headers=headers
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Check basic response structure
                    if 'response' not in data or 'session_id' not in data:
                        await self.log_test("Workout Creation", False, "Missing required response fields")
                        return False
                    
                    # Check for actions array
                    actions = data.get('actions')
                    if actions is None:
                        await self.log_test("Workout Creation", False, "No actions field in response - AI may not have understood request")
                        return False
                    
                    if not isinstance(actions, list):
                        await self.log_test("Workout Creation", False, f"Actions field is not a list: {type(actions)}")
                        return False
                        
                    if len(actions) == 0:
                        await self.log_test("Workout Creation", False, "Actions array is empty")
                        return False
                    
                    # Look for set_workout action with legs type
                    set_workout_found = False
                    for action in actions:
                        if action.get('type') == 'set_workout':
                            workout_type = action.get('workout_type')
                            if workout_type == 'legs':
                                set_workout_found = True
                                break
                    
                    if set_workout_found:
                        await self.log_test("Workout Creation", True, f"✓ Found set_workout action with legs type. Total actions: {len(actions)}")
                        return True
                    else:
                        await self.log_test("Workout Creation", False, f"No set_workout action with legs type. Actions received: {actions}")
                        return False
                        
                else:
                    response_text = await response.text()
                    await self.log_test("Workout Creation", False, f"HTTP {response.status}: {response_text}")
                    return False
                    
        except Exception as e:
            await self.log_test("Workout Creation", False, f"Request error: {str(e)}")
            return False
    
    async def test_workout_modification(self):
        """Test 3: Workout modification should return modify_exercise action for Bench Press"""
        try:
            payload = {
                "message": "Change the bench press to 5 sets of 5 reps at 100kg",
                "context": {
                    "activeWorkout": "Push Day",
                    "workoutExercises": [
                        {
                            "name": "Bench Press", 
                            "sets": 4, 
                            "reps": "8-10", 
                            "weight": 80, 
                            "targetMuscles": ["chest", "triceps"]
                        },
                        {
                            "name": "Overhead Press", 
                            "sets": 3, 
                            "reps": "8-10", 
                            "weight": 50, 
                            "targetMuscles": ["shoulders"]
                        }
                    ]
                }
            }
            
            headers = {"Content-Type": "application/json"}
            
            async with self.session.post(
                f"{self.base_url}/api/coach/chat", 
                json=payload, 
                headers=headers
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Check for actions array
                    actions = data.get('actions')
                    if not actions or not isinstance(actions, list):
                        await self.log_test("Workout Modification", False, f"No valid actions array: {actions}")
                        return False
                    
                    # Look for modify_exercise action for Bench Press
                    modify_found = False
                    for action in actions:
                        if action.get('type') == 'modify_exercise':
                            exercise_name = str(action.get('exercise_name', '')).lower()
                            if 'bench press' in exercise_name:
                                modify_found = True
                                # Check if it has the right parameters
                                new_sets = action.get('new_sets')
                                new_reps = action.get('new_reps') 
                                new_weight = action.get('new_weight')
                                details = f"Sets:{new_sets}, Reps:{new_reps}, Weight:{new_weight}"
                                await self.log_test("Workout Modification", True, f"✓ Found modify_exercise for Bench Press. {details}")
                                return True
                    
                    if not modify_found:
                        await self.log_test("Workout Modification", False, f"No modify_exercise action for Bench Press. Actions: {actions}")
                        return False
                        
                else:
                    response_text = await response.text()
                    await self.log_test("Workout Modification", False, f"HTTP {response.status}: {response_text}")
                    return False
                    
        except Exception as e:
            await self.log_test("Workout Modification", False, f"Request error: {str(e)}")
            return False
    
    async def test_exercise_swap(self):
        """Test 4: Exercise swap should return swap_exercise action"""
        try:
            payload = {
                "message": "Swap bench press for dumbbell press",
                "context": {
                    "activeWorkout": "Push Day",
                    "workoutExercises": [
                        {
                            "name": "Bench Press", 
                            "sets": 4, 
                            "reps": "8-10", 
                            "weight": 80, 
                            "targetMuscles": ["chest", "triceps"]
                        }
                    ]
                }
            }
            
            headers = {"Content-Type": "application/json"}
            
            async with self.session.post(
                f"{self.base_url}/api/coach/chat", 
                json=payload, 
                headers=headers
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Check for actions array
                    actions = data.get('actions')
                    if not actions or not isinstance(actions, list):
                        await self.log_test("Exercise Swap", False, f"No valid actions array: {actions}")
                        return False
                    
                    # Look for swap_exercise action
                    swap_found = False
                    for action in actions:
                        if action.get('type') == 'swap_exercise':
                            old_exercise = action.get('exercise_name', '')
                            new_exercise = action.get('new_exercise_name', '')
                            await self.log_test("Exercise Swap", True, f"✓ Found swap_exercise: {old_exercise} → {new_exercise}")
                            return True
                    
                    if not swap_found:
                        await self.log_test("Exercise Swap", False, f"No swap_exercise action found. Actions: {actions}")
                        return False
                        
                else:
                    response_text = await response.text()
                    await self.log_test("Exercise Swap", False, f"HTTP {response.status}: {response_text}")
                    return False
                    
        except Exception as e:
            await self.log_test("Exercise Swap", False, f"Request error: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run all workout action tests"""
        print(f"\n🏋️ AI COACH WORKOUT ACTIONS TEST")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 70)
        
        await self.setup()
        
        try:
            # Run tests in order
            test_1 = await self.test_health_check()
            test_2 = await self.test_workout_creation()
            test_3 = await self.test_workout_modification()  
            test_4 = await self.test_exercise_swap()
            
            # Summary
            passed = sum(1 for r in self.results if r['success'])
            total = len(self.results)
            
            print("=" * 70)
            print(f"📊 TEST SUMMARY: {passed}/{total} tests passed")
            
            if passed == total:
                print("🎉 All workout action tests passed! AI Coach actions working correctly.")
                return True
            else:
                print("⚠️  Some tests failed. Action functionality needs attention.")
                
                # Show detailed failure info
                print("\n📋 DETAILED RESULTS:")
                for result in self.results:
                    status = "✅" if result['success'] else "❌"
                    print(f"   {status} {result['test']}: {result['details']}")
                
                return False
                
        finally:
            await self.cleanup()

async def main():
    """Main test runner"""
    tester = WorkoutActionsTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())