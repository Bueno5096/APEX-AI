#!/usr/bin/env python3
"""
AI Coach Backend Testing Script
Tests the AI Coach chat endpoint with comprehensive user context data
"""
import asyncio
import aiohttp
import json
import sys
import os
from typing import Dict, Any, List

# Backend URL from frontend .env
BACKEND_URL = "https://smart-workout-ai-14.preview.emergentagent.com"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_success(message: str):
    print(f"{Colors.GREEN}✅ {message}{Colors.RESET}")

def print_failure(message: str):
    print(f"{Colors.RED}❌ {message}{Colors.RESET}")

def print_info(message: str):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.RESET}")

def print_warning(message: str):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.RESET}")

class AICoachTester:
    def __init__(self):
        self.session = None
        self.test_results = {
            "health_check": False,
            "full_context_chat": False,
            "minimal_context_chat": False
        }
        self.detailed_results = []

    async def setup(self):
        """Initialize the test session"""
        self.session = aiohttp.ClientSession()
        print_info("Starting AI Coach comprehensive testing...")

    async def cleanup(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()

    async def test_health_check(self) -> bool:
        """Test 1: Health check endpoint"""
        print_info("Testing health check endpoint...")
        
        try:
            async with self.session.get(f"{BACKEND_URL}/api/health") as response:
                if response.status == 200:
                    data = await response.json()
                    print_success(f"Health check passed - Status: {data.get('status')}")
                    self.detailed_results.append("✅ Health check endpoint returns 200 OK")
                    return True
                else:
                    print_failure(f"Health check failed - Status code: {response.status}")
                    self.detailed_results.append(f"❌ Health check failed with status {response.status}")
                    return False
        except Exception as e:
            print_failure(f"Health check error: {str(e)}")
            self.detailed_results.append(f"❌ Health check error: {str(e)}")
            return False

    async def test_full_context_chat(self) -> bool:
        """Test 2: Full context chat with comprehensive user data"""
        print_info("Testing full context chat with comprehensive user data...")
        
        payload = {
            "message": "What should I focus on today?",
            "context": {
                "recoveryScore": 72,
                "sleepDuration": 7.2,
                "hrv": 55,
                "coachStyle": "neutral",
                "userProfile": {
                    "name": "Marcus",
                    "age": 28,
                    "gender": "male",
                    "height": 178,
                    "weight": 75,
                    "trainingExperience": "intermediate",
                    "fitnessGoals": ["Build Muscle", "Improve Strength"],
                    "trainingDaysPerWeek": 4,
                    "workoutLocation": "Gym",
                    "injuries": "Minor left shoulder impingement"
                },
                "bodyComposition": {
                    "hasCalculated": True,
                    "bodyFatPercent": 16.4,
                    "bodyFatCategory": "Fitness",
                    "leanBMI": 19.8,
                    "leanBMICategory": "Normal",
                    "ffmi": 19.8,
                    "ffmiCategory": "Above Average",
                    "tdee": 2650,
                    "idealWeightMinKg": 70,
                    "idealWeightMaxKg": 82,
                    "muscleToFatRatio": 5.1,
                    "muscleToFatCategory": "Good",
                    "leanMassKg": 62.7,
                    "fatMassKg": 12.3,
                    "lastUpdated": "2025-06-10",
                    "trend": "improving (body fat decreasing)"
                },
                "muscleReadiness": [
                    {"name": "Chest", "readiness": 85, "lastTrained": "2 days ago", "estimatedRecoveryHours": 0},
                    {"name": "Back", "readiness": 45, "lastTrained": "Yesterday", "estimatedRecoveryHours": 18},
                    {"name": "Shoulders", "readiness": 70, "lastTrained": "2 days ago", "estimatedRecoveryHours": 8},
                    {"name": "Biceps", "readiness": 90, "lastTrained": "3 days ago", "estimatedRecoveryHours": 0},
                    {"name": "Triceps", "readiness": 55, "lastTrained": "Yesterday", "estimatedRecoveryHours": 12},
                    {"name": "Quadriceps", "readiness": 30, "lastTrained": "Today", "estimatedRecoveryHours": 24},
                    {"name": "Hamstrings", "readiness": 42, "lastTrained": "Today", "estimatedRecoveryHours": 20},
                    {"name": "Glutes", "readiness": 38, "lastTrained": "Today", "estimatedRecoveryHours": 22}
                ],
                "strengthProgress": {
                    "streak": 12,
                    "workoutsThisMonth": 14,
                    "mostImproved": [
                        {"muscle": "Chest", "gain": 15},
                        {"muscle": "Back", "gain": 12},
                        {"muscle": "Biceps", "gain": 10}
                    ],
                    "leastImproved": [
                        {"muscle": "Hamstrings", "gain": 3},
                        {"muscle": "Calves", "gain": 2},
                        {"muscle": "Shoulders", "gain": 4}
                    ],
                    "personalRecords": [
                        {"exercise": "Bench Press", "value": "100kg x 5"},
                        {"exercise": "Squat", "value": "120kg x 6"},
                        {"exercise": "Deadlift", "value": "140kg x 4"}
                    ]
                },
                "secondaryGoal": {
                    "type": "reduce_bodyfat",
                    "targetValue": 12,
                    "startingValue": 18,
                    "currentValue": 16.4,
                    "timeframeWeeks": 16,
                    "startDate": "2025-05-01",
                    "isActive": True
                },
                "goalLayeringActive": True
            }
        }

        try:
            async with self.session.post(
                f"{BACKEND_URL}/api/coach/chat",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status != 200:
                    text = await response.text()
                    print_failure(f"Full context chat failed - Status: {response.status}, Response: {text}")
                    self.detailed_results.append(f"❌ Full context chat API call failed with status {response.status}")
                    return False

                data = await response.json()
                ai_response = data.get('response', '')
                session_id = data.get('session_id', '')

                print_success("Full context chat API call successful")
                print_info(f"AI Response ({len(ai_response)} chars): {ai_response}")
                print_info(f"Session ID: {session_id}")

                # Verification checklist
                verifications = []
                
                # Check 1: AI addresses user by name
                if "Marcus" in ai_response:
                    verifications.append("✅ AI addresses user as 'Marcus'")
                else:
                    verifications.append("❌ AI does not address user as 'Marcus'")

                # Check 2: References specific numbers
                has_specific_numbers = False
                specific_numbers = ["16.4", "72", "30", "45", "85", "90", "12", "2650"]
                for num in specific_numbers:
                    if num in ai_response:
                        has_specific_numbers = True
                        break
                
                if has_specific_numbers:
                    verifications.append("✅ AI references specific numbers from the data")
                else:
                    verifications.append("❌ AI does not reference specific numbers from context")

                # Check 3: Not generic advice
                generic_phrases = ["generally", "typically", "usually", "most people", "in general"]
                is_generic = any(phrase in ai_response.lower() for phrase in generic_phrases)
                
                if not is_generic:
                    verifications.append("✅ AI provides personalized (non-generic) advice")
                else:
                    verifications.append("❌ AI gives generic advice")

                # Check 4: Acknowledges injury
                injury_keywords = ["shoulder", "impingement", "injury", "limitation"]
                acknowledges_injury = any(keyword in ai_response.lower() for keyword in injury_keywords)
                
                if acknowledges_injury:
                    verifications.append("✅ AI acknowledges shoulder impingement injury")
                else:
                    verifications.append("❌ AI does not acknowledge injury")

                # Check 5: Considers muscle readiness (avoids legs since quads at 30%)
                leg_keywords = ["quad", "leg", "squat", "hamstring"]
                has_leg_words = any(keyword in ai_response.lower() for keyword in leg_keywords)
                avoids_legs = "avoid" in ai_response.lower() and has_leg_words
                
                if avoids_legs or not has_leg_words:
                    verifications.append("✅ AI considers muscle readiness appropriately (avoids fatigued muscles)")
                else:
                    verifications.append("⚠️ AI may be recommending legs despite low readiness")

                # Check 6: Mentions secondary goal
                fat_keywords = ["fat", "body fat", "16.4", "12%", "secondary", "goal"]
                mentions_secondary_goal = any(keyword in ai_response.lower() for keyword in fat_keywords)
                
                if mentions_secondary_goal:
                    verifications.append("✅ AI mentions secondary goal (body fat reduction)")
                else:
                    verifications.append("❌ AI does not mention secondary goal")

                # Check 7: No diet/nutrition advice - more accurate check
                nutrition_keywords = ["diet", "calories", "protein", "carbs", "fat intake", "nutrition", "food", "meal", "eating"]
                mentions_nutrition = any(keyword in ai_response.lower() for keyword in nutrition_keywords)
                # Exclude false positives
                if "eat" in ai_response.lower() and not any(word in ai_response.lower() for word in ["eating", "eat more", "eat less"]):
                    mentions_nutrition = False
                
                if not mentions_nutrition:
                    verifications.append("✅ No diet/nutrition advice given")
                else:
                    verifications.append("❌ AI gives diet/nutrition advice (against rules)")

                # Check 8: Conciseness
                word_count = len(ai_response.split())
                sentence_count = ai_response.count('.') + ai_response.count('!') + ai_response.count('?')
                
                if word_count <= 150 and sentence_count <= 6:
                    verifications.append(f"✅ Response is concise ({word_count} words, ~{sentence_count} sentences)")
                else:
                    verifications.append(f"⚠️ Response may be too verbose ({word_count} words, ~{sentence_count} sentences)")

                # Print verification results
                for verification in verifications:
                    print(f"  {verification}")

                # Overall assessment
                success_count = len([v for v in verifications if v.startswith("✅")])
                total_checks = len(verifications)
                
                if success_count >= 6:  # At least 6/8 checks pass
                    print_success(f"Full context chat verification passed ({success_count}/{total_checks})")
                    self.detailed_results.append(f"✅ Full context chat verification passed ({success_count}/{total_checks} checks)")
                    return True
                else:
                    print_failure(f"Full context chat verification failed ({success_count}/{total_checks})")
                    self.detailed_results.append(f"❌ Full context chat verification failed ({success_count}/{total_checks} checks)")
                    return False

        except Exception as e:
            print_failure(f"Full context chat error: {str(e)}")
            self.detailed_results.append(f"❌ Full context chat error: {str(e)}")
            return False

    async def test_minimal_context_chat(self) -> bool:
        """Test 3: Chat without body composition data"""
        print_info("Testing chat with minimal context (no body composition)...")
        
        payload = {
            "message": "How am I doing?",
            "context": {
                "coachStyle": "neutral",
                "userProfile": {
                    "name": "Sarah",
                    "age": 32,
                    "gender": "female",
                    "height": 165,
                    "weight": 60,
                    "trainingExperience": "beginner",
                    "fitnessGoals": ["Stay Active"],
                    "trainingDaysPerWeek": 3,
                    "workoutLocation": "Home"
                }
            }
        }

        try:
            async with self.session.post(
                f"{BACKEND_URL}/api/coach/chat",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status != 200:
                    text = await response.text()
                    print_failure(f"Minimal context chat failed - Status: {response.status}, Response: {text}")
                    self.detailed_results.append(f"❌ Minimal context chat API call failed with status {response.status}")
                    return False

                data = await response.json()
                ai_response = data.get('response', '')
                session_id = data.get('session_id', '')

                print_success("Minimal context chat API call successful")
                print_info(f"AI Response: {ai_response}")
                print_info(f"Session ID: {session_id}")

                # Verification checklist
                verifications = []
                
                # Check 1: Addresses user by name
                if "Sarah" in ai_response:
                    verifications.append("✅ AI addresses user as 'Sarah'")
                else:
                    verifications.append("❌ AI does not address user as 'Sarah'")

                # Check 2: Handles missing data gracefully
                graceful_phrases = ["not yet", "haven't", "missing", "not measured", "no data", "when you"]
                handles_gracefully = any(phrase in ai_response.lower() for phrase in graceful_phrases)
                
                if handles_gracefully:
                    verifications.append("✅ Handles missing body composition data gracefully")
                else:
                    verifications.append("⚠️ May not handle missing data gracefully")

                # Check 3: No errors or exceptions
                if "error" not in ai_response.lower() and "exception" not in ai_response.lower():
                    verifications.append("✅ No error messages in response")
                else:
                    verifications.append("❌ Response contains error messages")

                # Check 4: Still personalized
                personal_elements = ["Sarah", "beginner", "home", "stay active", "3"]
                is_personalized = any(element.lower() in ai_response.lower() for element in personal_elements)
                
                if is_personalized:
                    verifications.append("✅ Response is still personalized despite minimal data")
                else:
                    verifications.append("❌ Response is not personalized")

                # Print verification results
                for verification in verifications:
                    print(f"  {verification}")

                # Overall assessment
                success_count = len([v for v in verifications if v.startswith("✅")])
                total_checks = len(verifications)
                
                if success_count >= 3:  # At least 3/4 checks pass
                    print_success(f"Minimal context chat verification passed ({success_count}/{total_checks})")
                    self.detailed_results.append(f"✅ Minimal context chat verification passed ({success_count}/{total_checks} checks)")
                    return True
                else:
                    print_failure(f"Minimal context chat verification failed ({success_count}/{total_checks})")
                    self.detailed_results.append(f"❌ Minimal context chat verification failed ({success_count}/{total_checks} checks)")
                    return False

        except Exception as e:
            print_failure(f"Minimal context chat error: {str(e)}")
            self.detailed_results.append(f"❌ Minimal context chat error: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all tests and generate report"""
        await self.setup()
        
        try:
            # Test 1: Health Check
            self.test_results["health_check"] = await self.test_health_check()
            print()

            # Test 2: Full Context Chat
            self.test_results["full_context_chat"] = await self.test_full_context_chat()
            print()

            # Test 3: Minimal Context Chat
            self.test_results["minimal_context_chat"] = await self.test_minimal_context_chat()
            print()

            # Generate summary
            self.generate_summary()

        finally:
            await self.cleanup()

    def generate_summary(self):
        """Generate test summary"""
        print(f"\n{Colors.BOLD}=== AI COACH TESTING SUMMARY ==={Colors.RESET}")
        
        total_tests = len(self.test_results)
        passed_tests = sum(self.test_results.values())
        
        for test_name, passed in self.test_results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            formatted_name = test_name.replace("_", " ").title()
            print(f"{status} - {formatted_name}")
        
        print(f"\n{Colors.BOLD}Overall Result: {passed_tests}/{total_tests} tests passed{Colors.RESET}")
        
        if passed_tests == total_tests:
            print_success("🎉 All AI Coach tests completed successfully!")
        else:
            print_failure(f"⚠️ {total_tests - passed_tests} test(s) failed")
        
        print(f"\n{Colors.BOLD}Detailed Results:{Colors.RESET}")
        for result in self.detailed_results:
            print(f"  {result}")

def main():
    """Main test runner"""
    tester = AICoachTester()
    asyncio.run(tester.run_all_tests())

if __name__ == "__main__":
    main()