const express = require('express');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

app.get('/plant-identification', (req, res) => {
    res.render('clientUploadPlant', {
      plantName: null,
      commonNames: [],
      description: '',
      diseases: [],
      imagePath: '',
      error: null
    });
  });
  app.post('/plant-identification', upload.single('plantImage'), async (req, res) => {
    const imagePath = path.join('public', 'uploads', req.file.filename);
  
    try {
      const imageBase64 = fs.readFileSync(imagePath).toString('base64');
  
      const response = await axios.post('https://api.plant.id/v2/identify', {
        images: [imageBase64],
        organs: ["leaf", "flower", "fruit", "bark", "habit"],
        api_key: process.env.PLANT_ID_API_KEY,
        plant_details: ["common_names", "url", "wiki_description", "taxonomy"],
        disease_details: ["common_names", "description", "treatment"],
        modifiers: ["health_all"]
      });
  
      const result = response.data;
      const plantInfo = result.suggestions[0] || {};
  
      // Check the confidence score
      const confidence = plantInfo.probability || 0;
  
      if (confidence < 0.5) { // Set a confidence threshold of 50%
        return res.render('clientUploadPlant', {
          plantName: null,
          commonNames: [],
          description: '',
          diseases: [],
          imagePath: '',
          error: 'The uploaded image might not be a plant or the identification is uncertain. Please upload a clear image of the plant.'
        });
      }
  
      const plantName = plantInfo.plant_name || 'Unknown';
      const commonNames = plantInfo.plant_details?.common_names || [];
      const description = plantInfo.plant_details?.wiki_description?.value || 'No description available';
  
      let diseases = [];
      if (result.health_assessment && result.health_assessment.diseases) {
        diseases = result.health_assessment.diseases.map(disease => ({
          name: disease.name,
          probability: disease.probability,
          description: disease.disease_details?.description || 'No description available',
          treatment: disease.disease_details?.treatment?.chemical || 'No treatment information available'
        }));
      }
  
      if (diseases.length === 0 && result.health_assessment) {
        const healthAssessment = result.health_assessment;
        if (healthAssessment.is_healthy) {
          diseases.push({
            name: "Healthy",
            probability: 1,
            description: "The plant appears to be healthy.",
            treatment: "No treatment needed."
          });
        } else if (healthAssessment.is_healthy === false) {
          diseases.push({
            name: "Unhealthy",
            probability: 1,
            description: "The plant appears to be unhealthy, but no specific disease was identified.",
            treatment: "Consider general plant care improvements."
          });
        }
      }
  
      res.render('clientUploadPlant', { 
        plantName, 
        commonNames, 
        description, 
        diseases,
        imagePath: '/uploads/' + req.file.filename,
        error: null  // No error, hence null
      });
    } catch (error) {
      console.error('Error in API request:', error);
      res.status(500).render('clientUploadPlant', { 
        error: 'Error in detecting plant species and disease. Please try again.',
        plantName: null,
        commonNames: [],
        description: '',
        diseases: []
      });
    }
});

  

module.exports = app;
