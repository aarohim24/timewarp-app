# netlify/functions/categorize.py

import json

# Simple rules — you can make this smarter later
CATEGORIES = {
    "youtube": "Entertainment",
    "netflix": "Entertainment",
    "instagram": "Social",
    "facebook": "Social",
    "linkedin": "Work",
    "github": "Work",
    "stackoverflow": "Work",
    "gmail": "Communication",
    "notion": "Productivity",
    "google": "Research",
    "chatgpt": "AI/Tools"
}

def handler(event, context):
    try:
        data = json.loads(event['body'])
        app = data.get('app', '').lower()
        title = data.get('title', '').lower()

        # Try to categorize by app
        for keyword, category in CATEGORIES.items():
            if keyword in app or keyword in title:
                return {
                    "statusCode": 200,
                    "body": json.dumps({"category": category}),
                    "headers": {
                        "Content-Type": "application/json"
                    }
                }

        return {
            "statusCode": 200,
            "body": json.dumps({"category": "Other"}),
            "headers": {
                "Content-Type": "application/json"
            }
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "headers": {
                "Content-Type": "application/json"
            }
        }
