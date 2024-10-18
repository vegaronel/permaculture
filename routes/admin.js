const express = require("express")
const Email = require("../models/message")
const User = require("../models/user")
const PlantCollection = require('../models/plantCollections');
const Plant = require('../models/Plant');
const Admin = require('../models/Admin');
const multer = require('multer');
const bcrypt = require("bcryptjs");
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();


const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next(); // User is authenticated, proceed to the next middleware
    }
    res.redirect('/admin-login'); // Redirect to login if not authenticated
};

// Configure multer storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'plants', // Cloudinary folder where images will be stored
      allowed_formats: ['jpg', 'png'],
      transformation: [{ width: 500, height: 500, crop: 'limit' }] // Optional image transformations
    }
  });

  const upload = multer({ storage: storage });

  app.get("/admin-login", (req,res)=>{
    res.render('admin-login');
  });

  app.get("/admin-register", (req,res)=>{
    res.render('admin-register');
  });

  // Route to handle admin registration
app.post('/admin-register', async (req, res) => {
    const { username, password } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({
        username,
        password: hashedPassword
    });

    try {
        await newAdmin.save();
        res.redirect('/admin-login'); // Redirect to login page after successful registration
    } catch (error) {
        console.error(error);
        res.render('admin-register', { error: 'Username already exists' }); // Show error message
    }
});

// Route to handle admin login
app.post('/admin' , async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find the admin by username
        const admin = await Admin.findOne({ username });

        // Check if admin exists and compare passwords
        if (admin && await bcrypt.compare(password, admin.password)) {
            // Successful login
            req.session.userId = admin._id; // Store admin ID in session
            return res.redirect('/admin'); // Redirect to admin dashboard
        } else {
            // Invalid credentials
            return res.render('admin-login', { error: 'Invalid username or password' });
        }
    } catch (error) {
        console.error(error);
        return res.render('admin-login', { error: 'An error occurred. Please try again.' });
    }
});

app.get("/admin", isAuthenticated, upload.single('plantImage'), async (req, res) => {
    try {
        // Fetch all emails from the database
        const emails = await Email.find().sort({ dateSent: -1 });
        
        // Fetch all users with status 'pending'
        const pendingUsers = await User.find({ status: 'pending' });

        const totalUserCount = await User.countDocuments(); // Count total users

        // Count total plants
        const totalPlantCount = await Plant.countDocuments();

        // Count harvested plants
        const harvestedPlantCount = await Plant.countDocuments({ status: "Harvested" });

        // Count dead plants
        const deadPlantCount = await Plant.countDocuments({ status: "Died" });

        // Count available plants (assuming available means not dead or harvested)
        const availablePlants = await Plant.countDocuments({
            status: { $ne: "Died" } // Exclude dead plants
        });

        // Find the most planted plant
        const mostPlanted = await Plant.aggregate([
            { $group: { _id: "$name", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 } // Get the plant with the highest count
        ]);

        const mostPlantedName = mostPlanted.length > 0 ? mostPlanted[0]._id : "No plants planted yet";
        const mostPlantedCount = mostPlanted.length > 0 ? mostPlanted[0].count : 0;

        // Fetch all users and their plant count, sorted by most plants to least
        const usersWithPlantCount = await User.aggregate([
            {
                $lookup: {
                    from: "plants", // Collection name for plants
                    localField: "_id",
                    foreignField: "userId", // Assuming userId field in the Plant model
                    as: "plants"
                }
            },
            {
                $project: {
                    firstname: 1,
                    lastname: 1,
                    email: 1,
                    plantCount: { $size: "$plants" }
                }
            },
            { $sort: { plantCount: -1 } } // Sort by plant count, descending
        ]);

        // Render the admin view with the necessary data
        res.render("admin.ejs", { 
            emails, 
            pendingUsers, 
            totalUserCount, 
            totalPlantCount, 
            harvestedPlantCount, 
            deadPlantCount,
            availablePlants, // Include available plants
            mostPlantedName,
            mostPlantedCount,
            usersWithPlantCount // Pass the users with plant count to the view
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

app.get("/plant-collection", async(req,res)=>{
      // Fetch all plants from the database
      const plants = await PlantCollection.find();
    
      res.render("adminPlantCollection.ejs", {plants,plantAdded: "Success"});
})

// Route to delete a plant
app.post("/admin/emails/delete/:id", async (req, res) => {
    try {
        await PlantCollection.findByIdAndDelete(req.params.id);
        res.redirect("/plant-collection");
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting plant');
    }
});

// Route to update a plant (rendering the edit form)
app.get("/admin/plants/edit/:id", async (req, res) => {
    try {
        const plant = await PlantCollection.findById(req.params.id);
        res.render("editPlant.ejs", { plant });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching plant');
    }
});app.post("/admin/plants/update/:id", upload.single('plantImage'), async (req, res) => {
    const { name, plantingInstructions, harvestTime, plantingMonth, overview, benefits, usedFor, transplantSeedling } = req.body;
    let imageUrl = req.body.existingImage; // Store existing image URL

    if (req.file) {
        imageUrl = req.file.path || req.file.url || req.file.secure_url;
    }

    try {
        // Ensure plantingMonth is an array, even if only one checkbox is checked
        const updatedPlantingMonth = Array.isArray(plantingMonth) ? plantingMonth : [plantingMonth].filter(Boolean);

        await PlantCollection.findByIdAndUpdate(req.params.id, {
            name,
            plantingInstructions,
            harvestTime,
            plantingMonth: updatedPlantingMonth,
            image: imageUrl, // Use the updated or existing image URL
            overview,
            benefits,
            usedFor,
            transplantSeedling
        });
        res.redirect("/plant-collection");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating plant");
    }
});

app.post('/add-plant', upload.single('plantImage'), async (req, res) => {
    const { name, plantingInstructions, harvestTime, plantingMonth, overview, benefits, usedFor,transplantSeedling } = req.body;
  
    // Ensure plantingMonth is an array
    const plantingMonthsArray = Array.isArray(plantingMonth) ? plantingMonth : [plantingMonth].filter(Boolean);

    console.log(req.file);

    const imageUrl = req.file.path || req.file.url || req.file.secure_url; // Cloudinary URL

    // Check if the imageUrl is defined
    if (!imageUrl) {
        throw new Error('Image URL is missing');
    }

    try {
        const newPlant = new PlantCollection({
            name,
            plantingInstructions,
            harvestTime,
            image: imageUrl,
            plantingMonth: plantingMonthsArray,
            overview,
            benefits,
            usedFor,
            transplantSeedling
        });
  
        await newPlant.save();
        res.redirect('/plant-collection'); // Redirect back to the admin page or wherever you want
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding plant to collection");
    }
});


app.post("/admin/verify-user/:id", async (req, res) => {
    try {
        // Update the user's status to 'verified'
        await User.findByIdAndUpdate(req.params.id, { status: 'verified' });
        res.redirect("/admin");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error verifying user");
    }
});

// Route to reject a user
app.post("/admin/reject-user/:id", async (req, res) => {
    try {
        // Update the user's status to 'rejected'
        await User.findByIdAndUpdate(req.params.id, { status: 'rejected' });
        res.redirect("/admin");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error rejecting user");
    }
});

// Route to view an email and mark it as read
app.get('/admin/email/:id', async (req, res) => {
    try 
        {
            const email = await Email.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
            res.render('viewEmail.ejs', { email });
        } 
    catch (err) 
        {
            console.error(err);
            res.status(500).send('Error fetching email');
        }
});


app.get("/email",isAuthenticated, (req, res)=>{
    res.render("email.ejs", {name: req.session.firstname + " "+ req.session.lastname, email: req.session.email, profilePicture: req.session.profilePicture});
})

app.delete("/admin/emails/delete/:id", async (req, res) => {
    try {
        const emailId = req.params.id;
        await Email.findByIdAndDelete(emailId);
        res.status(200).json({ message: 'Email deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting email' });
    }
});


app.post('/send-mail',isAuthenticated, async(req, res)=>{
    const { name, email, subject, message, profilePicture } = req.body;
    const reciepients = `${name} <${email}>`;

    try 
        {
            res.locals.emailSent = "Email Sent";
            const emailSent = req.session.emailSent;

            await Email({ reciepients, subject, message });
            
            // Save the email details to the database
            const newEmail = new Email({ name, email, subject, message, profilePicture });
            await newEmail.save();
            

            req.flash('success', 'Email sent successfully!');
            res.redirect('/email'); // Redirecting to the email page
        } 
    catch (err) 
        {
            console.error('Error sending email:', error);
            req.flash('error', 'Error sending email. Please try again.');
            res.redirect('/email'); // Redirect to the same page with an error message
        }
        
})

app.post("/clear-email-session", (req, res) => {
    delete req.session.emailSent;
    res.json({ success: true });
});

module.exports = app;