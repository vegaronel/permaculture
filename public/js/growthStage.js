// Example implementation of getCurrentGrowthStage
function getCurrentGrowthStage(plant) {
  const today = new Date();
  const plantingDate = new Date(plant.plantingDate);
  const harvestDate = new Date(plant.harvestDate);
  
  // Check if the plant has been harvested
  if (today > harvestDate) {
    return 'Harvested';
  }

  // Determine the stage based on the planting and harvest dates
  const daysSincePlanting = Math.floor((today - plantingDate) / (1000 * 60 * 60 * 24));
  const totalDays = Math.floor((harvestDate - plantingDate) / (1000 * 60 * 60 * 24));

  if (daysSincePlanting < 0) {
    return 'Not Planted';
  } else if (daysSincePlanting < totalDays * 0.25) {
    return 'Early Stage';
  } else if (daysSincePlanting < totalDays * 0.5) {
    return 'Mid Stage';
  } else if (daysSincePlanting < totalDays * 0.75) {
    return 'Late Stage';
  } else {
    return 'Almost Harvested';
  }
}

module.exports = getCurrentGrowthStage;
