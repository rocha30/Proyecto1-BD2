#!/bin/bash
# Script para ejecutar el ETL con el entorno virtual activado

# Activar entorno virtual
source venv/bin/activate

# Ejecutar ETL
python3 etl.py

# Desactivar entorno virtual
deactivate
