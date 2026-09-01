const db = require('../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Export Inventory to Excel
exports.exportInventoryExcel = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT bi.id, bb.name as bank_name, bi.blood_group, bi.component, bi.volume_ml, bi.units, bi.status, bi.expiry_date 
       FROM blood_inventory bi 
       JOIN blood_banks bb ON bi.blood_bank_id = bb.id 
       ORDER BY bi.expiry_date ASC`
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventory Stock');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Blood Bank', key: 'bank_name', width: 25 },
      { header: 'Blood Group', key: 'blood_group', width: 15 },
      { header: 'Component', key: 'component', width: 20 },
      { header: 'Volume per Unit (ml)', key: 'volume_ml', width: 20 },
      { header: 'Units', key: 'units', width: 12 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Expiry Date', key: 'expiry_date', width: 18 }
    ];

    // Format headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' } // Red header
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    rows.forEach(item => {
      worksheet.addRow({
        id: item.id,
        bank_name: item.bank_name,
        blood_group: item.blood_group,
        component: item.component,
        volume_ml: item.volume_ml,
        units: item.units,
        status: item.status,
        expiry_date: item.expiry_date ? item.expiry_date.toISOString().split('T')[0] : 'N/A'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=LifeLink_Inventory_Report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Inventory Excel export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export inventory details to Excel' });
  }
};

// Export Donors to Excel
exports.exportDonorsExcel = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.id, u.name, u.email, d.blood_group, d.gender, d.phone, d.address, d.availability_status, d.last_donation_date 
       FROM donors d 
       JOIN users u ON d.user_id = u.id`
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Donors List');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Full Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Blood Group', key: 'blood_group', width: 15 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Availability', key: 'availability_status', width: 15 },
      { header: 'Last Donation Date', key: 'last_donation_date', width: 18 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    rows.forEach(item => {
      worksheet.addRow({
        id: item.id,
        name: item.name,
        email: item.email,
        blood_group: item.blood_group,
        gender: item.gender,
        phone: item.phone,
        address: item.address,
        availability_status: item.availability_status,
        last_donation_date: item.last_donation_date ? item.last_donation_date.toISOString().split('T')[0] : 'Never'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=LifeLink_Donors_Report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Donors Excel export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export donors to Excel' });
  }
};

// Export Requests to Excel
exports.exportRequestsExcel = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id, r.patient_name, u.name as requester_name, r.blood_group, r.component, r.volume_ml, r.urgency, r.status, r.required_date, r.created_at 
       FROM blood_requests r 
       JOIN users u ON r.requester_id = u.id 
       ORDER BY r.created_at DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Blood Requests');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Patient Name', key: 'patient_name', width: 22 },
      { header: 'Requester', key: 'requester_name', width: 22 },
      { header: 'Blood Group', key: 'blood_group', width: 15 },
      { header: 'Component', key: 'component', width: 18 },
      { header: 'Volume (ml)', key: 'volume_ml', width: 15 },
      { header: 'Urgency', key: 'urgency', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Required Date', key: 'required_date', width: 18 },
      { header: 'Created Date', key: 'created_at', width: 18 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDC2626' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    rows.forEach(item => {
      worksheet.addRow({
        id: item.id,
        patient_name: item.patient_name,
        requester_name: item.requester_name,
        blood_group: item.blood_group,
        component: item.component,
        volume_ml: item.volume_ml,
        urgency: item.urgency,
        status: item.status,
        required_date: item.required_date ? item.required_date.toISOString().split('T')[0] : 'N/A',
        created_at: item.created_at ? item.created_at.toISOString().split('T')[0] : 'N/A'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=LifeLink_Requests_Report.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Requests Excel export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export requests to Excel' });
  }
};

// Generate PDF Report based on type query
exports.generatePDFReport = async (req, res) => {
  const { type } = req.query; // 'inventory', 'donors', 'requests', 'emergency', 'hospital'

  try {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=LifeLink_${type || 'Summary'}_Report.pdf`);
    doc.pipe(res);

    // 1. Stylized Header Banner
    doc.rect(0, 0, 612, 100).fill('#dc2626');
    doc.fillColor('#ffffff').fontSize(28).text('LIFELINK REPORT', 50, 25, { bold: true });
    doc.fontSize(12).text(`System Report Category: ${type ? type.toUpperCase() : 'GENERAL SUMMARY'}`, 50, 60);
    doc.text(`Generated Date: ${new Date().toLocaleString()}`, 50, 75);
    doc.moveDown(4);

    doc.fillColor('#333333');

    // 2. Report Contents based on parameter
    if (type === 'inventory') {
      const [rows] = await db.query(
        `SELECT bi.*, bb.name as bank_name 
         FROM blood_inventory bi 
         JOIN blood_banks bb ON bi.blood_bank_id = bb.id 
         WHERE bi.status = 'Available'
         ORDER BY bi.blood_group, bi.component`
      );

      doc.fontSize(16).text('Current Available Blood Inventory Stock', { underline: true });
      doc.moveDown(1);

      // Print columns header
      doc.fontSize(11).text('Bank Name / Location', 50, 160, { width: 150, bold: true });
      doc.text('Blood Group', 210, 160, { width: 60, bold: true });
      doc.text('Component', 280, 160, { width: 90, bold: true });
      doc.text('Vol (ml)', 380, 160, { width: 50, bold: true });
      doc.text('Units', 440, 160, { width: 40, bold: true });
      doc.text('Expiry Date', 490, 160, { width: 80, bold: true });

      doc.moveTo(50, 175).lineTo(560, 175).stroke();

      let yPos = 185;
      rows.forEach(item => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        doc.fontSize(10).text(item.bank_name, 50, yPos, { width: 150 });
        doc.text(item.blood_group, 210, yPos);
        doc.text(item.component, 280, yPos);
        doc.text(item.volume_ml.toString(), 380, yPos);
        doc.text(item.units.toString(), 440, yPos);
        doc.text(item.expiry_date.toISOString().split('T')[0], 490, yPos);
        yPos += 20;
      });

    } else if (type === 'donors') {
      const [rows] = await db.query(
        `SELECT d.*, u.name, u.email 
         FROM donors d 
         JOIN users u ON d.user_id = u.id 
         ORDER BY d.blood_group`
      );

      doc.fontSize(16).text('Registered Blood Donors Registry', { underline: true });
      doc.moveDown(1);

      doc.fontSize(11).text('Donor Name / Email', 50, 160, { width: 160, bold: true });
      doc.text('Blood Group', 220, 160, { width: 80, bold: true });
      doc.text('Phone', 310, 160, { width: 90, bold: true });
      doc.text('Status', 410, 160, { width: 70, bold: true });
      doc.text('Last Donation', 490, 160, { width: 80, bold: true });

      doc.moveTo(50, 175).lineTo(560, 175).stroke();

      let yPos = 185;
      rows.forEach(item => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        doc.fontSize(10).text(`${item.name}\n${item.email}`, 50, yPos, { width: 160 });
        doc.text(item.blood_group, 220, yPos);
        doc.text(item.phone, 310, yPos);
        doc.text(item.availability_status, 410, yPos);
        doc.text(item.last_donation_date ? item.last_donation_date.toISOString().split('T')[0] : 'Never', 490, yPos);
        yPos += 30;
      });

    } else if (type === 'requests' || type === 'emergency') {
      const urgencyFilter = type === 'emergency' ? 'Emergency' : '%';
      const [rows] = await db.query(
        `SELECT r.*, u.name as requester_name 
         FROM blood_requests r 
         JOIN users u ON r.requester_id = u.id 
         WHERE r.urgency LIKE ?
         ORDER BY r.created_at DESC`,
        [urgencyFilter]
      );

      doc.fontSize(16).text(type === 'emergency' ? 'Emergency Matching Blood Request Logs' : 'Blood Request Fulfillment Report', { underline: true });
      doc.moveDown(1);

      doc.fontSize(11).text('Patient Name / Urgency', 50, 160, { width: 150, bold: true });
      doc.text('Blood Group', 210, 160, { width: 80, bold: true });
      doc.text('Component', 300, 160, { width: 100, bold: true });
      doc.text('Vol (ml)', 410, 160, { width: 60, bold: true });
      doc.text('Status', 480, 160, { width: 80, bold: true });

      doc.moveTo(50, 175).lineTo(560, 175).stroke();

      let yPos = 185;
      rows.forEach(item => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        doc.fontSize(10).text(`${item.patient_name} (${item.urgency})`, 50, yPos, { width: 150 });
        doc.text(item.blood_group, 210, yPos);
        doc.text(item.component, 300, yPos);
        doc.text(item.volume_ml.toString(), 410, yPos);
        doc.text(item.status, 480, yPos);
        yPos += 25;
      });

    } else if (type === 'hospital') {
      const [rows] = await db.query(
        `SELECT r.*, h.name as hospital_name, h.license_number 
         FROM blood_requests r 
         JOIN hospitals h ON r.requester_id = h.user_id 
         ORDER BY h.name, r.created_at DESC`
      );

      doc.fontSize(16).text('Hospital Distribution & Dispatched Requests Logs', { underline: true });
      doc.moveDown(1);

      doc.fontSize(11).text('Hospital Name', 50, 160, { width: 150, bold: true });
      doc.text('Patient', 210, 160, { width: 90, bold: true });
      doc.text('Requested Blood', 310, 160, { width: 110, bold: true });
      doc.text('Vol (ml)', 430, 160, { width: 60, bold: true });
      doc.text('Fulfillment', 500, 160, { width: 80, bold: true });

      doc.moveTo(50, 175).lineTo(560, 175).stroke();

      let yPos = 185;
      rows.forEach(item => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
        doc.fontSize(10).text(item.hospital_name, 50, yPos, { width: 150 });
        doc.text(item.patient_name, 210, yPos);
        doc.text(`${item.blood_group} (${item.component})`, 310, yPos);
        doc.text(item.volume_ml.toString(), 430, yPos);
        doc.text(item.status, 500, yPos);
        yPos += 25;
      });

    } else {
      // General overview summary page
      doc.fontSize(16).text('LifeLink System Operational Overview', { underline: true });
      doc.moveDown(1.5);

      const [dRows] = await db.query('SELECT COUNT(*) as donorsCount FROM donors');
      const [pRows] = await db.query('SELECT COUNT(*) as patientsCount FROM patients');
      const [rRows] = await db.query('SELECT COUNT(*) as requestsCount FROM blood_requests');
      const [sRows] = await db.query('SELECT COALESCE(SUM(volume_ml * units), 0) as stockCount FROM blood_inventory WHERE status = "Available"');

      const donorsCount = dRows && dRows[0] ? dRows[0].donorsCount || 0 : 0;
      const patientsCount = pRows && pRows[0] ? pRows[0].patientsCount || 0 : 0;
      const requestsCount = rRows && rRows[0] ? rRows[0].requestsCount || 0 : 0;
      const stockCount = sRows && sRows[0] ? sRows[0].stockCount || 0 : 0;

      doc.fontSize(12).text(`Total Registered Blood Donors: ${donorsCount}`);
      doc.text(`Total Registered Patients: ${patientsCount}`);
      doc.text(`Total Placed Blood Requests: ${requestsCount}`);
      doc.text(`Total Available Inventory Stock: ${stockCount} ml`);
    }

    // End stream
    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF report' });
  }
};
