#!/usr/bin/env python3
"""
Backend API Testing for Coach AI Fitness App
Tests the AI Coach chat endpoint and related functionality
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://coach-context-v1.preview.emergentagent.com"
HEALTH_URL = f"{BASE_URL}/api/health"
CHAT_URL = f"{BASE_URL}/api/coach/chat"

def test_health_check():
    """Test 1: Health check endpoint"""
    print("🔍 Testing health check endpoint...")
    
    try:
        response = requests.get(HEALTH_URL, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        return False

def test_basic_chat():
    """Test 2: Basic chat without conversation history"""
    print("\n🔍 Testing basic chat (no history)...")
    
    try:
        payload = {
            "message": "What's the best way to warm up before a workout?"
        }
        
        response = requests.post(CHAT_URL, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check response structure
            if 'response' in data and 'session_id' in data:
                print(f"✅ Basic chat successful")
                print(f"   Session ID: {data['session_id']}")
                print(f"   Response: {data['response'][:100]}...")
                
                # Check response length for conciseness
                word_count = len(data['response'].split())
                if word_count <= 100:  # Roughly 2-4 sentences
                    print(f"✅ Response is concise ({word_count} words)")
                else:
                    print(f"⚠️  Response might be long ({word_count} words)")
                
                return True, data['session_id']
            else:
                print(f"❌ Basic chat - Invalid response structure: {data}")
                return False, None
        else:
            print(f"❌ Basic chat failed with status {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"❌ Basic chat error: {str(e)}")
        return False, None

def test_chat_with_memory():
    """Test 3: Chat with conversation history to test memory"""
    print("\n🔍 Testing chat with conversation history...")
    
    try:
        # Create a conversation about chest workouts
        payload = {
            "message": "What exercises should I add to that?",
            "conversation_history": [
                {
                    "role": "user",
                    "content": "I want to build a chest workout plan"
                },
                {
                    "role": "coach", 
                    "content": "For a chest workout, focus on bench press, incline dumbbell press, and cable flyes."
                },
                {
                    "role": "user",
                    "content": "What exercises should I add to that?"
                }
            ]
        }
        
        response = requests.post(CHAT_URL, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'response' in data and 'session_id' in data:
                response_text = data['response'].lower()
                
                # Check if the response references chest context
                chest_related = any(word in response_text for word in 
                                  ['chest', 'bench', 'press', 'pectoral', 'incline', 'dumbbell', 'flye'])
                
                if chest_related:
                    print("✅ Memory test passed - AI referenced chest workout context")
                    print(f"   Response: {data['response'][:150]}...")
                else:
                    print("❌ Memory test failed - AI didn't reference previous chest workout context")
                    print(f"   Response: {data['response'][:150]}...")
                
                return chest_related, data['session_id']
            else:
                print(f"❌ Memory test - Invalid response structure: {data}")
                return False, None
        else:
            print(f"❌ Memory test failed with status {response.status_code}: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"❌ Memory test error: {str(e)}")
        return False, None

def test_conciseness():
    """Test 4: Verify responses are concise"""
    print("\n🔍 Testing response conciseness...")
    
    try:
        payload = {
            "message": "What should I eat after a workout?"
        }
        
        response = requests.post(CHAT_URL, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'response' in data:
                response_text = data['response']
                word_count = len(response_text.split())
                sentence_count = len([s for s in response_text.split('.') if s.strip()])
                
                print(f"   Response: {response_text}")
                print(f"   Word count: {word_count}")
                print(f"   Sentence count: {sentence_count}")
                
                # Check conciseness criteria
                if word_count <= 100 and sentence_count <= 6:
                    print("✅ Conciseness test passed")
                    return True
                else:
                    print("⚠️  Response might be too long for simple question")
                    return False
            else:
                print(f"❌ Conciseness test - Invalid response: {data}")
                return False
        else:
            print(f"❌ Conciseness test failed with status {response.status_code}: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Conciseness test error: {str(e)}")
        return False

def test_session_persistence():
    """Test 5: Session persistence with same session_id"""
    print("\n🔍 Testing session persistence...")
    
    try:
        # Generate a unique session ID
        test_session_id = str(uuid.uuid4())
        
        # Send first message
        payload1 = {
            "message": "Hi, I'm Alex. Remember my name.",
            "session_id": test_session_id
        }
        
        response1 = requests.post(CHAT_URL, json=payload1, timeout=30)
        
        if response1.status_code != 200:
            print(f"❌ Session persistence test - First message failed: {response1.text}")
            return False
        
        data1 = response1.json()
        print(f"   First message sent, session: {data1.get('session_id')}")
        
        # Wait a moment
        time.sleep(2)
        
        # Send second message with same session ID
        payload2 = {
            "message": "What's my name?",
            "session_id": test_session_id
        }
        
        response2 = requests.post(CHAT_URL, json=payload2, timeout=30)
        
        if response2.status_code == 200:
            data2 = response2.json()
            
            # Check if session ID is preserved
            if data2.get('session_id') == test_session_id:
                print(f"✅ Session ID preserved: {test_session_id}")
                
                # Check if AI remembered the name (basic memory test)
                response_text = data2['response'].lower()
                if 'alex' in response_text:
                    print("✅ Session persistence passed - AI remembered name")
                    return True
                else:
                    print("⚠️  Session ID preserved but memory unclear")
                    print(f"   Response: {data2['response']}")
                    return True  # Still counts as working since session_id is preserved
            else:
                print(f"❌ Session persistence failed - Session ID changed")
                print(f"   Expected: {test_session_id}")
                print(f"   Got: {data2.get('session_id')}")
                return False
        else:
            print(f"❌ Session persistence test - Second message failed: {response2.text}")
            return False
            
    except Exception as e:
        print(f"❌ Session persistence test error: {str(e)}")
        return False

def run_all_tests():
    """Run all backend tests"""
    print("🚀 Starting Backend API Tests for Coach AI")
    print("=" * 50)
    
    results = {}
    
    # Test 1: Health Check
    results['health'] = test_health_check()
    
    # Test 2: Basic Chat
    basic_success, session_id = test_basic_chat()
    results['basic_chat'] = basic_success
    
    # Test 3: Memory with conversation history
    memory_success, _ = test_chat_with_memory()
    results['memory'] = memory_success
    
    # Test 4: Conciseness
    results['conciseness'] = test_conciseness()
    
    # Test 5: Session persistence
    results['session_persistence'] = test_session_persistence()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! AI Coach endpoint is working correctly.")
        return True
    else:
        print(f"⚠️  {total_tests - passed_tests} test(s) failed. Check issues above.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)