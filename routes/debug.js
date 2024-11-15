// routes/debug.js
const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

router.post('/toggle-profile', async (req, res) => {
  try {
    const envPath = path.join(__dirname, '../.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    // Parse current profile
    const currentProfile = process.env.ACTIVE_PROFILE;
    const newProfile = currentProfile === 'professional' ? 'entrepreneur' : 'professional';
    
    // Update .env file
    const updatedContent = envContent.replace(
      /ACTIVE_PROFILE=\w+/,
      `ACTIVE_PROFILE=${newProfile}`
    );
    
    await fs.writeFile(envPath, updatedContent);
    
    // Update process.env
    process.env.ACTIVE_PROFILE = newProfile;
    
    res.json({ success: true, newProfile });
  } catch (error) {
    console.error('Error toggling profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;