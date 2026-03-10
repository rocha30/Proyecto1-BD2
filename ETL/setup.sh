#!/bin/bash
# Setup rápido del ETL

echo "🚀 Configurando ETL MongoDB → PostgreSQL"
echo ""

# 1. Crear entorno virtual
echo "🔧 Creando entorno virtual..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Entorno virtual creado"
else
    echo "⚠️  Entorno virtual ya existe"
fi
echo ""

# 2. Activar y instalar dependencias
echo "📦 Instalando dependencias Python..."
source venv/bin/activate
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    echo "✅ Dependencias instaladas"
else
    echo "❌ Error instalando dependencias"
    exit 1
fi
echo ""

# 3. Crear base de datos PostgreSQL
echo "🗄️  Creando base de datos PostgreSQL..."
createdb restaurant_analytics 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Base de datos 'restaurant_analytics' creada"
else
    # Verificar si ya existe
    psql -lqt | cut -d \| -f 1 | grep -qw restaurant_analytics
    if [ $? -eq 0 ]; then
        echo "⚠️  Base de datos 'restaurant_analytics' ya existe"
    else
        echo "❌ Error creando base de datos"
        exit 1
    fi
fi
echo ""

# 4. Instrucciones finales
echo "✨ Setup completado!"
echo ""
echo "📝 ANTES DE EJECUTAR, verifica en config.json:"
echo "   1. mongodb.uri → Tu URI de MongoDB"
echo "   2. postgresql.password → Tu password de PostgreSQL"
echo ""
echo "▶️  Para ejecutar el ETL:"
echo "   source venv/bin/activate  # Activar entorno virtual"
echo "   python3 test_connections.py  # Probar conexiones"
echo "   python3 etl.py  # Ejecutar ETL"
echo ""

