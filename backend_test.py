#!/usr/bin/env python3
"""
AI Coach Backend Test Suite
Tests the AI Coach chat endpoint functionality including conversation memory and workout actions.
"""

import requests
import json
import uuid
from datetime import datetime
import sys

# Production backend URL from frontend/.env
BASE_URL = "https://smart-workout-ai-14.preview.emergentagent.com/api"

def test_health_check():
    """Test 1: Health check endpoint returns 200"""
    print("🔍 Test 1: Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {response.status_code} - {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code} - {response.text}")
            return False
    except requests.RequestException as e:
        print(f"❌ Health check error: {e}")
        return False

def test_basic_chat():
    """Test 2: Basic chat returns response and session_id"""
    print("\n🔍 Test 2: Basic Chat...")
    try:
        payload = {
            "message": "Hello, what can you help me with?",
            "context": {
                "coachStyle": "neutral"
            }
        }
        
        response = requests.post(f"{BASE_URL}/coach/chat", 
                               json=payload, 
                               headers={"Content-Type": "application/json"},
                               timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if 'session_id' in data and 'response' in data:
                print(f"✅ Basic chat passed: Got session_id={data['session_id'][:8]}... and response length={len(data['response'])}")
                print(f"   Response: {data['response'][:100]}...")
                return True, data
            else:
                print(f"❌ Basic chat failed: Missing session_id or response in {data}")
                return False, None
        else:
            print(f"❌ Basic chat failed: {response.status_code} - {response.text}")
            return False, None
    except requests.RequestException as e:
        print(f"❌ Basic chat error: {e}")
        return False, None

def test_conversation_memory():
    """Test 3: CRITICAL - Conversation memory test (two-part)"""
    print("\n🔍 Test 3: Conversation Memory (CRITICAL)...")
    
    # Part 1: First conversation with Marcus about chest workout
    print("   Part 1: Initial message with Marcus profile...")
    try:
        first_payload = {
            "message": "My name is Marcus and I want to focus on building my chest today",
            "context": {
                "coachStyle": "neutral",
                "userProfile": {
                    "name": "Marcus",
                    "age": 28,
                    "gender": "male",
                    "height": 178,
                    "weight": 80,
                    "fitnessGoals": ["muscle_building"],
                    "trainingExperience": "intermediate"
                }
            }
        }
        
        response1 = requests.post(f"{BASE_URL}/coach/chat", 
                                json=first_payload, 
                                headers={"Content-Type": "application/json"},
                                timeout=30)
        
        if response1.status_code != 200:
            print(f"❌ First conversation failed: {response1.status_code} - {response1.text}")
            return False
        
        data1 = response1.json()
        session_id = data1.get('session_id')
        first_response = data1.get('response')
        
        if not session_id or not first_response:
            print(f"❌ First conversation missing data: {data1}")
            return False
        
        print(f"✅ Part 1 passed: session_id={session_id[:8]}...")
        print(f"   First response: {first_response[:100]}...")
        
        # Part 2: Follow-up conversation with history
        print("   Part 2: Follow-up with conversation history...")
        
        second_payload = {
            "message": "Remind me what my name is and what muscle we discussed?",
            "session_id": session_id,
            "conversation_history": [
                {
                    "role": "user",
                    "content": "My name is Marcus and I want to focus on building my chest today"
                },
                {
                    "role": "coach", 
                    "content": first_response
                }
            ],
            "context": {
                "coachStyle": "neutral",
                "userProfile": {
                    "name": "Marcus",
                    "age": 28,
                    "gender": "male",
                    "height": 178,
                    "weight": 80,
                    "fitnessGoals": ["muscle_building"],
                    "trainingExperience": "intermediate"
                }
            }
        }
        
        response2 = requests.post(f"{BASE_URL}/coach/chat", 
                                json=second_payload, 
                                headers={"Content-Type": "application/json"},
                                timeout=30)
        
        if response2.status_code != 200:
            print(f"❌ Second conversation failed: {response2.status_code} - {response2text}")
            return False
        
        data2 = response2.json()
        second_response = data2.get('response', '').lower()
        
        # Verify memory: should mention Marcus AND chest
        has_marcus = 'marcus' in second_response
        has_chest = 'chest' in second_response
        
        print(f"   Second response: {data2.get('response', '')[:150]}...")
        print(f"   Memory check - Marcus mentioned: {has_marcus}, Chest mentioned: {has_chest}")
        
        if has_marcus and has_chest:
            print("✅ Conversation memory test PASSED: AI remembered both name and muscle")
            return True
        else:
            print("❌ Conversation memory test FAILED: AI did not remember context properly")
            return False
        
    except requests.RequestException as e:
        print(f"❌ Conversation memory error: {e}")
        return False

def test_workout_actions():
    """Test 4: Workout action test - verify response includes actions array"""
    print("\n🔍 Test 4: Workout Actions...")
    try:
        payload = {
            "message": "Create me a push day workout",
            "context": {
                "coachStyle": "direct"
            }
        }
        
        response = requests.post(f"{BASE_URL}/coach/chat", 
                               json=payload, 
                               headers={"Content-Type": "application/json"},
                               timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            actions = data.get('actions')
            response_text = data.get('response', '')
            
            print(f"   Response: {response_text[:100]}...")
            
            if actions and len(actions) > 0:
                print(f"✅ Workout actions passed: Found {len(actions)} action(s)")
                for i, action in enumerate(actions):
                    print(f"   Action {i+1}: {json.dumps(action, indent=2)}")
                
                # Look for set_workout action specifically
                has_set_workout = any(action.get('type') == 'set_workout' for action in actions)
                if has_set_workout:
                    print("✅ Found expected 'set_workout' action type")
                    return True
                else:
                    print("⚠️  No 'set_workout' action found, but actions are present")
                    return True
            else:
                print("❌ Workout actions failed: No actions array found or empty")
                print(f"   Full response data: {json.dumps(data, indent=2)}")
                return False
        else:
            print(f"❌ Workout actions failed: {response.status_code} - {response.text}")
            return False
    except requests.RequestException as e:
        print(f"❌ Workout actions error: {e}")
        return False

def run_all_tests():
    """Run all test scenarios from the review request"""
    print("🚀 Starting AI Coach Backend Test Suite")
    print(f"📡 Testing against: {BASE_URL}")
    print("=" * 60)
    
    results = {}
    
    # Test 1: Health check
    results['health'] = test_health_check()
    
    # Test 2: Basic chat
    basic_result, basic_data = test_basic_chat()
    results['basic_chat'] = basic_result
    
    # Test 3: Conversation memory (CRITICAL)
    results['conversation_memory'] = test_conversation_memory()
    
    # Test 4: Workout actions
    results['workout_actions'] = test_workout_actions()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title():<25} {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! AI Coach endpoint is fully functional.")
        return True
    else:
        print("⚠️  SOME TESTS FAILED. Check individual test results above.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)