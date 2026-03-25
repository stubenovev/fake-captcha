from flask import Flask, render_template, request, jsonify
import psycopg2
from datetime import datetime
import os
import csv
import io

app = Flask(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
DOWNLOAD_KEY = os.getenv("DOWNLOAD_KEY", "secret123")

# Initialize database on startup
def init_db():
    """Create the visitors table if it doesn't exist"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS visitors (
                id SERIAL PRIMARY KEY,
                ip VARCHAR(45),
                user_agent TEXT,
                timestamp TIMESTAMP,
                path VARCHAR(255)
            )
        """)
        conn.commit()
        cur.close()
        conn.close()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database init error: {e}")

def log_visitor(ip, user_agent, path):
    """Log a visitor to the Postgres database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO visitors (ip, user_agent, timestamp, path) VALUES (%s, %s, %s, %s)",
            (ip, user_agent, datetime.utcnow(), path)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Logging error: {e}")

@app.route('/')
def index():
    """Serve the fake CAPTCHA page"""
    log_visitor(request.remote_addr, request.headers.get('User-Agent', 'Unknown'), request.path)
    return render_template('captcha.html')

@app.route('/check-answer', methods=['POST'])
def check_answer():
    """Always return 'try again' (it's a joke)"""
    log_visitor(request.remote_addr, request.headers.get('User-Agent', 'Unknown'), request.path)
    return jsonify({'result': 'lol try again'})

@app.route('/download-visits')
def download_visits():
    """Download all visitor logs as CSV (requires correct key)"""
    key = request.args.get('key')
    
    # Check authorization
    if key != DOWNLOAD_KEY:
        return "Unauthorized", 401
    
    try:
        # Query all visitor data from database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT ip, user_agent, timestamp, path FROM visitors ORDER BY timestamp DESC")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        
        # Generate CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['IP Address', 'User Agent', 'Timestamp', 'Path'])
        writer.writerows(rows)
        
        # Return as downloadable file
        return output.getvalue(), 200, {
            'Content-Disposition': 'attachment; filename=visitor_logs.csv',
            'Content-Type': 'text/csv'
        }
    except Exception as e:
        print(f"Download error: {e}")
        return f"Error: {e}", 500

if __name__ == '__main__':
    init_db()  # Initialize database on startup
    app.run(debug=False)
