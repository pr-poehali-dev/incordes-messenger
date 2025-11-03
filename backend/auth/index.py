'''
Business: User authentication system with Incordes ID generation
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with user data or error
'''

import json
import os
import hashlib
import secrets
import psycopg2
from typing import Dict, Any

def generate_incordes_id() -> str:
    """Generate unique Incordes ID like INCRD-XXXX-XXXX"""
    part1 = secrets.token_hex(2).upper()
    part2 = secrets.token_hex(2).upper()
    return f"INCRD-{part1}-{part2}"

def generate_discriminator(username: str, conn) -> str:
    """Generate 4-digit discriminator for username"""
    cursor = conn.cursor()
    for _ in range(10):
        disc = f"{secrets.randbelow(10000):04d}"
        cursor.execute(
            "SELECT id FROM users WHERE username = %s AND discriminator = %s",
            (username, disc)
        )
        if not cursor.fetchone():
            return disc
    return f"{secrets.randbelow(10000):04d}"

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    
    try:
        if method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'register':
                email = body_data.get('email')
                username = body_data.get('username')
                password = body_data.get('password')
                
                if not email or not username or not password:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing required fields'})
                    }
                
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
                if cursor.fetchone():
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Email already registered'})
                    }
                
                password_hash = hashlib.sha256(password.encode()).hexdigest()
                incordes_id = generate_incordes_id()
                discriminator = generate_discriminator(username, conn)
                
                cursor.execute(
                    """INSERT INTO users (incordes_id, email, username, discriminator, password_hash, status)
                       VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, incordes_id, email, username, discriminator""",
                    (incordes_id, email, username, discriminator, password_hash, 'online')
                )
                user = cursor.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'id': user[0],
                        'incordesId': user[1],
                        'email': user[2],
                        'username': user[3],
                        'discriminator': user[4]
                    })
                }
            
            elif action == 'login':
                email = body_data.get('email')
                password = body_data.get('password')
                
                if not email or not password:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Missing email or password'})
                    }
                
                password_hash = hashlib.sha256(password.encode()).hexdigest()
                
                cursor = conn.cursor()
                cursor.execute(
                    """SELECT id, incordes_id, email, username, discriminator, avatar_url, bio, custom_status
                       FROM users WHERE email = %s AND password_hash = %s""",
                    (email, password_hash)
                )
                user = cursor.fetchone()
                
                if not user:
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Invalid credentials'})
                    }
                
                cursor.execute("UPDATE users SET status = %s WHERE id = %s", ('online', user[0]))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'id': user[0],
                        'incordesId': user[1],
                        'email': user[2],
                        'username': user[3],
                        'discriminator': user[4],
                        'avatarUrl': user[5],
                        'bio': user[6],
                        'customStatus': user[7]
                    })
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    finally:
        conn.close()