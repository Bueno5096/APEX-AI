#!/usr/bin/env python3
"""
Conversation Memory Test for AI Coach
Focus on testing the specific scenarios requested in the review
"""
import asyncio
import aiohttp
import json
import sys

# Backend URL from the review request
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

class ConversationMemoryTester:
    def __init__(self):
        self.session = None
        self.test_results = {
            "health_check": False,
            "basic_chat_without_history": False,
            "conversation_memory_test": False,
            "response_conciseness": False
        }
        self.detailed_results = []
        self.session_id = None
        self.conversation_history = []

    async def setup(self):
        """Initialize the test session"""
        self.session = aiohttp.ClientSession()
        print_info("Starting Conversation Memory Testing...")

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

    async def test_basic_chat_without_history(self) -> bool:
        """Test 2: Basic chat without history - should return session_id"""
        print_info("Testing basic chat without history...")
        
        payload = {
            "message": "Hello, what can you help me with?",
            "context": {
                "coachStyle": "neutral"
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
                    print_failure(f"Basic chat failed - Status: {response.status}, Response: {text}")
                    self.detailed_results.append(f"❌ Basic chat API call failed with status {response.status}")
                    return False

                data = await response.json()
                ai_response = data.get('response', '')
                session_id = data.get('session_id', '')

                print_success("Basic chat API call successful")
                print_info(f"AI Response: {ai_response}")
                print_info(f"Session ID: {session_id}")

                # Store session_id for next test
                self.session_id = session_id

                # Verification: Check if session_id is returned
                if session_id:
                    print_success("✅ Session ID returned successfully")
                    self.detailed_results.append("✅ Basic chat without history works and returns session_id")
                    return True
                else:
                    print_failure("❌ No session ID returned")
                    self.detailed_results.append("❌ Basic chat did not return session_id")
                    return False

        except Exception as e:
            print_failure(f"Basic chat error: {str(e)}")
            self.detailed_results.append(f"❌ Basic chat error: {str(e)}")
            return False

    async def test_conversation_memory(self) -> bool:
        """Test 3: CRITICAL - Conversation memory test with multi-turn conversation"""
        print_info("Testing conversation memory with multi-turn conversation...")
        
        # First call: User introduces themselves and mentions chest focus
        print_info("First call: User mentions name and chest focus...")
        first_payload = {
            "message": "My name is Marcus and I want to focus on building my chest today",
            "context": {
                "coachStyle": "neutral"
            }
        }

        try:
            # First API call
            async with self.session.post(
                f"{BACKEND_URL}/api/coach/chat",
                json=first_payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status != 200:
                    text = await response.text()
                    print_failure(f"First conversation call failed - Status: {response.status}, Response: {text}")
                    self.detailed_results.append(f"❌ First conversation call failed with status {response.status}")
                    return False

                first_data = await response.json()
                first_response = first_data.get('response', '')
                session_id = first_data.get('session_id', '')

                print_success("First conversation call successful")
                print_info(f"First AI Response: {first_response}")
                print_info(f"Session ID: {session_id}")

                # Build conversation history for second call
                self.conversation_history = [
                    {"role": "user", "content": "My name is Marcus and I want to focus on building my chest today"},
                    {"role": "coach", "content": first_response}
                ]

                # Second call: Follow up question using session_id and conversation_history
                print_info("\nSecond call: Follow up question with conversation history...")
                second_payload = {
                    "message": "What exercises do you recommend?",
                    "session_id": session_id,
                    "conversation_history": self.conversation_history,
                    "context": {
                        "coachStyle": "neutral"
                    }
                }

                async with self.session.post(
                    f"{BACKEND_URL}/api/coach/chat",
                    json=second_payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    if response.status != 200:
                        text = await response.text()
                        print_failure(f"Second conversation call failed - Status: {response.status}, Response: {text}")
                        self.detailed_results.append(f"❌ Second conversation call failed with status {response.status}")
                        return False

                    second_data = await response.json()
                    second_response = second_data.get('response', '')

                    print_success("Second conversation call successful")
                    print_info(f"Second AI Response: {second_response}")

                    # CRITICAL VERIFICATION: Check if AI remembers Marcus and chest focus
                    verifications = []
                    
                    # Check 1: AI mentions Marcus by name
                    if "Marcus" in second_response:
                        verifications.append("✅ AI mentions Marcus by name in second response")
                    else:
                        verifications.append("❌ AI does not mention Marcus by name in second response")

                    # Check 2: AI references chest/chest exercises 
                    chest_keywords = ["chest", "bench", "press", "pec", "pectoral", "push", "incline", "decline", "dumbbell press"]
                    mentions_chest = any(keyword.lower() in second_response.lower() for keyword in chest_keywords)
                    
                    if mentions_chest:
                        verifications.append("✅ AI references chest exercises, proving it read conversation history")
                    else:
                        verifications.append("❌ AI does not reference chest exercises in recommendations")

                    # Check 3: Response is not generic (shows it understood context)
                    generic_phrases = ["any exercise", "depends on", "it's up to you", "many options"]
                    is_generic = any(phrase.lower() in second_response.lower() for phrase in generic_phrases)
                    
                    if not is_generic:
                        verifications.append("✅ AI provides specific recommendations (not generic)")
                    else:
                        verifications.append("❌ AI gives generic response (may not have processed history)")

                    # Check 4: Conciseness test
                    word_count = len(second_response.split())
                    if word_count <= 150:
                        verifications.append(f"✅ Response is concise ({word_count} words, under 150)")
                    else:
                        verifications.append(f"❌ Response is too verbose ({word_count} words, over 150)")

                    # Print verification results
                    for verification in verifications:
                        print(f"  {verification}")

                    # Overall assessment
                    critical_checks = verifications[:2]  # Marcus name + chest reference are critical
                    critical_passed = len([v for v in critical_checks if v.startswith("✅")])
                    total_passed = len([v for v in verifications if v.startswith("✅")])
                    
                    if critical_passed == 2:  # Both critical checks must pass
                        print_success(f"Conversation memory test PASSED ({total_passed}/4 checks)")
                        self.detailed_results.append(f"✅ Conversation memory works - AI mentions Marcus by name AND references chest exercises from history")
                        return True
                    else:
                        print_failure(f"Conversation memory test FAILED ({critical_passed}/2 critical checks)")
                        self.detailed_results.append(f"❌ Conversation memory failed - missing critical elements (name/context reference)")
                        return False

        except Exception as e:
            print_failure(f"Conversation memory test error: {str(e)}")
            self.detailed_results.append(f"❌ Conversation memory test error: {str(e)}")
            return False

    async def test_response_conciseness(self) -> bool:
        """Test 4: Verify response conciseness across multiple calls"""
        print_info("Testing response conciseness across multiple interactions...")
        
        test_messages = [
            "How should I warm up?",
            "What's the best rep range for strength?", 
            "Should I do cardio after weights?"
        ]
        
        all_responses_concise = True
        concise_results = []

        try:
            for i, message in enumerate(test_messages):
                payload = {
                    "message": message,
                    "context": {
                        "coachStyle": "neutral"
                    }
                }

                async with self.session.post(
                    f"{BACKEND_URL}/api/coach/chat",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        ai_response = data.get('response', '')
                        word_count = len(ai_response.split())
                        
                        if word_count <= 150:
                            concise_results.append(f"✅ Response {i+1}: {word_count} words (concise)")
                        else:
                            concise_results.append(f"❌ Response {i+1}: {word_count} words (too verbose)")
                            all_responses_concise = False
                    else:
                        concise_results.append(f"❌ Response {i+1}: API call failed")
                        all_responses_concise = False

            # Print conciseness results
            for result in concise_results:
                print(f"  {result}")

            if all_responses_concise:
                print_success("All responses are appropriately concise (under 150 words)")
                self.detailed_results.append("✅ Response conciseness verified - all responses under 150 words")
                return True
            else:
                print_failure("Some responses are too verbose")
                self.detailed_results.append("❌ Response conciseness failed - some responses over 150 words")
                return False

        except Exception as e:
            print_failure(f"Conciseness test error: {str(e)}")
            self.detailed_results.append(f"❌ Conciseness test error: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all conversation memory tests and generate report"""
        await self.setup()
        
        try:
            # Test 1: Health Check
            self.test_results["health_check"] = await self.test_health_check()
            print()

            # Test 2: Basic Chat without History
            self.test_results["basic_chat_without_history"] = await self.test_basic_chat_without_history()
            print()

            # Test 3: CRITICAL - Conversation Memory
            self.test_results["conversation_memory_test"] = await self.test_conversation_memory()
            print()

            # Test 4: Response Conciseness
            self.test_results["response_conciseness"] = await self.test_response_conciseness()
            print()

            # Generate summary
            self.generate_summary()

        finally:
            await self.cleanup()

    def generate_summary(self):
        """Generate test summary"""
        print(f"\n{Colors.BOLD}=== CONVERSATION MEMORY TESTING SUMMARY ==={Colors.RESET}")
        
        total_tests = len(self.test_results)
        passed_tests = sum(self.test_results.values())
        
        for test_name, passed in self.test_results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            formatted_name = test_name.replace("_", " ").title()
            print(f"{status} - {formatted_name}")
        
        print(f"\n{Colors.BOLD}Overall Result: {passed_tests}/{total_tests} tests passed{Colors.RESET}")
        
        if passed_tests == total_tests:
            print_success("🎉 All conversation memory tests completed successfully!")
        else:
            print_failure(f"⚠️ {total_tests - passed_tests} test(s) failed")
        
        print(f"\n{Colors.BOLD}Detailed Results:{Colors.RESET}")
        for result in self.detailed_results:
            print(f"  {result}")

def main():
    """Main test runner"""
    tester = ConversationMemoryTester()
    asyncio.run(tester.run_all_tests())

if __name__ == "__main__":
    main()