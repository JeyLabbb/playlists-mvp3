#!/bin/bash

# Script para exportar PLEIA Partnerships Deck a PDF
# Requiere PowerPoint o Keynote instalado

DECK_PATH="$(cd "$(dirname "$0")/.." && pwd)/PLEIA_Partnerships_Deck.pptx"
OUTPUT_PATH="$(cd "$(dirname "$0")/.." && pwd)/PLEIA_Partnerships_Deck.pdf"

echo "📄 Intentando exportar deck a PDF..."

# Método 1: Usar PowerPoint si está disponible (macOS)
if command -v osascript &> /dev/null; then
    echo "🔄 Intentando usar PowerPoint para exportar..."
    osascript <<EOF
    tell application "Microsoft PowerPoint"
        activate
        open POSIX file "$DECK_PATH"
        delay 2
        save active presentation in "$OUTPUT_PATH" as save as PDF
        close active presentation
        quit
    end tell
EOF
    if [ -f "$OUTPUT_PATH" ]; then
        echo "✅ PDF generado exitosamente: $OUTPUT_PATH"
        exit 0
    fi
fi

# Método 2: Usar Keynote si está disponible (macOS)
if command -v osascript &> /dev/null; then
    echo "🔄 Intentando usar Keynote para exportar..."
    osascript <<EOF
    tell application "Keynote"
        activate
        open POSIX file "$DECK_PATH"
        delay 2
        export front document as PDF to POSIX file "$OUTPUT_PATH"
        close front document
        quit
    end tell
EOF
    if [ -f "$OUTPUT_PATH" ]; then
        echo "✅ PDF generado exitosamente: $OUTPUT_PATH"
        exit 0
    fi
fi

# Si ninguna herramienta automática funciona, mostrar instrucciones
echo ""
echo "❌ No se pudo exportar automáticamente a PDF."
echo ""
echo "📋 Opciones para exportar manualmente:"
echo ""
echo "1. PowerPoint:"
echo "   - Abre $DECK_PATH"
echo "   - Archivo > Exportar > Crear PDF/XPS"
echo ""
echo "2. Keynote:"
echo "   - Abre $DECK_PATH (se convertirá automáticamente)"
echo "   - Archivo > Exportar a > PDF"
echo ""
echo "3. Google Slides:"
echo "   - Sube a Google Drive"
echo "   - Abre con Google Slides"
echo "   - Archivo > Descargar > Documento PDF"
echo ""
echo "4. LibreOffice (si está instalado):"
echo "   libreoffice --headless --convert-to pdf \"$DECK_PATH\""
echo ""

exit 1



