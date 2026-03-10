#!/usr/bin/env python3
"""Script para verificar qué hay en MongoDB"""

import json
from pymongo import MongoClient

# Load config
with open('config.json', 'r') as f:
    config = json.load(f)

mongo_config = config['mongodb']
client = MongoClient(mongo_config['uri'])

print("🔍 Bases de datos disponibles:")
print("=" * 50)
for db_name in client.list_database_names():
    print(f"\n📁 Base de datos: {db_name}")
    db = client[db_name]
    collections = db.list_collection_names()
    
    for coll_name in collections:
        count = db[coll_name].count_documents({})
        print(f"   └─ {coll_name}: {count} documentos")

print("\n" + "=" * 50)
print(f"\n🎯 Usando base de datos: {mongo_config['database']}")
db = client[mongo_config['database']]
print(f"   Colecciones: {db.list_collection_names()}")

client.close()
