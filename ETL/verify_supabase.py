#!/usr/bin/env python3
"""Verificar datos en Supabase"""

import psycopg2

# Conectar a Supabase
conn = psycopg2.connect(
    host="db.rrlsbiauatnpbhdnvlsr.supabase.co",
    port=5432,
    database="postgres",
    user="postgres",
    password="bonvar-qisva3-zuKtyz"
)

cursor = conn.cursor()

# Contar registros
cursor.execute("SELECT 'fact_orders' as tabla, COUNT(*) FROM fact_orders UNION ALL SELECT 'fact_reviews', COUNT(*) FROM fact_reviews UNION ALL SELECT 'dim_users', COUNT(*) FROM dim_users ORDER BY tabla;")
results = cursor.fetchall()

print("\n📊 Datos en Supabase (PostgreSQL en la nube):")
print("=" * 50)
for tabla, count in results:
    print(f"  {tabla}: {count:,} registros")

cursor.close()
conn.close()

print("=" * 50)
print("\n✅ Datos listos para Power BI!")
