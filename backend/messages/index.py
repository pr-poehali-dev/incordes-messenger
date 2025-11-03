'''
Business: Message management - send, get, delete messages in channels and DMs
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with messages or error
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
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
            params = event.get('queryStringParameters', {})
            channel_id = params.get('channelId')
            recipient_id = params.get('recipientId')
            limit = int(params.get('limit', 50))
            
            if channel_id:
                cursor.execute("""
                    SELECT m.id, m.content, m.created_at,
                           u.id, u.username, u.discriminator, u.avatar_url
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE m.channel_id = %s
                    ORDER BY m.created_at DESC
                    LIMIT %s
                """, (channel_id, limit))
            elif recipient_id:
                cursor.execute("""
                    SELECT m.id, m.content, m.created_at,
                           u.id, u.username, u.discriminator, u.avatar_url
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE ((m.sender_id = %s AND m.recipient_id = %s) OR 
                           (m.sender_id = %s AND m.recipient_id = %s))
                    ORDER BY m.created_at DESC
                    LIMIT %s
                """, (user_id, recipient_id, recipient_id, user_id, limit))
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Channel ID or recipient ID required'})
                }
            
            messages = []
            for row in cursor.fetchall():
                messages.append({
                    'id': row[0],
                    'content': row[1],
                    'createdAt': row[2].isoformat() if row[2] else None,
                    'sender': {
                        'id': row[3],
                        'username': row[4],
                        'discriminator': row[5],
                        'avatarUrl': row[6]
                    }
                })
            
            messages.reverse()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'messages': messages})
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            content = body_data.get('content')
            channel_id = body_data.get('channelId')
            recipient_id = body_data.get('recipientId')
            
            if not content:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Message content required'})
                }
            
            if not channel_id and not recipient_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Channel ID or recipient ID required'})
                }
            
            cursor.execute("""
                INSERT INTO messages (sender_id, channel_id, recipient_id, content)
                VALUES (%s, %s, %s, %s) RETURNING id, created_at
            """, (user_id, channel_id, recipient_id, content))
            
            result = cursor.fetchone()
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'id': result[0],
                    'createdAt': result[1].isoformat() if result[1] else None,
                    'message': 'Message sent'
                })
            }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters', {})
            message_id = params.get('messageId')
            
            cursor.execute("""
                DELETE FROM messages
                WHERE id = %s AND sender_id = %s
            """, (message_id, user_id))
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Message deleted'})
            }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    finally:
        conn.close()
