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
  identifier: String,
  age: Number,
  gender: String,
  exercise: String,
  modestactivityhours: Number,
  highintensityhours: Number,
  weight: Number,
  race: String,
  education: String,
  smokertype: String,
  lungDisease: String,
  familyHistory: String,
  name: String,
  vegetablesservings: Number,
  redmeatservings: Number,
  drinksalcohol: {
    type: String,
    enum: ['No', 'Yes']
  },
  phonenumber: Number,
  drinksperweek: Number,
  quitsmoking: Date,
  startsmoking: Date,
  cigarettesperday: Number,
  yearssmoked: Number,
  quitdate: Date,
  colorectalCancer: String,
  colorectalCancerAge: Number,
  breastCancerWomen: String,
  breastCancerWomenSiblings: Number,
  breastCancerWomenAge: Number,
  lungCancer: String,
  lungCancerAge: Number,
  bladderCancer: String,
  bladderCancerAge: Number,
  prostateCancerMen: String,
  prostateCancerMenAge: Number,
  abdominalAorticAneurysm: String,
  abdominalAorticAneurysmAge: Number,
  coronaryArteryDisease: String,
  coronaryArteryDiseaseAge: Number,
  hypertension: String,
  diabetesMellitus: String,
  dyslipidemia: String,
  inflammatoryBowelDisease: String,
  stress: String,
  mood: String,
  mutationInBRCA: String,
  ageAtFirstMenstrualPeriod: Number,
  ageAtFirstChild: Number,
  antihypertensives: String,
  antilipidemic: String,
  aspirin: String,
  aspirinLast30Days: String,
  nsaid: String,
  nsaidLast30Days: String,
  otherMedication: String,
  colonoscopy: String,
  sigmoidoscopy: String,
  lungCT: String,
  breastMammography: String,
  breastBiopsy: String,
  papSmear: String,
  abdominalUltrasound: String,
  colonoscopyDate: Date,
  sigmoidoscopyDate: Date,
  lungCTDate: Date,
  breastMammographyDate: Date,
  breastBiopsyDate: Date,
  papSmearDate: Date,
  abdominalUltrasoundDate: Date,
 
});








const Form = mongoose.model('Form', FormSchema);

app.use(bodyParser.json());
app.use(cors());

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

app.get('/api/forms', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const forms = await Form.find().limit(limit * 1).skip((page - 1) * limit).exec();
    const count = await Form.countDocuments();
    res.json({
      forms,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get('/api/identifiers', async (req, res) => {
  try {
    const { page, perPage } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(perPage);
    const identifiers = await Form.find({}, 'identifier').skip(skip).limit(parseInt(perPage));
    res.json(identifiers.map(form => form.identifier));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.get('/api/allForms', async (req, res) => {
  try {
    const forms = await Form.find();
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
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
    pdf.text(`Age: ${formData.identifier}`);
    pdf.text(`PhoneNumber: ${formData.number}`);
    pdf.text(`SmokerType: ${formData.smokerType}`);
    pdf.text(`exercise: ${formData.exercise}`);
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


app.put('/api/form/:id', async (req, res) => {
  const { id } = req.params;
  const newData = req.body;

  try {
    const updatedForm = await Form.findByIdAndUpdate(id, newData, { new: true });
    if (!updatedForm) {
      return res.status(404).json({ message: 'Form not found' });
    }
    res.json(updatedForm);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


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

app.post('/api/saveSummary/csv', async (req, res) => {
  try {
    const { formData, riskData } = req.body;
    // Generate CSV
    const csvData = [
      ['Age', 'Gender', 'Height (cm)', 'Weight (kg)', 'Ethnicity', 'Education', 'Smoker Type', 'Lung Disease History', 'Family History of Lung Cancer'],
      [formData.age, formData.gender, formData.height, formData.weight, formData.ethnicity, formData.education, formData.smokerType, formData.lungDisease, formData.familyHistory]
    ];
    const csvString = csvData.map(row => row.join(',')).join('\n');
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="summary.csv"');
    res.send(csvString);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


