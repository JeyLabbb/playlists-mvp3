-- Script para exportar PPTX a PDF automáticamente
-- Uso: osascript scripts/quick-export-pdf.applescript

set deckPath to POSIX path of ((path to desktop as string) & "PLEIA_Partnerships_Deck.pptx")
set pdfPath to POSIX path of ((path to desktop as string) & "PLEIA_Partnerships_Deck.pdf")

-- Intentar con Keynote primero
try
    tell application "Keynote"
        activate
        set theDoc to open deckPath
        delay 2
        
        -- Exportar a PDF
        export theDoc as "PDF" to file pdfPath
        close theDoc
        quit
        
        return "PDF exportado exitosamente con Keynote: " & pdfPath
    end tell
on error errMsg
    -- Si Keynote falla, intentar con PowerPoint
    try
        tell application "Microsoft PowerPoint"
            activate
            open deckPath
            delay 3
            
            -- Guardar como PDF
            save active presentation in pdfPath as save as PDF
            close active presentation
            quit
            
            return "PDF exportado exitosamente con PowerPoint: " & pdfPath
        end tell
    on error errMsg2
        return "Error: No se pudo exportar automáticamente. Por favor exporta manualmente desde la aplicación abierta."
    end try
end try



