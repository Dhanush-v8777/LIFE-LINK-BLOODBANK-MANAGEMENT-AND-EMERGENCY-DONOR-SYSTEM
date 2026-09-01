import { FileSpreadsheet, Download, FileText, CheckCircle2 } from 'lucide-react';

export default function ReportsView() {
  const handleReportDownload = (reportType, format) => {
    const token = localStorage.getItem('token');
    if (format === 'excel') {
      window.open(`http://localhost:5000/api/reports/excel/${reportType}?token=${token}`, '_blank');
    } else {
      window.open(`http://localhost:5000/api/reports/pdf?type=${reportType}&token=${token}`, '_blank');
    }
  };

  const reportsList = [
    {
      id: 'inventory',
      title: 'Inventory Stock Logs',
      description: 'Export active components stock, warning status, and expiry details across regional inventories.',
      color: 'green'
    },
    {
      id: 'donors',
      title: 'Donor Registry Logs',
      description: 'Export the complete directory of registered donors, eligibility records, and contact details.',
      color: 'blue'
    },
    {
      id: 'requests',
      title: 'Requests Fulfillment Logs',
      description: 'Export regional patient and hospital blood requisition history, fulfillment statuses, and urgency classifications.',
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-2">
          <FileSpreadsheet className="h-5 w-5 text-brand-600" />
          <span>Generate System Reports</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">Export database registries and history logs into structured spreadsheets or printable PDF files.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportsList.map((report) => (
          <div key={report.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 hover:shadow-md transition">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2.5 bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 rounded-xl`}>
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">{report.title}</h4>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {report.description}
            </p>
            
            <div className="flex space-x-2 pt-2 text-xs font-bold">
              <button
                onClick={() => handleReportDownload(report.id, 'excel')}
                className="w-1/2 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg flex items-center justify-center space-x-1.5 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Excel Sheet</span>
              </button>
              <button
                onClick={() => handleReportDownload(report.id, 'pdf')}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white border border-slate-700 rounded-lg flex items-center justify-center space-x-1.5 transition"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>PDF Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center space-x-3 text-xs text-slate-500">
        <CheckCircle2 className="h-5 w-5 text-brand-600 shrink-0" />
        <span>All reports are generated in real-time, fetching the most up-to-date data from the database. Export files are secured using session authentication.</span>
      </div>
    </div>
  );
}
