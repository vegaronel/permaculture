const express = require("express");
const multer = require("multer");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.json({ limit: "50mb" })); // Increase payload limit for base64 images

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.get("/plant-identification", (req, res) => {
  res.render("clientUploadPlant", {
    plantName: null,
    commonNames: [],
    description: "",
    diseases: [],
    imagePath: "",
    error: null,
    name: req.session.firstname + " " + req.session.lastname,
  });
});

// Route to handle image upload and plant identification
app.post(
  "/plant-identification",
  upload.single("plantImage"),
  async (req, res) => {
    let imageBase64 = null;
    console.log("File:", req.file);
    console.log("Body:", req.body);

    try {
      // Check if the user took a photo
      if (req.body.capturedImage) {
        imageBase64 = req.body.capturedImage.replace(
          /^data:image\/png;base64,/,
          ""
        );
      }
      // If an image was uploaded, convert it to base64
      else if (req.file) {
        const imagePath = path.join("public", "uploads", req.file.filename);
        imageBase64 = fs.readFileSync(imagePath).toString("base64");
      }

      if (!imageBase64) {
        return res.render("clientUploadPlant", {
          error: "No image provided",
          plantName: null,
          commonNames: [],
          description: "",
          diseases: [],
          imagePath: "",
          name: req.session.firstname + " " + req.session.lastname,
        });
      }

      // Send the base64 image to the Plant Identification API
      const response = await axios.post(
        "https://plant.id/api/v3/identification",
        {
          images: [imageBase64],
          similar_images: true,
          health: "all",
          classification_level: "all",
          symptoms: true,
        },
        {
          headers: {
            "Api-Key": process.env.PLANT_ID_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;
      console.log("API Response:", JSON.stringify(result, null, 2));

      // Check if the API response is valid
      if (!result || !result.result) {
        throw new Error("Invalid API response");
      }

      // Get the first result from the identification
      const plantInfo = result.result?.classification?.suggestions?.[0] || {};
      const healthInfo = result.result?.is_healthy || {};
      const diseaseInfo = result.result?.disease || {};
      const symptomInfo = result.result?.symptom || {};

      // Check if we have a valid plant identification
      if (!plantInfo.name) {
        return res.render("clientUploadPlant", {
          error:
            "Could not identify the plant in the image. Please try uploading a clearer image.",
          plantName: null,
          commonNames: [],
          description: "",
          diseases: [],
          imagePath: req.file
            ? "/uploads/" + req.file.filename
            : req.body.capturedImage,
          name: req.session.firstname + " " + req.session.lastname,
        });
      }

      // Get similar images
      const similarImages =
        plantInfo.similar_images?.map((img) => ({
          url: img.url,
          url_small: img.url_small,
          similarity: img.similarity,
          citation: img.citation || "Unknown",
          license: img.license_name || "Unknown",
        })) || [];

      // Prepare health assessment
      let healthStatus = {
        isHealthy: healthInfo.binary || false,
        probability: healthInfo.probability || 0,
        threshold: healthInfo.threshold || 0,
      };

      // Get disease information
      let diseases = [];
      if (diseaseInfo.suggestions) {
        diseases = diseaseInfo.suggestions.map((disease) => ({
          name: disease.name,
          probability: disease.probability,
          similarImages:
            disease.similar_images?.map((img) => ({
              url: img.url,
              url_small: img.url_small,
              similarity: img.similarity,
              citation: img.citation || "Unknown",
              license: img.license_name || "Unknown",
            })) || [],
        }));
      }

      // Get symptom information
      let symptoms = [];
      if (symptomInfo.suggestions) {
        symptoms = symptomInfo.suggestions.map((symptom) => ({
          name: symptom.name,
          probability: symptom.score,
          heatmaps: symptom.heatmaps || [],
        }));
      }

      res.render("clientUploadPlant", {
        plantName: plantInfo.name,
        commonNames: [],
        description: "",
        diseases: diseases,
        symptoms: symptoms,
        imagePath: req.file
          ? "/uploads/" + req.file.filename
          : req.body.capturedImage,
        name: req.session.firstname + " " + req.session.lastname,
        error: null,
        confidence: plantInfo.probability || 0,
        similarImages: similarImages,
        healthStatus: healthStatus,
        isPlant: result.result?.is_plant?.binary || false,
        plantProbability: result.result?.is_plant?.probability || 0,
      });
    } catch (error) {
      console.error("Error in API request:", error);

      // Check if it's an API error
      if (error.response) {
        console.error("API Error Response:", error.response.data);
        return res.render("clientUploadPlant", {
          error:
            "Error communicating with the plant identification service. Please try again later.",
          plantName: null,
          commonNames: [],
          description: "",
          diseases: [],
          imagePath: req.file
            ? "/uploads/" + req.file.filename
            : req.body.capturedImage,
          name: req.session.firstname + " " + req.session.lastname,
        });
      }

      // For other errors
      res.render("clientUploadPlant", {
        error:
          "Error in detecting plant species and disease. Please try again.",
        plantName: null,
        commonNames: [],
        description: "",
        diseases: [],
        imagePath: req.file
          ? "/uploads/" + req.file.filename
          : req.body.capturedImage,
        name: req.session.firstname + " " + req.session.lastname,
      });
    }
  }
);

module.exports = app;
