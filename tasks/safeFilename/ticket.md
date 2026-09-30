Downloads currently use whatever the user typed as the filename. Add `safeFilename(raw: string, extension: string): string` that builds a safe download filename from the user-entered text and a file extension.

Example: `safeFilename("report", "pdf")` returns `report.pdf`.
