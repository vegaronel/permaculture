// const cron = require('node-cron');
// const Plant = require('../models/Plant');
// const nodemailer = require('nodemailer');

// // Configure email transport (example using Gmail)
// const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.USER_PASS,
//     },
// });

// // Function to send watering reminders
// const sendWateringReminders = async () => {
//   try {
//     const plants = await Plant.find();

//     plants.forEach(async (plant) => {
//       const today = new Date();
//       const lastWatered = plant.lastWatered || new Date(plant.plantingDate); // Assume planting date as initial last watered date
//       const wateringFrequency = plant.wateringSchedule;

//       let nextWateringDate = new Date(lastWatered);

//       if (wateringFrequency === 'Daily') {
//         nextWateringDate.setDate(lastWatered.getDate() + 1);
//       } else if (wateringFrequency === 'Every 2 Days') {
//         nextWateringDate.setDate(lastWatered.getDate() + 2);
//       } else if (wateringFrequency === 'Weekly') {
//         nextWateringDate.setDate(lastWatered.getDate() + 7);
//       } else if (wateringFrequency === 'Every 2 Weeks') {
//         nextWateringDate.setDate(lastWatered.getDate() + 14);
//       }

//       if (today >= nextWateringDate) {
//         // Define the email options
//         const mailOptions = {
//           from: `"JELLYACE" <${process.env.EMAIL_USER}>`,
//           to: "ronelvega31@gmail.com", // Replace with actual recipient email or user-specific email
//           subject: 'Watering Reminder',
//           text: `It's time to water your plant: ${plant.name}.`
//         };

//         // Send the email
//         transporter.sendMail(mailOptions, (error, info) => {
//           if (error) {
//             console.error('Error sending email:', error);
//           } else {
//             console.log('Email sent:', info.response);
//           }
//         });

//         // Update last watered date
//         plant.lastWatered = today;
//         await plant.save();
//       }
//             // Define the email options for growth stage notification
//             const growthStageMailOptions = {
//               from: `"JELLYACE" <${process.env.EMAIL_USER}>`,
//               to: "ronelvega31@gmail.com", // Replace with actual recipient email or user-specific email
//               subject: 'Plant Growth Stage Update',
//               text: `Your plant "${plant._id + plant.name}" is currently at the "${plant.growthStage}" stage of growth.`
//           };

//           // Send the growth stage notification email
//           transporter.sendMail(growthStageMailOptions, (error, info) => {
//               if (error) {
//                   console.error('Error sending growth stage notification email:', error);
//               } else {
//                   console.log('Growth stage notification email sent:', info.response);
//               }
//           });
//       });
    
    
//   } catch (error) {
//     console.error('Error sending reminders:', error);
//   }
// };

// cron.schedule('0 8 * * *', sendWateringReminders); // Runs every day at midnight

// // Export an empty object or any necessary configuration
// module.exports = {};
