'''
Business: Server and channel management - create servers, channels, join/leave
Args: event - dict with httpMethod, body, queryStringParameters
      context - object with attributes: request_id, function_name
Returns: HTTP response dict with server/channel data or error
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
            server_id = params.get('serverId')
            
            if server_id:
                cursor.execute("""
                    SELECT id, name, icon_url, description
                    FROM channels
                    WHERE server_id = %s
                    ORDER BY position, created_at
                """, (server_id,))
                
                channels = []
                for row in cursor.fetchall():
                    channels.append({
                        'id': row[0],
                        'name': row[1],
                        'iconUrl': row[2],
                        'description': row[3]
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'channels': channels})
                }
            else:
                cursor.execute("""
                    SELECT s.id, s.name, s.icon_url, s.owner_id
                    FROM servers s
                    JOIN server_members sm ON s.id = sm.server_id
                    WHERE sm.user_id = %s
                    ORDER BY s.created_at DESC
                """, (user_id,))
                
                servers = []
                for row in cursor.fetchall():
                    servers.append({
                        'id': row[0],
                        'name': row[1],
                        'iconUrl': row[2],
                        'ownerId': row[3]
                    })
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'servers': servers})
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'createServer':
                name = body_data.get('name')
                icon_url = body_data.get('iconUrl')
                
                if not name:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Server name required'})
                    }
                
                cursor.execute("""
                    INSERT INTO servers (name, icon_url, owner_id)
                    VALUES (%s, %s, %s) RETURNING id
                """, (name, icon_url, user_id))
                server_id = cursor.fetchone()[0]
                
                cursor.execute("""
                    INSERT INTO server_members (server_id, user_id, role)
                    VALUES (%s, %s, %s)
                """, (server_id, user_id, 'owner'))
                
                cursor.execute("""
                    INSERT INTO channels (server_id, name, type, position)
                    VALUES (%s, %s, %s, %s)
                """, (server_id, 'общий', 'text', 0))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'serverId': server_id, 'message': 'Server created'})
                }
            
            elif action == 'createChannel':
                server_id = body_data.get('serverId')
                name = body_data.get('name')
                channel_type = body_data.get('type', 'text')
                
                if not name or not server_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Server ID and channel name required'})
                    }
                
                cursor.execute("""
                    SELECT COUNT(*) FROM channels WHERE server_id = %s
                """, (server_id,))
                position = cursor.fetchone()[0]
                
                cursor.execute("""
                    INSERT INTO channels (server_id, name, type, position)
                    VALUES (%s, %s, %s, %s) RETURNING id
                """, (server_id, name, channel_type, position))
                channel_id = cursor.fetchone()[0]
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'channelId': channel_id, 'message': 'Channel created'})
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    finally:
        conn.close()
