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
        "https://api.plant.id/v2/identify",
        {
          images: [imageBase64],
          organs: ["leaf", "flower", "fruit", "bark", "habit"],
          plant_details: [
            "common_names",
            "url",
            "wiki_description",
            "taxonomy",
          ],
          disease_details: ["common_names", "description", "treatment"],
          modifiers: ["health_all", "disease_similar_images"],
          language: "en",
          plant_language: "en",
          disease_language: "en",
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

      // Get the first result from the identification
      const plantInfo = result.suggestions?.[0] || {};
      const healthInfo = result.health_assessment || {};

      // Check the confidence score
      const confidence = plantInfo.probability || 0;
      console.log("Plant identification confidence:", confidence);

      // Only show error if we have no suggestions at all
      if (!result.suggestions?.length) {
        return res.render("clientUploadPlant", {
          plantName: null,
          commonNames: [],
          description: "",
          diseases: [],
          symptoms: [],
          imagePath: "",
          name: req.session.firstname + " " + req.session.lastname,
          error:
            "No plant was identified in the image. Please try uploading a clearer image of the plant, preferably showing leaves or flowers.",
        });
      }

      // Get similar images
      const similarImages =
        plantInfo.similar_images?.map((img) => ({
          url: img.url,
          url_small: img.url_small,
          similarity: img.similarity,
          citation: img.citation || "Unknown",
        })) || [];

      // Prepare health assessment
      let healthStatus = {
        isHealthy: healthInfo.is_healthy,
        probability: healthInfo.is_healthy ? 1 : 0,
      };

      // Prepare diseases data
      let diseases = [];
      if (healthInfo.diseases) {
        diseases = healthInfo.diseases.map((disease) => ({
          name: disease.name,
          probability: disease.probability,
          description:
            disease.disease_details?.description || "No description available",
          treatment:
            disease.disease_details?.treatment?.chemical ||
            "No treatment information available",
        }));
      }

      // If no diseases but plant is unhealthy
      if (diseases.length === 0 && healthInfo.is_healthy === false) {
        diseases.push({
          name: "Unhealthy",
          probability: 1,
          description:
            "The plant appears to be unhealthy, but no specific disease was identified.",
          treatment: "Consider general plant care improvements.",
        });
      }

      res.render("clientUploadPlant", {
        plantName: plantInfo.plant_name || "Unknown",
        commonNames: plantInfo.plant_details?.common_names || [],
        description: plantInfo.plant_details?.wiki_description?.value || "",
        diseases: diseases,
        symptoms: [], // API v2 doesn't provide symptoms
        imagePath: req.file
          ? "/uploads/" + req.file.filename
          : req.body.capturedImage,
        name: req.session.firstname + " " + req.session.lastname,
        error: null,
        confidence: confidence,
        similarImages: similarImages,
        healthStatus: healthStatus,
        isPlant: true,
        plantProbability: confidence,
        plantDetails: {
          taxonomy: plantInfo.plant_details?.taxonomy || {},
          url: plantInfo.plant_details?.url || "",
        },
      });
    } catch (error) {
      console.error("Error in API request:", error);
      res.status(500).render("clientUploadPlant", {
        error:
          "Error in detecting plant species and disease. Please try again.",
        plantName: null,
        commonNames: [],
        description: "",
        diseases: [],
        imagePath: "",
        name: req.session.firstname + " " + req.session.lastname,
      });
    }
  }
);

module.exports = app;
