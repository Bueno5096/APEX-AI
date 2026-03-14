#!/usr/bin/env python3
"""
Backend API Testing for APEX AI Fitness - Review Request Scenarios
Tests the 3 specific scenarios from the review request with 60s timeout for AI calls
"""

import requests
import json
import time
import sys
from datetime import datetime, timedelta

# Test configuration
BASE_URL = "https://workout-fixes-branch.preview.emergentagent.com/api"
TIMEOUT = 60  # 60 seconds for AI calls as specified

def log_test(message, level="INFO"):
    """Log test messages with timestamp"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def test_health_check():
    """Test 1: Health Check - GET /api/health"""
    log_test("=== TEST 1: HEALTH CHECK ===")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        log_test(f"Health check status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log_test(f"Health check response: {json.dumps(data, indent=2)}")
            log_test("✅ Health check PASSED - Returns 200 OK", "SUCCESS")
            return True
        else:
            log_test(f"❌ Health check FAILED - Expected 200, got {response.status_code}", "ERROR")
            log_test(f"Response: {response.text}", "ERROR")
            return False
            
    except Exception as e:
        log_test(f"❌ Health check FAILED with exception: {str(e)}", "ERROR")
        return False

def test_force_actions():
    """Test 2: FIX 9 - Force Actions with force_actions=true"""
    log_test("=== TEST 2: FORCE ACTIONS (FIX 9) ===")
    
    try:
        # Test data with fullWorkoutPlan containing Bench Press
        test_data = {
            "message": "Change bench press to 5 sets of 5 reps",
            "force_actions": True,
            "context": {
                "coachStyle": "neutral",
                "userProfile": {
                    "name": "Marcus",
                    "age": 28,
                    "gender": "male",
                    "trainingExperience": "intermediate"
                },
                "fullWorkoutPlan": [
                    {
                        "id": "bench_1",
                        "name": "Bench Press",
                        "sets": 3,
                        "reps": "10",
                        "weight": 60,
                        "targetMuscles": ["Chest", "Triceps"],
                        "restSeconds": 120,
                        "notes": "Control the weight on descent"
                    },
                    {
                        "id": "squat_1", 
                        "name": "Barbell Squat",
                        "sets": 3,
                        "reps": "8-10",
                        "weight": 80,
                        "targetMuscles": ["Quads", "Glutes"],
                        "restSeconds": 180,
                        "notes": "Full depth squats"
                    }
                ],
                "activeWorkout": "Upper Body Push Day"
            }
        }
        
        log_test(f"Sending POST request to {BASE_URL}/coach/chat")
        log_test(f"Request includes force_actions=true and fullWorkoutPlan with Bench Press (3 sets, 10 reps, 60kg)")
        
        # Use 60s timeout as specified in review request
        response = requests.post(
            f"{BASE_URL}/coach/chat", 
            json=test_data, 
            timeout=TIMEOUT,
            headers={"Content-Type": "application/json"}
        )
        
        log_test(f"Force actions status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log_test(f"Response keys: {list(data.keys())}")
            
            # Check if response contains actions array
            if "actions" in data and data["actions"] and len(data["actions"]) > 0:
                actions = data["actions"]
                log_test(f"Found {len(actions)} action(s)")
                
                # Look for modify_exercise action that changes sets/reps
                modify_found = False
                for action in actions:
                    action_type = action.get("type")
                    log_test(f"Action type: {action_type}")
                    
                    if action_type == "modify_exercise":
                        exercise_name = action.get("exercise_name", "")
                        new_sets = action.get("new_sets")
                        new_reps = action.get("new_reps")
                        
                        log_test(f"Found modify_exercise action:")
                        log_test(f"  - Exercise: {exercise_name}")
                        log_test(f"  - New sets: {new_sets}")
                        log_test(f"  - New reps: {new_reps}")
                        
                        # Check if it modifies bench press to 5 sets of 5 reps
                        if ("bench press" in exercise_name.lower() or "bench" in exercise_name.lower()):
                            if new_sets == 5 and (str(new_reps) == "5" or new_reps == 5):
                                modify_found = True
                                log_test("✅ MATCH: Bench press modified to 5 sets of 5 reps", "SUCCESS")
                                break
                
                if modify_found:
                    log_test("✅ Force actions PASSED - Contains modify_exercise action that changes sets/reps", "SUCCESS")
                    return True
                else:
                    log_test("❌ Force actions FAILED - No valid modify_exercise action found for bench press with 5 sets of 5 reps", "ERROR")
                    log_test(f"Full actions array: {json.dumps(actions, indent=2)}", "ERROR")
                    return False
            else:
                log_test("❌ Force actions FAILED - No actions array found in response", "ERROR")
                log_test(f"Response body: {json.dumps(data, indent=2)}", "ERROR")
                return False
        else:
            log_test(f"❌ Force actions FAILED - Expected 200, got {response.status_code}", "ERROR")
            log_test(f"Response: {response.text}", "ERROR")
            return False
            
    except requests.Timeout:
        log_test(f"❌ Force actions FAILED - Request timeout after {TIMEOUT}s", "ERROR")
        return False
    except Exception as e:
        log_test(f"❌ Force actions FAILED with exception: {str(e)}", "ERROR")
        return False

def test_ai_workout_generator():
    """Test 3: AI Workout Generator still works"""
    log_test("=== TEST 3: AI WORKOUT GENERATOR ===")
    
    try:
        test_data = {
            "focusMuscles": ["Chest", "Back"],
            "equipment": "full_gym",
            "duration": 45,
            "intensity": "moderate"
        }
        
        log_test(f"Sending POST request to {BASE_URL}/generate-workout")
        log_test(f"Request parameters: focusMuscles=['Chest', 'Back'], equipment='full_gym', duration=45, intensity='moderate'")
        
        # Use 60s timeout as specified
        response = requests.post(
            f"{BASE_URL}/generate-workout",
            json=test_data,
            timeout=TIMEOUT,
            headers={"Content-Type": "application/json"}
        )
        
        log_test(f"Workout generator status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            log_test(f"Response keys: {list(data.keys())}")
            
            # Verify response contains valid exercises array
            if "exercises" in data and isinstance(data["exercises"], list) and len(data["exercises"]) > 0:
                exercises = data["exercises"]
                log_test(f"Found {len(exercises)} exercises")
                
                # Check structure of first few exercises
                valid_structure = True
                structure_details = []
                
                for i, ex in enumerate(exercises[:3]):  # Check first 3 exercises
                    required_fields = ["name", "sets", "reps", "targetMuscles"]
                    present_fields = [field for field in required_fields if field in ex]
                    missing_fields = [field for field in required_fields if field not in ex]
                    
                    ex_name = ex.get('name', 'N/A')
                    ex_sets = ex.get('sets', 'N/A')
                    ex_reps = ex.get('reps', 'N/A')
                    ex_muscles = ex.get('targetMuscles', [])
                    
                    structure_details.append(f"Exercise {i+1}: {ex_name} - {ex_sets}x{ex_reps} - Targets: {ex_muscles}")
                    
                    if missing_fields:
                        log_test(f"Exercise {i+1} missing fields: {missing_fields}", "ERROR")
                        valid_structure = False
                
                # Log exercise details
                for detail in structure_details:
                    log_test(detail)
                
                # Check if exercises target the requested muscles (Chest and Back)
                target_muscles_found = False
                target_muscle_details = []
                
                for ex in exercises:
                    ex_muscles = ex.get("targetMuscles", [])
                    ex_name = ex.get("name", "Unknown")
                    
                    chest_back_muscles = [m for m in ex_muscles if m in ["Chest", "Back"]]
                    if chest_back_muscles:
                        target_muscles_found = True
                        target_muscle_details.append(f"{ex_name} targets {chest_back_muscles}")
                
                if target_muscle_details:
                    log_test(f"Target muscle verification: {'; '.join(target_muscle_details[:3])}")  # Show first 3
                
                if valid_structure and target_muscles_found:
                    log_test("✅ AI Workout Generator PASSED - Valid exercises array with proper structure", "SUCCESS")
                    log_test(f"Workout title: {data.get('title', 'N/A')}")
                    log_test(f"Workout type: {data.get('type', 'N/A')}")
                    log_test(f"Duration: {data.get('duration', 'N/A')} minutes")
                    log_test(f"Intensity: {data.get('intensity', 'N/A')}")
                    return True
                else:
                    if not valid_structure:
                        log_test("❌ AI Workout Generator FAILED - Invalid exercise structure", "ERROR")
                    if not target_muscles_found:
                        log_test("❌ AI Workout Generator FAILED - No exercises targeting requested muscles (Chest/Back)", "ERROR")
                    return False
            else:
                log_test("❌ AI Workout Generator FAILED - No valid exercises array found", "ERROR")
                log_test(f"Response: {json.dumps(data, indent=2)}")
                return False
        else:
            log_test(f"❌ AI Workout Generator FAILED - Expected 200, got {response.status_code}", "ERROR")
            log_test(f"Response: {response.text}", "ERROR")
            return False
            
    except requests.Timeout:
        log_test(f"❌ AI Workout Generator FAILED - Request timeout after {TIMEOUT}s", "ERROR")
        return False
    except Exception as e:
        log_test(f"❌ AI Workout Generator FAILED with exception: {str(e)}", "ERROR")
        return False

def main():
    """Run all backend tests for review request scenarios"""
    log_test("🚀 STARTING APEX AI FITNESS BACKEND TESTING - REVIEW REQUEST SCENARIOS")
    log_test(f"Base URL: {BASE_URL}")
    log_test(f"Timeout: {TIMEOUT}s for AI calls")
    log_test("=" * 80)
    
    results = []
    
    # Test 1: Health Check
    results.append(("Health Check", test_health_check()))
    log_test("=" * 80)
    
    # Test 2: Force Actions (FIX 9)
    results.append(("FIX 9 - Force Actions", test_force_actions()))
    log_test("=" * 80)
    
    # Test 3: AI Workout Generator
    results.append(("AI Workout Generator", test_ai_workout_generator()))
    log_test("=" * 80)
    
    # Summary
    log_test("🏁 BACKEND TESTING SUMMARY")
    log_test("=" * 80)
    
    passed = 0
    total = len(results)
    
    for test_name, passed_test in results:
        status = "✅ PASSED" if passed_test else "❌ FAILED"
        log_test(f"{test_name}: {status}")
        if passed_test:
            passed += 1
    
    log_test("=" * 80)
    log_test(f"OVERALL RESULT: {passed}/{total} tests passed")
    
    if passed == total:
        log_test("🎉 ALL BACKEND TESTS PASSED!", "SUCCESS")
        return True
    else:
        log_test(f"⚠️  {total - passed} test(s) failed", "ERROR")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)