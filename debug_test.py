#!/usr/bin/env python3
"""
Debug test to see full AI response for Goal Layering issue
"""

import asyncio
import aiohttp
import json

# Backend URL from environment
BACKEND_URL = "https://workout-fixes-branch.preview.emergentagent.com"

async def debug_test():
    """Debug the secondary goal response"""
    timeout = aiohttp.ClientTimeout(total=30)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        
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
        
        async with session.post(
            f"{BACKEND_URL}/api/coach/chat",
            json=payload,
            headers={'Content-Type': 'application/json'}
        ) as response:
            data = await response.json()
            
            print("🔍 FULL AI RESPONSE:")
            print("=" * 80)
            print(data.get('response', ''))
            print("=" * 80)
            
            # Check what diet-related terms were found
            response_text = data.get('response', '').lower()
            diet_terms = ['diet', 'nutrition', 'calorie', 'eat', 'food', 'meal']
            found_terms = [term for term in diet_terms if term in response_text]
            
            print(f"\n🚨 DETECTED DIET TERMS: {found_terms}")
            
            # Show context where these terms appear
            for term in found_terms:
                index = response_text.find(term)
                if index != -1:
                    start = max(0, index - 30)
                    end = min(len(response_text), index + 30)
                    print(f"'{term}' context: ...{response_text[start:end]}...")

if __name__ == "__main__":
    asyncio.run(debug_test())