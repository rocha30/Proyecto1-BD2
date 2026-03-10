# ETL MongoDB → PostgreSQL

Script ETL para extraer datos de MongoDB usando pipelines de agregación y cargarlos en PostgreSQL para análisis con Power BI.

## 📋 Requisitos

- Python 3.8+
- MongoDB (corriendo)
- PostgreSQL (corriendo)

## 🚀 Instalación

1. Instalar dependencias de Python:
```bash
pip install -r requirements.txt
```

2. Configurar PostgreSQL:
```bash
# Crear la base de datos
createdb restaurant_analytics

# O usando psql
psql -U postgres -c "CREATE DATABASE restaurant_analytics;"
```

## ⚙️ Configuración

Editar `config.json` con tus credenciales:

```json
{
  "mongodb": {
    "uri": "mongodb://localhost:27017",
    "database": "restaurant_management"
  },
  "postgresql": {
    "host": "localhost",
    "port": 5432,
    "database": "restaurant_analytics",
    "user": "postgres",
    "password": "tu_password"
  }
}
```

## 📊 ETL Jobs Incluidos

### 1. **dim_restaurants** - Dimensión de Restaurantes
- Total de reviews y órdenes
- Rating promedio
- Revenue total
- Información de contacto

### 2. **fact_orders** - Tabla de Hechos de Órdenes
- Detalles completos de órdenes
- Relaciones con usuarios y restaurantes
- Métricas de delivery

### 3. **fact_reviews** - Tabla de Hechos de Reviews
- Todas las reseñas con ratings
- Datos relacionados de usuarios y restaurantes

### 4. **dim_users** - Dimensión de Usuarios
- Perfil de usuarios
- Métricas agregadas (total gastado, órdenes, reviews)

## 🎯 Uso

Ejecutar el ETL completo:
```bash
python etl.py
```

El script:
1. ✅ Conecta a MongoDB y PostgreSQL
2. ✅ Ejecuta los aggregates configurados
3. ✅ Guarda los datos en CSV (carpeta `output/`)
4. ✅ Crea las tablas en PostgreSQL
5. ✅ Carga los datos

## 📁 Estructura de Salida

```
ETL/
├── output/
│   ├── restaurant_performance_20260310_143022.csv
│   ├── orders_fact_20260310_143022.csv
│   ├── reviews_fact_20260310_143022.csv
│   └── users_dimension_20260310_143022.csv
├── config.json
├── etl.py
└── requirements.txt
```

## 🔧 Personalización

### Agregar un nuevo ETL Job

Edita `config.json` y agrega un nuevo job:

```json
{
  "name": "mi_nuevo_job",
  "enabled": true,
  "source_collection": "nombre_coleccion",
  "target_table": "mi_tabla",
  "aggregate_pipeline": [
    { "$match": { "campo": "valor" } },
    { "$project": { "campo1": 1, "campo2": 1 } }
  ],
  "create_table_sql": "CREATE TABLE IF NOT EXISTS mi_tabla (...);"
}
```

### Deshabilitar un job

Cambia `"enabled": false` en el job correspondiente.

## 📊 Conectar con Power BI

1. Abre Power BI Desktop
2. Get Data → PostgreSQL Database
3. Conecta a `localhost:5432` → `restaurant_analytics`
4. Selecciona las tablas: `dim_restaurants`, `fact_orders`, etc.
5. Crea relaciones entre las tablas usando los IDs

## 🔍 Troubleshooting

### Error de conexión a MongoDB
```bash
# Verificar que MongoDB está corriendo
mongosh --eval "db.version()"
```

### Error de conexión a PostgreSQL
```bash
# Verificar que PostgreSQL está corriendo
psql -U postgres -c "SELECT version();"
```

### Permisos de PostgreSQL
```sql
GRANT ALL PRIVILEGES ON DATABASE restaurant_analytics TO postgres;
```

## 📝 Logs

El script genera logs detallados mostrando:
- ✅ Conexiones exitosas
- 📊 Cantidad de documentos extraídos
- 💾 Archivos CSV generados
- ✨ Filas insertadas en PostgreSQL
- ❌ Errores si ocurren
