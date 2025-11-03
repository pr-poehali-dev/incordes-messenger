'''
Business: Friend management system - add, accept, reject, list friends
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with friends data or error
'''

import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers_dict = event.get('headers', {})
    user_id = headers_dict.get('X-User-Id') or headers_dict.get('x-user-id')
    
    if not user_id:
        return {
            'statusCode': 401,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'User ID required'})
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    
    try:
        cursor = conn.cursor()
        
        if method == 'GET':
            cursor.execute("""
                SELECT u.id, u.incordes_id, u.username, u.discriminator, u.avatar_url, u.status, f.status as friend_status
                FROM friendships f
                JOIN users u ON (f.user_id = u.id OR f.friend_id = u.id)
                WHERE (f.user_id = %s OR f.friend_id = %s) AND u.id != %s
                ORDER BY f.created_at DESC
            """, (user_id, user_id, user_id))
            
            friends = []
            for row in cursor.fetchall():
                friends.append({
                    'id': row[0],
                    'incordesId': row[1],
                    'username': row[2],
                    'discriminator': row[3],
                    'avatarUrl': row[4],
                    'status': row[5],
                    'friendStatus': row[6]
                })
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'friends': friends})
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'add':
                incordes_id = body_data.get('incordesId')
                
                if not incordes_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Incordes ID required'})
                    }
                
                cursor.execute("SELECT id FROM users WHERE incordes_id = %s", (incordes_id,))
                friend = cursor.fetchone()
                
                if not friend:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'User not found'})
                    }
                
                friend_id = friend[0]
                
                if int(user_id) == friend_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Cannot add yourself'})
                    }
                
                cursor.execute("""
                    SELECT id FROM friendships 
                    WHERE (user_id = %s AND friend_id = %s) OR (user_id = %s AND friend_id = %s)
                """, (user_id, friend_id, friend_id, user_id))
                
                if cursor.fetchone():
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Friend request already exists'})
                    }
                
                cursor.execute("""
                    INSERT INTO friendships (user_id, friend_id, status)
                    VALUES (%s, %s, %s) RETURNING id
                """, (user_id, friend_id, 'pending'))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Friend request sent'})
                }
            
            elif action == 'accept':
                friend_id = body_data.get('friendId')
                
                cursor.execute("""
                    UPDATE friendships SET status = %s
                    WHERE friend_id = %s AND user_id = %s AND status = %s
                """, ('accepted', user_id, friend_id, 'pending'))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Friend request accepted'})
                }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            friend_id = params.get('friendId')
            
            cursor.execute("""
                DELETE FROM friendships
                WHERE (user_id = %s AND friend_id = %s) OR (user_id = %s AND friend_id = %s)
            """, (user_id, friend_id, friend_id, user_id))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Friend removed'})
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    finally:
        conn.close()
