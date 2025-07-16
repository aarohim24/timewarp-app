# netlify/functions/activity.py
import json
import sqlite3
import os
from datetime import datetime

def handler(event, context):
    # CORS headers
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
    
    # Handle preflight requests
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    # Database path (use /tmp for serverless)
    db_path = "/tmp/activity.db"
    
    try:
        if event['httpMethod'] == 'POST':
            # Save activity
            body = json.loads(event['body'])
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS activity (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    app TEXT,
                    title TEXT,
                    category TEXT,
                    duration INTEGER DEFAULT 0,
                    user_id TEXT DEFAULT 'default'
                )
            ''')
            cursor.execute('''
                INSERT INTO activity (timestamp, app, title, category, duration, user_id)
                VALUES (?, ?, ?, ?, ?, ?)''', 
                (timestamp, body['app'], body['title'], body['category'], 
                 body.get('duration', 0), body.get('user_id', 'default')))
            conn.commit()
            conn.close()
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'Activity saved successfully'})
            }
            
        elif event['httpMethod'] == 'GET':
            # Get activities
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Create table if it doesn't exist
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS activity (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    app TEXT,
                    title TEXT,
                    category TEXT,
                    duration INTEGER DEFAULT 0,
                    user_id TEXT DEFAULT 'default'
                )
            ''')
            
            cursor.execute("SELECT * FROM activity ORDER BY timestamp DESC LIMIT 1000")
            activities = cursor.fetchall()
            conn.close()
            
            # Convert to dict format
            activity_list = []
            for activity in activities:
                activity_list.append({
                    'id': activity[0],
                    'timestamp': activity[1],
                    'app': activity[2],
                    'title': activity[3],
                    'category': activity[4],
                    'duration': activity[5],
                    'user_id': activity[6]
                })
            
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(activity_list)
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

# netlify/functions/analytics.py
import json
import sqlite3
from datetime import datetime, timedelta
from collections import defaultdict

def handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    }
    
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    db_path = "/tmp/activity.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                app TEXT,
                title TEXT,
                category TEXT,
                duration INTEGER DEFAULT 0,
                user_id TEXT DEFAULT 'default'
            )
        ''')
        
        # Get analytics data
        cursor.execute("""
            SELECT category, COUNT(*) as count, SUM(duration) as total_duration
            FROM activity 
            WHERE timestamp >= datetime('now', '-7 days')
            GROUP BY category
        """)
        category_data = cursor.fetchall()
        
        cursor.execute("""
            SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
            FROM activity 
            WHERE timestamp >= datetime('now', '-7 days')
            GROUP BY hour
            ORDER BY hour
        """)
        hourly_data = cursor.fetchall()
        
        cursor.execute("""
            SELECT date(timestamp) as date, COUNT(*) as count
            FROM activity 
            WHERE timestamp >= datetime('now', '-30 days')
            GROUP BY date
            ORDER BY date
        """)
        daily_data = cursor.fetchall()
        
        conn.close()
        
        analytics = {
            'category_stats': [{'category': row[0], 'count': row[1], 'duration': row[2]} for row in category_data],
            'hourly_stats': [{'hour': int(row[0]), 'count': row[1]} for row in hourly_data],
            'daily_stats': [{'date': row[0], 'count': row[1]} for row in daily_data]
        }
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps(analytics)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }

# netlify/functions/categorize.py
import json

def categorize_activity(app, title):
    app = app.lower()
    title = title.lower()
    
    rules = {
        "work": ["code", "vscode", "pycharm", "github", "notion", "slack", "teams", "zoom", "jira", "confluence"],
        "social": ["discord", "instagram", "whatsapp", "twitter", "facebook", "linkedin", "telegram"],
        "entertainment": ["youtube", "netflix", "spotify", "twitch", "gaming", "steam", "epic"],
        "browsing": ["chrome", "firefox", "edge", "safari", "browser"],
        "writing": ["word", "notepad", "docs", "writing", "document"],
        "design": ["photoshop", "figma", "canva", "illustrator", "sketch"],
        "productivity": ["calendar", "email", "gmail", "outlook", "trello", "asana"]
    }
    
    for category, keywords in rules.items():
        if any(kw in app or kw in title for kw in keywords):
            return category
    return "other"

def handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
    
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    try:
        body = json.loads(event['body'])
        app = body.get('app', '')
        title = body.get('title', '')
        
        category = categorize_activity(app, title)
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'category': category})
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }