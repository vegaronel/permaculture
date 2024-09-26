const express = require("express")
const Email = require("../models/message")
const User = require("../models/user")
const isAuthenticated = require('../middleware/athenticateUser')
const PlantCollection = require('../models/plantCollections'); // Import the PlantCollection model
const app = express();
// Update the /admin route to fetch plants
app.get("/admin", async (req, res) => {
    try {
        // Fetch all emails from the database
        const emails = await Email.find().sort({ dateSent: -1 });
        
        // Fetch all users with status 'pending'
        const pendingUsers = await User.find({ status: 'pending' });
        
        // Fetch all plants from the database
        const plants = await PlantCollection.find();

        // Render the admin view with emails, pending users, and plants
        res.render("admin.ejs", { emails, pendingUsers, plants });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error fetching data');
    }
});

// Route to delete a plant
app.post("/admin/plants/delete/:id", async (req, res) => {
    try {
        await PlantCollection.findByIdAndDelete(req.params.id);
        res.redirect("/admin");
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
});

// Route to update a plant (processing the form submission)
app.post("/admin/plants/update/:id", async (req, res) => {
    const { name, plantingInstructions, wateringSchedule, harvestTime } = req.body;

    try {
        await PlantCollection.findByIdAndUpdate(req.params.id, {
            name,
            plantingInstructions,
            wateringSchedule,
            harvestTime
        });
        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error updating plant");
    }
});
// Route for adding a new plant collection
app.post('/add-plant', async (req, res) => {
    const { name, plantingInstructions, wateringSchedule, harvestTime } = req.body;
  
    try {
      const newPlant = new PlantCollection({
        name,
        plantingInstructions,
        wateringSchedule,
        harvestTime
      });
  
      await newPlant.save();
      res.redirect('/admin'); // Redirect back to the admin page or wherever you want
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

app.post("/admin/emails/delete/:id", async (req, res) => {
    try 
        {
            const emailId = req.params.id;
            await Email.findByIdAndDelete(emailId);
            res.redirect("/admin/emails/");
        } 
    catch (err) 
        {
            console.error(err);
            res.status(500).send('Error deleting email');
        }
});

app.post('/send-mail',isAuthenticated, async(req, res)=>{
    const { name, email, subject, message, profilePicture } = req.body;
    const reciepients = `${name} <${email}>`;

    try 
        {
            await Email({ reciepients, subject, message });
            
            // Save the email details to the database
            const newEmail = new Email({ name, email, subject, message, profilePicture });
            await newEmail.save();

            res.render("email.ejs", { emailSent: "Email Sent" });
        } 
    catch (err) 
        {
            console.error(err);
            res.status(500).send('Error sending email');
        }
        
})

module.exports = app;