const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const Chart = require('chart.js');
const { createCanvas } = require('canvas');

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.connect('mongodb+srv://kevork:123@cluster0.khomafv.mongodb.net/?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const FormSchema = new mongoose.Schema({
  age: Number,
  gender: String,
  height: Number,
  weight: Number,
  ethnicity: String,
  education: String,
  smokerType: String,
  lungDisease: String,
  familyHistory: String
});

const Form = mongoose.model('Form', FormSchema);

app.use(bodyParser.json());
app.use(cors());

async function createPdf(formData, riskData, chartImage) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument();
    const buffers = [];

    // Set font and other styles for better readability
    pdf.fontSize(12);
    pdf.font('Helvetica');

    // Add text content to the PDF
    pdf.text('Lung Cancer Risk Assessment Summary', { align: 'center' });
    pdf.moveDown();
    pdf.text(`Age: ${formData.age}`);
    pdf.text(`Gender: ${formData.gender}`);
    pdf.text(`Height: ${formData.height}`);
    pdf.text(`Weight: ${formData.weight}`);
    pdf.text(`Ethnicity: ${formData.ethnicity}`);
    pdf.text(`Education: ${formData.education}`);
    pdf.text(`Smoker Type: ${formData.smokerType}`);
    pdf.text(`Lung Disease History: ${formData.lungDisease}`);
    pdf.text(`Family History: ${formData.familyHistory}`);
    pdf.moveDown();

    // Embed chart image in the PDF
    pdf.image(chartImage, { width: 400, align: 'center' });

    // Finalize the PDF and resolve with the buffer
    pdf.on('data', buffers.push.bind(buffers));
    pdf.on('end', () => resolve(Buffer.concat(buffers)));
    pdf.on('error', reject);
    pdf.end();
  });
}

async function createChartImage(data) {
  // Create a canvas for rendering the chart
  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');

  // Create a new Chart.js instance and render the chart
  new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {}
  });

  // Convert the canvas to a buffer
  const imageBuffer = canvas.toBuffer('image/png');
  return imageBuffer;
}

app.post('/api/saveSummary/pdf', async (req, res) => {
  try {
    const { formData, riskData } = req.body;
    const chartImage = await createChartImage(riskData);
    const pdfBuffer = await createPdf(formData, riskData, chartImage);

    // Set response headers for downloading the PDF
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'attachment; filename="summary.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
