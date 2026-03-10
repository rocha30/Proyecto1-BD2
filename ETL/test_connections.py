#!/usr/bin/env python3
"""
Quick test script to verify MongoDB and PostgreSQL connections
"""

import json
import sys

try:
    from pymongo import MongoClient
    import psycopg2
except ImportError:
    print("❌ Dependencias no instaladas. Ejecuta: pip3 install -r requirements.txt")
    sys.exit(1)

# Load config
with open('config.json', 'r') as f:
    config = json.load(f)

print("🔍 Verificando conexiones...")
print("")

# Test MongoDB
try:
    mongo_config = config['mongodb']
    client = MongoClient(mongo_config['uri'], serverSelectionTimeoutMS=5000)
    client.server_info()
    db = client[mongo_config['database']]
    
    # Count documents
    restaurants = db.restaurants.count_documents({})
    users = db.users.count_documents({})
    orders = db.orders.count_documents({})
    reviews = db.reviews.count_documents({})
    
    print(f"✅ MongoDB conectado: {mongo_config['database']}")
    print(f"   📊 Restaurantes: {restaurants}")
    print(f"   👥 Usuarios: {users}")
    print(f"   🛒 Órdenes: {orders}")
    print(f"   ⭐ Reviews: {reviews}")
    client.close()
except Exception as e:
    print(f"❌ Error conectando a MongoDB: {e}")
    print(f"   Verifica el URI en config.json")
    sys.exit(1)

print("")

# Test PostgreSQL
try:
    pg_config = config['postgresql']
    conn = psycopg2.connect(
        host=pg_config['host'],
        port=pg_config['port'],
        database=pg_config['database'],
        user=pg_config['user'],
        password=pg_config['password']
    )
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]
    print(f"✅ PostgreSQL conectado: {pg_config['database']}")
    print(f"   {version.split(',')[0]}")
    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Error conectando a PostgreSQL: {e}")
    print(f"   Verifica las credenciales en config.json")
    sys.exit(1)

print("")
print("🎉 Todas las conexiones funcionan correctamente!")
print("▶️  Listo para ejecutar: python3 etl.py")
