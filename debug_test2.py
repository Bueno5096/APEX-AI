#!/usr/bin/env python3
"""
Debug test to see full AI response for this specific failed case
"""

import asyncio
import aiohttp
import json

# Backend URL from environment
BACKEND_URL = "https://coach-context-v1.preview.emergentagent.com"

async def debug_latest_response():
    """Debug the latest secondary goal response that failed"""
    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        
        # Use same session ID from the failed test
        session_id = "6b520381-9e9b-415d-a7cc-ad165ea6642f"
        
        # Get the chat history for this session
        async with session.get(f"{BACKEND_URL}/api/coach/history/{session_id}") as response:
            data = await response.json()
            
            print("🔍 CHAT HISTORY FOR FAILED TEST:")
            print("=" * 80)
            
            messages = data.get('messages', [])
            for msg in messages:
                if msg['role'] == 'coach':
                    coach_response = msg['content']
                    print("COACH RESPONSE:")
                    print(coach_response)
                    print("=" * 80)
                    
                    # Check what diet-related terms were found
                    response_text = coach_response.lower()
                    diet_terms = ['diet', 'nutrition', 'calorie', 'eat', 'food', 'meal']
                    found_terms = [term for term in diet_terms if term in response_text]
                    
                    print(f"\n🚨 DETECTED DIET TERMS: {found_terms}")
                    
                    # Show context where these terms appear
                    for term in found_terms:
                        index = response_text.find(term)
                        if index != -1:
                            start = max(0, index - 40)
                            end = min(len(response_text), index + 40)
                            print(f"'{term}' context: ...{response_text[start:end]}...")

if __name__ == "__main__":
    asyncio.run(debug_latest_response())