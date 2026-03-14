#!/usr/bin/env python3
"""
Backend API Testing for APEX Fitness App - 4 Critical Fixes
Testing URL: https://workout-create-hub.preview.emergentagent.com/api

Test Scenarios:
1. Health check endpoint
2. FIX 1: Training style enforcement (powerlifting, calisthenics, crossfit)  
3. FIX 2: Split day context in AI coach
"""

import asyncio
import aiohttp
import json
import sys
from typing import Dict, Any

# Test configuration
BASE_URL = "https://workout-create-hub.preview.emergentagent.com/api"
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
        """Test 1: Health check endpoint"""
        test_name = "Health Check"
        try:
            async with self.session.get(f"{BASE_URL}/health") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("status") == "healthy":
                        self.log_result(test_name, True, "Returns 200 OK with healthy status")
                        return True
                    else:
                        self.log_result(test_name, False, f"Status not healthy: {data}")
                        return False
                else:
                    self.log_result(test_name, False, f"HTTP {resp.status}")
                    return False
        except Exception as e:
            self.log_result(test_name, False, f"Request failed: {str(e)}")
            return False
    
    async def test_powerlifting_style_enforcement(self):
        """Test 2: FIX 1 - Powerlifting style enforcement"""
        test_name = "Powerlifting Style Enforcement"
        try:
            payload = {
                "focusMuscles": ["Chest"],
                "equipment": "full_gym",
                "duration": 45,
                "intensity": "high",
                "trainingStyle": "powerlifting",
                "userProfile": {
                    "name": "Alex", 
                    "trainingExperience": "intermediate"
                }
            }
            
            async with self.session.post(f"{BASE_URL}/generate-workout", 
                                       json=payload, 
                                       headers={"Content-Type": "application/json"}) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    # Verify powerlifting requirements
                    exercises = data.get("exercises", [])
                    if not exercises:
                        self.log_result(test_name, False, "No exercises returned")
                        return False
                    
                    first_exercise = exercises[0].get("name", "").lower()
                    
                    # Check if first exercise is a major compound (bench press or similar)
                    major_compounds = ["bench press", "barbell bench", "squat", "deadlift"]
                    is_compound = any(comp in first_exercise for comp in major_compounds)
                    
                    # Check rep ranges (should be 1-5 for main lifts)
                    main_lift_reps = str(exercises[0].get("reps", ""))
                    low_rep_patterns = ["1-5", "3-5", "1-3", "2-5", "1-4", "3", "4", "5", "1", "2"]
                    is_low_rep = any(pattern in main_lift_reps for pattern in low_rep_patterns)
                    
                    # Check rest periods (should be 180+ seconds)
                    rest_seconds = exercises[0].get("restSeconds", 0)
                    is_long_rest = rest_seconds >= 180
                    
                    # Collect verification results
                    checks = []
                    if is_compound:
                        checks.append("✓ First exercise is major compound")
                    else:
                        checks.append("✗ First exercise not a major compound")
                    
                    if is_low_rep:
                        checks.append("✓ Low rep range (1-5) for main lift")
                    else:
                        checks.append("✗ Rep range not powerlifting style")
                    
                    if is_long_rest:
                        checks.append("✓ Rest period 180+ seconds")
                    else:
                        checks.append("✗ Rest period too short")
                    
                    all_checks_pass = is_compound and is_low_rep and is_long_rest
                    
                    details = f"First exercise: {exercises[0].get('name')}, Reps: {main_lift_reps}, Rest: {rest_seconds}s. Checks: {'; '.join(checks)}"
                    
                    self.log_result(test_name, all_checks_pass, details)
                    return all_checks_pass
                else:
                    error_text = await resp.text()
                    self.log_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            self.log_result(test_name, False, f"Request failed: {str(e)}")
            return False
    
    async def test_calisthenics_style_enforcement(self):
        """Test 3: FIX 1 - Calisthenics style enforcement"""
        test_name = "Calisthenics Style Enforcement"
        try:
            payload = {
                "focusMuscles": ["Chest", "Back"],
                "equipment": "bodyweight",
                "duration": 40,
                "intensity": "moderate",
                "trainingStyle": "calisthenics"
            }
            
            async with self.session.post(f"{BASE_URL}/generate-workout", 
                                       json=payload, 
                                       headers={"Content-Type": "application/json"}) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    exercises = data.get("exercises", [])
                    if not exercises:
                        self.log_result(test_name, False, "No exercises returned")
                        return False
                    
                    # Check that ALL exercises are bodyweight only
                    forbidden_equipment = ["barbell", "dumbbell", "cable", "machine", "kettlebell", "plate"]
                    equipment_violations = []
                    
                    for exercise in exercises:
                        ex_name = exercise.get("name", "").lower()
                        for equipment in forbidden_equipment:
                            if equipment in ex_name:
                                equipment_violations.append(f"{exercise.get('name')} contains '{equipment}'")
                    
                    # Check for proper bodyweight exercises
                    bodyweight_indicators = ["push", "pull", "squat", "lunge", "plank", "dip", "chin", "sit", "handstand", "burpee", "jump"]
                    has_bodyweight = any(any(indicator in ex.get("name", "").lower() for indicator in bodyweight_indicators) for ex in exercises)
                    
                    is_all_bodyweight = len(equipment_violations) == 0
                    
                    if is_all_bodyweight and has_bodyweight:
                        exercise_names = [ex.get("name") for ex in exercises]
                        details = f"All {len(exercises)} exercises are bodyweight-only: {', '.join(exercise_names)}"
                        self.log_result(test_name, True, details)
                        return True
                    else:
                        violation_text = f"Equipment violations: {'; '.join(equipment_violations)}" if equipment_violations else "No clear bodyweight exercises found"
                        self.log_result(test_name, False, violation_text)
                        return False
                        
                else:
                    error_text = await resp.text()
                    self.log_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            self.log_result(test_name, False, f"Request failed: {str(e)}")
            return False
    
    async def test_crossfit_style_enforcement(self):
        """Test 4: FIX 1 - CrossFit style enforcement"""
        test_name = "CrossFit Style Enforcement"
        try:
            payload = {
                "focusMuscles": ["Full Body"],
                "equipment": "full_gym",
                "duration": 30,
                "intensity": "high",
                "trainingStyle": "crossfit"
            }
            
            async with self.session.post(f"{BASE_URL}/generate-workout", 
                                       json=payload, 
                                       headers={"Content-Type": "application/json"}) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    
                    exercises = data.get("exercises", [])
                    title = data.get("title", "")
                    
                    if not exercises:
                        self.log_result(test_name, False, "No exercises returned")
                        return False
                    
                    # Check for CrossFit format indicators in title or notes
                    crossfit_formats = ["amrap", "emom", "for time", "rounds", "time cap"]
                    title_lower = title.lower()
                    has_crossfit_format = any(fmt in title_lower for fmt in crossfit_formats)
                    
                    # Check for functional/Olympic movements
                    functional_movements = ["clean", "jerk", "snatch", "kettlebell", "box jump", "burpee", "thrusters", "deadlift", "pull-up", "double under"]
                    functional_exercises = []
                    
                    for exercise in exercises:
                        ex_name = exercise.get("name", "").lower()
                        for movement in functional_movements:
                            if movement in ex_name:
                                functional_exercises.append(exercise.get("name"))
                                break
                    
                    has_functional_movements = len(functional_exercises) >= 1
                    
                    # Check notes for additional format clues
                    format_in_notes = False
                    for exercise in exercises:
                        notes = exercise.get("notes", "").lower()
                        if any(fmt in notes for fmt in crossfit_formats):
                            format_in_notes = True
                            break
                    
                    has_format = has_crossfit_format or format_in_notes
                    
                    if has_format and has_functional_movements:
                        details = f"Title: '{title}' contains CrossFit format. Functional movements: {', '.join(functional_exercises)}"
                        self.log_result(test_name, True, details)
                        return True
                    else:
                        missing = []
                        if not has_format:
                            missing.append("no AMRAP/EMOM/For Time format")
                        if not has_functional_movements:
                            missing.append("no functional/Olympic movements")
                        details = f"Title: '{title}'. Missing: {', '.join(missing)}"
                        self.log_result(test_name, False, details)
                        return False
                        
                else:
                    error_text = await resp.text()
                    self.log_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            self.log_result(test_name, False, f"Request failed: {str(e)}")
            return False
    
    async def test_coach_split_day_context(self):
        """Test 5: FIX 2 - Split day context in AI Coach"""
        test_name = "Coach Split Day Context"
        try:
            payload = {
                "message": "What should I train today?",
                "context": {
                    "trainingStyle": "bodybuilding",
                    "trainingSplit": "push_pull_legs",
                    "trainingFrequency": 6,
                    "trainingDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                    "userProfile": {
                        "name": "Alex", 
                        "trainingExperience": "intermediate", 
                        "trainingDaysPerWeek": 6
                    }
                }
            }
            
            async with self.session.post(f"{BASE_URL}/coach/chat", 
                                       json=payload, 
                                       headers={"Content-Type": "application/json"}) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    response_text = data.get("response", "").lower()
                    session_id = data.get("session_id")
                    
                    if not response_text:
                        self.log_result(test_name, False, "No response text returned")
                        return False
                    
                    # Check for split day mention (push/pull/legs)
                    split_indicators = ["push", "pull", "legs"]
                    has_split_day = any(indicator in response_text for indicator in split_indicators)
                    
                    # Check for muscle group mentions
                    muscle_groups = ["chest", "shoulders", "triceps", "back", "biceps", "quads", "hamstrings", "glutes", "calves"]
                    mentioned_muscles = [muscle for muscle in muscle_groups if muscle in response_text]
                    
                    # Also check for muscle groups with capital letters (like "Quads")
                    response_text_original = data.get("response", "")
                    capital_muscle_groups = ["Chest", "Shoulders", "Triceps", "Back", "Biceps", "Quads", "Hamstrings", "Glutes", "Calves"]
                    capital_mentioned = [muscle for muscle in capital_muscle_groups if muscle in response_text_original]
                    
                    # Combine both lowercase and capital muscle mentions
                    all_mentioned_muscles = mentioned_muscles + capital_mentioned
                    
                    # Check for bodybuilding style (8-15 rep ranges)
                    rep_indicators = ["8-", "10-", "12-", "15", "hypertrophy", "pump", "isolation"]
                    has_bodybuilding_style = any(indicator in response_text for indicator in rep_indicators)
                    
                    # Verify response quality
                    checks = []
                    if has_split_day:
                        checks.append("✓ Mentions specific split day")
                    else:
                        checks.append("✗ No split day reference")
                    
                    if mentioned_muscles:
                        checks.append(f"✓ Mentions muscle groups: {', '.join(mentioned_muscles)}")
                    elif capital_mentioned:
                        checks.append(f"✓ Mentions muscle groups: {', '.join(capital_mentioned)}")
                    else:
                        checks.append("✗ No muscle group mentions")
                    
                    if has_bodybuilding_style:
                        checks.append("✓ Uses bodybuilding style")
                    else:
                        checks.append("✗ No bodybuilding style indicators")
                    
                    if session_id:
                        checks.append("✓ Returns session_id")
                    else:
                        checks.append("✗ No session_id")
                    
                    # Test passes if it has split day context and muscle mentions
                    test_passed = has_split_day and (len(mentioned_muscles) > 0 or len(capital_mentioned) > 0)
                    
                    details = f"Response length: {len(data.get('response', ''))} chars. Checks: {'; '.join(checks)}"
                    
                    self.log_result(test_name, test_passed, details)
                    return test_passed
                        
                else:
                    error_text = await resp.text()
                    self.log_result(test_name, False, f"HTTP {resp.status}: {error_text}")
                    return False
                    
        except Exception as e:
            self.log_result(test_name, False, f"Request failed: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run all backend tests"""
        print("🏋️  Starting APEX Fitness Backend Testing")
        print(f"📡 Testing URL: {BASE_URL}")
        print("=" * 60)
        
        await self.setup()
        
        try:
            # Run all tests in sequence
            tests = [
                self.test_health_check,
                self.test_powerlifting_style_enforcement,
                self.test_calisthenics_style_enforcement,
                self.test_crossfit_style_enforcement,
                self.test_coach_split_day_context
            ]
            
            results = []
            for test_func in tests:
                result = await test_func()
                results.append(result)
                print()  # Empty line between tests
            
            # Summary
            passed_count = sum(1 for r in results if r)
            total_count = len(results)
            
            print("=" * 60)
            print("📊 TEST SUMMARY")
            print(f"✅ Passed: {passed_count}/{total_count}")
            print(f"❌ Failed: {total_count - passed_count}/{total_count}")
            
            if passed_count == total_count:
                print("🎉 ALL TESTS PASSED - Backend is working correctly!")
                return True
            else:
                print("⚠️  SOME TESTS FAILED - Issues found in backend")
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