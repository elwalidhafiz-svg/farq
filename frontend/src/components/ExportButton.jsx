import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function ExportButton({ disabled }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const element = document.getElementById('storyboard-export');
    if (!element) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save('storyboard.pdf');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="export-section">
      <button
        className="export-btn"
        onClick={handleExport}
        disabled={disabled || exporting}
      >
        {exporting ? 'Exporting...' : 'Export as PDF'}
      </button>
    </div>
  );
}

export default ExportButton;
