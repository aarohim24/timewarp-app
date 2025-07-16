# netlify/functions/analytics.py

import json
import os
import sqlite3

def handler(event, context):
    conn = sqlite3.connect("/tmp/timewarp.db")
    c = conn.cursor()

    try:
        # Create table if it doesn't exist (precaution)
        c.execute('''CREATE TABLE IF NOT EXISTS activities (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        app TEXT,
                        title TEXT,
                        category TEXT,
                        duration INTEGER,
                        timestamp TEXT
                    )''')
        conn.commit()

        # Get total duration per app
        c.execute("SELECT app, SUM(duration) as total_time FROM activities GROUP BY app ORDER BY total_time DESC")
        app_data = [{"app": row[0], "total_time": row[1]} for row in c.fetchall()]

        # Get total duration per category
        c.execute("SELECT category, SUM(duration) as total_time FROM activities GROUP BY category ORDER BY total_time DESC")
        category_data = [{"category": row[0], "total_time": row[1]} for row in c.fetchall()]

        return {
            "statusCode": 200,
            "body": json.dumps({
                "apps": app_data,
                "categories": category_data
            }),
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
