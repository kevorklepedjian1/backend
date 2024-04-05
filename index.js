const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const Chart = require('chart.js');
const { createCanvas, registerFont } = require('canvas');

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


function createCsv(formData, riskData) {
  return new Promise((resolve, reject) => {
    const csvData = [
      ['Age', 'Gender', 'Height (cm)', 'Weight (kg)', 'Ethnicity', 'Education', 'Smoker Type', 'Lung Disease History', 'Family History of Lung Cancer', 'Risk Data'],
      [formData.age, formData.gender, formData.height, formData.weight, formData.ethnicity, formData.education, formData.smokerType, formData.lungDisease, formData.familyHistory]
    ];
    const csvString = csvData.map(row => row.join(',')).join('\n');
    resolve(csvString);
  });
}




async function createPdf(formData, riskData, chartImage) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument();
    pdf.text('Lung Cancer Risk Assessment Summary\n\n');
    pdf.text(`Age: ${formData.age}\n`);
    pdf.text(`Gender: ${formData.gender}\n`);
    pdf.text(`Height: ${formData.height}\n`);
    pdf.text(`Weight: ${formData.weight}\n`);
    pdf.text(`Ethnicity: ${formData.ethnicity}\n`);
    pdf.text(`Education: ${formData.education}\n`);
    pdf.text(`Smoker Type: ${formData.smokerType}\n`);
    pdf.text(`Lung Disease History: ${formData.lungDisease}\n`);
    pdf.text(`Family History: ${formData.familyHistory}\n\n`);


    pdf.image(chartImage, 100, 300, { width: 400 });

    pdf.end();

    const buffers = [];
    pdf.on('data', buffers.push.bind(buffers));
    pdf.on('end', () => resolve(Buffer.concat(buffers)));
    pdf.on('error', reject);
  });
}


async function createChartImage(data) {

  const canvas = createCanvas(400, 400);
  const ctx = canvas.getContext('2d');


  new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {}
  });

    const imageBuffer = canvas.toBuffer('image/png');

  return imageBuffer;
}


app.post('/api/form', async (req, res) => {
  try {
    const formData = req.body;
    const newForm = new Form(formData);
    await newForm.save();
    res.status(201).json(newForm);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/api/saveSummary/pdf', async (req, res) => {
  try {
    const { formData, riskData } = req.body;
    const chartImage = await createChartImage(riskData);
    const pdfBuffer = await createPdf(formData, riskData, chartImage);


    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'attachment; filename="summary.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/saveSummary/csv', async (req, res) => {
  try {
    const { formData, riskData } = req.body;
    const csvString = await createCsv(formData, riskData);

    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="summary.csv"');
    res.send(csvString);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
